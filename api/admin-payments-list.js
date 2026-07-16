import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin } from "./_admin-guard.js";

/// GET /api/admin-payments-list?status=<all|pending|success|failed>&limit=&offset=
///
/// Denormalized: also pulls the payer's email + preferred_name so the
/// table can show "who paid" without a second round-trip.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const status = (req.query.status ?? "all").toString();
  const limit = Math.min(parseInt(req.query.limit ?? "50", 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset ?? "0", 10) || 0, 0);

  const sb = supabaseAdmin();
  let query = sb
    .from("subscription_orders")
    .select(
      `
      id,
      user_id,
      tier,
      billing_period,
      amount_paise,
      currency,
      status,
      razorpay_order_id,
      razorpay_payment_id,
      created_at,
      completed_at,
      profiles ( email, preferred_name, display_name )
      `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    payments: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
