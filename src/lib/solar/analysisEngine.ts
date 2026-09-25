import type {
  EnvironmentAssessment,
  EnvironmentLevel,
  NormalisedSite,
  NormalisedWeather,
  RuleEngineAnalysis,
} from "./siteAnalysis";

/**
 * The Solink rule engine: normalised site data in, a finished site analysis out.
 *
 * It replaces the model call this analysis used to make. Nothing here is
 * generated, sampled or guessed: every level is a comparison between a value a
 * provider returned and a threshold written down in this file, and every
 * sentence is a template filled with those same values. Run it twice on the
 * same data and it returns the same analysis.
 *
 * What it is allowed to talk about:
 *
 *   - where Google put the address, and how precisely
 *   - the conditions WeatherAPI reported there: heat, dust, air quality, wind,
 *     and the forecast days it returned
 *   - what those conditions mean for keeping panels working and clean
 *
 * What it must never do, and does not:
 *
 *   - state or estimate roof area, pitch, orientation, panel count, irradiance
 *     or annual production. None of that is measured anywhere in the pipeline,
 *     so all of it stays unavailable
 *   - turn a missing value into a zero
 *   - claim a panel is dirty, damaged or underperforming. No system is measured
 *     here; the recommendations are about conditions, not about equipment
 *
 * This module is deliberately free of secrets, network calls and server-only
 * imports (the imports above are types, erased at compile time), so it can be
 * read, reviewed and run on its own.
 */

/* ------------------------------------------------------------------ engine id */

export const ANALYSIS_ENGINE = {
  /** Stored in `ai_analyses.model`. Not a model name: no model is involved. */
  id: "solink-rule-engine",
  version: "1.0.0",
  label: "Solink analysis rules",
} as const;

/* ----------------------------------------------------------------- thresholds */

/**
 * Solink's own environmental thresholds. These are application-defined
 * operating bands chosen for Kuwait's climate, not engineering standards and
 * not anybody's published limits, and the analysis says so wherever it uses
 * them. The one exception is the air-quality index, which is WeatherAPI's US
 * EPA index reported as the provider gives it.
 *
 * Units: °C, µg/m³, km/h.
 */
export const SOLINK_ENVIRONMENT_THRESHOLDS = {
  /** Current air temperature. Panels lose output as they heat; crews are at risk above the top band. */
  heatC: { moderate: 30, high: 40, extreme: 48 },
  /** PM10: coarse airborne particles, the closest proxy in this data for dust that settles on glass. */
  pm10: { moderate: 50, high: 150, extreme: 350 },
  /** PM2.5: used for air quality only when the provider's EPA index is missing. */
  pm2_5: { moderate: 25, high: 75, extreme: 150 },
  /** Wind at the location. High wind lifts dust and is a reason to delay rooftop work. */
  windKph: { moderate: 20, high: 40, extreme: 60 },
  /** Forecast days are flagged against these, not against the current-conditions bands. */
  forecast: { heatC: 45, windKph: 40 },
} as const;

/** WeatherAPI's US EPA index, 1–6, with the provider's own wording. */
const EPA_INDEX_LABEL: Record<number, string> = {
  1: "good",
  2: "moderate",
  3: "unhealthy for sensitive groups",
  4: "unhealthy",
  5: "very unhealthy",
  6: "hazardous",
};

/** Condition texts that mean airborne dust or sand, matched case-insensitively. */
const DUST_WORDS = ["sandstorm", "sand storm", "duststorm", "dust storm", "blowing dust", "blowing sand", "dust"] as const;
const SEVERITY_WORDS = ["severe", "heavy", "widespread", "extreme"] as const;

/* -------------------------------------------------------------------- helpers */

const LEVEL_ORDER: EnvironmentLevel[] = ["unavailable", "low", "moderate", "high", "extreme"];

