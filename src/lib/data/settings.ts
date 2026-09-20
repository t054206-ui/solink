import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "./mode";
import type { SolarAssumptions } from "@/lib/solar/calculations";
import { tariffFor, type TariffSetting } from "@/lib/solar/tariff";
import type { TariffCategory } from "@/lib/types";

/**
 * Platform-wide assumptions set by an admin (platform_settings table).
 * NULL = not provided → the UI shows the matching [PLACEHOLDER] and lets the
 * user type their own value, labeled as user-provided.
 */
export interface PlatformSettings {
  /** Headline rate plus, when entered, per-sector rates. See `src/lib/solar/tariff.ts`. */
  electricity_tariff_per_kwh: TariffSetting | null;
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
    // value stored as {"value": n, ...extras} or a raw object; attach the source.
    // The extras (unit, category, by_category, year, basis) ride along so a
    // setting can say more than one number without a schema change.
    const isObj = typeof row.value === "object" && row.value !== null;
    const v = isObj && "value" in (row.value as object) ? (row.value as { value: unknown }).value : row.value;
    const source = row.source ?? "platform setting";
    (out as unknown as Record<string, unknown>)[row.key] = typeof v === "number"
      ? { ...(isObj ? (row.value as object) : {}), value: v, source }
      : { ...(row.value as object), source };
  }
  return out;
}

/**
 * Platform settings as calculator inputs. Pass the profile's tariff category
 * when there is a profile: the tariff then follows the sector the property is
 * billed under, and is null (not the Residential rate) when the platform has
 * no rate for that sector.
 */
export function settingsToAssumptions(s: PlatformSettings, tariffCategory: TariffCategory | null | undefined = undefined): SolarAssumptions {
  return {
    tariffPerKwh: tariffFor(s.electricity_tariff_per_kwh, tariffCategory).platform?.value ?? null,
    peakSunHoursPerDay: s.peak_sun_hours_per_day?.value ?? null,
    performanceRatio: s.performance_ratio?.value ?? null,
    gridCo2KgPerKwh: s.grid_co2_kg_per_kwh?.value ?? null,
    annualDegradation: s.expected_panel_degradation_rate?.value ?? null,
    horizonYears: s.tco_period_years?.value ?? null,
    currency: "KWD",
  };
}
