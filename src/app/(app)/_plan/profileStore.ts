import type { SolarProfile } from "@/lib/types";

/**
 * Shared helpers for the Plan phase (Profile → Potential → Calculator).
 *
 * In demo mode the profile a user edits lives in the browser under the
 * `profile` local-store key. Server components still read the labeled demo
 * profile via repositories; client components merge the two so every Plan
 * page sees the same picture.
 */
export const PROFILE_STORE_KEY = "profile";

/** Fields a user can edit. `id`, `user_id`, `updated_at` are managed by the store. */
export type ProfileDraft = Partial<Omit<SolarProfile, "id" | "user_id" | "updated_at">>;

export function mergeProfile(server: SolarProfile | null, local: ProfileDraft | null): SolarProfile | null {
  if (!server && !local) return null;
  const base: SolarProfile = server ?? {
    id: "local", user_id: "local", country_code: "KW", currency: "KWD", updated_at: new Date(0).toISOString(),
  };
  if (!local) return base;
  return { ...base, ...local };
}

/** Roof area from explicit value or length × width. Returns the value and how it was derived. */
export function resolveRoofArea(p: Pick<SolarProfile, "roof_area_m2" | "roof_length_m" | "roof_width_m"> | null | undefined): { value: number | null; derived: boolean } {
  if (!p) return { value: null, derived: false };
  if (typeof p.roof_area_m2 === "number" && Number.isFinite(p.roof_area_m2) && p.roof_area_m2 > 0) return { value: p.roof_area_m2, derived: false };
  if (typeof p.roof_length_m === "number" && typeof p.roof_width_m === "number" && p.roof_length_m > 0 && p.roof_width_m > 0) {
    return { value: Math.round(p.roof_length_m * p.roof_width_m * 100) / 100, derived: true };
  }
  return { value: null, derived: false };
}

export interface CompletenessItem { key: string; label: string; required: boolean; done: boolean; weight: number }
export interface Completeness { pct: number; items: CompletenessItem[]; missingRequired: CompletenessItem[]; missingOptional: CompletenessItem[]; readyForAnalysis: boolean }

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Only the fields that the Solar Potential analysis truly needs are required:
 * electricity use (kWh or bill) and a roof area. Everything else improves the
 * analysis but is optional.
 */
export function profileCompleteness(p: SolarProfile | null): Completeness {
  const roof = resolveRoofArea(p);
  const items: CompletenessItem[] = [
    { key: "consumption", label: "Monthly electricity use (kWh) or monthly bill", required: true, weight: 25, done: Boolean(p && (num(p.monthly_consumption_kwh) || num(p.monthly_bill))) },
    { key: "roof_area", label: "Roof area (or roof length and width)", required: true, weight: 20, done: roof.value !== null },
    { key: "available_area", label: "Available roof area for panels", required: false, weight: 15, done: Boolean(p && num(p.available_roof_area_m2)) },
    { key: "location", label: "Address or map coordinates", required: false, weight: 15, done: Boolean(p && ((p.address && p.address.trim().length > 0) || (num(p.lat) && num(p.lng)))) },
    { key: "orientation", label: "Roof orientation", required: false, weight: 10, done: Boolean(p && p.roof_orientation && p.roof_orientation !== "unknown") },
    { key: "tilt", label: "Roof tilt", required: false, weight: 5, done: Boolean(p && num(p.roof_tilt_deg)) },
    { key: "house_type", label: "House type", required: false, weight: 5, done: Boolean(p && p.house_type) },
    { key: "budget", label: "Budget", required: false, weight: 5, done: Boolean(p && num(p.budget)) },
  ];
  const pct = Math.round(items.reduce((s, i) => s + (i.done ? i.weight : 0), 0));
  const missingRequired = items.filter((i) => i.required && !i.done);
  const missingOptional = items.filter((i) => !i.required && !i.done);
  return { pct, items, missingRequired, missingOptional, readyForAnalysis: missingRequired.length === 0 };
}