/** The more serious of two levels. `unavailable` never outranks a real reading. */
function worst(a: EnvironmentLevel, b: EnvironmentLevel): EnvironmentLevel {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

/** Places a reading in its band. A missing reading is unavailable, never zero. */
function band(value: number | null, t: { moderate: number; high: number; extreme: number }): EnvironmentLevel {
  if (value === null) return "unavailable";
  if (value >= t.extreme) return "extreme";
  if (value >= t.high) return "high";
  if (value >= t.moderate) return "moderate";
  return "low";
}

/** A number for a sentence, or nothing when there is no number. */
function fmt(value: number | null, digits = 1): string | null {
  return value === null ? null : value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function hasDust(condition: string | null): boolean {
  if (!condition) return false;
  const c = condition.toLowerCase();
  return DUST_WORDS.some((w) => c.includes(w));
}

function isSevere(condition: string | null): boolean {
  if (!condition) return false;
  const c = condition.toLowerCase();
  return SEVERITY_WORDS.some((w) => c.includes(w));
}

/** Keeps a template inside the schema's limit without ever cutting mid-number. */
function clamp(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/* ----------------------------------------------------------- the rule results */

interface Rule {
  level: EnvironmentLevel;
  note: string;
  /** How this level was reached, for solarPotential.calculatedValues. */
  trace: string | null;
}

/** A. Heat. The current air temperature against the Solink heat bands. */
function heatRule(w: NormalisedWeather): Rule {
  const t = SOLINK_ENVIRONMENT_THRESHOLDS.heatC;
  const level = band(w.temperatureC, t);
  if (level === "unavailable") {
    return {
      level,
      note: "WeatherAPI did not return a temperature for this location, so heat exposure was not assessed.",
      trace: null,
    };
  }
  const value = fmt(w.temperatureC);
  const explanation: Record<Exclude<EnvironmentLevel, "unavailable">, string> = {
    low: `below ${t.moderate} °C`,
    moderate: `between ${t.moderate} °C and ${t.high} °C`,
    high: `between ${t.high} °C and ${t.extreme} °C`,
    extreme: `${t.extreme} °C or above`,
  };
  const meaning: Record<Exclude<EnvironmentLevel, "unavailable">, string> = {
    low: "Panels run close to their rated conditions at this temperature.",
    moderate: "Panels give up a little output as they warm, which is normal and expected.",
    high: "Panels run well above their rated temperature, so output is lower than the nameplate figure while the heat lasts.",
    extreme: "Panels and inverters are working at the top of their temperature range, and rooftop work is unsafe in this heat without precautions.",
  };
  return {
    level,
    note: `WeatherAPI reports ${value} °C at this location. Solink treats ${explanation[level]} as ${level} heat exposure. ${meaning[level]}`,
    trace: `Heat exposure: ${level}. Solink heat threshold, current temperature ${value} °C is ${explanation[level]}`,
  };
}

/** B. Dust and soiling. PM10 first, then what the sky is actually doing. */
function dustRule(w: NormalisedWeather): Rule & { dustEventNow: boolean; dustEventForecast: boolean } {
  const t = SOLINK_ENVIRONMENT_THRESHOLDS.pm10;
  const byParticles = band(w.pm10, t);
  const dustEventNow = hasDust(w.condition);
  const dustEventForecast = w.forecast.some((d) => hasDust(d.condition));

  // A dust event that is happening outranks a quiet particle reading: the
  // provider is describing the sky, and glass is being covered either way.
  const level = dustEventNow ? worst(byParticles, isSevere(w.condition) ? "extreme" : "high") : byParticles;

  const parts: string[] = [];
  const pm10 = fmt(w.pm10);
  if (pm10 !== null) parts.push(`PM10 is ${pm10} µg/m³.`);
  else parts.push("WeatherAPI did not return a PM10 reading for this location.");
  if (w.condition) parts.push(`The current condition is reported as ${w.condition}.`);
  if (level !== "unavailable") {
    const band10: Record<Exclude<EnvironmentLevel, "unavailable">, string> = {
      low: `below ${t.moderate} µg/m³`,
      moderate: `between ${t.moderate} and ${t.high} µg/m³`,
      high: `between ${t.high} and ${t.extreme} µg/m³`,
      extreme: `${t.extreme} µg/m³ or above`,
    };
    parts.push(
      dustEventNow
        ? `Solink treats a reported dust or sand event as ${level} soiling risk regardless of the particle count.`
        : `Solink treats PM10 ${band10[level]} as ${level} soiling risk.`,
    );
  }
  if (dustEventForecast) parts.push("A dust event also appears in the forecast period.");

  return {
    level,
    note: parts.join(" "),
    trace:
      level === "unavailable"
        ? null
        : dustEventNow
          ? `Soiling risk: ${level}. Solink dust rule, WeatherAPI condition "${w.condition}" is a dust event${pm10 ? ` (PM10 ${pm10} µg/m³)` : ""}`
          : `Soiling risk: ${level}. Solink PM10 threshold, PM10 ${pm10} µg/m³`,
    dustEventNow,
    dustEventForecast,
  };
}

/** C. Air quality. WeatherAPI's EPA index when it is there, PM2.5 when it is not. */
function airQualityRule(w: NormalisedWeather): Rule {
  const epa = w.usEpaIndex;
  if (epa !== null && EPA_INDEX_LABEL[epa]) {
    const level: EnvironmentLevel = epa >= 5 ? "extreme" : epa >= 3 ? "high" : epa === 2 ? "moderate" : "low";
    const readings = [
      fmt(w.pm2_5) ? `PM2.5 ${fmt(w.pm2_5)} µg/m³` : null,
      fmt(w.pm10) ? `PM10 ${fmt(w.pm10)} µg/m³` : null,
    ].filter(Boolean);
    return {
      level,
      note: `WeatherAPI reports a US EPA air-quality index of ${epa} (${EPA_INDEX_LABEL[epa]})${
        readings.length ? `, with ${readings.join(" and ")}` : ""
      }. This describes the air at the location, not the state of any equipment.`,
      trace: `Air quality: ${level}. WeatherAPI US EPA index ${epa} (${EPA_INDEX_LABEL[epa]}), mapped by Solink to ${level}`,
    };
  }

  const t = SOLINK_ENVIRONMENT_THRESHOLDS.pm2_5;
  const level = band(w.pm2_5, t);
  if (level === "unavailable") {
    return {
      level,
      note: "WeatherAPI returned no air-quality data for this location, so air quality was not assessed.",
      trace: null,
    };
  }
  return {
    level,
    note: `WeatherAPI did not return an EPA index, so air quality was read from PM2.5, which is ${fmt(w.pm2_5)} µg/m³. Solink treats that as ${level}.`,
    trace: `Air quality: ${level}. Solink PM2.5 threshold (no EPA index returned), PM2.5 ${fmt(w.pm2_5)} µg/m³`,
  };
}

/** D. Wind. */
function windRule(w: NormalisedWeather): Rule {
  const t = SOLINK_ENVIRONMENT_THRESHOLDS.windKph;
  const level = band(w.windKph, t);
  if (level === "unavailable") {
    return { level, note: "WeatherAPI did not return a wind speed for this location, so wind exposure was not assessed.", trace: null };
  }
  const value = fmt(w.windKph);
  const explanation: Record<Exclude<EnvironmentLevel, "unavailable">, string> = {
    low: `below ${t.moderate} km/h`,
    moderate: `between ${t.moderate} and ${t.high} km/h`,
    high: `between ${t.high} and ${t.extreme} km/h`,
    extreme: `${t.extreme} km/h or above`,
  };
  return {
    level,
    note: `Wind at the location is ${value} km/h. Solink treats ${explanation[level]} as ${level} wind exposure.${
      level === "high" || level === "extreme" ? " Wind at this strength lifts dust and is a reason to postpone work on a roof." : ""
    }`,
    trace: `Wind exposure: ${level}. Solink wind threshold, wind ${value} km/h is ${explanation[level]}`,
  };
}

/** E. Forecast. Only the days WeatherAPI actually returned. */
function forecastRule(w: NormalisedWeather): { alerts: EnvironmentAssessment["forecast"]["alerts"]; note: string; traces: string[] } {
  const alerts: EnvironmentAssessment["forecast"]["alerts"] = [];
  const traces: string[] = [];
  const f = SOLINK_ENVIRONMENT_THRESHOLDS.forecast;

  for (const day of w.forecast) {
    if (hasDust(day.condition)) {
      const severe = isSevere(day.condition);
      alerts.push({
        date: day.date,
        kind: severe ? "severe_dust" : "dust",
        detail: clamp(`WeatherAPI forecasts ${day.condition} on ${day.date}.`, 240),
      });
      traces.push(`Forecast alert (${severe ? "severe dust" : "dust"}): ${day.date}. WeatherAPI forecast condition "${day.condition}"`);
    }
    if (day.maxTempC !== null && day.maxTempC >= f.heatC) {
      alerts.push({
        date: day.date,
        kind: "heat",
        detail: clamp(`A daytime high of ${fmt(day.maxTempC)} °C is forecast on ${day.date}.`, 240),
      });
      traces.push(`Forecast alert (heat): ${day.date}. Solink forecast heat threshold ${f.heatC} °C, forecast high ${fmt(day.maxTempC)} °C`);
    }
    if (day.maxWindKph !== null && day.maxWindKph >= f.windKph) {
      alerts.push({
        date: day.date,
        kind: "wind",
        detail: clamp(`Wind is forecast to reach ${fmt(day.maxWindKph)} km/h on ${day.date}.`, 240),
      });
      traces.push(`Forecast alert (wind): ${day.date}. Solink forecast wind threshold ${f.windKph} km/h, forecast maximum ${fmt(day.maxWindKph)} km/h`);
    }
  }

  const days = w.forecast.length;
  const span = days > 0 ? ` (${w.forecast[0].date} to ${w.forecast[days - 1].date})` : "";
  const note =
    days === 0
      ? "WeatherAPI returned no forecast days for this location, so nothing ahead was assessed."
      : alerts.length === 0
        ? `The forecast covers ${days} day${days === 1 ? "" : "s"}${span}. No dust event, forecast high of ${f.heatC} °C or more, or wind of ${f.windKph} km/h or more appears in it.`
        : `The forecast covers ${days} day${days === 1 ? "" : "s"}${span} and contains ${alerts.length} condition${alerts.length === 1 ? "" : "s"} worth watching. Nothing is claimed beyond those days.`;

  return { alerts, note, traces };
}

/* ---------------------------------------------------------- overall + advice */

const STATUS_BY_LEVEL: Record<EnvironmentLevel, EnvironmentAssessment["overallStatus"]> = {
  unavailable: "unavailable",
  low: "low",
  moderate: "moderate",
  high: "high",
  extreme: "attention_required",
};

/** F. Maintenance advice. Conditions only: no claim about any installed panel. */
function recommendations(env: {
  heat: EnvironmentLevel;
  dust: EnvironmentLevel;
  air: EnvironmentLevel;
  wind: EnvironmentLevel;
  dustEventNow: boolean;
  dustEventForecast: boolean;
}): string[] {
  const out: string[] = [];

  if (env.dustEventNow) {
    out.push("A dust event is in progress. Soiling risk is raised: once it passes, look over the panel surfaces and decide then whether a clean is needed.");
  } else if (env.dust === "high" || env.dust === "extreme") {
    out.push("Airborne dust is high at this location. Inspect panel surfaces more often than usual and clean only when an inspection shows it is warranted.");
  } else if (env.dust === "moderate") {
    out.push("Airborne dust is moderate. A routine look at the panel surfaces between scheduled cleans is enough.");
  }

  if (env.dustEventForecast) {
    out.push("A dust event is forecast in the days ahead. Plan to check the system after it passes rather than during it.");
  }

  if (env.heat === "extreme") {
    out.push("Heat exposure is extreme. Watch system output and equipment temperatures while it lasts, keep inverter ventilation clear, and avoid rooftop work in the middle of the day.");
  } else if (env.heat === "high") {
    out.push("Heat exposure is high. Expect output below the nameplate figure while the heat lasts, and keep the area around the inverter clear and ventilated.");
  }

  if (env.wind === "extreme" || env.wind === "high") {
    out.push("Wind is strong at the location. Postpone rooftop work until it eases, then check mountings, fixings and anything loose nearby.");
  }

  if (env.air === "extreme" || env.air === "high") {
    out.push("Air quality is poor at this location. Anyone working on the roof should plan for it, and it is a further reason to expect dust on the glass.");
  }

  if (out.length === 0) {
    out.push("No condition in this data calls for action beyond the normal maintenance schedule.");
  }

  out.push("These follow from the conditions above and nothing else. No panel, inverter or meter was measured, so none of this says that a system is dirty, damaged or underperforming.");
  return out.slice(0, 10);
}

/* -------------------------------------------------------------- the analysis */

/**
 * Runs the rules over a normalised site and returns the finished analysis,
 * in the shape the page already renders and the database already stores.
 */
export function analyseSiteConditions(site: NormalisedSite): RuleEngineAnalysis {
  const { location, solar, weather } = site;

  const heat = heatRule(weather);
  const dust = dustRule(weather);
  const air = airQualityRule(weather);
  const wind = windRule(weather);
  const forecast = forecastRule(weather);

  /* Overall status: the most serious of the four, raised to attention_required
     when a dust event is happening now and the soiling risk is already high. */
  const highest = [heat.level, dust.level, air.level, wind.level].reduce<EnvironmentLevel>(
    (acc, l) => worst(acc, l),
    "unavailable",
  );
  const overallStatus: EnvironmentAssessment["overallStatus"] =
    dust.dustEventNow && (dust.level === "high" || dust.level === "extreme") ? "attention_required" : STATUS_BY_LEVEL[highest];

  const named: [string, EnvironmentLevel][] = [
    ["heat", heat.level],
    ["dust and soiling", dust.level],
    ["air quality", air.level],
    ["wind", wind.level],
  ];
  const drivers = named.filter(([, l]) => l === highest && l !== "unavailable").map(([n]) => n);
  const statusReason =
    overallStatus === "unavailable"
      ? "No environmental readings were available for this location, so no overall status could be reached."
      : dust.dustEventNow && (dust.level === "high" || dust.level === "extreme")
        ? `A dust event is in progress and soiling risk is ${dust.level}, which Solink treats as needing attention.`
        : `The most serious condition is ${drivers.join(" and ")} at ${highest}. Solink maps that to an overall environmental status of ${overallStatus.replace("_", " ")}.`;

  const environment: EnvironmentAssessment = {
    engine: { id: ANALYSIS_ENGINE.id, version: ANALYSIS_ENGINE.version, label: ANALYSIS_ENGINE.label },
    overallStatus,
    statusReason: clamp(statusReason, 400),
    heat: { level: heat.level, temperatureC: weather.temperatureC, note: clamp(heat.note, 400) },
    dust: {
      level: dust.level,
      pm10: weather.pm10,
      condition: weather.condition ? clamp(weather.condition, 120) : null,
      dustEventNow: dust.dustEventNow,
      dustEventForecast: dust.dustEventForecast,
      note: clamp(dust.note, 400),
    },
    airQuality: { level: air.level, pm2_5: weather.pm2_5, pm10: weather.pm10, usEpaIndex: weather.usEpaIndex, note: clamp(air.note, 400) },
    wind: { level: wind.level, windKph: weather.windKph, note: clamp(wind.note, 400) },
    forecast: { daysAnalysed: weather.forecast.length, alerts: forecast.alerts.slice(0, 28), note: clamp(forecast.note, 400) },
    recommendations: recommendations({
      heat: heat.level,
      dust: dust.level,
      air: air.level,
      wind: wind.level,
      dustEventNow: dust.dustEventNow,
      dustEventForecast: dust.dustEventForecast,
    }).map((r) => clamp(r, 300)),
  };

  /* ------------------------------------------------------------- narrative */

  const where = location.formattedAddress ?? location.address;
  const precision = location.approximate
    ? `Google resolved it to ${where}${location.matchPrecision ? ` (${location.matchPrecision})` : ""}, which is a nearby street or area rather than the building itself, so the conditions below describe that area.`
    : `Google resolved it to ${where}${location.matchPrecision ? ` (${location.matchPrecision})` : ""}.`;

  /* Verdict. It is a statement about the location's conditions, never about a
     roof: nothing in this pipeline measures the building. "poor" is therefore
     not reachable — no environmental reading on its own makes a location
     unsuitable for solar — and a run without weather data is insufficient_data
     rather than a judgement. */
  const verdict: RuleEngineAnalysis["feasibility"]["verdict"] = !weather.available
    ? "insufficient_data"
    : overallStatus === "unavailable"
      ? "insufficient_data"
      : overallStatus === "high" || overallStatus === "attention_required"
        ? "mixed"
        : "promising";

  const summary = clamp(
    [
      "No roof measurements were available for this address, so this assesses the location's environmental conditions and not the building's roof.",
      precision,
      weather.available
        ? `WeatherAPI reports ${[fmt(weather.temperatureC) ? `${fmt(weather.temperatureC)} °C` : null, weather.condition, fmt(weather.pm10) ? `PM10 ${fmt(weather.pm10)} µg/m³` : null].filter(Boolean).join(", ")}.`
        : "No weather or air-quality data was available for this location.",
      `Overall environmental status: ${overallStatus.replace("_", " ")}.`,
    ].join(" "),
    600,
  );

  /* ------------------------------------------------ what came from providers */

  const apiProvidedValues: string[] = [
    `Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (Google Geocoding API)`,
    `Resolved address: ${location.formattedAddress ?? "not returned"} (Google Geocoding API)`,
    `Match precision: ${location.matchPrecision ?? "not returned"}${location.approximate ? ", approximate" : ""} (Google Geocoding API)`,
  ];
  const push = (label: string, value: string | null, unit = "", provider = "WeatherAPI") => {
    if (value !== null) apiProvidedValues.push(`${label}: ${value}${unit} (${provider})`);
  };
  if (weather.available) {
    if (weather.observedAt) apiProvidedValues.push(`Observed at: ${weather.observedAt} (WeatherAPI)`);
    push("Temperature", fmt(weather.temperatureC), " °C");
    push("Condition", weather.condition);
    push("Cloud cover", fmt(weather.cloudCoverPct, 0), " %");
    push("Humidity", fmt(weather.humidityPct, 0), " %");
    push("Wind", fmt(weather.windKph), " km/h");
    push("Precipitation", fmt(weather.precipitationMm), " mm");
    push("UV index", fmt(weather.uvIndex));
    push("PM2.5", fmt(weather.pm2_5), " µg/m³");
    push("PM10", fmt(weather.pm10), " µg/m³");
    push("US EPA air-quality index", fmt(weather.usEpaIndex, 0));
    for (const d of weather.forecast) {
      const bits = [
        d.condition,
        fmt(d.maxTempC) ? `high ${fmt(d.maxTempC)} °C` : null,
        fmt(d.minTempC) ? `low ${fmt(d.minTempC)} °C` : null,
        fmt(d.maxWindKph) ? `wind to ${fmt(d.maxWindKph)} km/h` : null,
      ].filter(Boolean);
      apiProvidedValues.push(`Forecast ${d.date}: ${bits.join(", ")} (WeatherAPI)`);
    }
  }
  if (solar.available) {
    if (solar.wholeRoofAreaM2 !== null) apiProvidedValues.push(`Roof area: ${fmt(solar.wholeRoofAreaM2)} m² (Google Solar API)`);
    if (solar.maxArrayPanelsCount !== null) apiProvidedValues.push(`Maximum panels modelled: ${fmt(solar.maxArrayPanelsCount, 0)} (Google Solar API)`);
    if (solar.maxSunshineHoursPerYear !== null) apiProvidedValues.push(`Maximum sunshine: ${fmt(solar.maxSunshineHoursPerYear, 0)} hours/year (Google Solar API)`);
    if (solar.bestConfigYearlyEnergyDcKwh !== null)
      apiProvidedValues.push(`Modelled annual energy (DC): ${fmt(solar.bestConfigYearlyEnergyDcKwh, 0)} kWh (Google Solar API)`);
  }

  const calculatedValues = [heat.trace, dust.trace, air.trace, wind.trace, ...forecast.traces, `Overall environmental status: ${overallStatus.replace("_", " ")}. ${statusReason}`]
    .filter((t): t is string => Boolean(t))
    .map((t) => clamp(t, 300));

  /* ----------------------------------------------------------------- roof */

  const roofFindings = solar.available
    ? [
        solar.wholeRoofAreaM2 !== null ? `Google Solar reports a roof area of ${fmt(solar.wholeRoofAreaM2)} m² at this location.` : null,
        solar.roofSegments.length > 0
          ? `Google Solar returned ${solar.roofSegments.length} roof segment${solar.roofSegments.length === 1 ? "" : "s"}; the largest has a pitch of ${fmt(solar.roofSegments[0].pitchDegrees)}° and faces ${fmt(solar.roofSegments[0].azimuthDegrees, 0)}°.`
          : null,
      ].filter((s): s is string => Boolean(s))
    : [
        "No roof survey was carried out for this address. Roof area, pitch, orientation, shading, usable space and panel count are unavailable, and none of them has been estimated here.",
        "That a roof measurement is missing does not mean it is zero: it means nothing measured it.",
      ];

  const roofLimitations = solar.available
    ? ["Roof figures come from aerial imagery and are not a site survey."]
    : [
        "Roof area: unavailable.",
        "Roof pitch and orientation: unavailable.",
        "Panel count and layout: unavailable.",
        "Annual production for this building: unavailable.",
      ];

  /* -------------------------------------------------------- solar potential */

  const solarFindings = solar.available
    ? [
        solar.bestConfigYearlyEnergyDcKwh !== null
          ? `Google Solar models up to ${fmt(solar.bestConfigYearlyEnergyDcKwh, 0)} kWh a year (DC) for this roof.`
          : "Google Solar returned no modelled annual energy for this roof.",
      ]
    : [
        "Solar potential for this building was not modelled: that needs roof measurements, which this analysis does not have.",
        "What can be said is about the location, not the building: the conditions below are what a system here would have to work in.",
      ];

  const energy: RuleEngineAnalysis["energy"] =
    solar.available && solar.bestConfigYearlyEnergyDcKwh !== null
      ? {
          annualEnergyDcKwh: solar.bestConfigYearlyEnergyDcKwh,
          basis: clamp(
            "Modelled by the Google Solar API for the largest panel configuration it returned. Solink did not calculate this figure and has not adjusted it.",
            400,
          ),
        }
      : {
          annualEnergyDcKwh: null,
          basis: clamp(
            "Unavailable. An annual energy figure needs roof measurements or a designed system, and this analysis has neither. It has not been estimated, and it is not zero.",
            400,
          ),
        };

  /* ---------------------------------------------------------- completeness */

  const missing = [...site.unavailable];
  const completeness: RuleEngineAnalysis["dataCompleteness"]["level"] = !weather.available
    ? "low"
    : solar.available && weather.pm10 !== null && weather.forecast.length > 0
      ? "high"
      : "medium";

  const limitations = [
    solar.available ? "Roof figures are modelled from imagery, not surveyed." : "No roof measurements: area, pitch, orientation, shading and panel count are all unavailable.",
    location.approximate
      ? "Google resolved the address to a nearby street or area rather than the exact building, so the conditions describe that area."
      : null,
    weather.available
      ? `Weather is a single current reading and a ${weather.forecast.length}-day forecast, not a climate record for the site.`
      : "No weather or air-quality data was available, so no environmental assessment could be made.",
    "No installed equipment was measured. Nothing here describes the condition or output of any system.",
    "Solink's heat, dust and wind bands are application-defined operating thresholds for Kuwait, not published standards.",
  ].filter((s): s is string => Boolean(s));

  /* ------------------------------------------------------------- reasoning */

  const reasoning = clamp(
    [
      `The address entered was "${location.address}". ${precision}`,
      weather.available
        ? `WeatherAPI was then asked about those coordinates. ${heat.note} ${dust.note} ${air.note} ${wind.note} ${forecast.note}`
        : "WeatherAPI returned no data for those coordinates, so there are no conditions to report and no assessment could be made.",
      weather.available ? `${statusReason}` : "",
      solar.available
        ? "Google Solar returned roof data for this location; the roof figures above are its, not Solink's."
        : "No roof survey was carried out: the Google Solar API is not part of this analysis. Roof area, pitch, orientation, panel count and annual production are therefore unavailable, and this assessment is about the location's conditions only.",
      "Every level above comes from comparing a value one of these providers returned against a threshold written down in Solink's analysis rules. No model, estimate or sample was used, and no value was filled in where a provider returned nothing.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    6000,
  );

  return {
    feasibility: { verdict, summary },
    roofAssessment: { findings: roofFindings.slice(0, 12), limitations: roofLimitations.slice(0, 12) },
    solarPotential: {
      findings: solarFindings.slice(0, 12),
      apiProvidedValues: apiProvidedValues.slice(0, 28),
      calculatedValues: calculatedValues.slice(0, 28),
    },
    weatherConsiderations: {
      findings: weather.available
        ? [heat.note, dust.note, air.note, wind.note, forecast.note].map((n) => clamp(n, 400)).slice(0, 12)
        : ["No weather or air-quality data was available for this location."],
    },
    energy,
    systemConsiderations: environment.recommendations.slice(0, 12),
    limitations: limitations.slice(0, 14),
    reasoning,
    dataCompleteness: { level: completeness, missing: missing.slice(0, 16) },
    sourceReferences: [
      "Google Maps Platform, Geocoding API: https://developers.google.com/maps/documentation/geocoding",
      "WeatherAPI.com, current conditions, air quality and forecast: https://www.weatherapi.com/docs/",
      `${ANALYSIS_ENGINE.label} ${ANALYSIS_ENGINE.version} (src/lib/solar/analysisEngine.ts): application-defined environmental thresholds, applied to the values above`,
    ],
    environment,
  };
}
