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

export interface ShellIdentity { email: string | null; name: string | null; role: Role; orgName: string | null }

/**
 * What the sidebar footer shows: the person's name, their email, and for a
 * provider or manufacturer the organisation they act for. One read of
 * user_profiles plus one of the linked company, both under RLS.
 */
export async function getShellIdentity(): Promise<ShellIdentity | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const { data: prof } = await supabase.from("user_profiles").select("full_name, role, provider_company_id, manufacturer_id").eq("user_id", user.id).maybeSingle();
  const role: Role = isRole(prof?.role) ? prof.role : DEFAULT_ROLE;
  const metaName = typeof user.user_metadata?.full_name === "string" ? (user.user_metadata.full_name as string) : null;
  let orgName: string | null = null;
  if (prof?.provider_company_id) {
    const { data } = await supabase.from("provider_companies").select("name").eq("id", prof.provider_company_id).maybeSingle();
    orgName = (data?.name as string | undefined) ?? null;
  } else if (prof?.manufacturer_id) {
    const { data } = await supabase.from("manufacturers").select("name").eq("id", prof.manufacturer_id).maybeSingle();
    orgName = (data?.name as string | undefined) ?? null;
  }
  return { email: user.email ?? null, name: (prof?.full_name as string | null) ?? metaName, role, orgName };
}
