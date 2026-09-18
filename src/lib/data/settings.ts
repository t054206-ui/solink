import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "./mode";
import type { SolarAssumptions } from "@/lib/solar/calculations";

/**
 * Platform-wide assumptions set by an admin (platform_settings table).
 * NULL = not provided → the UI shows the matching [PLACEHOLDER] and lets the
 * user type their own value, labeled as user-provided.
 */
export interface PlatformSettings {
  electricity_tariff_per_kwh: { value: number; source: string } | null;
  peak_sun_hours_per_day: { value: number; source: string } | null;
  performance_ratio: { value: number; source: string } | null;
  grid_co2_kg_per_kwh: { value: number; source: string } | null;
  expected_panel_degradation_rate: { value: number; source: string } | null;
  tco_period_years: { value: number; source: string } | null;
  production_alert_thresholds: { warn_pct: number; alert_pct: number; source: string } | null;
  end_of_life_criteria: Record<string, unknown> | null;
}

const EMPTY: PlatformSettings = {
  electricity_tariff_per_kwh: null, peak_sun_hours_per_day: null, performance_ratio: null, grid_co2_kg_per_kwh: null,
  expected_panel_degradation_rate: null, tco_period_years: null, production_alert_thresholds: null, end_of_life_criteria: null,
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (getDataMode() === "demo") return EMPTY;
  const c = await createClient();
  if (!c) return EMPTY;
  const { data } = await c.from("platform_settings").select("key,value,source");
  const out: PlatformSettings = { ...EMPTY };
  for (const row of data ?? []) {
    if (row.value === null || !(row.key in out)) continue;
    // value stored as {"value": n} or raw object; attach source
    const v = typeof row.value === "object" && row.value !== null && "value" in row.value ? (row.value as { value: number }).value : row.value;
    (out as Record<string, unknown>)[row.key] = typeof v === "number" ? { value: v, source: row.source ?? "platform setting" } : { ...(row.value as object), source: row.source ?? "platform setting" };
  }
  return out;
}

export function settingsToAssumptions(s: PlatformSettings): SolarAssumptions {
  return {
    tariffPerKwh: s.electricity_tariff_per_kwh?.value ?? null,
    peakSunHoursPerDay: s.peak_sun_hours_per_day?.value ?? null,
    performanceRatio: s.performance_ratio?.value ?? null,
    gridCo2KgPerKwh: s.grid_co2_kg_per_kwh?.value ?? null,
    annualDegradation: s.expected_panel_degradation_rate?.value ?? null,
    horizonYears: s.tco_period_years?.value ?? null,
    currency: "KWD",
  };
}
