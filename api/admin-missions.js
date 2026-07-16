import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin, logAdminAction } from "./_admin-guard.js";

/// /api/admin-missions
///   GET                        → catalog of all missions
///   POST ?op=upsert            → create / update (full mission row)
///   POST ?op=delete            → { id }  (daily_streak is protected)
///
/// Consolidated (list + upsert + delete) to fit under Vercel Hobby's
/// 12-function cap. Poster upload stays in its own file because it
/// needs a bumped body-size limit.
const VALID_TYPES = new Set(["daily", "weekly"]);
const VALID_CATEGORIES = new Set(["steps", "battle", "streak", "calories"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const ID_PATTERN = /^[a-z0-9_]{2,40}$/;
const PROTECTED_IDS = new Set(["daily_streak"]);

export default async function handler(req, res) {
  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  if (req.method === "GET") return list(req, res);

  if (req.method === "POST") {
    const op = String(req.query.op ?? "");
    if (op === "upsert") return upsert(req, res, guard);
    if (op === "delete") return remove(req, res, guard);
    return res.status(400).json({ error: `Unknown op: ${op}` });
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function list(_req, res) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("missions")
    .select(
      "id, type, title, description, category, target_value, xp_reward, difficulty, should_show_in_home, poster_url, display_order",
    )
    .order("type", { ascending: true })
    .order("display_order", { ascending: false })
    .order("id", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ missions: data ?? [] });
}

async function upsert(req, res, guard) {
  const body = req.body ?? {};
  const errors = [];
  if (typeof body.id !== "string" || !ID_PATTERN.test(body.id)) {
    errors.push("id must be 2-40 lowercase letters / digits / underscores");
  }
  if (!VALID_TYPES.has(body.type)) errors.push("type must be daily or weekly");
  if (typeof body.title !== "string" || !body.title.trim()) {
    errors.push("title required");
  }
  if (!VALID_CATEGORIES.has(body.category)) errors.push("invalid category");
  if (!Number.isFinite(Number(body.target_value)) || Number(body.target_value) <= 0) {
    errors.push("target_value must be positive");
  }
  if (!Number.isFinite(Number(body.xp_reward)) || Number(body.xp_reward) < 0) {
    errors.push("xp_reward must be >= 0");
  }
  if (!VALID_DIFFICULTIES.has(body.difficulty)) errors.push("invalid difficulty");
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const row = {
    id: body.id.trim(),
    type: body.type,
    title: body.title.trim(),
    description: (body.description ?? "").trim(),
    category: body.category,
    target_value: Math.floor(Number(body.target_value)),
    xp_reward: Math.floor(Number(body.xp_reward)),
    difficulty: body.difficulty,
    should_show_in_home: Boolean(body.should_show_in_home),
    poster_url:
      typeof body.poster_url === "string" && body.poster_url.trim()
        ? body.poster_url.trim()
        : null,
    display_order: Number.isFinite(Number(body.display_order))
      ? Math.floor(Number(body.display_order))
      : 100,
  };

  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("missions")
    .select("*")
    .eq("id", row.id)
    .maybeSingle();

  const { error: upErr } = await sb
    .from("missions")
    .upsert(row, { onConflict: "id" });
  if (upErr) return res.status(500).json({ error: upErr.message });

  await logAdminAction({
    adminId: guard.adminId,
    action: existing ? "mission_update" : "mission_create",
    details: { mission_id: row.id, from: existing ?? null, to: row },
  });

  res.status(200).json({ ok: true, mission: row, created: !existing });
}

async function remove(req, res, guard) {
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
  if (readErr) return res.status(500).json({ error: readErr.message });
  if (!existing) return res.status(404).json({ error: "Mission not found" });

  const { error: delErr } = await sb.from("missions").delete().eq("id", id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  await logAdminAction({
    adminId: guard.adminId,
    action: "mission_delete",
    details: { mission_id: id, snapshot: existing },
  });

  res.status(200).json({ ok: true });
}
