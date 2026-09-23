import type { DataClass } from "@/lib/classification";

/**
 * Which way to face a fixed panel, and at what angle, from a latitude and
 * longitude alone.
 *
 * Pure: no network call, no key, no storage. The browser hands it a pair of
 * coordinates and it returns a recommendation, so the coordinates never have
 * to leave the device for this guide to work.
 *
 * What it can answer from a location: the hemisphere, and therefore the
 * direction the sun sits in across the year, plus a tilt band for that
 * latitude. What it cannot answer, and never claims to: where on a roof a
 * panel should go. Roof shape, parapets, tanks, neighbouring buildings and
 * trees decide that, and none of them is in a coordinate pair.
 *
 * Two bases, and the result always says which one it used:
 *
 *  - Inside Kuwait, the tilt band comes from the studies the owner cited
 *    (KUWAIT_TILT below). It is a real, local finding, so it is classified as
 *    source data.
 *  - Anywhere else, the tilt is the common rule of thumb of setting a fixed
 *    panel near the site's own latitude. That is a rule, not a study of that
 *    place, so it is classified as an estimate and the wording says so.
 */

export type Hemisphere = "north" | "south";

export interface TiltBand {
  /** Degrees from horizontal. `min` and `max` are equal when the basis gives one figure. */
  minDeg: number;
  maxDeg: number;
  basis: "kuwait_studies" | "latitude_rule" | "drainage_minimum";
  /** Plain sentence naming where the number came from. Shown to the user. */
  source: string;
}

export interface PlacementRecommendation {
  latitude: number;
  longitude: number;
  hemisphere: Hemisphere;
  /** Degrees clockwise from true north: 180 is due south, 0 due north. */
  azimuthDeg: number;
  /** Compass letter, in the same vocabulary the Solar Profile uses. */
  compass: "N" | "S";
  compassLabel: "North" | "South";
  /** Why that direction, in one sentence. */
  azimuthReason: string;
  tilt: TiltBand;
  inKuwait: boolean;
  /** True near the equator, where the sun passes close to overhead. */
  nearEquator: boolean;
  /** How the tilt figure should be labelled on screen. */
  cls: DataClass;
}

/**
 * Kuwait's land extent, used only to decide whether the cited local studies
 * apply. Deliberately generous at the edges: a few kilometres either way
 * changes nothing about which body of research is the closer one.
 */
const KUWAIT_BOUNDS = { minLat: 28.4, maxLat: 30.2, minLng: 46.4, maxLng: 48.6 } as const;

/**
 * The tilt band for Kuwait, from the two findings the owner supplied
 * (2026-09-23). Recorded here as they were given: a Kuwait University study of
 * photovoltaic tilt optimisation found 20° produced the highest output among
 * the angles it tested, and location-specific analyses around Kuwait and
 * Hawalli commonly land on about 25° facing south for fixed annual
 * optimisation. No paper URL was supplied with them, so the UI cites them as
 * studies rather than linking out, and does not present them as a standard.
 */
const KUWAIT_TILT: TiltBand = {
  minDeg: 20,
  maxDeg: 25,
  basis: "kuwait_studies",
  source:
    "A Kuwait University study of photovoltaic tilt optimisation found 20° gave the highest energy output of the angles it tested, and location-specific analyses around Kuwait and Hawalli commonly identify about 25° facing south for fixed annual output.",
};

/**
 * Below this latitude the sun is high enough year round that tilt earns little,
 * and panels are usually still set a few degrees off flat so rain runs off the
 * glass instead of pooling on it. That is a maintenance convention, not an
 * energy optimum, and the wording says as much.
 */
const DRAINAGE_MIN_TILT = 10;

export function isInKuwait(lat: number, lng: number): boolean {
  return (
    lat >= KUWAIT_BOUNDS.minLat && lat <= KUWAIT_BOUNDS.maxLat && lng >= KUWAIT_BOUNDS.minLng && lng <= KUWAIT_BOUNDS.maxLng
  );
}

/** Coordinates that could not be a place on Earth are refused rather than guessed at. */
export function isUsableCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * The recommendation. `null` when the coordinates are not usable, so the caller
 * shows its unavailable state rather than a confident answer about nowhere.
 */
export function recommendPlacement(latitude: number, longitude: number): PlacementRecommendation | null {
  if (!isUsableCoordinate(latitude, longitude)) return null;

  const hemisphere: Hemisphere = latitude >= 0 ? "north" : "south";
  const north = hemisphere === "north";
  const nearEquator = Math.abs(latitude) < 5;
  const inKuwait = isInKuwait(latitude, longitude);

  const azimuthReason = nearEquator
    ? `At ${Math.abs(latitude).toFixed(1)}° from the equator the sun passes close to overhead through the year, so the direction a panel faces matters much less here than it does further north or south. Facing ${north ? "south" : "north"} is still the better of the two.`
    : `You are in the ${hemisphere}ern hemisphere, so the sun sits in the ${north ? "southern" : "northern"} half of the sky through the day and across the year. A fixed panel facing ${north ? "south" : "north"} spends more of that time pointed at it.`;

  const tilt: TiltBand = inKuwait
    ? KUWAIT_TILT
    : Math.abs(latitude) < DRAINAGE_MIN_TILT
      ? {
          minDeg: DRAINAGE_MIN_TILT,
          maxDeg: DRAINAGE_MIN_TILT,
          basis: "drainage_minimum",
          source: `At ${Math.abs(latitude).toFixed(1)}° latitude the sun is high year round and tilt changes output very little. Panels are commonly still set around ${DRAINAGE_MIN_TILT}° so rain runs off the glass rather than pooling on it, which is a cleaning convention rather than an energy figure.`,
        }
      : {
          minDeg: Math.round(Math.abs(latitude)),
          maxDeg: Math.round(Math.abs(latitude)),
          basis: "latitude_rule",
          source: `A fixed panel is commonly set near the latitude of the place it stands, which here is ${Math.abs(latitude).toFixed(1)}°. That is a general rule of thumb for year-round output, not a study of this location: Solink has no local measurement for it.`,
        };

  return {
    latitude,
    longitude,
    hemisphere,
    azimuthDeg: north ? 180 : 0,
    compass: north ? "S" : "N",
    compassLabel: north ? "South" : "North",
    azimuthReason,
    tilt,
    inKuwait,
    nearEquator,
    // Kuwait's band comes from cited studies; everywhere else it is a rule of
    // thumb applied to a latitude, which is an estimate and is labelled as one.
    cls: inKuwait ? "source" : "estimated",
  };
}

/** "20 to 25°" or "29°", for a heading. */
export function formatTilt(t: TiltBand): string {
  return t.minDeg === t.maxDeg ? `${t.minDeg}°` : `${t.minDeg} to ${t.maxDeg}°`;
}

/**
 * Coordinates rounded for display. Two decimals is about a kilometre: enough to
 * show the guide used the right place, without printing the doorstep.
 */
export function formatCoarseCoordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lng).toFixed(2)}° ${ew}`;
}
