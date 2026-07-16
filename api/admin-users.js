import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin, logAdminAction } from "./_admin-guard.js";

/// /api/admin-users
///   GET                          → paginated user list (q, limit, offset)
///   POST ?op=set-tier            → { targetUid, tier, extendMonths? }
///
/// Consolidated to keep us under Vercel Hobby's 12-function cap.
const VALID_TIERS = new Set(["free", "pro", "family"]);

export default async function handler(req, res) {
  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  if (req.method === "GET") return listUsers(req, res);

  if (req.method === "POST") {
    const op = String(req.query.op ?? "");
    if (op === "set-tier") return setTier(req, res, guard);
    return res.status(400).json({ error: `Unknown op: ${op}` });
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function listUsers(req, res) {
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
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({
    users: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

async function setTier(req, res, guard) {
  const { targetUid, tier, extendMonths } = req.body ?? {};
  if (typeof targetUid !== "string" || !targetUid) {
    return res.status(400).json({ error: "Missing targetUid" });
  }
  if (!VALID_TIERS.has(tier)) {
    return res.status(400).json({ error: "Invalid tier" });
  }
  const months = Number.isFinite(Number(extendMonths))
    ? Math.max(0, Math.floor(Number(extendMonths)))
    : 0;

  const sb = supabaseAdmin();

  const { data: currentRow, error: readErr } = await sb
    .from("profiles")
    .select(
      "id, email, subscription_tier, subscription_expires_at, subscription_billing_period",
    )
    .eq("id", targetUid)
    .maybeSingle();
  if (readErr) return res.status(500).json({ error: readErr.message });
  if (!currentRow) return res.status(404).json({ error: "User not found" });

  let expiresAt = currentRow.subscription_expires_at;
  if (tier === "free") {
    expiresAt = null;
  } else if (months > 0) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    expiresAt = d.toISOString();
  }

  const billingPeriod =
    tier === "free"
      ? null
      : months >= 12
        ? "yearly"
        : months > 0
          ? "monthly"
          : currentRow.subscription_billing_period;

  const { error: updErr } = await sb
    .from("profiles")
    .update({
      subscription_tier: tier,
      subscription_expires_at: expiresAt,
      subscription_billing_period: billingPeriod,
    })
    .eq("id", targetUid);
  if (updErr) return res.status(500).json({ error: updErr.message });

  await logAdminAction({
    adminId: guard.adminId,
    targetUserId: targetUid,
    action: "set_tier",
    details: {
      from: {
        tier: currentRow.subscription_tier,
        expires_at: currentRow.subscription_expires_at,
      },
      to: { tier, expires_at: expiresAt, billing_period: billingPeriod },
      extend_months: months,
    },
  });

  res.status(200).json({ ok: true, tier, expiresAt, billingPeriod });
}
