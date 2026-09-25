/**
 * Pure helpers shared by Dashboard, Monitoring and Passport pages.
 * Everything here is deterministic arithmetic on ProductionRecord arrays.
 * When the input records are DEMO, every output is re-labelled DEMO so no
 * simulated number can ever appear as "calculated from real data".
 */
import { type Classified, type DataClass, unavailable } from "@/lib/classification";
import type { PlatformSettings } from "@/lib/data/settings";
import { productionDeviation } from "@/lib/solar/calculations";
import type { MaintenanceCase, MonitorStatus, ProductionRecord } from "@/lib/types";

export interface DayPoint { date: string; kwh: number }
export interface BucketPoint { label: string; value: number | null }

const DEMO_NOTE = "Computed from SIMULATED PRODUCTION: NOT REAL.";

/** Data class of a production series: demo if any record is demo, else source. */
export function productionCls(records: ProductionRecord[]): DataClass {
  if (records.length === 0) return "unavailable";
  return records.some((r) => r.cls === "demo") ? "demo" : "source";
}

/** Re-label a derived value so demo inputs always produce demo outputs. */
export function inheritCls<T>(c: Classified<T>, inputCls: DataClass): Classified<T> {
  if (c.value === null || c.value === undefined) return c;
  if (inputCls === "demo") return { ...c, cls: "demo", notes: [...(c.notes ?? []), DEMO_NOTE] };
  return c;
}

