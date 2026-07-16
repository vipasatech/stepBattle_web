import Razorpay from "razorpay";

import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin, logAdminAction } from "./_admin-guard.js";

/// POST /api/admin-refund
/// Body: {
///   paymentId: string,      // razorpay_payment_id, e.g. pay_XXXX
///   amountPaise?: number,   // partial refund; omit for full refund
///   reason?: string,
/// }
///
/// Issues a Razorpay refund + marks the corresponding
/// subscription_orders row as `refunded`. Does NOT touch
/// profiles.subscription_tier — the admin should separately
/// call /api/admin-set-tier if they want to downgrade the user
/// after refund. This split keeps the two decisions independent.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

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
  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message });
  }
  if (!orderRow) {
    return res.status(404).json({ error: "Payment not found in our records" });
  }
  if (orderRow.status === "refunded") {
    return res.status(409).json({ error: "Already refunded" });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  let refund;
  try {
    refund = await razorpay.payments.refund(paymentId, {
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
      refund_id: refund.id,
    })
    .eq("id", orderRow.id);
  if (updErr) console.error("subscription_orders refund update:", updErr);

  await logAdminAction({
    adminId: guard.adminId,
    targetUserId: orderRow.user_id,
    action: "refund",
    details: {
      payment_id: paymentId,
      refund_id: refund.id,
      amount_paise: refund.amount,
      reason: reason ?? null,
    },
  });

  return res.status(200).json({
    ok: true,
    refundId: refund.id,
    amount: refund.amount,
    status: refund.status,
  });
}
