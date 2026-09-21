import "server-only";
import { z } from "zod";
import { geocode, type GeocodeHit } from "@/lib/maps/google";
import { getBuildingInsights } from "@/lib/maps/google";
import { getWeatherBundle } from "@/lib/weather/weatherapi";
import { serverEnv } from "@/lib/config/env";

/**
 * Site analysis: an address in, a normalised picture of that roof out.
 *
 * The pipeline runs entirely on the server, in this order, and each step feeds
 * the next with real values:
 *
 *   address → Google Geocoding → Google Solar buildingInsights → WeatherAPI
 *           → normalise + validate → (caller hands this to Claude)
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
  forecast: {
    date: string;
    avgTempC: number | null;
    maxTempC: number | null;
    minTempC: number | null;
    totalPrecipMm: number | null;
    avgHumidityPct: number | null;
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
  if (!solar.available) unavailable.push("roof and solar potential (Google Solar)");
  else {
    if (solar.wholeRoofAreaM2 === null) unavailable.push("roof area");
    if (solar.roofSegments.length === 0) unavailable.push("roof segments (pitch and orientation)");
    if (solar.maxSunshineHoursPerYear === null) unavailable.push("annual sunshine hours");
    if (solar.bestConfigYearlyEnergyDcKwh === null) unavailable.push("modelled annual energy");
  }
  if (!weather.available) unavailable.push("weather conditions (WeatherAPI)");

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
    roofSegments: (sp.roofSegmentStats ?? []).map((s) => ({
      pitchDegrees: num(s.pitchDegrees),
      azimuthDegrees: num(s.azimuthDegrees),
      areaM2: num(s.stats?.areaMeters2),
      sunshineMedianHoursPerYear: medianQuantile(s.stats?.sunshineQuantiles),
    })),
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
    forecast: result.data.forecast.map((f) => ({
      date: f.date,
      avgTempC: num(f.avgtemp_c),
      maxTempC: num(f.maxtemp_c),
      minTempC: num(f.mintemp_c),
      totalPrecipMm: num(f.totalprecip_mm),
      avgHumidityPct: num(f.avghumidity),
      uvIndex: num(f.uv),
      condition: f.condition ?? null,
    })),
  };
}

/* ------------------------------------------------------- Claude's structured output */

/**
 * What Claude must return. Validated before anything is stored, so a malformed
 * answer can never be saved as a successful analysis.
 */
export const SiteAnalysisSchema = z.object({
  feasibility: z.object({
    verdict: z.enum(["promising", "mixed", "poor", "insufficient_data"]),
    summary: z.string().min(1).max(600),
  }),
  roofAssessment: z.object({
    findings: z.array(z.string()).max(8),
    limitations: z.array(z.string()).max(8),
  }),
  solarPotential: z.object({
    findings: z.array(z.string()).max(8),
    apiProvidedValues: z.array(z.string()).max(12),
    calculatedValues: z.array(z.string()).max(12),
  }),
  weatherConsiderations: z.object({
    findings: z.array(z.string()).max(8),
  }),
  energy: z.object({
    annualEnergyDcKwh: z.number().nullable(),
    basis: z.string().max(400),
  }),
  systemConsiderations: z.array(z.string()).max(8),
  limitations: z.array(z.string()).max(10),
  reasoning: z.string().min(1).max(2500),
  dataCompleteness: z.object({
    level: z.enum(["high", "medium", "low"]),
    missing: z.array(z.string()).max(12),
  }),
  sourceReferences: z.array(z.string()).max(6),
});

export type SiteAnalysis = z.infer<typeof SiteAnalysisSchema>;

/** The shape description handed to Claude, matching SiteAnalysisSchema exactly. */
export const SITE_ANALYSIS_SHAPE = `{
  "feasibility": {"verdict":"promising|mixed|poor|insufficient_data","summary":string},
  "roofAssessment": {"findings":string[],"limitations":string[]},
  "solarPotential": {"findings":string[],"apiProvidedValues":string[],"calculatedValues":string[]},
  "weatherConsiderations": {"findings":string[]},
  "energy": {"annualEnergyDcKwh":number|null,"basis":string},
  "systemConsiderations": string[],
  "limitations": string[],
  "reasoning": string,
  "dataCompleteness": {"level":"high|medium|low","missing":string[]},
  "sourceReferences": string[]
}`;

/** The rules Claude is held to. Kept beside the schema so the two stay in step. */
export function buildAnalysisSystemPrompt(site: NormalisedSite): string {
  return [
    "You are analysing one specific roof for rooftop solar, for a homeowner in Kuwait.",
    "",
    "The DATA block below is the complete set of measurements available. It came from Google's Geocoding API, Google's Solar API and WeatherAPI.",
    "",
    "Rules, all of them absolute:",
    "- Use only the values in the DATA block. Do not add figures from general knowledge.",
    "- Never invent a roof characteristic that is not there. If pitch, orientation or area is null, say it is unavailable.",
    "- Never fabricate a production figure. Only report annual energy if the data contains one, and name the field it came from.",
    "- Put every number you took straight from a provider in solarPotential.apiProvidedValues, naming the provider.",
    "- Put anything you worked out yourself in solarPotential.calculatedValues, with the arithmetic.",
    "- List everything that was unavailable in dataCompleteness.missing and in limitations.",
    "- If the Solar API returned nothing, verdict must be insufficient_data. A weather reading alone cannot establish feasibility.",
    "- Weather here is a short current window, not a climate record. Do not present it as an annual pattern.",
    "- Write for a homeowner: plain sentences, no jargon without explanation, no marketing language.",
    "- Do not recommend a specific product, price or installer. None are in the data.",
    "",
    `DATA:\n${JSON.stringify(site, null, 2)}`,
  ].join("\n");
}

/** Whether the AI step can run at all. */
export function isAnalysisConfigured(): boolean {
  return Boolean(serverEnv().claudeApiKey);
}

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
