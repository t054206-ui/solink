/**
 * Pure helpers over ProductionRecord[] and dates for the operations features.
 * No physical constants or assumptions live here — only aggregation and
 * calendar arithmetic. Results are CALCULATED from whatever the records are
 * (source or demo); callers must carry the input classification forward.
 */
import type { DataClass } from "@/lib/classification";
import type { ProductionRecord } from "@/lib/types";

const DAY_MS = 86_400_000;

export function toDay(iso: string): string { return iso.slice(0, 10); }
export function toMonth(iso: string): string { return iso.slice(0, 7); }

/** Data class of a series: demo if any record is demo, unavailable if empty, otherwise the (first) record class. */
export function seriesClass(records: ProductionRecord[]): DataClass {
  if (records.length === 0) return "unavailable";
  if (records.some((r) => r.cls === "demo")) return "demo";
  return records[0].cls;
}

export function sumKwh(records: ProductionRecord[]): number {
  return Math.round(records.reduce((s, r) => s + r.energy_kwh, 0) * 10) / 10;
}

/** Records whose period_start falls within [from, to). */
export function inRange(records: ProductionRecord[], from: Date, to: Date): ProductionRecord[] {
  const a = from.getTime(), b = to.getTime();
  return records.filter((r) => { const t = new Date(r.period_start).getTime(); return t >= a && t < b; });
}

/** Mean daily energy over the last `days` days ending `endOffsetDays` days before today. Null if fewer than 3 records. */
export function meanDaily(records: ProductionRecord[], days: number, endOffsetDays = 0): { mean: number | null; count: number } {
  const now = new Date(); now.setUTCHours(0, 0, 0, 0);
  const end = new Date(now.getTime() - endOffsetDays * DAY_MS);
  const start = new Date(end.getTime() - days * DAY_MS);
  const rs = inRange(records.filter((r) => r.granularity === "day"), start, end);
  if (rs.length < 3) return { mean: null, count: rs.length };
  return { mean: sumKwh(rs) / rs.length, count: rs.length };
}

export function recordsForMonth(records: ProductionRecord[], month: string): ProductionRecord[] {
  return records.filter((r) => toMonth(r.period_start) === month);
}

/** Daily breakdown for a month, one entry per record day. */
export function dailyBreakdown(records: ProductionRecord[], month: string): { day: string; kwh: number }[] {
  const byDay = new Map<string, number>();
  for (const r of recordsForMonth(records, month)) byDay.set(toDay(r.period_start), (byDay.get(toDay(r.period_start)) ?? 0) + r.energy_kwh);
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, kwh]) => ({ day, kwh: Math.round(kwh * 10) / 10 }));
}

/** Months (YYYY-MM) covered by the records, newest first. */
export function monthsCovered(records: ProductionRecord[]): string[] {
  return [...new Set(records.map((r) => toMonth(r.period_start)))].sort().reverse();
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export interface YearTotal { year: number; kwh: number; days: number; complete: boolean }

/**
 * Yearly totals. A year is "complete" only if it has at least 360 daily
 * records — partial years are flagged so they are never compared as if whole.
 */
export function yearlyTotals(records: ProductionRecord[]): YearTotal[] {
  const byYear = new Map<number, { kwh: number; days: Set<string> }>();
  for (const r of records) {
    const y = new Date(r.period_start).getUTCFullYear();
    const e = byYear.get(y) ?? { kwh: 0, days: new Set<string>() };
    e.kwh += r.energy_kwh; e.days.add(toDay(r.period_start)); byYear.set(y, e);
  }
  return [...byYear.entries()].sort(([a], [b]) => a - b).map(([year, e]) => ({ year, kwh: Math.round(e.kwh * 10) / 10, days: e.days.size, complete: e.days.size >= 360 }));
}

/** Whole years between an ISO date and now (fractional). */
export function ageYears(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return null;
  return (now.getTime() - d.getTime()) / (365.25 * DAY_MS);
}

/** ISO date `years` after `iso`. */
export function addYears(iso: string | null | undefined, years: number | null | undefined): string | null {
  if (!iso || years === null || years === undefined || !Number.isFinite(years)) return null;
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return null;
  d.setUTCFullYear(d.getUTCFullYear() + Math.floor(years));
  d.setUTCMonth(d.getUTCMonth() + Math.round((years % 1) * 12));
  return d.toISOString();
}

export function yearOf(iso: string | null | undefined): number | null {
  if (!iso) return null; const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

export function fmtKwh(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("en-US", { maximumFractionDigits: digits })} kWh`;
}

export function fmtPct(v: number | null | undefined, digits = 1, signed = true): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  return `${signed && v > 0 ? "+" : ""}${s}%`;
}
