import type { PlatformSettings } from "@/lib/data/settings";
import { tariffFor, TARIFF_CATEGORY_LABELS, sectorOf } from "@/lib/solar/tariff";
import type { TariffCategory } from "@/lib/types";

/*
 * The platform values that already exist, in words a homeowner can read
 * (owner, 2026-09-24: "If a value exists, DISPLAY IT"). Every function returns
 * null when the setting is missing; nothing here supplies a default.
 */

const n = (v: number, d = 3) => v.toLocaleString("en-US", { maximumFractionDigits: d });

/** The rate a homeowner's savings use, e.g. "0.002 KWD/kWh (Residential)". */
export function tariffFact(s: PlatformSettings, category?: TariffCategory | null): { text: string; source: string } | null {
  const t = tariffFor(s.electricity_tariff_per_kwh, category);
  if (!t.platform) return null;
  const setting = s.electricity_tariff_per_kwh;
  const sector = category ?? (setting ? sectorOf(setting) : null);
  return { text: `${n(t.platform.value, 4)} KWD/kWh${sector ? ` (${TARIFF_CATEGORY_LABELS[sector]})` : ""}`, source: t.platform.source };
}

/** e.g. "0.7 kg CO₂ per kWh". */
export function co2Fact(s: PlatformSettings): { text: string; source: string } | null {
  const c = s.grid_co2_kg_per_kwh;
  return c ? { text: `${n(c.value)} kg CO₂ per kWh`, source: c.source } : null;
}

/** e.g. "Watch below −10 %, inspect below −20 %". */
export function thresholdsFact(s: PlatformSettings): { text: string; source: string } | null {
  const t = s.production_alert_thresholds;
  return t ? { text: `Watch below −${Math.abs(t.warn_pct)} %, inspect below −${Math.abs(t.alert_pct)} % (7-day vs 30-day mean)`, source: t.source } : null;
}

/** The end-of-life criteria as readable lines, from the stored JSON. Unknown keys are ignored, not guessed at. */
export function endOfLifeFacts(s: PlatformSettings): { lines: string[]; rule: string | null; source: string } | null {
  const c = s.end_of_life_criteria as (Record<string, unknown> & { source?: string }) | null;
  if (!c) return null;
  const lines: string[] = [];
  const num = (k: string) => (typeof c[k] === "number" ? (c[k] as number) : null);
  const min = num("min_output_pct_of_nameplate");
  if (min !== null) lines.push(`Output below ${min} % of nameplate${typeof c.output_window === "string" ? ` over a ${c.output_window}` : ""}.`);
  if (Array.isArray(c.safety_defects) && c.safety_defects.length) lines.push(`A safety defect on inspection: ${(c.safety_defects as unknown[]).filter((x) => typeof x === "string").join(", ")}.`);
  const repair = num("repair_cost_over_replacement_pct");
  if (repair !== null) lines.push(`A repair quoted above ${repair} % of the cost of replacement.`);
  if (c.warranty_expired_and_fault === true) lines.push("The product warranty has expired and there is a fault.");
  if (!lines.length) return null;
  return { lines, rule: c.rule === "any one criterion" ? "Any one of these is enough." : typeof c.rule === "string" ? c.rule : null, source: typeof c.source === "string" ? c.source : "Platform setting" };
}
