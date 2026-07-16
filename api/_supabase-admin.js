import { createClient } from "@supabase/supabase-js";

/// Server-only Supabase client with the service_role key. Used by
/// the Razorpay webhook to bypass RLS and upsert `subscription_orders`
/// + update `profiles.subscription_tier`.
///
/// This file is under /api so Vercel treats it as server-side code
/// (never bundled into the browser). The underscore prefix keeps it
/// from being registered as its own API route.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the Vercel env.",
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
