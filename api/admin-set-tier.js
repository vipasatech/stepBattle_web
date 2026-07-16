import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin, logAdminAction } from "./_admin-guard.js";

/// POST /api/admin-set-tier
/// Body: {
///   targetUid: string,
///   tier: "free" | "pro" | "family",
///   extendMonths?: number  // 0/omitted = clear expiry;
///                          // positive number = expires N months from now.
/// }
///
/// Manually bumps or resets a user's subscription. Writes to
/// admin_activity_log so we can audit who did what.
const VALID_TIERS = new Set(["free", "pro", "family"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

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
  if (readErr) {
    return res.status(500).json({ error: readErr.message });
  }
  if (!currentRow) {
    return res.status(404).json({ error: "User not found" });
  }

  // Compute the new expiry: free tier → null; paid tier with
  // extendMonths → that many months out; paid tier without a
  // duration → keep whatever's already there (or null).
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
  if (updErr) {
    return res.status(500).json({ error: updErr.message });
  }

  await logAdminAction({
    adminId: guard.adminId,
    targetUserId: targetUid,
    action: "set_tier",
    details: {
      from: {
        tier: currentRow.subscription_tier,
        expires_at: currentRow.subscription_expires_at,
      },
      to: {
        tier,
        expires_at: expiresAt,
        billing_period: billingPeriod,
      },
      extend_months: months,
    },
  });

  return res.status(200).json({
    ok: true,
    tier,
    expiresAt,
    billingPeriod,
  });
}
