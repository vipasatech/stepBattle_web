import Razorpay from "razorpay";

import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin, logAdminAction } from "./_admin-guard.js";

/// /api/admin-payments
///   GET  ?format=json               → paginated payments list
///   GET  ?format=csv                → CSV file download (attachment)
///   POST ?op=refund                 → { paymentId, amountPaise?, reason? }
///
/// Consolidated (list + csv + refund) to fit under Vercel Hobby's
/// 12-function cap.
export default async function handler(req, res) {
  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  if (req.method === "GET") {
    const format = String(req.query.format ?? "json");
    if (format === "csv") return listCsv(req, res);
    return listJson(req, res);
  }

  if (req.method === "POST") {
    const op = String(req.query.op ?? "");
    if (op === "refund") return refund(req, res, guard);
    return res.status(400).json({ error: `Unknown op: ${op}` });
  }

  res.status(405).json({ error: "Method not allowed" });
}

// ---------------------------------------------------------------------------
// GET (JSON) — table view for the panel
// ---------------------------------------------------------------------------
async function listJson(req, res) {
  const status = String(req.query.status ?? "all");
  const limit = Math.min(parseInt(req.query.limit ?? "50", 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset ?? "0", 10) || 0, 0);

  const sb = supabaseAdmin();
  let query = sb
    .from("subscription_orders")
    .select(
      `id, user_id, tier, billing_period, amount_paise, currency, status,
       razorpay_order_id, razorpay_payment_id, created_at, completed_at,
       profiles ( email, preferred_name, display_name )`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({
    payments: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

// ---------------------------------------------------------------------------
// GET (CSV) — full export as an attachment
// ---------------------------------------------------------------------------
async function listCsv(req, res) {
  const status = String(req.query.status ?? "all");
  const from = req.query.from?.toString();
  const to = req.query.to?.toString();

  const sb = supabaseAdmin();
  let q = sb
    .from("subscription_orders")
    .select(
      `id, user_id, tier, billing_period, amount_paise, currency, status,
       razorpay_order_id, razorpay_payment_id, created_at, completed_at,
       profiles ( email, preferred_name )`,
    )
    .order("created_at", { ascending: false });

  if (status !== "all") q = q.eq("status", status);
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const header = [
    "created_at",
    "user_email",
    "user_name",
    "tier",
    "billing_period",
    "amount_rupees",
    "currency",
    "status",
    "razorpay_order_id",
    "razorpay_payment_id",
    "completed_at",
  ];
  const rows = (data ?? []).map((r) => [
    r.created_at,
    r.profiles?.email ?? "",
    r.profiles?.preferred_name ?? "",
    r.tier ?? "",
    r.billing_period ?? "",
    ((r.amount_paise ?? 0) / 100).toFixed(2),
    r.currency ?? "",
    r.status ?? "",
    r.razorpay_order_id ?? "",
    r.razorpay_payment_id ?? "",
    r.completed_at ?? "",
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");

  const filename = `stepbattle-payments-${status}-${
    new Date().toISOString().slice(0, 10)
  }.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`,
  );
  res.status(200).send(csv);
}

// ---------------------------------------------------------------------------
// POST ?op=refund — Razorpay refund + DB writeback + audit log
// ---------------------------------------------------------------------------
async function refund(req, res, guard) {
  const { paymentId, amountPaise, reason } = req.body ?? {};
  if (typeof paymentId !== "string" || !paymentId.startsWith("pay_")) {
    return res.status(400).json({ error: "Missing / invalid paymentId" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res
      .status(500)
      .json({ error: "Razorpay keys missing on the server" });
  }

  const sb = supabaseAdmin();
  const { data: orderRow, error: fetchErr } = await sb
    .from("subscription_orders")
    .select("id, user_id, amount_paise, status")
    .eq("razorpay_payment_id", paymentId)
    .maybeSingle();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!orderRow) {
    return res.status(404).json({ error: "Payment not found in our records" });
  }
  if (orderRow.status === "refunded") {
    return res.status(409).json({ error: "Already refunded" });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  let refundResult;
  try {
    refundResult = await razorpay.payments.refund(paymentId, {
      amount: amountPaise ?? orderRow.amount_paise,
      notes: {
        reason: reason ?? "admin refund",
        admin_id: guard.adminId,
      },
    });
  } catch (e) {
    return res.status(502).json({
      error: `Razorpay refund failed: ${
        e?.error?.description ?? e?.message ?? String(e)
      }`,
    });
  }

  const { error: updErr } = await sb
    .from("subscription_orders")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_id: refundResult.id,
    })
    .eq("id", orderRow.id);
  if (updErr) console.error("subscription_orders refund update:", updErr);

  await logAdminAction({
    adminId: guard.adminId,
    targetUserId: orderRow.user_id,
    action: "refund",
    details: {
      payment_id: paymentId,
      refund_id: refundResult.id,
      amount_paise: refundResult.amount,
      reason: reason ?? null,
    },
  });

  res.status(200).json({
    ok: true,
    refundId: refundResult.id,
    amount: refundResult.amount,
    status: refundResult.status,
  });
}
