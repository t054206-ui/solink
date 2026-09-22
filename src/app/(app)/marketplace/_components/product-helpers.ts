/**
 * Marketplace / Choose-phase helpers. Pure functions only — no data is
 * invented here; every helper returns "unavailable" when inputs are missing.
 */
import type { Product, ProductCategory, SpecValue, VerificationStatus } from "@/lib/types";
import { type Classified, unavailable } from "@/lib/classification";
import { specNum } from "@/lib/utils";

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  solar_panel: "Solar panels",
  inverter: "Inverters",
  battery: "Batteries",
  installation_package: "Installation packages",
  maintenance_package: "Maintenance packages",
  cleaning_service: "Cleaning services",
  other_service: "Other services",
};

export const CATEGORY_SINGULAR: Record<ProductCategory, string> = {
  solar_panel: "Solar panel",
  inverter: "Inverter",
  battery: "Battery",
  installation_package: "Installation package",
  maintenance_package: "Maintenance package",
  cleaning_service: "Cleaning service",
  other_service: "Other service",
};

export const CATEGORY_ORDER: ProductCategory[] = [
  "solar_panel", "inverter", "battery", "installation_package", "maintenance_package", "cleaning_service", "other_service",
];

export function isCategory(v: string | undefined | null): v is ProductCategory {
  return !!v && (CATEGORY_ORDER as string[]).includes(v);
}

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  pending_verification: "Pending verification",
  verified: "Verified",
  needs_changes: "Needs changes",
  rejected: "Rejected",
};

/** Maximum products in the comparison tray. */
export const COMPARE_MAX = 4;
export const COMPARE_STORE_KEY = "compare";

export type AnySpec = SpecValue<string | number>;

/** Read a spec field defensively — specs are loosely typed for non-panel categories. */
export function getSpec(specs: Product["specs"] | undefined, key: string): AnySpec | undefined {
  if (!specs) return undefined;
  const v = (specs as Record<string, unknown>)[key];
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) return v as AnySpec;
  return undefined;
}

/** Numeric spec or null. */
export function getSpecNum(specs: Product["specs"] | undefined, key: string): number | null {
  return specNum(getSpec(specs, key));
}

/**
 * A price that can be trusted as a real amount. Demo products never have a
 * real price; SpecValue with null value is unavailable. Zero is not a price.
 */
export function realPrice(p: Product, field: "price" | "installation_cost" | "annual_maintenance_cost" | "cleaning_cost" = "price"): number | null {
  if (p.is_demo) return null;
  const n = specNum(p[field]);
  return n !== null && n > 0 ? n : null;
}

/** Power density W/m² from rated power and module dimensions (mm). CALCULATED. */
export function powerDensityWm2(specs: Product["specs"]): Classified {
  const w = getSpecNum(specs, "rated_power_w");
  const l = getSpecNum(specs, "length_mm");
  const wd = getSpecNum(specs, "width_mm");
  if (w === null || l === null || wd === null) return unavailable("Rated power, length and width are required.");
  const area = (l / 1000) * (wd / 1000);
  if (area <= 0) return unavailable("Panel area must be positive.");
  return { value: w / area, cls: "calculated", source: "Solink calculator", notes: [`${w} W ÷ (${l} mm × ${wd} mm)`] };
}

/** Panel area in m². CALCULATED. */
export function panelAreaM2(specs: Product["specs"]): Classified {
  const l = getSpecNum(specs, "length_mm");
  const wd = getSpecNum(specs, "width_mm");
  if (l === null || wd === null) return unavailable("Length and width are required.");
  return { value: (l / 1000) * (wd / 1000), cls: "calculated", source: "Solink calculator", notes: [`${l} mm × ${wd} mm`] };
}

/** Panels needed per 1 kWp. CALCULATED (fractional; round up when buying). */
export function panelsPerKwp(specs: Product["specs"]): Classified {
  const w = getSpecNum(specs, "rated_power_w");
  if (w === null || w <= 0) return unavailable("Rated power is required.");
  return { value: 1000 / w, cls: "calculated", source: "Solink calculator", notes: [`1000 W ÷ ${w} W`, "Round up to whole panels when buying."] };
}

/** Roof area per 1 kWp, m². CALCULATED (module area only; no spacing). */
export function areaPerKwpM2(specs: Product["specs"]): Classified {
  const n = panelsPerKwp(specs);
  const a = panelAreaM2(specs);
  if (n.value === null || a.value === null) return unavailable("Rated power and dimensions are required.");
  return { value: n.value * a.value, cls: "calculated", source: "Solink calculator", notes: [`${n.value.toFixed(2)} panels × ${a.value.toFixed(3)} m²`, "Module area only; ignores gaps, walkways and tilt."] };
}

/** Humanize a snake_case spec key for the "Additional specs" section. */
export function humanizeKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\b(kw|kwh|ac|dc|mppt|pct|v|a|w|c)\b/gi, (m) => m.toUpperCase()).replace(/^\w/, (c) => c.toUpperCase());
}

/** Compact, category-aware key specs for a card. */
export function keySpecs(p: Product): { label: string; term?: string; spec: AnySpec | undefined }[] {
  const s = p.specs;
  switch (p.category) {
    case "solar_panel":
      return [
        { label: "Rated power", term: "peak_power", spec: getSpec(s, "rated_power_w") },
        { label: "Efficiency", term: "efficiency", spec: getSpec(s, "module_efficiency_pct") },
        { label: "Dimensions", spec: dimsSpec(s) },
      ];
    case "inverter":
      return [
        { label: "AC power", term: "inverter", spec: getSpec(s, "rated_ac_power_kw") },
        { label: "Efficiency", spec: getSpec(s, "efficiency_pct") },
      ];
    case "battery":
      return [
        { label: "Usable capacity", term: "battery", spec: getSpec(s, "usable_capacity_kwh") },
        { label: "Chemistry", spec: getSpec(s, "chemistry") },
      ];
    default:
      return [];
  }
}

/** Combine L × W × T into a single display spec, or unavailable when incomplete. */
export function dimsSpec(specs: Product["specs"]): AnySpec {
  const l = getSpecNum(specs, "length_mm");
  const w = getSpecNum(specs, "width_mm");
  const t = getSpecNum(specs, "thickness_mm");
  if (l === null || w === null) return { value: null, status: "unavailable" };
  return { value: t === null ? `${l} × ${w}` : `${l} × ${w} × ${t}`, unit: "mm" };
}
