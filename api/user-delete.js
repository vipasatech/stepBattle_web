import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "./_supabase-admin.js";

/// POST /api/user-delete
///
/// Self-serve account deletion. Authenticates the caller via their
/// Supabase JWT (Bearer token) — the uid is read from the token, not
/// the request body, so a malicious client can't request deletion
/// of somebody else's account.
///
/// Order of operations:
///   1. Validate JWT → resolve `uid`
///   2. DELETE FROM public.profiles WHERE id = uid — the profile
///      row is the CASCADE root. Migration 0001 declares most
///      user-owned tables (step_logs, user_mission_progress,
///      friend_relationships, etc.) as
///      `references profiles(id) on delete cascade`, so a single
///      profile-row delete sweeps everything referencing it.
///   3. Delete auth row via supabase.auth.admin.deleteUser(uid) —
///      requires the service_role key (already used elsewhere on
///      this server).
///
/// Notes:
///   * subscription_orders is intentionally kept without cascade
///     (accounting history) — the row's user_id is orphaned but
///     the payment record survives. That's the desired behaviour;
///     the finance side needs the trail.
///   * We do NOT clean up Supabase Storage assets (avatars, mission
///     posters). Cheap to leave until you have a nightly janitor.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- 1. Validate JWT → uid ------------------------------------
  const header = req.headers.authorization ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  const jwt = match[1];

  const url = process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return res.status(500).json({
      error:
        "Server not configured: SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing.",
    });
  }

  // Round-trip to GoTrue via the anon client so expired/forged tokens
  // are rejected before we do anything destructive.
  const authClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(jwt);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  const uid = data.user.id;

  const sb = supabaseAdmin();

  // --- 2. Delete the profile row (cascades everywhere) ----------
  const { error: profileErr } = await sb
    .from("profiles")
    .delete()
    .eq("id", uid);
  if (profileErr) {
    console.error("user-delete: profile delete failed:", profileErr);
    return res.status(500).json({
      error: `Profile delete failed: ${profileErr.message}`,
    });
  }

  // --- 3. Delete auth row via admin API -------------------------
  // If the profile row was deleted but this fails, the user's auth
  // account still exists but has no profile — next sign-in would
  // hit the onboarding gate and try to recreate a fresh profile,
  // which is a workable recovery path. Log the error but return
  // 200 so the client proceeds with sign-out.
  try {
    const { error: authErr } = await sb.auth.admin.deleteUser(uid);
    if (authErr) {
      console.error("user-delete: auth delete failed:", authErr);
    }
  } catch (e) {
    console.error("user-delete: auth delete threw:", e);
  }

  return res.status(200).json({ ok: true, uid });
}
