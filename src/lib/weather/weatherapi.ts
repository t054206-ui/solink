import "server-only";
import { serverEnv } from "@/lib/config/env";
import type { WeatherSnapshot } from "@/lib/types";

/**
 * WeatherAPI.com client. SERVER ONLY. The preferred (and only) weather provider
 * for Solink. When WEATHER_API_KEY is missing, callers receive
 * { ok: false, reason: "not_configured" } and must render the unavailable state.
 * No other provider is substituted.
 */
const BASE = "https://api.weatherapi.com/v1";

export type WeatherResult<T> =
  | { ok: true; data: T; source: "weatherapi.com"; fetched_at: string }
  | { ok: false; reason: "not_configured" | "error" | "invalid_location"; message: string };

export function isWeatherConfigured() { return Boolean(serverEnv().weatherApiKey); }

export interface ForecastDay {
  date: string;
  maxtemp_c: number; mintemp_c: number; avgtemp_c: number;
  daily_chance_of_rain: number; totalprecip_mm: number; avghumidity: number; uv: number;
  condition: string; maxwind_kph: number; sunrise: string; sunset: string;
}

export interface WeatherBundle {
  location: { name: string; region: string; country: string; lat: number; lon: number; localtime: string };
  current: WeatherSnapshot;
  forecast: ForecastDay[];
}

async function call<T>(path: string, params: Record<string, string>): Promise<WeatherResult<T>> {
  const key = serverEnv().weatherApiKey;
  if (!key) return { ok: false, reason: "not_configured", message: "Weather isn't available right now." };
  const qs = new URLSearchParams({ key, ...params });
  try {
    const res = await fetch(`${BASE}/${path}?${qs}`, { next: { revalidate: 600 } });
    if (!res.ok) {
      if (res.status === 400) return { ok: false, reason: "invalid_location", message: "Weather service could not find that location." };
      return { ok: false, reason: "error", message: `Weather service error (${res.status}).` };
    }
    return { ok: true, data: (await res.json()) as T, source: "weatherapi.com", fetched_at: new Date().toISOString() };
  } catch {
    return { ok: false, reason: "error", message: "Weather service is unreachable." };
  }
}

/** Current conditions + air quality + N-day forecast for lat,lng. */
export async function getWeatherBundle(lat: number, lng: number, days = 3): Promise<WeatherResult<WeatherBundle>> {
  type Raw = {
    location: WeatherBundle["location"];
    current: { last_updated: string; temp_c: number; humidity: number; wind_kph: number; cloud: number; precip_mm: number; uv: number;
      condition: { text: string }; air_quality?: { pm2_5?: number; pm10?: number; "us-epa-index"?: number } };
    forecast: { forecastday: { date: string; day: { maxtemp_c: number; mintemp_c: number; avgtemp_c: number; daily_chance_of_rain: number; totalprecip_mm: number; avghumidity: number; uv: number; maxwind_kph: number; condition: { text: string } }; astro: { sunrise: string; sunset: string } }[] };
  };
  const r = await call<Raw>("forecast.json", { q: `${lat},${lng}`, days: String(days), aqi: "yes", alerts: "no" });
  if (!r.ok) return r;
  const c = r.data.current;
  const current: WeatherSnapshot = {
    observed_at: c.last_updated,
    temp_c: c.temp_c, humidity_pct: c.humidity, wind_kph: c.wind_kph, cloud_pct: c.cloud, precip_mm: c.precip_mm, uv: c.uv,
    condition: c.condition?.text ?? null,
    pm2_5: c.air_quality?.pm2_5 ?? null, pm10: c.air_quality?.pm10 ?? null, us_epa_index: c.air_quality?.["us-epa-index"] ?? null,
    source: "weatherapi.com", cls: "source",
  };
  const forecast: ForecastDay[] = r.data.forecast.forecastday.map((d) => ({
    date: d.date, maxtemp_c: d.day.maxtemp_c, mintemp_c: d.day.mintemp_c, avgtemp_c: d.day.avgtemp_c,
    daily_chance_of_rain: d.day.daily_chance_of_rain, totalprecip_mm: d.day.totalprecip_mm, avghumidity: d.day.avghumidity,
    uv: d.day.uv, condition: d.day.condition.text, maxwind_kph: d.day.maxwind_kph, sunrise: d.astro.sunrise, sunset: d.astro.sunset,
  }));
  return { ok: true, data: { location: r.data.location, current, forecast }, source: "weatherapi.com", fetched_at: r.fetched_at };
}

/** Historical day (WeatherAPI history endpoint; plan-dependent availability). */
export async function getHistoricalDay(lat: number, lng: number, date: string) {
  return call<unknown>("history.json", { q: `${lat},${lng}`, dt: date });
}
