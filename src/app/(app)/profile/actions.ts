"use server";
import { friendlyDbError } from "@/lib/api/errors";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";
import type { SolarProfile } from "@/lib/types";

/**
 * Solar Profile server actions.
 * Supabase mode: upsert into solar_profiles for the signed-in user (RLS: user_id = auth.uid()).
 * Demo mode: returns { ok: false, reason: "demo" } and the client persists to local storage instead.
 */

const numOrNull = z.number().finite().nullable().optional();
const ProfileInput = z.object({
  address: z.string().max(300).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  country_code: z.string().length(2).optional(),
  governorate: z.string().max(120).nullable().optional(),
  house_type: z.enum(["villa", "apartment_building", "townhouse", "commercial", "other"]).nullable().optional(),
  tariff_category: z.enum(["residential", "investment_commercial", "industrial_agricultural", "productive_industrial_agricultural", "governmental", "other"]).nullable().optional(),
  roof_length_m: numOrNull, roof_width_m: numOrNull, roof_area_m2: numOrNull, available_roof_area_m2: numOrNull,
  roof_orientation: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "flat", "unknown"]).nullable().optional(),
  roof_tilt_deg: z.number().min(0).max(90).nullable().optional(),
  shading_notes: z.string().max(2000).nullable().optional(),
  monthly_consumption_kwh: numOrNull, monthly_bill: numOrNull,
  currency: z.string().length(3).optional(),
  budget: numOrNull,
  roof_photo_path: z.string().max(500).nullable().optional(),
});
export type ProfileInputT = z.infer<typeof ProfileInput>;

export type SaveProfileResult =
  | { ok: true; profile: SolarProfile }
  | { ok: false; reason: "demo" | "unauthenticated" | "invalid" | "error"; message: string };

export async function saveProfile(raw: unknown): Promise<SaveProfileResult> {
  const parsed = ProfileInput.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  if (getDataMode() === "demo") return { ok: false, reason: "demo", message: "Supabase is not connected; saving on this device only." };
  const c = await createClient();
  if (!c) return { ok: false, reason: "demo", message: "Supabase is not connected; saving on this device only." };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to save your profile." };
  const row = { ...parsed.data, user_id: user.id, country_code: parsed.data.country_code ?? "KW", currency: parsed.data.currency ?? "KWD" };
  const { data, error } = await c.from("solar_profiles").upsert(row, { onConflict: "user_id" }).select("*").single();
  if (error) return { ok: false, reason: "error", message: friendlyDbError(error) };
  return { ok: true, profile: data as SolarProfile };
}

export type UploadPhotoResult =
  | { ok: true; path: string; signedUrl: string | null }
  | { ok: false; reason: "demo" | "unauthenticated" | "invalid" | "error"; message: string };

const MAX_BYTES = 8 * 1024 * 1024;

/** Upload a roof photo to storage bucket roof-photos/<userId>/… (RLS: own folder only). */
export async function uploadRoofPhoto(formData: FormData): Promise<UploadPhotoResult> {
  if (getDataMode() === "demo") return { ok: false, reason: "demo", message: "Photo storage requires Supabase. Preview only." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, reason: "invalid", message: "No file received." };
  if (!file.type.startsWith("image/")) return { ok: false, reason: "invalid", message: "Only image files are accepted." };
  if (file.size > MAX_BYTES) return { ok: false, reason: "invalid", message: "Image must be 8 MB or smaller." };
  const c = await createClient();
  if (!c) return { ok: false, reason: "demo", message: "Photo storage requires Supabase. Preview only." };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to upload a photo." };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error } = await c.storage.from("roof-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, reason: "error", message: friendlyDbError(error) };
  const { data: signed } = await c.storage.from("roof-photos").createSignedUrl(path, 60 * 60);
  return { ok: true, path, signedUrl: signed?.signedUrl ?? null };
}
