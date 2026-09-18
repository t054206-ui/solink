/**
 * Provider service catalogue (price + availability per maintenance kind).
 *
 * Prices are SpecValue: until a provider enters a real figure the price stays
 * { value: null, status: "unavailable" } and the UI shows
 * [PLACEHOLDER: MAINTENANCE PRICE]. Nothing here ever assumes a number.
 *
 * Supabase mode stores a row per service in provider_prices (RLS: the
 * provider's own company). That table has no availability columns, so the
 * weekday/time window is written into provider_prices.notes in the readable
 * format below and parsed back for the editor.
 */
import type { MaintenanceKind, SpecValue } from "@/lib/types";

/** Local-storage key used in demo mode (see useLocalStore). */
export const PROVIDER_SERVICES_KEY = "provider_services";

export interface Availability {
  /** 0 = Sunday … 6 = Saturday. Empty = no days recorded. */
  days: number[];
  /** "HH:MM" or "" when not recorded. */
  from: string;
  to: string;
}

export interface ServiceEntry {
  price: SpecValue;
  availability: Availability;
  updated_at: string | null;
}

export type ServiceMap = Partial<Record<MaintenanceKind, ServiceEntry>>;

export const EMPTY_AVAILABILITY: Availability = { days: [], from: "", to: "" };
export const UNAVAILABLE_PRICE: SpecValue = { value: null, status: "unavailable" };

export const WEEKDAYS = [
  { index: 0, short: "Sun", label: "Sunday" },
  { index: 1, short: "Mon", label: "Monday" },
  { index: 2, short: "Tue", label: "Tuesday" },
  { index: 3, short: "Wed", label: "Wednesday" },
  { index: 4, short: "Thu", label: "Thursday" },
  { index: 5, short: "Fri", label: "Friday" },
  { index: 6, short: "Sat", label: "Saturday" },
] as const;

const PREFIX = "Availability:";

/** "Availability: Sun,Mon,Tue 08:00-16:00" — empty string when nothing is recorded. */
export function formatAvailability(a: Availability): string {
  const days = [...a.days].sort((x, y) => x - y).map((d) => WEEKDAYS[d]?.short).filter(Boolean).join(",");
  const window = a.from && a.to ? `${a.from}-${a.to}` : "";
  if (!days && !window) return "";
  return [PREFIX, days || "no days recorded", window].filter(Boolean).join(" ");
}

/** Reads back the format above. Anything else yields an empty availability. */
export function parseAvailability(notes: string | null | undefined): Availability {
  if (!notes || !notes.startsWith(PREFIX)) return EMPTY_AVAILABILITY;
  const rest = notes.slice(PREFIX.length).trim();
  const window = /(\d{2}:\d{2})-(\d{2}:\d{2})/.exec(rest);
  const dayPart = rest.replace(/\s*\d{2}:\d{2}-\d{2}:\d{2}\s*/, "").trim();
  const days = dayPart
    .split(",")
    .map((s) => WEEKDAYS.findIndex((w) => w.short.toLowerCase() === s.trim().toLowerCase()))
    .filter((i) => i >= 0);
  return { days, from: window?.[1] ?? "", to: window?.[2] ?? "" };
}

/** Human summary for a read-only cell. */
export function availabilityText(a: Availability): string {
  const days = [...a.days].sort((x, y) => x - y).map((d) => WEEKDAYS[d]?.short).filter(Boolean).join(", ");
  if (!days && !(a.from && a.to)) return "Not recorded";
  if (!days) return `${a.from}–${a.to}, days not recorded`;
  if (!(a.from && a.to)) return `${days}, hours not recorded`;
  return `${days} · ${a.from}–${a.to}`;
}

/** A provider_prices row as read by the services page. */
export interface ProviderPriceRow {
  id: string;
  service: MaintenanceKind;
  price: SpecValue;
  currency: string;
  notes: string | null;
  updated_at: string | null;
}

export function rowsToServiceMap(rows: ProviderPriceRow[]): ServiceMap {
  const out: ServiceMap = {};
  for (const r of rows) {
    out[r.service] = {
      price: r.price && typeof r.price === "object" ? r.price : UNAVAILABLE_PRICE,
      availability: parseAvailability(r.notes),
      updated_at: r.updated_at,
    };
  }
  return out;
}
