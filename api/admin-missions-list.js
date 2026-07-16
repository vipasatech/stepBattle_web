import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin } from "./_admin-guard.js";

/// GET /api/admin-missions-list
///
/// Returns every row in `public.missions`. No pagination — the
/// catalog is tiny (~dozens of rows at most) and the admin panel
/// wants to see all of them in a single scrollable table so
/// display_order tweaks are visible in context.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("missions")
    .select(
      "id, type, title, description, category, target_value, xp_reward, difficulty, should_show_in_home, poster_url, display_order",
    )
    .order("type", { ascending: true })
    .order("display_order", { ascending: false })
    .order("id", { ascending: true });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ missions: data ?? [] });
}
