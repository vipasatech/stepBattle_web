import { createClient } from "@supabase/supabase-js";

// The marketing frontend supports a deliberate no-backend demo mode. Once
// real public Supabase values are supplied, the normal client is used again.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isRealPublicConfig =
  typeof url === "string" &&
  /^https:\/\/.+\.supabase\.co$/i.test(url) &&
  typeof anonKey === "string" &&
  anonKey.length > 20 &&
  !/replace_me|your-project-ref|eyJhbGc\.\.\./i.test(url + " " + anonKey);

export const isSupabaseDemoMode = !isRealPublicConfig;

function demoModeError() {
  return {
    message:
      "Supabase is not configured. This frontend is running in local demo mode.",
  };
}

// A deliberately unauthenticated adapter. It prevents import-time crashes
// without impersonating a user or putting credentials into the frontend.
function createDemoClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithOtp: async () => ({ error: demoModeError() }),
      verifyOtp: async () => ({ error: demoModeError() }),
      signOut: async () => ({ error: null }),
    },
  };
}

export const supabase = isRealPublicConfig
  ? createClient(url, anonKey)
  : createDemoClient();
