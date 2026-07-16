import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin } from "./_admin-guard.js";

/// GET /api/admin-metrics
///
/// Snapshot for the header strip on the admin panel:
///   * total paid users (tier != 'free')
///   * currently-active Pro subs (expires_at > now)
///   * currently-active Family subs
///   * this-calendar-month gross revenue (paid orders, in ₹)
///
/// All counts read straight from Supabase — no caching, so refreshes
/// each panel open. Fine at this scale.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [proRes, familyRes, ordersRes, adminsRes] = await Promise.all([
    sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("subscription_tier", "pro")
      .gte("subscription_expires_at", nowIso),
    sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("subscription_tier", "family")
      .gte("subscription_expires_at", nowIso),
    sb
      .from("subscription_orders")
      .select("amount_paise")
      .eq("status", "success")
      .gte("created_at", monthStart.toISOString()),
    sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true),
  ]);

  const err =
    proRes.error ?? familyRes.error ?? ordersRes.error ?? adminsRes.error;
  if (err) {
    return res.status(500).json({ error: err.message });
  }

  const paise = (ordersRes.data ?? []).reduce(
    (acc, r) => acc + (r.amount_paise ?? 0),
    0,
  );

  return res.status(200).json({
    activePro: proRes.count ?? 0,
    activeFamily: familyRes.count ?? 0,
    paidTotal: (proRes.count ?? 0) + (familyRes.count ?? 0),
    admins: adminsRes.count ?? 0,
    monthRevenueRupees: Math.round(paise / 100),
    monthOrderCount: ordersRes.data?.length ?? 0,
    monthStart: monthStart.toISOString(),
  });
}
