/**
 * Pure helpers for manufacturer companies. No data is invented here: every
 * label for a missing or unverified value says exactly that.
 */
import type { Manufacturer, ManufacturerSourceType } from "@/lib/types";

export const SOURCE_TYPE_LABEL: Record<ManufacturerSourceType, string> = {
  official_manufacturer_website: "Official manufacturer website",
  official_manufacturer_datasheet: "Official manufacturer datasheet",
  official_manufacturer_documentation: "Official manufacturer documentation",
  other_verified_source: "Other verified source",
};
export const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABEL) as ManufacturerSourceType[];

/** The claims a source row can be attached to. */
export const SOURCE_FIELD_LABEL: Record<string, string> = {
  company: "The company as a whole",
  website: "Official website",
  legal_name: "Legal name",
  headquarters: "Headquarters",
  kuwait_availability: "Kuwait availability",
  gcc_availability: "GCC availability",
  logo: "Logo",
  description: "Description",
};

/** The one classification Solink uses today; kept as a list so more can follow. */
export const MANUFACTURER_TYPES = ["Solar Panel Manufacturer", "Inverter Manufacturer", "Battery Manufacturer", "Mounting System Manufacturer"] as const;
export const MARKET_REGIONS = ["Kuwait", "GCC"] as const;

export type AvailabilityState = "available" | "not_available" | "not_verified";

export function availabilityState(v: boolean | null | undefined): AvailabilityState {
  return v === true ? "available" : v === false ? "not_available" : "not_verified";
}

export const AVAILABILITY_LABEL: Record<AvailabilityState, { kuwait: string; gcc: string; tone: "good" | "neutral" | "warn" }> = {
  available: { kuwait: "Available in Kuwait", gcc: "Available in the GCC", tone: "good" },
  not_available: { kuwait: "Not available in Kuwait", gcc: "Not available in the GCC", tone: "neutral" },
  not_verified: { kuwait: "Kuwait: not yet verified", gcc: "GCC: not yet verified", tone: "warn" },
};

/** Same rule as the database's slugify(): lower-case, non-alphanumerics to one hyphen. */
export function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Initials for the logo fallback: up to two letters, never a made-up image. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

/** "City, Country", "Country", or null when neither is recorded. */
export function headquartersText(m: Pick<Manufacturer, "headquarters_city" | "headquarters_country">): string | null {
  const parts = [m.headquarters_city, m.headquarters_country].filter((v): v is string => Boolean(v && v.trim()));
  return parts.length ? parts.join(", ") : null;
}

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/** Public profile path for a manufacturer. */
export function manufacturerHref(m: Pick<Manufacturer, "slug">): string {
  return `/marketplace/manufacturers/${encodeURIComponent(m.slug)}`;
}
export function adminManufacturerHref(m: Pick<Manufacturer, "id">): string {
  return `/admin/manufacturers/${m.id}`;
}
