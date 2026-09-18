import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/env";
import { serverEnv } from "@/lib/config/env";

/**
 * Service-role client. SERVER ONLY. Bypasses RLS — use exclusively in trusted
 * server code (imports, scheduled jobs, admin actions after authorization).
 */
export function createAdminClient() {
  const { supabaseServiceRoleKey } = serverEnv();
  if (!publicEnv.supabaseUrl || !supabaseServiceRoleKey) return null;
  return createSupabaseClient(publicEnv.supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
