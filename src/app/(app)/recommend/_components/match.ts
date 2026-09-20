/**
 * Panel matching: filter, rank, explain.
 *
 * Pure functions over the catalogue rows the server loaded from Supabase. No
 * product data is defined here.
 *
 * Two rules run through all of it:
 *
 *  - A missing value is missing. It never becomes zero, and it never removes a
 *    panel from the results. A panel with no recorded price is not "free" and
 *    is not "too expensive"; it is a panel whose price nobody has published,
 *    so it still appears, ranked last for a price-led sort and labelled.
 *  - A constraint is only applied when every input it needs exists. Roof-area
 *    feasibility needs both the roof area and a target system size; without
 *    the target, sizing would need a solar-resource figure Solink does not
 *    have, so the filter simply does not run.
 */
import type { Product } from "@/lib/types";
import { areaPerKwpM2, getSpecNum, panelAreaM2, powerDensityWm2, realPrice } from "../../marketplace/_components/product-helpers";

export const PRIORITY_IDS = [
  "lowest_upfront_cost",
  "maximum_production",
  "smallest_roof_area",
  "hot_climate_performance",
  "longest_warranty",
  "verified_data_only",
] as const;

export type PriorityId = (typeof PRIORITY_IDS)[number];

export interface Requirements {
  budget: number | null;
  roofAreaM2: number | null;
  monthlyKwh: number | null;
  desiredKwp: number | null;
  priorities: string[];
}

export interface MatchFlags {
  /** A real KWD price published by a local supplier. */
  hasKuwaitPrice: boolean;
  /** A local supplier lists the product. Not a confirmation of stock. */
  kuwaitListed: boolean;
  /** An admin has reviewed this record. */
  verified: boolean;
  /** Specifications come from a manufacturer datasheet rather than a reseller. */
  manufacturerConfirmed: boolean;
}

export interface Match {
  product: Product;
  /** Sentences built from the record's own numbers. Never generic praise. */
  reasons: string[];
  /** Whole panels needed to reach the requested size, when both figures exist. */
  panelsNeeded: number | null;
  /** Module area those panels occupy, m². Excludes walkways and gaps. */
  areaNeededM2: number | null;
  /** panelsNeeded x published price, when a real price exists. */
  estimatedCostKwd: number | null;
  flags: MatchFlags;
}

export interface Excluded {
  product: Product;
  reason: string;
}

export type MatchStatus = "ok" | "empty_catalogue" | "no_matches";

export interface MatchResult {
  matches: Match[];
  excluded: Excluded[];
  status: MatchStatus;
  /** The priority the ranking used, or null when none was chosen. */
  rankedBy: PriorityId | null;
}

const isPriority = (v: string): v is PriorityId => (PRIORITY_IDS as readonly string[]).includes(v);

