import { createClient } from "@/lib/supabase/server";
import { getDataMode, type DataMode } from "@/lib/data/mode";
import { DEMO_PROVIDERS } from "@/lib/demo/data";

/**
 * Maintenance-provider access check. Mirrors the admin gate
 * (admin/_lib/auth.ts); the role / permission model is NOT final
 * ([PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS]):
 *  - Supabase mode: the signed-in user's user_profiles.provider_company_id must
 *    be set. Every query below is additionally scoped by RLS
 *    (my_provider_id()), so a provider only ever reads its own cases.
 *  - Demo mode: allowed, acting as the labeled demo maintenance company, and
 *    every provider page shows the DEMO banner.
 */

/** In demo mode the signed-in provider is the demo maintenance company. */
export const DEMO_PROVIDER = DEMO_PROVIDERS.find((p) => p.kind.includes("maintenance")) ?? null;

export interface ProviderAccess {
  mode: DataMode;
  authorized: boolean;
  userId: string | null;
  providerId: string | null;
  providerName: string | null;
  isDemoProvider: boolean;
  reason: string | null;
}

export async function getProviderAccess(): Promise<ProviderAccess> {
  const mode = getDataMode();
  if (mode === "demo") {
    return {
      mode, authorized: true, userId: null,
      providerId: DEMO_PROVIDER?.id ?? null, providerName: DEMO_PROVIDER?.name ?? null,
      isDemoProvider: true, reason: null,
    };
  }
  const base = { mode, authorized: false, userId: null, providerId: null, providerName: null, isDemoProvider: false };
  const c = await createClient();
  if (!c) return { ...base, reason: "Supabase client could not be created." };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ...base, reason: "You are not signed in." };
  const { data, error } = await c.from("user_profiles").select("role, provider_company_id").eq("user_id", user.id).maybeSingle();
  if (error) return { ...base, userId: user.id, reason: `Could not read your profile: ${error.message}` };
  const providerId = (data?.provider_company_id as string | null) ?? null;
  if (!providerId) return { ...base, userId: user.id, reason: "Your account is not linked to a provider company." };
  const { data: company } = await c.from("provider_companies").select("name, is_demo").eq("id", providerId).maybeSingle();
  return {
    mode, authorized: true, userId: user.id, providerId,
    providerName: (company?.name as string | undefined) ?? null,
    isDemoProvider: Boolean(company?.is_demo), reason: null,
  };
}
