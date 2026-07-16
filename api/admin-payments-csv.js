import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin } from "./_admin-guard.js";

/// GET /api/admin-payments-csv?status=<all|success|failed|pending|refunded>&from=&to=
///
/// Streams a CSV of subscription_orders. Not paginated — always
/// exports everything matching the filter. Fine while the row count
/// stays modest; add server-side pagination + streaming if this
/// starts timing out.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const status = (req.query.status ?? "all").toString();
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
  if (error) {
    return res.status(500).json({ error: error.message });
  }

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
          // RFC 4180 escaping — quote fields containing comma / quote / newline.
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
