import "server-only";
import { z } from "zod";
import { geocode, type GeocodeHit } from "@/lib/maps/google";
import { getBuildingInsights } from "@/lib/maps/google";
import { getWeatherBundle } from "@/lib/weather/weatherapi";

/**
 * Site analysis: an address in, a normalised picture of that location out.
 *
 * The pipeline runs entirely on the server, in this order, and each step feeds
 * the next with real values:
 *
 *   address → Google Geocoding → Google Solar buildingInsights (optional)
 *           → WeatherAPI → normalise + validate
 *           → (caller hands this to the Solink rule engine, analysisEngine.ts)
 *
 * No model is involved. The conclusions are produced by the deterministic
 * rules in `analysisEngine.ts`, and every one of them names the value and the
 * threshold it came from.
 *
 * Two rules shape the whole file:
 *
 *  - Nothing is invented. Where a provider does not return a field it becomes
 *    null and its name is added to `unavailable`, so the analysis can say what
 *    it did not know rather than filling the gap.
 *  - Provider payloads are validated before use. The schemas below are
 *    deliberately loose — every field optional, unknown keys allowed — because
 *    the job is to reject the wrong *shape*, not to demand a response Google
 *    never promised.
 */

/* ---------------------------------------------------------------- providers */

/**
 * Google's buildingInsights response, as much of it as this analysis reads.
 * `passthrough` keeps the untouched payload available for traceability.
 */
const SunshineStats = z
  .object({
    areaMeters2: z.number().optional(),
    groundAreaMeters2: z.number().optional(),
    sunshineQuantiles: z.array(z.number()).optional(),
  })
  .passthrough();