export function toDayPoints(records: ProductionRecord[]): DayPoint[] {
  return records
    .filter((r) => r.granularity === "day")
    .map((r) => ({ date: r.period_start.slice(0, 10), kwh: r.energy_kwh }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);

export function todayIso(): string { return new Date().toISOString().slice(0, 10); }

/** Energy recorded for today's date (UTC). */
export function todayKwh(records: ProductionRecord[]): Classified {
  const cls = productionCls(records);
  const today = todayIso();
  const rec = toDayPoints(records).find((p) => p.date === today);
  if (!rec) return unavailable("No record for today yet.");
  return inheritCls({ value: rec.kwh, cls: "source", source: records[0]?.source }, cls);
}

/** Energy recorded so far this calendar month (UTC). */
export function monthToDateKwh(records: ProductionRecord[]): Classified {
  const cls = productionCls(records);
  const ym = todayIso().slice(0, 7);
  const pts = toDayPoints(records).filter((p) => p.date.startsWith(ym));
  if (pts.length === 0) return unavailable("No records this month yet.");
  return inheritCls({ value: sum(pts.map((p) => p.kwh)), cls: "calculated", source: "Solink calculator", notes: [`Sum of ${pts.length} daily records`] }, cls);
}

/** Total over the trailing N days. */
export function trailingKwh(records: ProductionRecord[], days: number): Classified {
  const cls = productionCls(records);
  const pts = toDayPoints(records).slice(-days);
  if (pts.length === 0) return unavailable("No production records.");
  return inheritCls({ value: sum(pts.map((p) => p.kwh)), cls: "calculated", source: "Solink calculator", notes: [`Sum of ${pts.length} daily records`] }, cls);
}

export interface DeviationSignal {
  last7Mean: number | null;
  prev30Mean: number | null;
  deviation: Classified;
  /** Number of daily records actually used */
  used: { last7: number; prev30: number };
}

/** 7-day mean vs the preceding 30-day mean. Thresholds are NOT applied. */
/** Days of daily records the 7-vs-30 signal needs: the last 7 plus the 30 before them. */
export const SIGNAL_WINDOW_DAYS = 7 + 30;

export function sevenVsThirty(records: ProductionRecord[]): DeviationSignal {
  const cls = productionCls(records);
  const pts = toDayPoints(records);
  const last7 = pts.slice(-7).map((p) => p.kwh);
  const prev30 = pts.slice(-37, -7).map((p) => p.kwh);
  const l = mean(last7), p = mean(prev30);
  if (last7.length < 7 || prev30.length < 30) {
    return { last7Mean: l, prev30Mean: p, deviation: unavailable("At least 37 consecutive daily records are required."), used: { last7: last7.length, prev30: prev30.length } };
  }
  const d = inheritCls(productionDeviation(l, p), cls);
  return { last7Mean: l, prev30Mean: p, deviation: { ...d, notes: [...(d.notes ?? []), "actual = 7-day mean, expected = previous 30-day mean"] }, used: { last7: 7, prev30: 30 } };
}

/** Daily points for the last N days. */
export function lastDays(records: ProductionRecord[], n: number): DayPoint[] {
  return toDayPoints(records).slice(-n);
}

/** Weekly totals (ISO-week-agnostic: trailing 7-day blocks ending today) for the last N weeks. */
export function weeklyTotals(records: ProductionRecord[], weeks: number): BucketPoint[] {
  const pts = toDayPoints(records);
  const out: BucketPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = pts.length - w * 7;
    const start = end - 7;
    const slice = pts.slice(Math.max(0, start), Math.max(0, end));
    if (slice.length === 0) { out.push({ label: "", value: null }); continue; }
    out.push({ label: shortDate(slice[0].date), value: slice.length === 7 ? round1(sum(slice.map((p) => p.kwh))) : null });
  }
  return out;
}

/** Calendar-month totals for the last N months; months with incomplete data are still summed but flagged in the label. */
export function monthlyTotals(records: ProductionRecord[], months: number): BucketPoint[] {
  const pts = toDayPoints(records);
  const byMonth = new Map<string, number>();
  for (const p of pts) byMonth.set(p.date.slice(0, 7), (byMonth.get(p.date.slice(0, 7)) ?? 0) + p.kwh);
  const keys = [...byMonth.keys()].sort().slice(-months);
  return keys.map((k) => ({ label: monthLabel(k), value: round1(byMonth.get(k) ?? 0) }));
}

/** Calendar-year totals. */
export function yearlyTotals(records: ProductionRecord[]): BucketPoint[] {
  const pts = toDayPoints(records);
  const byYear = new Map<string, number>();
  for (const p of pts) byYear.set(p.date.slice(0, 4), (byYear.get(p.date.slice(0, 4)) ?? 0) + p.kwh);
  return [...byYear.keys()].sort().map((k) => ({ label: k, value: round1(byYear.get(k) ?? 0) }));
}

/** Specific yield over the trailing 365 days: kWh per kWp installed. */
export function specificYield(records: ProductionRecord[], capacityKwp: number | null): Classified {
  const cls = productionCls(records);
  const pts = toDayPoints(records).slice(-365);
  if (pts.length < 365) return unavailable(`A full year of daily records is required (${pts.length} available).`);
  if (capacityKwp === null || !Number.isFinite(capacityKwp) || capacityKwp <= 0) return unavailable("System capacity (kWp) is required.");
  const total = sum(pts.map((p) => p.kwh));
  return inheritCls({ value: total / capacityKwp, cls: "calculated", source: "Solink calculator", notes: [`${Math.round(total)} kWh over 365 days ÷ ${capacityKwp} kWp`] }, cls);
}

/* ---------------- status derivation ---------------- */

export const MONITOR_STATUS_LABEL: Record<MonitorStatus, string> = {
  normal: "Normal",
  monitor: "Monitor",
  inspection_recommended: "Inspection Recommended",
  maintenance_recommended: "Maintenance Recommended",
  insufficient_data: "Insufficient data",
};

export interface DerivedStatus {
  status: MonitorStatus;
  headline: string;
  lines: string[];
  thresholdsDefined: boolean;
  cls: DataClass;
}

/**
 * Deterministic status from the 7d-vs-30d deviation. Without platform-defined
 * thresholds the only honest status is "insufficient_data": a decline can be
 * described, but not judged.
 */
export function deriveStatus(signal: DeviationSignal, settings: PlatformSettings, records: ProductionRecord[]): DerivedStatus {
  const cls = productionCls(records);
  const dev = signal.deviation.value;
  const th = settings.production_alert_thresholds;
  if (dev === null) {
    return { status: "insufficient_data", headline: "Additional data is required.", lines: [signal.deviation.reason ?? "Not enough production history."], thresholdsDefined: Boolean(th), cls };
  }
  const pctText = `${dev >= 0 ? "+" : ""}${(dev * 100).toFixed(1)}% versus the previous 30-day mean`;
  if (!th) {
    return {
      status: "insufficient_data",
      headline: dev < 0 ? "Performance decline detected in the available data." : "No decline versus the previous 30 days in the available data.",
      lines: [`7-day mean is ${pctText}.`, "Whether this change is significant cannot be judged: production alert thresholds have not been defined."],
      thresholdsDefined: false, cls,
    };
  }
  const warn = -Math.abs(th.warn_pct) / 100, alert = -Math.abs(th.alert_pct) / 100;
  if (dev <= alert) return { status: "inspection_recommended", headline: "Performance decline detected. Inspection may be useful.", lines: [`7-day mean is ${pctText}.`, `Below the alert threshold (${th.alert_pct}%). Source: ${th.source}.`], thresholdsDefined: true, cls };
  if (dev <= warn) return { status: "monitor", headline: "Performance decline detected. Continue monitoring.", lines: [`7-day mean is ${pctText}.`, `Below the warning threshold (${th.warn_pct}%). Source: ${th.source}.`], thresholdsDefined: true, cls };
  return { status: "normal", headline: "Production is within the defined thresholds.", lines: [`7-day mean is ${pctText}.`], thresholdsDefined: true, cls };
}

/* ---------------- cleaning ---------------- */

export function lastCleaning(maintenance: MaintenanceCase[]): MaintenanceCase | null {
  const done = maintenance
    .filter((m) => m.kind === "cleaning" && (m.status === "resolved" || m.status === "closed"))
    .sort((a, b) => (b.appointment_at ?? b.updated_at).localeCompare(a.appointment_at ?? a.updated_at));
  return done[0] ?? null;
}

/** Before/after change of a maintenance record, when both values exist. */
export function cleaningEffectiveness(m: MaintenanceCase | null): Classified {
  if (!m) return unavailable("No completed cleaning record.");
  const b = m.production_before_kwh, a = m.production_after_kwh;
  if (b == null || a == null) return unavailable("Before/after production values were not recorded for the last cleaning.");
  const c = productionDeviation(a, b);
  const out: Classified = { ...c, notes: [...(c.notes ?? []), "before = daily kWh before cleaning, after = daily kWh after cleaning", "Weather and season also changed between the two readings; the difference is not attributable to cleaning alone."] };
  return m.is_demo ? { ...out, cls: "demo", notes: [...(out.notes ?? []), "Demo maintenance record: NOT REAL."] } : out;
}

/* ---------------- formatting ---------------- */

export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
export function monthLabel(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}
export function round1(v: number): number { return Math.round(v * 10) / 10; }
