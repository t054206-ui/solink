import { createClient } from "@/lib/supabase/server";
import { getDataMode, type DataMode } from "@/lib/data/mode";

/**
 * Admin access check. The admin role / permission model is NOT final
 * ([PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS]); for now:
 *  - Supabase mode: the signed-in user's user_profiles.role must equal 'admin'.
 *  - Demo mode: allowed, and every admin page shows the DEMO banner.
 */
export interface AdminAccess { mode: DataMode; authorized: boolean; userId: string | null; reason: string | null }

export async function getAdminAccess(): Promise<AdminAccess> {
  const mode = getDataMode();
  if (mode === "demo") return { mode, authorized: true, userId: null, reason: null };
  const c = await createClient();
  if (!c) return { mode, authorized: false, userId: null, reason: "Supabase client could not be created." };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { mode, authorized: false, userId: null, reason: "You are not signed in." };
  const { data, error } = await c.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (error) return { mode, authorized: false, userId: user.id, reason: `Could not read your profile: ${error.message}` };
  if (data?.role !== "admin") return { mode, authorized: false, userId: user.id, reason: "Your account does not have the admin role." };
  return { mode, authorized: true, userId: user.id, reason: null };
}
