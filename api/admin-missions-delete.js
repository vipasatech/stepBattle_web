import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin, logAdminAction } from "./_admin-guard.js";

/// POST /api/admin-missions-delete
/// Body: { id: string }
///
/// Deletes a mission from the catalog. `daily_streak` is protected —
/// the mobile app's XP model depends on it as a system reward and
/// removing it would break the streak-XP grant. If it accidentally
/// gets removed, seed it back via a raw SQL insert.
const PROTECTED_IDS = new Set(["daily_streak"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const { id } = req.body ?? {};
  if (typeof id !== "string" || !id) {
    return res.status(400).json({ error: "Missing id" });
  }
  if (PROTECTED_IDS.has(id)) {
    return res.status(400).json({
      error: `Mission "${id}" is protected — the app depends on it. Cannot delete.`,
    });
  }

  const sb = supabaseAdmin();

  const { data: existing, error: readErr } = await sb
    .from("missions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readErr) {
    return res.status(500).json({ error: readErr.message });
  }
  if (!existing) {
    return res.status(404).json({ error: "Mission not found" });
  }

  const { error: delErr } = await sb.from("missions").delete().eq("id", id);
  if (delErr) {
    return res.status(500).json({ error: delErr.message });
  }

  await logAdminAction({
    adminId: guard.adminId,
    action: "mission_delete",
    details: { mission_id: id, snapshot: existing },
  });

  return res.status(200).json({ ok: true });
}
