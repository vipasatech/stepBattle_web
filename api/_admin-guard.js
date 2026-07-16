import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "./_supabase-admin.js";

/// Shared auth check for every /api/admin-* endpoint.
///
/// Contract: the client attaches its Supabase JWT in
/// `Authorization: Bearer <access_token>`. We resolve it into a
/// user id (via the anon-key client so we're not blindly trusting
/// the sub claim ourselves) then confirm `profiles.is_admin=true`
/// with the service-role client.
///
/// Returns `{ ok: true, adminId }` on success; on failure writes
/// the status/body to `res` and returns `{ ok: false }`. Callers
/// should early-return when `ok` is false.
export async function requireAdmin(req, res) {
  const header = req.headers.authorization ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: "Missing bearer token" });
    return { ok: false };
  }
  const jwt = match[1];

  const url = process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    res.status(500).json({
      error:
        "Server not configured: SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing.",
    });
    return { ok: false };
  }

  // Anon-key client just to validate + decode the JWT server-side.
  // We deliberately don't trust the JWT payload ourselves — this
  // call round-trips to GoTrue which will reject expired/forged
  // tokens.
  const authClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(jwt);
  if (error || !data?.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return { ok: false };
  }
  const uid = data.user.id;

  const sb = supabaseAdmin();
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("id, is_admin")
    .eq("id", uid)
    .maybeSingle();
  if (profileErr) {
    res
      .status(500)
      .json({ error: `Profile lookup failed: ${profileErr.message}` });
    return { ok: false };
  }
  if (!profile?.is_admin) {
    res.status(403).json({ error: "Not authorized" });
    return { ok: false };
  }

  return { ok: true, adminId: uid };
}

/// Convenience helper — writes an entry to admin_activity_log. Never
/// throws; log-and-continue if the audit write fails, since the
/// primary action already succeeded.
export async function logAdminAction({
  adminId,
  targetUserId = null,
  action,
  details = {},
}) {
  try {
    const sb = supabaseAdmin();
    const { error } = await sb.from("admin_activity_log").insert({
      admin_id: adminId,
      target_user_id: targetUserId,
      action,
      details,
    });
    if (error) console.error("admin_activity_log insert:", error);
  } catch (e) {
    console.error("admin_activity_log:", e);
  }
}
