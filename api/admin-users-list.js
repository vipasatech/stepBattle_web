import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin } from "./_admin-guard.js";

/// GET /api/admin-users-list?q=<search>&limit=<n>&offset=<n>
///
/// Paginated user list for the admin panel's Users tab. `q` matches
/// (case-insensitive) against email / display_name / preferred_name.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const q = (req.query.q ?? "").toString().trim();
  const limit = Math.min(parseInt(req.query.limit ?? "50", 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset ?? "0", 10) || 0, 0);

  const sb = supabaseAdmin();
  let query = sb
    .from("profiles")
    .select(
      "id, email, display_name, preferred_name, subscription_tier, subscription_expires_at, subscription_billing_period, is_admin, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    query = query.or(
      `email.ilike.${like},display_name.ilike.${like},preferred_name.ilike.${like}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    users: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
