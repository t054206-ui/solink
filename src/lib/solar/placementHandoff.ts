import { isUsableCoordinate } from "./placement";

/**
 * The location a person settled on in the Placement Guide, carried to Solar
 * Potential so they do not have to find it twice.
 *
 * It travels in `sessionStorage`, not in the URL. A location is personal: a
 * query string ends up in browser history, in a shared link, and in the
 * server's request log, and the Placement Guide promises in as many words
 * that the coordinates stay in the browser. This keeps that promise — the
 * hand-off never reaches a server — and it ends when the tab does, which is
 * the right lifetime for "the thing I was just looking at".
 *
 * Nothing here is authoritative. Solar Potential still runs its own analysis
 * from the address, through the same Google lookup as always; what this
 * carries is the starting point and the provenance to show beside it.
 */

const KEY = "solink:placement-location";

export interface CarriedLocation {
  /** Google's own resolved address, when the address route was used. */
  address: string | null;
  /** What the person typed, kept so the page can show both. */
  typed: string | null;
  latitude: number;
  longitude: number;
  /** Google's precision for the point: ROOFTOP, GEOMETRIC_CENTER, APPROXIMATE… */
  precision: string | null;
  /** True when Google landed near the place rather than on it. */
  approximate: boolean;
  /** Which way the coordinates arrived. */
  source: "browser" | "address";
  /** When it was resolved, so a stale hand-off can be judged rather than trusted. */
  at: string;
}

/** Stores the location for the next page. Storage may be unavailable; that is not an error. */
export function rememberPlacementLocation(loc: CarriedLocation): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(loc));
  } catch {
    // Private windows, blocked site data, or a full quota. The hand-off is a
    // convenience: losing it means the person types the address, as before.
  }
}

/**
 * Reads the carried location, or null when there is none, when storage is
 * unavailable, or when what was stored is not a location. A bad value is
 * dropped rather than rendered: the page then shows its ordinary empty form,
 * which is the truth.
 */
export function readPlacementLocation(): CarriedLocation | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<CarriedLocation>;
    if (typeof v.latitude !== "number" || typeof v.longitude !== "number") return null;
    if (!isUsableCoordinate(v.latitude, v.longitude)) return null;
    if (v.source !== "browser" && v.source !== "address") return null;
    return {
      address: typeof v.address === "string" ? v.address : null,
      typed: typeof v.typed === "string" ? v.typed : null,
      latitude: v.latitude,
      longitude: v.longitude,
      precision: typeof v.precision === "string" ? v.precision : null,
      approximate: v.approximate === true,
      source: v.source,
      at: typeof v.at === "string" ? v.at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Drops the carried location, for when the person wants to start somewhere else. */
export function forgetPlacementLocation(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do: if it cannot be removed it could not have been read either.
  }
}
