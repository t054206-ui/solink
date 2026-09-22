import { createClient } from "@/lib/supabase/server";
import { getDataMode, type DataMode } from "@/lib/data/mode";
import { listManufacturers } from "@/lib/data/repositories";
import type { Manufacturer } from "@/lib/types";

/**
 * Who the signed-in manufacturer is. Mirrors provider/_lib/access.ts:
 *  - Supabase mode: user_profiles.manufacturer_id must point at a manufacturer;
 *    RLS ("products manufacturer own", "manufacturers self update",
 *    "documents manufacturer own") then scopes every write to that company.
 *  - Demo mode: allowed, acting as the labelled demo manufacturer, and every
 *    page shows the demo banner.
 * The role / permission model is not final: [PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS].
 */
export interface ManufacturerAccess {
  mode: DataMode;
  authorized: boolean;
  userId: string | null;
  manufacturer: Manufacturer | null;
  reason: string | null;
}

const DEMO_MANUFACTURER_ID = "m-demo-a";

export async function getManufacturerAccess(): Promise<ManufacturerAccess> {
  const mode = getDataMode();
  if (mode === "demo") {
    const { data } = await listManufacturers();
    const me = data.find((m) => m.id === DEMO_MANUFACTURER_ID) ?? data[0] ?? null;
    return { mode, authorized: true, userId: null, manufacturer: me, reason: null };
  }
  const c = await createClient();
  if (!c) return { mode, authorized: false, userId: null, manufacturer: null, reason: "Supabase client could not be created." };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { mode, authorized: false, userId: null, manufacturer: null, reason: "You are not signed in." };
  const { data: prof, error } = await c.from("user_profiles").select("role, manufacturer_id").eq("user_id", user.id).maybeSingle();
  if (error) return { mode, authorized: false, userId: user.id, manufacturer: null, reason: `Could not read your profile: ${error.message}` };
  const mid = (prof?.manufacturer_id as string | null) ?? null;
  if (!mid) return { mode, authorized: false, userId: user.id, manufacturer: null, reason: "Your account is not linked to a manufacturer." };
  const { data: m } = await c.from("manufacturers").select("*").eq("id", mid).maybeSingle();
  if (!m) return { mode, authorized: false, userId: user.id, manufacturer: null, reason: "The manufacturer linked to your account no longer exists." };
  return { mode, authorized: true, userId: user.id, manufacturer: m as Manufacturer, reason: null };
}
