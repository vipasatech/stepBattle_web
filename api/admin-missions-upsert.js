import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin, logAdminAction } from "./_admin-guard.js";

/// POST /api/admin-missions-upsert
/// Body: {
///   id: string,                           // primary key (e.g. "daily_arena")
///   type: "daily" | "weekly",
///   title: string,
///   description?: string,
///   category: "steps" | "battle" | "streak" | "calories",
///   target_value: number,
///   xp_reward: number,
///   difficulty: "easy" | "medium" | "hard",
///   should_show_in_home?: boolean,
///   poster_url?: string | null,
///   display_order?: number,
/// }
///
/// Creates a new mission or updates one in place. Also mirrors the
/// action into admin_activity_log so we can audit catalog changes.
const VALID_TYPES = new Set(["daily", "weekly"]);
const VALID_CATEGORIES = new Set(["steps", "battle", "streak", "calories"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const ID_PATTERN = /^[a-z0-9_]{2,40}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

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
  if (errors.length) {
    return res.status(400).json({ error: errors.join("; ") });
  }

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
    display_order:
      Number.isFinite(Number(body.display_order))
        ? Math.floor(Number(body.display_order))
        : 100,
  };

  const sb = supabaseAdmin();

  // Capture existing row (if any) for the audit trail's "from"
  // snapshot — makes activity log entries diff-able at a glance.
  const { data: existing } = await sb
    .from("missions")
    .select("*")
    .eq("id", row.id)
    .maybeSingle();

  const { error: upErr } = await sb
    .from("missions")
    .upsert(row, { onConflict: "id" });
  if (upErr) {
    return res.status(500).json({ error: upErr.message });
  }

  await logAdminAction({
    adminId: guard.adminId,
    action: existing ? "mission_update" : "mission_create",
    details: {
      mission_id: row.id,
      from: existing ?? null,
      to: row,
    },
  });

  return res.status(200).json({ ok: true, mission: row, created: !existing });
}
