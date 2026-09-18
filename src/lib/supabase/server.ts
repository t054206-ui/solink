import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv, isSupabaseConfigured } from "@/lib/config/env";

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
