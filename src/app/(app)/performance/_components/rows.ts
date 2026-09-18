/**
 * Pure helpers for Long-term performance.
 *
 * Only aggregation and provenance bookkeeping live here: no tariff, emission
 * factor, degradation rate or analysis period is assumed. Anything that needs
 * one of those is returned as `unavailable` with the placeholder as the reason.
 */
import { type Classified, type DataClass, unavailable } from "@/lib/classification";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import { yearOverYearChange } from "@/lib/solar/calculations";
import type { Incident, MaintenanceCase, MaintenanceKind, ProductionRecord, SpecValue } from "@/lib/types";
import { inheritCls, specificYield } from "../../_operate/production";
import { yearlyTotals } from "../../_ops/production";

export interface YearRow {
  year: number;
  /** Total recorded kWh for the calendar year. */
  kwh: number;
  /** Distinct days with a record. */
  days: number;
  /** A year is complete only with at least 360 daily records. */
  complete: boolean;
  /** Change vs the previous year in the series (calculated, no judgement). */
  changePct: number | null;
  /** True only when this year AND the previous one are complete — partial years are never compared. */
  comparable: boolean;
  /** kWh per kWp for that year; unavailable without capacity or a full year of records. */
  yieldPerKwp: Classified;
  incidents: number;
  maintenance: number;
  repairs: number;
}

export const REPAIR_KINDS: MaintenanceKind[] = ["repair", "minor_maintenance", "replacement"];
export const UPKEEP_KINDS: MaintenanceKind[] = ["inspection", "annual_maintenance"];

const utcYear = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
};

const caseDate = (c: MaintenanceCase): string => c.appointment_at ?? c.created_at;

/** One row per calendar year covered by the production records. */
export function buildYearRows(
  records: ProductionRecord[],
  incidents: Incident[],
  cases: MaintenanceCase[],
  capacityKwp: number | null,
): YearRow[] {
  const totals = yearlyTotals(records);
  const changes = yearOverYearChange(totals.map((t) => ({ year: t.year, kwh: t.kwh })));
  return totals.map((t, i) => {
    const prev = totals[i - 1];
    const ofYear = records.filter((r) => utcYear(r.period_start) === t.year);
    const casesOfYear = cases.filter((c) => utcYear(caseDate(c)) === t.year);
    return {
      year: t.year,
      kwh: t.kwh,
      days: t.days,
      complete: t.complete,
      changePct: changes[i]?.changePct ?? null,
      comparable: Boolean(prev && prev.complete && t.complete),
      yieldPerKwp: specificYield(ofYear, capacityKwp),
      incidents: incidents.filter((x) => utcYear(x.occurred_at) === t.year).length,
      maintenance: casesOfYear.length,
      repairs: casesOfYear.filter((c) => REPAIR_KINDS.includes(c.kind)).length,
    };
  });
}

/** The first complete year in the series — the only fair baseline for a degradation curve. */
export function baselineYear(rows: YearRow[]): YearRow | null {
  return rows.find((r) => r.complete) ?? null;
}

export interface RecordedCost {
  /** Sum of the costs that were actually recorded, or null when none were. */
  total: number | null;
  recorded: number;
  missing: number;
}

/** Sums the costs a set of records carries. Records without a cost are counted, never zero-filled. */
export function sumRecordedCosts(items: { cost: SpecValue }[]): RecordedCost {
  const known = items.filter((x) => typeof x.cost?.value === "number");
  return { total: known.length ? known.reduce((s, x) => s + (x.cost.value as number), 0) : null, recorded: known.length, missing: items.length - known.length };
}

export interface PrefilledCost {
  value: number | null;
  source: string | null;
  notes: string[];
}

/** A total cost that was recorded against the system (source-derived), or nothing. */
export function recordedTotal(label: string, c: RecordedCost): PrefilledCost {
  if (c.total === null) {
    return { value: null, source: null, notes: [c.recorded + c.missing === 0 ? `No ${label} are recorded for this system.` : `${c.missing} recorded ${label} carry no cost: ${PLACEHOLDERS.MAINTENANCE_PRICE}`] };
  }
  return {
    value: Math.round(c.total * 1000) / 1000,
    source: `Sum of ${c.recorded} recorded ${label}`,
    notes: c.missing > 0 ? [`${c.missing} further ${label} have no cost recorded: ${PLACEHOLDERS.MAINTENANCE_PRICE}`] : [],
  };
}

/**
 * A per-year figure derived from recorded costs over the period the system has
 * existed. Returned only when the system is at least a year old, so a few
 * months of records are never presented as an annual cost.
 */
export function perYearFromRecords(label: string, c: RecordedCost, ageYearsValue: number | null): PrefilledCost {
  if (c.total === null) return recordedTotal(label, c);
  if (ageYearsValue === null || !Number.isFinite(ageYearsValue)) return { value: null, source: null, notes: ["The installation date is not recorded, so recorded costs cannot be spread over a year."] };
  if (ageYearsValue < 1) return { value: null, source: null, notes: [`The system is less than a year old (${ageYearsValue.toFixed(1)} years), so recorded ${label} are not turned into an annual figure.`] };
  return {
    value: Math.round((c.total / ageYearsValue) * 1000) / 1000,
    source: `Recorded ${label} ÷ system age`,
    notes: [`${c.total} over ${ageYearsValue.toFixed(1)} years of operation`, ...(c.missing > 0 ? [`${c.missing} record(s) without a cost are excluded: ${PLACEHOLDERS.MAINTENANCE_PRICE}`] : [])],
  };
}

/** Year-1 production used as the baseline for lifetime figures. Demo series stay labelled demo. */
export function yearOneProduction(rows: YearRow[], cls: DataClass): Classified {
  const base = baselineYear(rows);
  if (!base) return unavailable("A complete calendar year of production records is required as the year-1 baseline.");
  return inheritCls({ value: base.kwh, cls: "calculated", source: "Solink calculator", notes: [`${base.year} total from ${base.days} daily records`] }, cls);
}
