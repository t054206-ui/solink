import "server-only";
import { getWeatherBundle } from "@/lib/weather/weatherapi";
import type { SolarProfile } from "@/lib/types";
import type { WeatherState } from "./weather";

/**
 * Server-side weather for the profile's coordinates. Uses the same
 * WeatherAPI.com module that backs /api/weather; nothing else.
 */
export async function loadWeatherForProfile(profile: SolarProfile | null, days = 3): Promise<WeatherState> {
  if (!profile || profile.lat == null || profile.lng == null) return { status: "no_location" };
  const r = await getWeatherBundle(profile.lat, profile.lng, days);
  if (!r.ok) return r.reason === "not_configured" ? { status: "not_configured", message: r.message } : { status: "error", message: r.message };
  return { status: "ok", bundle: r.data, fetched_at: r.fetched_at };
}
