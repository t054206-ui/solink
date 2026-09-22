import type { Product, SpecValue } from "@/lib/types";

/**
 * A panel's degradation as its manufacturer warrants it.
 *
 * The platform has no default degradation rate and will not invent one
 * (EXPECTED_PANEL_DEGRADATION_RATE). What it does have, for panels imported
 * from a datasheet, is the performance warranty's own curve: a first-year
 * allowance and a linear annual loss after that. The LONGi Hi-MO 7 rows carry
 * both under `specs.additional`. When a page knows which panel is involved,
 * that figure is the right one, and it is source data, not an estimate.
 */
export interface WarrantyDegradation {
  /** Fraction lost per year after year one, e.g. 0.004 for 0.4 %/year. */
  annualFraction: number;
  /** Fraction allowed in the first year, e.g. 0.01, when the datasheet states it. */
  firstYearFraction: number | null;
  /** Guaranteed output at the end of the performance warranty, as a fraction, when stated. */
  endOfWarrantyFraction: number | null;
  warrantyYears: number | null;
  source: string;
}

const ANNUAL_KEYS = ["annual_degradation_year_2_30_pct", "annual_degradation_year_2_25_pct", "annual_degradation_pct"];
const FIRST_YEAR_KEYS = ["first_year_degradation_pct"];

function num(v: SpecValue<string | number> | undefined): number | null {
  if (!v || v.value === null || v.value === undefined) return null;
  const n = typeof v.value === "number" ? v.value : Number(v.value);
  return Number.isFinite(n) ? n : null;
}

export function warrantyDegradation(specs: Product["specs"] | null | undefined, manufacturer?: string | null): WarrantyDegradation | null {
  if (!specs) return null;
  const extra = specs.additional ?? {};
  const annualPct = ANNUAL_KEYS.map((k) => num(extra[k])).find((n): n is number => n !== null);
  if (annualPct === undefined || annualPct <= 0) return null;
  const firstPct = FIRST_YEAR_KEYS.map((k) => num(extra[k])).find((n): n is number => n !== null) ?? null;
  const endPct = num(specs.performance_warranty_end_pct as SpecValue<string | number> | undefined);
  const years = num(specs.performance_warranty_years as SpecValue<string | number> | undefined);
  return {
    annualFraction: annualPct / 100,
    firstYearFraction: firstPct === null ? null : firstPct / 100,
    endOfWarrantyFraction: endPct === null ? null : endPct / 100,
    warrantyYears: years,
    source: `${manufacturer ? manufacturer + " " : ""}performance warranty (manufacturer datasheet): ${annualPct} %/year${firstPct !== null ? ` after ${firstPct} % in year one` : ""}${endPct !== null && years !== null ? `, ${endPct} % guaranteed at year ${years}` : ""}`,
  };
}