const BuildingInsights = z
  .object({
    name: z.string().optional(),
    center: z.object({ latitude: z.number(), longitude: z.number() }).partial().optional(),
    imageryDate: z.object({ year: z.number(), month: z.number(), day: z.number() }).partial().optional(),
    imageryQuality: z.string().optional(),
    postalCode: z.string().optional(),
    administrativeArea: z.string().optional(),
    regionCode: z.string().optional(),
    solarPotential: z
      .object({
        maxArrayPanelsCount: z.number().optional(),
        maxArrayAreaMeters2: z.number().optional(),
        maxSunshineHoursPerYear: z.number().optional(),
        carbonOffsetFactorKgPerMwh: z.number().optional(),
        panelCapacityWatts: z.number().optional(),
        panelHeightMeters: z.number().optional(),
        panelWidthMeters: z.number().optional(),
        panelLifetimeYears: z.number().optional(),
        wholeRoofStats: SunshineStats.optional(),
        roofSegmentStats: z
          .array(
            z
              .object({
                pitchDegrees: z.number().optional(),
                azimuthDegrees: z.number().optional(),
                stats: SunshineStats.optional(),
              })
              .passthrough(),
          )
          .optional(),
        solarPanelConfigs: z
          .array(
            z
              .object({
                panelsCount: z.number().optional(),
                yearlyEnergyDcKwh: z.number().optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type BuildingInsightsPayload = z.infer<typeof BuildingInsights>;

/* --------------------------------------------------------------- normalised */

export interface NormalisedLocation {
  /** Exactly what the user typed. */
  address: string;
  formattedAddress: string | null;
  latitude: number;
  longitude: number;
  placeId: string | null;
  country: string | null;
  /** Google's own precision for the point: ROOFTOP, GEOMETRIC_CENTER, APPROXIMATE… */
  matchPrecision: string | null;
  /**
   * True when Google did not put the point on the requested building: either it
   * flagged a partial match, or the point is anything less precise than a
   * rooftop. Asking for a university and receiving a nearby street is exactly
   * this case, and the analysis has to say so rather than imply the building
   * was identified.
   */
  approximate: boolean;
}

export interface NormalisedRoofSegment {
  pitchDegrees: number | null;
  azimuthDegrees: number | null;
  areaM2: number | null;
  /** Median of Google's sunshine deciles for this segment, hours per year. */
  sunshineMedianHoursPerYear: number | null;
}

export interface NormalisedSolar {
  available: boolean;
  unavailableReason: string | null;
  imageryDate: string | null;
  imageryQuality: string | null;
  wholeRoofAreaM2: number | null;
  groundAreaM2: number | null;
  maxArrayPanelsCount: number | null;
  maxArrayAreaM2: number | null;
  maxSunshineHoursPerYear: number | null;
  carbonOffsetFactorKgPerMwh: number | null;
  panelCapacityWatts: number | null;
  roofSegments: NormalisedRoofSegment[];
  /** The largest configuration Google returned, which is its own maximum. */
  bestConfigPanelsCount: number | null;
  bestConfigYearlyEnergyDcKwh: number | null;
}

export interface NormalisedWeather {
  available: boolean;
  unavailableReason: string | null;
  observedAt: string | null;
  temperatureC: number | null;
  humidityPct: number | null;
  cloudCoverPct: number | null;
  windKph: number | null;
  precipitationMm: number | null;
  uvIndex: number | null;
  condition: string | null;
  pm2_5: number | null;
  pm10: number | null;
  /**
   * WeatherAPI's US EPA air-quality index, 1 (good) to 6 (hazardous), exactly
   * as the provider returns it. Carried through because it is the one
   * air-quality judgement in the data that comes from a published scale rather
   * than from a Solink threshold.
   */
  usEpaIndex: number | null;
  forecast: {
    date: string;
    avgTempC: number | null;
    maxTempC: number | null;
    minTempC: number | null;
    totalPrecipMm: number | null;
    avgHumidityPct: number | null;
    maxWindKph: number | null;
    uvIndex: number | null;
    condition: string | null;
  }[];
}

export interface AnalysisSources {
  geocoding: { provider: string; url: string | null; status: string };
  googleSolar: { provider: string; url: string | null; status: string };
  weather: { provider: string; url: string | null; status: string };
}

export interface NormalisedSite {
  location: NormalisedLocation;
  solar: NormalisedSolar;
  weather: NormalisedWeather;
  sources: AnalysisSources;
  /** Field names no provider supplied. The analysis must not fill these in. */
  unavailable: string[];
}

/* ------------------------------------------------------------------ helpers */

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Median of Google's 11 sunshine deciles. Null when the array is absent. */
function medianQuantile(q: number[] | undefined): number | null {
  if (!q || q.length === 0) return null;
  const mid = Math.floor(q.length / 2);
  return num(q[mid]);
}

/** Public documentation for each provider. Used as the source reference shown to the user. */
export const SOURCE_URLS = {
  geocoding: "https://developers.google.com/maps/documentation/geocoding",
  googleSolar: "https://developers.google.com/maps/documentation/solar/building-insights",
  weather: "https://www.weatherapi.com/docs/",
} as const;

/* ----------------------------------------------------------------- pipeline */

export type StageName = "geocoding" | "google_solar" | "weather" | "analysis";

export type SiteDataResult =
  | { ok: true; data: NormalisedSite; raw: { geocode: GeocodeHit; googleSolar: unknown; weather: unknown } }
  | { ok: false; stage: StageName; reason: string; message: string };

/**
 * Steps 3 to 6: geocode, then call both providers with the coordinates that
 * geocoding actually returned, then normalise.
 *
 * Only geocoding is fatal. Without coordinates there is nothing to ask the
 * other two about, so the run stops. A missing Solar or Weather response is
 * recorded as unavailable and the analysis continues, saying so.
 */
export async function collectSiteData(address: string): Promise<SiteDataResult> {
  const geo = await geocode(address);
  if (!geo.ok) {
    return {
      ok: false,
      stage: "geocoding",
      reason: geo.reason,
      message:
        geo.reason === "zero_results"
          ? "That address could not be found. Try adding the area or governorate."
          : geo.reason === "not_configured"
            ? "Address lookup is not connected."
            : "The address lookup service could not be reached.",
    };
  }
  const hit = geo.data[0];
  if (!hit) {
    return { ok: false, stage: "geocoding", reason: "zero_results", message: "That address could not be found." };
  }

  // Both providers are given the coordinates geocoding returned, never the
  // typed address, and they run together because neither depends on the other.
  const [solarResult, weatherResult] = await Promise.all([
    getBuildingInsights(hit.lat, hit.lng),
    getWeatherBundle(hit.lat, hit.lng, 3),
  ]);

  const solar = normaliseSolar(solarResult);
  const weather = normaliseWeather(weatherResult);

  const unavailable: string[] = [];
  if (!solar.available)
    unavailable.push(
      solar.unavailableReason === "not_configured"
        ? "roof measurements (no roof survey was carried out: the Google Solar API is not part of this analysis)"
        : "roof measurements (the Google Solar API returned no data for this location)",
    );
  else {
    if (solar.wholeRoofAreaM2 === null) unavailable.push("roof area");
    if (solar.roofSegments.length === 0) unavailable.push("roof segments (pitch and orientation)");
    if (solar.maxSunshineHoursPerYear === null) unavailable.push("annual sunshine hours");
    if (solar.bestConfigYearlyEnergyDcKwh === null) unavailable.push("modelled annual energy");
  }
  if (!weather.available) unavailable.push("weather conditions (WeatherAPI)");
  else {
    if (weather.pm10 === null) unavailable.push("airborne dust (PM10)");
    if (weather.usEpaIndex === null && weather.pm2_5 === null) unavailable.push("air quality");
    if (weather.forecast.length === 0) unavailable.push("forecast");
  }

  return {
    ok: true,
    raw: { geocode: hit, googleSolar: solarResult.ok ? solarResult.data : null, weather: weatherResult.ok ? weatherResult.data : null },
    data: {
      location: {
        address,
        formattedAddress: hit.formatted_address ?? null,
        latitude: hit.lat,
        longitude: hit.lng,
        placeId: hit.place_id ?? null,
        country: hit.components?.country ?? null,
        matchPrecision: hit.location_type ?? null,
        approximate: hit.partial_match === true || (hit.location_type ? hit.location_type !== "ROOFTOP" : true),
      },
      solar,
      weather,
      sources: {
        geocoding: { provider: "Google Maps Platform (Geocoding API)", url: SOURCE_URLS.geocoding, status: "ok" },
        googleSolar: {
          provider: "Google Solar API (buildingInsights)",
          url: solar.available ? SOURCE_URLS.googleSolar : null,
          status: solar.available ? "ok" : (solar.unavailableReason ?? "unavailable"),
        },
        weather: {
          provider: "WeatherAPI.com",
          url: weather.available ? SOURCE_URLS.weather : null,
          status: weather.available ? "ok" : (weather.unavailableReason ?? "unavailable"),
        },
      },
      unavailable,
    },
  };
}

/** Google Solar → normalised. A rejected shape is treated as no data, never as zeros. */
function normaliseSolar(result: Awaited<ReturnType<typeof getBuildingInsights>>): NormalisedSolar {
  const empty: NormalisedSolar = {
    available: false,
    unavailableReason: null,
    imageryDate: null,
    imageryQuality: null,
    wholeRoofAreaM2: null,
    groundAreaM2: null,
    maxArrayPanelsCount: null,
    maxArrayAreaM2: null,
    maxSunshineHoursPerYear: null,
    carbonOffsetFactorKgPerMwh: null,
    panelCapacityWatts: null,
    roofSegments: [],
    bestConfigPanelsCount: null,
    bestConfigYearlyEnergyDcKwh: null,
  };

  if (!result.ok) return { ...empty, unavailableReason: result.reason };

  const parsed = BuildingInsights.safeParse(result.data);
  if (!parsed.success) return { ...empty, unavailableReason: "unexpected_response_shape" };

  const b = parsed.data;
  const sp = b.solarPotential;
  if (!sp) return { ...empty, unavailableReason: "no_solar_potential_returned" };

  const configs = sp.solarPanelConfigs ?? [];
  const best = configs.reduce<{ panelsCount?: number; yearlyEnergyDcKwh?: number } | null>((acc, c) => {
    if (typeof c.yearlyEnergyDcKwh !== "number") return acc;
    if (!acc || typeof acc.yearlyEnergyDcKwh !== "number" || c.yearlyEnergyDcKwh > acc.yearlyEnergyDcKwh) return c;
    return acc;
  }, null);

  const d = b.imageryDate;
  return {
    available: true,
    unavailableReason: null,
    imageryDate:
      d && typeof d.year === "number" && typeof d.month === "number" && typeof d.day === "number"
        ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`
        : null,
    imageryQuality: b.imageryQuality ?? null,
    wholeRoofAreaM2: num(sp.wholeRoofStats?.areaMeters2),
    groundAreaM2: num(sp.wholeRoofStats?.groundAreaMeters2),
    maxArrayPanelsCount: num(sp.maxArrayPanelsCount),
    maxArrayAreaM2: num(sp.maxArrayAreaMeters2),
    maxSunshineHoursPerYear: num(sp.maxSunshineHoursPerYear),
    carbonOffsetFactorKgPerMwh: num(sp.carbonOffsetFactorKgPerMwh),
    panelCapacityWatts: num(sp.panelCapacityWatts),
    // Sorted largest first. Google does not document an order for
    // roofSegmentStats, and both the UI and the analysis speak about "the
    // largest segment", so the order is established here rather than assumed.
    // Segments with no recorded area sort last; nothing is dropped.
    roofSegments: (sp.roofSegmentStats ?? [])
      .map((s) => ({
        pitchDegrees: num(s.pitchDegrees),
        azimuthDegrees: num(s.azimuthDegrees),
        areaM2: num(s.stats?.areaMeters2),
        sunshineMedianHoursPerYear: medianQuantile(s.stats?.sunshineQuantiles),
      }))
      .sort((a, b) => (b.areaM2 ?? -Infinity) - (a.areaM2 ?? -Infinity)),
    bestConfigPanelsCount: num(best?.panelsCount),
    bestConfigYearlyEnergyDcKwh: num(best?.yearlyEnergyDcKwh),
  };
}

/** WeatherAPI → normalised. */
function normaliseWeather(result: Awaited<ReturnType<typeof getWeatherBundle>>): NormalisedWeather {
  const empty: NormalisedWeather = {
    available: false,
    unavailableReason: null,
    observedAt: null,
    temperatureC: null,
    humidityPct: null,
    cloudCoverPct: null,
    windKph: null,
    precipitationMm: null,
    uvIndex: null,
    condition: null,
    pm2_5: null,
    pm10: null,
    usEpaIndex: null,
    forecast: [],
  };
  if (!result.ok) return { ...empty, unavailableReason: result.reason };

  const c = result.data.current;
  return {
    available: true,
    unavailableReason: null,
    observedAt: c.observed_at ?? null,
    temperatureC: num(c.temp_c),
    humidityPct: num(c.humidity_pct),
    cloudCoverPct: num(c.cloud_pct),
    windKph: num(c.wind_kph),
    precipitationMm: num(c.precip_mm),
    uvIndex: num(c.uv),
    condition: c.condition ?? null,
    pm2_5: num(c.pm2_5),
    pm10: num(c.pm10),
    usEpaIndex: num(c.us_epa_index),
    forecast: result.data.forecast.map((f) => ({
      date: f.date,
      avgTempC: num(f.avgtemp_c),
      maxTempC: num(f.maxtemp_c),
      minTempC: num(f.mintemp_c),
      totalPrecipMm: num(f.totalprecip_mm),
      avgHumidityPct: num(f.avghumidity),
      maxWindKph: num(f.maxwind_kph),
      uvIndex: num(f.uv),
      condition: f.condition ?? null,
    })),
  };
}

/* ------------------------------------------------ the analysis, as it is stored */

/**
 * The environmental assessment: the part of the analysis the Solink rule
 * engine reasons about. Every level below is decided by a named threshold in
 * `analysisEngine.ts` applied to a value WeatherAPI actually returned, and
 * `unavailable` is a first-class answer rather than a zero.
 *
 * None of it describes the building. Roof area, pitch, orientation, panel
 * count and production are not derivable from this data and stay unavailable.
 */
export const EnvironmentLevelSchema = z.enum(["unavailable", "low", "moderate", "high", "extreme"]);
export type EnvironmentLevel = z.infer<typeof EnvironmentLevelSchema>;

export const EnvironmentAssessmentSchema = z.object({
  /** Which engine produced this, so a stored row can always be traced back. */
  engine: z.object({ id: z.string().max(60), version: z.string().max(20), label: z.string().max(80) }),
  /** The location's overall environmental standing for running panels. */
  overallStatus: z.enum(["unavailable", "low", "moderate", "high", "attention_required"]),
  statusReason: z.string().max(400),
  heat: z.object({
    level: EnvironmentLevelSchema,
    temperatureC: z.number().nullable(),
    note: z.string().max(400),
  }),
  dust: z.object({
    level: EnvironmentLevelSchema,
    pm10: z.number().nullable(),
    condition: z.string().max(120).nullable(),
    dustEventNow: z.boolean(),
    dustEventForecast: z.boolean(),
    note: z.string().max(400),
  }),
  airQuality: z.object({
    level: EnvironmentLevelSchema,
    pm2_5: z.number().nullable(),
    pm10: z.number().nullable(),
    usEpaIndex: z.number().nullable(),
    note: z.string().max(400),
  }),
  wind: z.object({
    level: EnvironmentLevelSchema,
    windKph: z.number().nullable(),
    note: z.string().max(400),
  }),
  forecast: z.object({
    daysAnalysed: z.number().int().min(0).max(14),
    alerts: z
      .array(
        z.object({
          date: z.string().max(20),
          kind: z.enum(["dust", "severe_dust", "heat", "wind"]),
          detail: z.string().max(240),
        }),
      )
      .max(28),
    note: z.string().max(400),
  }),
  /** Maintenance advice that follows from the conditions above, nothing else. */
  recommendations: z.array(z.string().max(300)).max(10),
});

export type EnvironmentAssessment = z.infer<typeof EnvironmentAssessmentSchema>;

/**
 * A completed analysis, validated before anything is stored so a malformed
 * result can never be saved as a successful run.
 *
 * The shape is the one Session 8 wrote for the model's answer, kept so that
 * rows saved then still read back and so the page did not have to be rebuilt.
 * `environment` is optional here for exactly that reason: rows written before
 * 2026-09-22 do not have it. Everything written from now on does, and the
 * route validates new results against `RuleEngineAnalysisSchema` below, which
 * requires it.
 */
export const SiteAnalysisSchema = z.object({
  feasibility: z.object({
    verdict: z.enum(["promising", "mixed", "poor", "insufficient_data"]),
    summary: z.string().min(1).max(600),
  }),
  roofAssessment: z.object({
    findings: z.array(z.string()).max(12),
    limitations: z.array(z.string()).max(12),
  }),
  solarPotential: z.object({
    findings: z.array(z.string()).max(12),
    /** Every figure taken straight from a provider, with the provider named. */
    apiProvidedValues: z.array(z.string()).max(28),
    /** Every conclusion Solink reached, with the rule and the numbers in it. */
    calculatedValues: z.array(z.string()).max(28),
  }),
  weatherConsiderations: z.object({
    findings: z.array(z.string()).max(12),
  }),
  energy: z.object({
    annualEnergyDcKwh: z.number().nullable(),
    basis: z.string().max(400),
  }),
  systemConsiderations: z.array(z.string()).max(12),
  limitations: z.array(z.string()).max(14),
  reasoning: z.string().min(1).max(6000),
  dataCompleteness: z.object({
    level: z.enum(["high", "medium", "low"]),
    missing: z.array(z.string()).max(16),
  }),
  sourceReferences: z.array(z.string()).max(6),
  environment: EnvironmentAssessmentSchema.optional(),
});

export type SiteAnalysis = z.infer<typeof SiteAnalysisSchema>;

/** What the rule engine must produce: the same analysis, environment included. */
export const RuleEngineAnalysisSchema = SiteAnalysisSchema.extend({
  environment: EnvironmentAssessmentSchema,
});

export type RuleEngineAnalysis = z.infer<typeof RuleEngineAnalysisSchema>;

/* ------------------------------------------------------------ stored shape */

/** What a completed run stores in `ai_analyses.output`. */
export interface SiteAnalysisOutput {
  status: "completed" | "failed";
  stage: StageName;
  analysis?: SiteAnalysis;
  sources?: AnalysisSources;
  unavailable?: string[];
  reason?: string;
  error?: string;
  completed_at?: string;
}

/** One `ai_analyses` row of kind 'site_analysis', as the read path returns it. */
export interface SiteAnalysisRow {
  id: string;
  kind: string;
  input_summary: {
    address?: string;
    started_at?: string;
    location?: NormalisedLocation;
    normalised?: NormalisedSite;
  };
  output: SiteAnalysisOutput;
  model: string | null;
  created_at: string;
}
