import "server-only";
import { serverEnv } from "@/lib/config/env";
import { PLACEHOLDERS } from "@/lib/config/placeholders";

/**
 * Google Maps Platform server helpers (Geocoding, Distance Matrix). SERVER ONLY.
 * The browser Maps JavaScript API uses a separate, referrer-restricted key
 * (NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY) loaded by <MapView/>.
 */
export type MapsResult<T> =
  | { ok: true; data: T; source: "google_maps_platform" }
  | { ok: false; reason: "not_configured" | "zero_results" | "error"; message: string };

export function isGoogleMapsConfigured() { return Boolean(serverEnv().googleMapsApiKey); }

export interface GeocodeHit {
  formatted_address: string;
  lat: number;
  lng: number;
  place_id: string;
  components: Record<string, string>;
  /** Google sets this when it matched something other than what was asked for. */
  partial_match?: boolean;
  /** ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE. How precise the point is. */
  location_type?: string | null;
}

export async function geocode(address: string, region = "kw"): Promise<MapsResult<GeocodeHit[]>> {
  const key = serverEnv().googleMapsApiKey;
  if (!key) return { ok: false, reason: "not_configured", message: `Maps are not connected. ${PLACEHOLDERS.GOOGLE_MAPS_API_KEY}` };
  const qs = new URLSearchParams({ address, region, key });
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${qs}`);
    const json = await res.json() as { status: string; results: { formatted_address: string; place_id: string; partial_match?: boolean; geometry: { location: { lat: number; lng: number }; location_type?: string }; address_components: { long_name: string; types: string[] }[] }[] };
    if (json.status === "ZERO_RESULTS") return { ok: false, reason: "zero_results", message: "No location matched that address." };
    if (json.status !== "OK") return { ok: false, reason: "error", message: `Geocoding error: ${json.status}` };
    return { ok: true, source: "google_maps_platform", data: json.results.map((r) => ({
      formatted_address: r.formatted_address, place_id: r.place_id, lat: r.geometry.location.lat, lng: r.geometry.location.lng,
      components: Object.fromEntries(r.address_components.map((c) => [c.types[0], c.long_name])),
      // Carried through so callers can tell an exact building from a nearby
      // street. Google says so; nobody downstream has to guess.
      partial_match: r.partial_match === true,
      location_type: r.geometry.location_type ?? null,
    })) };
  } catch {
    return { ok: false, reason: "error", message: "Geocoding service is unreachable." };
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<MapsResult<GeocodeHit[]>> {
  const key = serverEnv().googleMapsApiKey;
  if (!key) return { ok: false, reason: "not_configured", message: `Maps are not connected. ${PLACEHOLDERS.GOOGLE_MAPS_API_KEY}` };
  const qs = new URLSearchParams({ latlng: `${lat},${lng}`, key });
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${qs}`);
    const json = await res.json() as { status: string; results: { formatted_address: string; place_id: string; geometry: { location: { lat: number; lng: number } }; address_components: { long_name: string; types: string[] }[] }[] };
    if (json.status !== "OK") return { ok: false, reason: json.status === "ZERO_RESULTS" ? "zero_results" : "error", message: `Reverse geocoding: ${json.status}` };
    return { ok: true, source: "google_maps_platform", data: json.results.map((r) => ({
      formatted_address: r.formatted_address, place_id: r.place_id, lat: r.geometry.location.lat, lng: r.geometry.location.lng,
      components: Object.fromEntries(r.address_components.map((c) => [c.types[0], c.long_name])),
    })) };
  } catch {
    return { ok: false, reason: "error", message: "Geocoding service is unreachable." };
  }
}

/**
 * Google Solar API (buildingInsights). Access is NOT assumed. Requires GOOGLE_SOLAR_API_KEY.
 * Returns not_configured otherwise: [PLACEHOLDER: GOOGLE SOLAR / SOLAR SITE DATA SOURCE]
 */
export async function getBuildingInsights(lat: number, lng: number): Promise<MapsResult<unknown>> {
  const key = serverEnv().googleSolarApiKey;
  if (!key) return { ok: false, reason: "not_configured", message: `Site solar data is not connected. ${PLACEHOLDERS.GOOGLE_SOLAR_SITE_DATA_SOURCE}` };
  const qs = new URLSearchParams({ "location.latitude": String(lat), "location.longitude": String(lng), requiredQuality: "MEDIUM", key });
  try {
    const res = await fetch(`https://solar.googleapis.com/v1/buildingInsights:findClosest?${qs}`);
    if (!res.ok) return { ok: false, reason: res.status === 404 ? "zero_results" : "error", message: `Solar API error (${res.status}).` };
    return { ok: true, source: "google_maps_platform", data: await res.json() };
  } catch {
    return { ok: false, reason: "error", message: "Solar API is unreachable." };
  }
}
