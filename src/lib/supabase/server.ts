import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv, isSupabaseConfigured } from "@/lib/config/env";
import { DEFAULT_ROLE, isRole, type Role } from "@/lib/roles";

/**
 * Supabase client for server components and route handlers (user-scoped, RLS applies).
 * Returns null when Supabase is not configured so callers can fall back to demo mode.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) return null;
  const store = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a server component; proxy.ts refreshes cookies instead.
        }
      },
    },
  });
}

/** Current authenticated user or null (also null in demo mode). */
export async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * The signed-in user's role from user_profiles, or null when there is no
 * session or Supabase is not configured. Callers in demo mode fall back to the
 * browser-chosen role; in Supabase mode this is the only source of truth, and a
 * ?as= query string must never override it.
 */
export async function getCurrentRole(): Promise<Role | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const { data } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  const role: unknown = data?.role;
  return isRole(role) ? role : DEFAULT_ROLE;
}
