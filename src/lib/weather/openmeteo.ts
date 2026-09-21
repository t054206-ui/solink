import "server-only";
import type { DataClass } from "@/lib/classification";

/**
 * Open-Meteo historical archive. SERVER ONLY.
 *
 * This is the only source of measured sunlight in Solink, and it exists for one
 * reason: without it a monthly report cannot say why production moved. Cloud
 * cover alone cannot carry that argument — a dusty month and a cloudy month
 * look the same from a cloud percentage — so before this module the honest
 * answer to "why was September lower?" was "cause undetermined".
 *
 * `shortwave_radiation_sum` is the daily global horizontal irradiation. Divide
 * the month's production by the month's irradiation and you have yield per unit
 * of sunlight, which is the number that separates "there was less sun" from
 * "something is wrong with the system". That comparison is the whole point.
 *
 * Two honesty notes that must survive into anything shown to a user:
 *
 *  - This is ERA5 reanalysis, not a pyranometer on the roof. It is a model that
 *    assimilates observations, accurate for a month over a region, not a
 *    measurement of the light that fell on this particular array.
 *  - The archive lags real time by several days. A report generated on the 1st
 *    may be missing the end of the month, so `coverage` is reported and callers
 *    must say when the month is incomplete rather than averaging over a hole.
 *
 * No API key, and none is needed. Open-Meteo's free tier is NON-COMMERCIAL use
 * only — see OPEN_METEO_LICENCE in the placeholder registry. That is a decision
 * for the day Solink charges anyone, not a reason to avoid it now.
 */

const BASE = "https://archive-api.open-meteo.com/v1/archive";

/** The archive reports MJ/m². 1 MJ = 1/3.6 kWh. */
const MJ_TO_KWH = 1 / 3.6;

export interface IrradiationDay {
  date: string;
  /** Global horizontal irradiation for the day, kWh/m². */
  ghi_kwh_m2: number | null;
  cloud_pct: number | null;
  temp_mean_c: number | null;
  temp_max_c: number | null;
}

export interface MonthlyIrradiation {
  /** YYYY-MM */
  month: string;
  days: IrradiationDay[];
  /** Summed over the days the archive actually returned, not over the month. */
  total_kwh_m2: number | null;
  mean_daily_kwh_m2: number | null;
  mean_cloud_pct: number | null;
  mean_temp_c: number | null;
  coverage: { days_returned: number; days_in_month: number; complete: boolean };
  source: "open-meteo.com ERA5 archive";
  cls: DataClass;
}

export type IrradiationResult =
  | { ok: true; data: MonthlyIrradiation }
  | { ok: false; reason: "no_location" | "empty" | "error"; message: string };

/** Days in a YYYY-MM, from the calendar rather than a lookup table. */
export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return 0;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function mean(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => typeof v === "number");
  if (known.length === 0) return null;
  return known.reduce((s, v) => s + v, 0) / known.length;
}

function round(v: number | null, places: number): number | null {
  if (v === null) return null;
  const f = 10 ** places;
  return Math.round(v * f) / f;
}

interface ArchiveResponse {
  error?: boolean;
  reason?: string;
  daily?: {
    time?: string[];
    shortwave_radiation_sum?: (number | null)[];
    cloud_cover_mean?: (number | null)[];
    temperature_2m_mean?: (number | null)[];
    temperature_2m_max?: (number | null)[];
  };
}

/**
 * Measured sunlight over one calendar month at one location.
 *
 * Cached for a day: the archive for a finished month does not change, and a
 * report that is regenerated twice should not fetch it twice.
 */
export async function getMonthlyIrradiation(
  lat: number | null | undefined,
  lng: number | null | undefined,
  month: string,
): Promise<IrradiationResult> {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return { ok: false, reason: "no_location", message: "This system has no coordinates, so sunlight for the month cannot be looked up." };
  }
  const total = daysInMonth(month);
  if (total === 0) return { ok: false, reason: "error", message: `"${month}" is not a YYYY-MM month.` };

  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: `${month}-01`,
    end_date: `${month}-${String(total).padStart(2, "0")}`,
    daily: "shortwave_radiation_sum,cloud_cover_mean,temperature_2m_mean,temperature_2m_max",
    timezone: "auto",
  });

  let raw: ArchiveResponse;
  try {
    const res = await fetch(`${BASE}?${qs}`, { next: { revalidate: 86400 } });
    if (!res.ok) return { ok: false, reason: "error", message: `Sunlight archive error (${res.status}).` };
    raw = (await res.json()) as ArchiveResponse;
  } catch {
    return { ok: false, reason: "error", message: "The sunlight archive is unreachable." };
  }
  if (raw.error) return { ok: false, reason: "error", message: raw.reason ?? "The sunlight archive refused the request." };

  const time = raw.daily?.time ?? [];
  const rad = raw.daily?.shortwave_radiation_sum ?? [];
  const cloud = raw.daily?.cloud_cover_mean ?? [];
  const tMean = raw.daily?.temperature_2m_mean ?? [];
  const tMax = raw.daily?.temperature_2m_max ?? [];

  const days: IrradiationDay[] = time.map((date, i) => ({
    date,
    ghi_kwh_m2: typeof rad[i] === "number" ? round((rad[i] as number) * MJ_TO_KWH, 2) : null,
    cloud_pct: typeof cloud[i] === "number" ? (cloud[i] as number) : null,
    temp_mean_c: typeof tMean[i] === "number" ? (tMean[i] as number) : null,
    temp_max_c: typeof tMax[i] === "number" ? (tMax[i] as number) : null,
  }));

  const withSun = days.filter((d) => d.ghi_kwh_m2 !== null);
  if (withSun.length === 0) {
    return { ok: false, reason: "empty", message: `The sunlight archive has no data yet for ${month}.` };
  }

  const sum = withSun.reduce((s, d) => s + (d.ghi_kwh_m2 as number), 0);

  return {
    ok: true,
    data: {
      month,
      days,
      total_kwh_m2: round(sum, 1),
      mean_daily_kwh_m2: round(sum / withSun.length, 2),
      mean_cloud_pct: round(mean(days.map((d) => d.cloud_pct)), 0),
      mean_temp_c: round(mean(days.map((d) => d.temp_mean_c)), 1),
      coverage: { days_returned: withSun.length, days_in_month: total, complete: withSun.length >= total },
      source: "open-meteo.com ERA5 archive",
      cls: "source",
    },
  };
}

/**
 * Yield per unit of sunlight: kWh generated for every kWh/m² that fell.
 *
 * The one figure that can tell a homeowner whether a quiet month was the sky or
 * the system. It is a ratio of two real quantities, so it is calculated rather
 * than estimated — but it is only comparable between months when both months
 * were measured the same way, which is why the callers refuse to compare a demo
 * month with a real one.
 */
export function yieldPerSunlight(productionKwh: number | null, irradiation: MonthlyIrradiation | null): number | null {
  if (productionKwh === null || !irradiation || !irradiation.total_kwh_m2) return null;
  if (irradiation.total_kwh_m2 <= 0) return null;
  return round(productionKwh / irradiation.total_kwh_m2, 2);
}
