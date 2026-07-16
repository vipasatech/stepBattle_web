import { createClient } from "@supabase/supabase-js";

/// Browser-side Supabase client for the /upgrade page. Uses the
/// public anon key; row-level security enforces per-user access.
/// Server-only writes (subscription_orders, profile tier flip) go
/// through the /api/* serverless functions using the service_role
/// key — see api/_supabase-admin.js.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
