import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-only jobs (scraping, sending alerts). It
// bypasses RLS, so it must NEVER be imported into client components or exposed
// to the browser. Returns null when the required env is missing so callers can
// degrade gracefully instead of throwing at import time.
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasAdminConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
