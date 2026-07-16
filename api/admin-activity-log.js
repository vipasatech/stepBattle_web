import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin } from "./_admin-guard.js";

/// GET /api/admin-activity-log?limit=&offset=
///
/// Backed by the `admin_activity_log_expanded` view (created in
/// migration 0031/chunk 3) which pre-joins the admin's and target
/// user's email/name.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const limit = Math.min(parseInt(req.query.limit ?? "100", 10) || 100, 500);
  const offset = Math.max(parseInt(req.query.offset ?? "0", 10) || 0, 0);

  const sb = supabaseAdmin();
  const { data, error, count } = await sb
    .from("admin_activity_log_expanded")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    entries: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