/** Whole panels needed for a target size. Rounds up: you cannot buy a fraction of a panel. */
function panelsFor(targetKwp: number, ratedW: number): number {
  return Math.ceil((targetKwp * 1000) / ratedW);
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/**
 * Filter and rank. `products` is whatever the caller loaded; this function
 * assumes nothing about where it came from beyond its shape.
 */
export function matchPanels(products: Product[], req: Requirements): MatchResult {
  const priorities = req.priorities.filter(isPriority);
  const verifiedOnly = priorities.includes("verified_data_only");
  // "Verified data only" removes records; it does not order them. If it is the
  // only thing chosen there is no ranking key, and the caller is told so rather
  // than being shown a list that claims an order it does not have.
  const rankedBy = priorities.find((p) => p !== "verified_data_only") ?? null;

  const candidates = products.filter((p) => p.category === "solar_panel" && !p.is_archived);
  if (candidates.length === 0) return { matches: [], excluded: [], status: "empty_catalogue", rankedBy };

  const matches: Match[] = [];
  const excluded: Excluded[] = [];

  for (const product of candidates) {
    const ratedW = getSpecNum(product.specs, "rated_power_w");
    const price = realPrice(product);
    const areaPerKwp = areaPerKwpM2(product.specs).value;

    if (verifiedOnly && product.source.verification_status !== "verified") {
      excluded.push({ product, reason: "You asked for verified records only, and this record has not been verified yet." });
      continue;
    }

    // Roof area. Only when a target size and a roof area both exist, and the
    // panel records dimensions: otherwise there is nothing to compare.
    let panelsNeeded: number | null = null;
    let areaNeededM2: number | null = null;
    if (req.desiredKwp !== null && ratedW !== null) {
      panelsNeeded = panelsFor(req.desiredKwp, ratedW);
      const one = panelAreaM2(product.specs).value;
      if (one !== null) areaNeededM2 = panelsNeeded * one;
    }
    if (areaNeededM2 !== null && req.roofAreaM2 !== null && areaNeededM2 > req.roofAreaM2) {
      excluded.push({
        product,
        reason: `A ${fmt(req.desiredKwp!, 1)} kWp system needs ${panelsNeeded} of these panels, about ${fmt(areaNeededM2)} m² of module area, which is more than the ${fmt(req.roofAreaM2)} m² you have.`,
      });
      continue;
    }

    // Budget. Only bites when a real published price exists and a size is known.
    const estimatedCostKwd = price !== null && panelsNeeded !== null ? panelsNeeded * price : null;
    if (estimatedCostKwd !== null && req.budget !== null && estimatedCostKwd > req.budget) {
      excluded.push({
        product,
        reason: `${panelsNeeded} panels at ${fmt(price!, 3)} KWD each is about ${fmt(estimatedCostKwd, 0)} KWD for the modules alone, above your ${fmt(req.budget, 0)} KWD budget. Installation is not included: no supplier has published it.`,
      });
      continue;
    }

    matches.push({
      product,
      reasons: buildReasons(product, req, { ratedW, price, panelsNeeded, areaNeededM2, estimatedCostKwd, areaPerKwp }),
      panelsNeeded,
      areaNeededM2,
      estimatedCostKwd,
      flags: {
        hasKuwaitPrice: typeof product.source.kuwait_price_kwd === "number",
        kuwaitListed: product.source.kuwait_availability === "listed_by_retailer",
        verified: product.source.verification_status === "verified",
        manufacturerConfirmed: Boolean(product.source.datasheet_url),
      },
    });
  }

  sortByPriority(matches, rankedBy, req.desiredKwp !== null);
  return { matches, excluded, status: matches.length === 0 ? "no_matches" : "ok", rankedBy };
}

interface Derived {
  ratedW: number | null;
  price: number | null;
  panelsNeeded: number | null;
  areaNeededM2: number | null;
  estimatedCostKwd: number | null;
  areaPerKwp: number | null;
}

/**
 * Why this panel is in the list, in the record's own numbers. Every sentence
 * names the figure it rests on so the claim can be checked against the sources.
 */
function buildReasons(product: Product, req: Requirements, d: Derived): string[] {
  const out: string[] = [];
  const eff = getSpecNum(product.specs, "module_efficiency_pct");
  const tc = getSpecNum(product.specs, "temperature_coefficient_pmax_pct_per_c");
  const warranty = getSpecNum(product.specs, "performance_warranty_years");
  const density = powerDensityWm2(product.specs).value;

  if (d.ratedW !== null && d.panelsNeeded !== null && req.desiredKwp !== null) {
    out.push(`${d.panelsNeeded} panels at ${fmt(d.ratedW, 0)} W reach ${fmt((d.panelsNeeded * d.ratedW) / 1000, 2)} kWp against the ${fmt(req.desiredKwp, 1)} kWp you asked for.`);
  } else if (d.ratedW !== null) {
    out.push(`Rated ${fmt(d.ratedW, 0)} W per panel.`);
  }

  if (d.areaNeededM2 !== null) {
    out.push(
      req.roofAreaM2 !== null
        ? `They cover about ${fmt(d.areaNeededM2)} m² of your ${fmt(req.roofAreaM2)} m², leaving roughly ${fmt(req.roofAreaM2 - d.areaNeededM2)} m². Module area only: walkways, tilt and obstacles are not counted.`
        : `They cover about ${fmt(d.areaNeededM2)} m² of module area.`,
    );
  } else if (d.areaPerKwp !== null) {
    out.push(`Needs about ${fmt(d.areaPerKwp)} m² of module area per kWp.`);
  }

  if (density !== null) out.push(`${fmt(density, 0)} W per m² of module, which is what decides how much power fits on a fixed roof.`);
  if (eff !== null) out.push(`${fmt(eff, 1)} % module efficiency.`);
  if (tc !== null) out.push(`Power falls ${fmt(Math.abs(tc), 3)} % per °C above 25 °C, which is the figure that matters most in Kuwait's heat.`);
  if (warranty !== null) out.push(`${fmt(warranty, 0)}-year performance warranty.`);

  if (d.estimatedCostKwd !== null && d.panelsNeeded !== null && d.price !== null) {
    out.push(`Modules alone come to about ${fmt(d.estimatedCostKwd, 0)} KWD (${d.panelsNeeded} × ${fmt(d.price, 3)} KWD published locally). Installation, inverter and battery are not included: nobody has published those prices.`);
  } else if (d.price === null) {
    out.push("No local price has been published for this panel, so no cost could be worked out.");
  }

  return out;
}

/**
 * Orders in place. Panels missing the ranking field always sort last.
 *
 * `sizeKnown` keeps the cost comparison in one unit. With a target system size
 * every panel is priced as the whole array; without one, every panel is priced
 * per module. Mixing the two would rank a panel with no recorded power — which
 * has no array cost — against other panels' array totals using its unit price,
 * and it would win every time.
 */
function sortByPriority(matches: Match[], priority: PriorityId | null, sizeKnown: boolean): void {
  const value = (m: Match): number | null => {
    switch (priority) {
      case "maximum_production":
        return getSpecNum(m.product.specs, "rated_power_w");
      case "smallest_roof_area":
        return powerDensityWm2(m.product.specs).value;
      case "longest_warranty":
        return getSpecNum(m.product.specs, "performance_warranty_years");
      case "hot_climate_performance": {
        const tc = getSpecNum(m.product.specs, "temperature_coefficient_pmax_pct_per_c");
        // Closer to zero is better, so invert to keep "higher wins" below.
        return tc === null ? null : -Math.abs(tc);
      }
      case "lowest_upfront_cost": {
        const cost = sizeKnown ? m.estimatedCostKwd : realPrice(m.product);
        return cost === null ? null : -cost;
      }
      default:
        return getSpecNum(m.product.specs, "rated_power_w");
    }
  };

  matches.sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === null && bv === null) return a.product.name.localeCompare(b.product.name);
    if (av === null) return 1;
    if (bv === null) return -1;
    if (bv !== av) return bv - av;
    return a.product.name.localeCompare(b.product.name);
  });
}

export const PRIORITY_LABEL: Record<PriorityId, string> = {
  lowest_upfront_cost: "Lowest upfront cost",
  maximum_production: "Maximum production",
  smallest_roof_area: "Smallest roof area",
  hot_climate_performance: "Hot-climate performance",
  longest_warranty: "Longest warranty",
  verified_data_only: "Verified data only",
};
