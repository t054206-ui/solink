/**
 * Solink solar calculations — pure, transparent functions.
 *
 * Principle: every function takes ALL of its assumptions as explicit inputs and
 * returns a Classified value with the formula and assumptions attached. No
 * physical constant, tariff, irradiance figure, loss factor, emission factor,
 * or degradation rate is hard-coded here. Missing inputs → "unavailable" with
 * the reason (a placeholder name), never a guessed number.
 */
import { type Classified, unavailable } from "@/lib/classification";
import { PLACEHOLDERS } from "@/lib/config/placeholders";

export interface SolarAssumptions {
  /** Site solar resource, kWh/m²/day (≈ peak sun hours). Source: [PLACEHOLDER: SOLAR RESOURCE DATA SOURCE] or user-provided. */
  peakSunHoursPerDay?: number | null;
  /** Performance ratio 0–1 (system losses: heat, soiling, wiring, inverter). [PLACEHOLDER: SYSTEM PERFORMANCE RATIO / LOSS FACTOR] */
  performanceRatio?: number | null;
  /** Electricity tariff, currency per kWh. [PLACEHOLDER: ELECTRICITY TARIFF] */
  tariffPerKwh?: number | null;
  /** Grid emission factor, kg CO2 per kWh. [PLACEHOLDER: GRID CO2 EMISSION FACTOR] */
  gridCo2KgPerKwh?: number | null;
  /** Annual degradation, fraction per year (e.g. from performance warranty). [PLACEHOLDER: EXPECTED PANEL DEGRADATION RATE] */
  annualDegradation?: number | null;
  /** Analysis horizon in years. [PLACEHOLDER: TCO PERIOD] */
  horizonYears?: number | null;
  currency?: string;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** System capacity from panel count × rated power (W). CALCULATED. */
export function systemCapacityKwp(panelCount: number | null, ratedPowerW: number | null): Classified {
  if (!isNum(panelCount) || !isNum(ratedPowerW)) return unavailable("Panel count and rated panel power are required.");
  return { value: (panelCount * ratedPowerW) / 1000, cls: "calculated", source: "Solink calculator", notes: [`${panelCount} panels × ${ratedPowerW} W ÷ 1000`] };
}

/** How many panels fit an area given panel dimensions (mm) and a spacing factor. CALCULATED (geometry only). */
export function panelsThatFit(areaM2: number | null, lengthMm: number | null, widthMm: number | null, usableFraction = 1): Classified {
  if (!isNum(areaM2) || !isNum(lengthMm) || !isNum(widthMm)) return unavailable("Available roof area and panel dimensions are required.");
  const panelArea = (lengthMm / 1000) * (widthMm / 1000);
  const n = Math.floor((areaM2 * usableFraction) / panelArea);
  return { value: n, cls: "calculated", source: "Solink calculator", notes: [`floor(${areaM2} m² × ${usableFraction} ÷ ${panelArea.toFixed(3)} m² per panel)`, "Simple area division; ignores walkways, obstacles and orientation."] };
}

/** Recommended capacity to offset a consumption target. ESTIMATED (depends on solar resource & losses). */
export function capacityForConsumption(monthlyKwh: number | null, a: SolarAssumptions, offsetFraction = 1): Classified {
  if (!isNum(monthlyKwh)) return unavailable("Monthly electricity consumption is required.");
  if (!isNum(a.peakSunHoursPerDay)) return unavailable(PLACEHOLDERS.SOLAR_RESOURCE_DATA_SOURCE);
  if (!isNum(a.performanceRatio)) return unavailable(PLACEHOLDERS.SYSTEM_LOSS_FACTOR);
  const dailyKwh = (monthlyKwh * 12) / 365;
  const kwp = (dailyKwh * offsetFraction) / (a.peakSunHoursPerDay * a.performanceRatio);
  return { value: kwp, cls: "estimated", source: "Solink calculator", notes: [
    `(${monthlyKwh} kWh/month × 12 ÷ 365) × ${offsetFraction} ÷ (${a.peakSunHoursPerDay} peak sun hours × ${a.performanceRatio} performance ratio)`,
    "Peak sun hours and performance ratio are assumptions you or an admin supplied.",
  ] };
}

/** Annual production estimate. ESTIMATED. */
export function annualProductionKwh(capacityKwp: number | null, a: SolarAssumptions): Classified {
  if (!isNum(capacityKwp)) return unavailable("System capacity is required.");
  if (!isNum(a.peakSunHoursPerDay)) return unavailable(PLACEHOLDERS.SOLAR_RESOURCE_DATA_SOURCE);
  if (!isNum(a.performanceRatio)) return unavailable(PLACEHOLDERS.SYSTEM_LOSS_FACTOR);
  const v = capacityKwp * a.peakSunHoursPerDay * 365 * a.performanceRatio;
  return { value: v, cls: "estimated", source: "Solink calculator", notes: [`${capacityKwp.toFixed(2)} kWp × ${a.peakSunHoursPerDay} h/day × 365 × ${a.performanceRatio}`] };
}

/** Energy offset fraction. CALCULATED from an estimate → ESTIMATED. */
export function energyOffset(annualProduction: number | null, monthlyConsumptionKwh: number | null): Classified {
  if (!isNum(annualProduction) || !isNum(monthlyConsumptionKwh) || monthlyConsumptionKwh <= 0) return unavailable("Annual production and consumption are required.");
  return { value: annualProduction / (monthlyConsumptionKwh * 12), cls: "estimated", source: "Solink calculator", notes: ["Annual production ÷ annual consumption"] };
}

/** Annual savings. Requires a tariff — never assumed. ESTIMATED. */
export function annualSavings(annualProduction: number | null, a: SolarAssumptions, selfConsumptionFraction = 1): Classified {
  if (!isNum(annualProduction)) return unavailable("Annual production is required.");
  if (!isNum(a.tariffPerKwh)) return unavailable(PLACEHOLDERS.ELECTRICITY_TARIFF);
  return { value: annualProduction * selfConsumptionFraction * a.tariffPerKwh, cls: "estimated", source: "Solink calculator", notes: [
    `${Math.round(annualProduction)} kWh × ${selfConsumptionFraction} self-consumed × ${a.tariffPerKwh} ${a.currency ?? ""}/kWh`,
    "Assumes the tariff applies to every kWh offset. Export/net-metering rules are not modelled.",
  ] };
}

/** Simple payback. ESTIMATED. */
export function paybackYears(totalCost: number | null, annualSavingsValue: number | null, annualOpex = 0): Classified {
  if (!isNum(totalCost)) return unavailable("Total system cost (product + installation) is required.");
  if (!isNum(annualSavingsValue)) return unavailable("Annual savings could not be estimated.");
  const net = annualSavingsValue - annualOpex;
  if (net <= 0) return unavailable("Annual savings do not exceed annual costs, so payback cannot be reached.");
  return { value: totalCost / net, cls: "estimated", source: "Solink calculator", notes: [`${totalCost} ÷ (${annualSavingsValue.toFixed(0)} − ${annualOpex} annual costs)`, "Simple payback; ignores inflation, tariff changes and degradation."] };
}

/** CO2 avoided. Requires grid factor. ESTIMATED. */
export function co2AvoidedKg(annualProduction: number | null, a: SolarAssumptions): Classified {
  if (!isNum(annualProduction)) return unavailable("Annual production is required.");
  if (!isNum(a.gridCo2KgPerKwh)) return unavailable(PLACEHOLDERS.GRID_CO2_EMISSION_FACTOR);
  return { value: annualProduction * a.gridCo2KgPerKwh, cls: "estimated", source: "Solink calculator", notes: [`${Math.round(annualProduction)} kWh × ${a.gridCo2KgPerKwh} kg CO₂/kWh`] };
}

/** Lifetime production with degradation over a horizon. ESTIMATED. */
export function lifetimeProductionKwh(year1Kwh: number | null, a: SolarAssumptions): Classified {
  if (!isNum(year1Kwh)) return unavailable("Year-1 production is required.");
  if (!isNum(a.horizonYears)) return unavailable(PLACEHOLDERS.TCO_PERIOD);
  if (!isNum(a.annualDegradation)) return unavailable(PLACEHOLDERS.EXPECTED_PANEL_DEGRADATION_RATE);
  let total = 0;
  for (let y = 0; y < a.horizonYears; y++) total += year1Kwh * Math.pow(1 - a.annualDegradation, y);
  return { value: total, cls: "estimated", source: "Solink calculator", notes: [`Σ year1 × (1 − ${a.annualDegradation})^y for ${a.horizonYears} years`] };
}

export interface TcoInputs {
  systemCost: number | null; installation: number | null; annualMaintenance: number | null;
  annualCleaning: number | null; repairsAndReplacements: number | null; horizonYears: number | null;
}
/** Total cost of ownership. Every term must be present (no zero-filling of unknown costs). ESTIMATED. */
export function totalCostOfOwnership(i: TcoInputs): Classified & { breakdown?: Record<string, number> } {
  if (!isNum(i.horizonYears)) return unavailable(PLACEHOLDERS.TCO_PERIOD);
  const missing: string[] = [];
  if (!isNum(i.systemCost)) missing.push("system cost");
  if (!isNum(i.installation)) missing.push(`installation (${PLACEHOLDERS.INSTALLATION_PRICE})`);
  if (!isNum(i.annualMaintenance)) missing.push(`maintenance (${PLACEHOLDERS.MAINTENANCE_PRICE})`);
  if (!isNum(i.annualCleaning)) missing.push(`cleaning (${PLACEHOLDERS.MAINTENANCE_PRICE})`);
  if (!isNum(i.repairsAndReplacements)) missing.push("repairs / replacements");
  if (missing.length) return unavailable(`Missing: ${missing.join(", ")}.`);
  const breakdown = {
    "Initial system cost": i.systemCost!, Installation: i.installation!,
    "Maintenance over period": i.annualMaintenance! * i.horizonYears, "Cleaning over period": i.annualCleaning! * i.horizonYears,
    "Repairs / replacements": i.repairsAndReplacements!,
  };
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  return { value: total, cls: "estimated", source: "Solink calculator", breakdown, notes: [`Over ${i.horizonYears} years; undiscounted.`] };
}

/** Deviation of actual vs expected production. CALCULATED. Thresholds are NOT applied here. */
export function productionDeviation(actualKwh: number | null, expectedKwh: number | null): Classified {
  if (!isNum(actualKwh) || !isNum(expectedKwh) || expectedKwh <= 0) return unavailable("Actual and expected production are both required.");
  return { value: (actualKwh - expectedKwh) / expectedKwh, cls: "calculated", source: "Solink calculator", notes: ["(actual − expected) ÷ expected"] };
}

/** Year-over-year change series. CALCULATED. Flagging a decline as unusual requires [PLACEHOLDER: EXPECTED PANEL DEGRADATION RATE]. */
export function yearOverYearChange(annual: { year: number; kwh: number }[]): { year: number; changePct: number | null }[] {
  return annual.map((r, i) => ({ year: r.year, changePct: i === 0 || annual[i - 1].kwh <= 0 ? null : ((r.kwh - annual[i - 1].kwh) / annual[i - 1].kwh) * 100 }));
}

export function formatNumber(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
