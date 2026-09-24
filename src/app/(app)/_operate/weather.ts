/**
 * Serialisable weather state shared by server pages and client components.
 * The only provider is WeatherAPI.com (via src/lib/weather/weatherapi.ts and
 * /api/weather). When it is not configured, the UI renders the unavailable
 * state — no fallback provider and no fabricated conditions.
 */
import type { WeatherSnapshot } from "@/lib/types";
import type { ForecastDay, WeatherBundle } from "@/lib/weather/weatherapi";

export type { ForecastDay, WeatherBundle };
export type { WeatherSnapshot };

export const WEATHER_SOURCE = "WeatherAPI.com";

export type WeatherState =
  | { status: "no_location" }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string }
  | { status: "ok"; bundle: WeatherBundle; fetched_at: string };

/** US EPA index (1–6) as published by WeatherAPI.com. Descriptive only. */
export function epaIndexLabel(i: number | null): string {
  if (i === null) return "Not reported";
  return ["", "Good", "Moderate", "Unhealthy for sensitive groups", "Unhealthy", "Very unhealthy", "Hazardous"][i] ?? `Index ${i}`;
}

export function fmtNum(v: number | null | undefined, digits = 0, unit = ""): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("en-US", { maximumFractionDigits: digits })}${unit}`;
}
