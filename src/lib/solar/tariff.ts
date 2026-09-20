import type { TariffCategory } from "@/lib/types";

/**
 * Electricity tariff by consumption sector.
 *
 * MEW (Kuwait) prices a kWh by the sector the property is billed under, not by
 * who lives there: Electrical Energy Statistical Yearbook 2020, ch. 4, p. 113,
 * "Tariff Of Electricity In All Sectors Of Consumption". A private house is
 * Residential; an apartment building is Investmental & Commercial. The labels
 * below are that table's row names, kept as printed.
 *
 * No rate lives in this file. Rates are the `electricity_tariff_per_kwh`
 * platform setting, entered by an admin with the source attached. This module
 * only decides which of the entered rates applies to a given profile, and
 * says so in words when none does.
 *
 * Client-safe: no server imports, so the Plan pages can call it directly.
 */
export const TARIFF_CATEGORY_LABELS: Record<TariffCategory, string> = {
  residential: "Residential",
  investment_commercial: "Investmental & Commercial",
  industrial_agricultural: "Industrial & Agriculture",
  productive_industrial_agricultural: "Productive Industrial & Agriculture (related facilities)",
  governmental: "Governmental",
  other: "Others",
};

export const TARIFF_CATEGORIES = Object.keys(TARIFF_CATEGORY_LABELS) as TariffCategory[];

/** The shape of the `electricity_tariff_per_kwh` platform setting once loaded. */
export interface TariffSetting {
  /** The headline rate, in currency per kWh. */
  value: number;
  source: string;
  /** Which sector `value` is for, as the admin typed it. Residential when absent. */
  category?: string;
  /** Rates for other sectors, when an admin has entered them. */
  by_category?: Partial<Record<TariffCategory, number>>;
}

/** Map the admin's free-text sector name onto the enum. Residential when unsure. */
export function sectorOf(t: TariffSetting): TariffCategory {
  const c = (t.category ?? "").toLowerCase();
  if (c.includes("invest") || c.includes("commercial")) return "investment_commercial";
  if (c.includes("productive")) return "productive_industrial_agricultural";
  if (c.includes("industr") || c.includes("agric")) return "industrial_agricultural";
  if (c.includes("govern")) return "governmental";
  if (c.includes("other")) return "other";
  return "residential";
}

export interface TariffResolution {
  /** The platform rate that applies to this profile, or null when none does. */
  platform: { value: number; source: string } | null;
  /** A sentence for the UI when the answer needs one. Null when nothing needs saying. */
  note: string | null;
}

/**
 * Which platform tariff applies to a profile in `category`.
 *
 * - No setting: nothing, and nothing to say (the placeholder speaks).
 * - No category on the profile: the headline rate, with a note saying which
 *   sector it is, because the profile has not said.
 * - Same sector as the headline: the headline rate.
 * - Another sector with an entered rate: that rate, source annotated.
 * - Another sector without one: nothing, and a note explaining why the tariff
 *   is not simply assumed. A landlord's apartment building is not billed at
 *   the private-house rate, and pretending otherwise would overstate nothing
 *   and understate the bill by a factor of two and a half.
 */
export function tariffFor(t: TariffSetting | null | undefined, category: TariffCategory | null | undefined): TariffResolution {
  if (!t) return { platform: null, note: null };
  const headline = sectorOf(t);
  const headlineLabel = TARIFF_CATEGORY_LABELS[headline];
  if (!category) {
    return {
      platform: { value: t.value, source: t.source },
      note: `This is the ${headlineLabel} sector rate. MEW bills by the property's sector: if yours is an apartment building or another sector, say so in your Solar Profile.`,
    };
  }
  if (category === headline) return { platform: { value: t.value, source: t.source }, note: null };
  const rate = t.by_category?.[category];
  if (typeof rate === "number" && Number.isFinite(rate)) {
    return { platform: { value: rate, source: `${t.source} (${TARIFF_CATEGORY_LABELS[category]} sector)` }, note: null };
  }
  return {
    platform: null,
    note: `Your profile says the property is billed in the ${TARIFF_CATEGORY_LABELS[category]} sector. The platform only has the ${headlineLabel} rate, so no tariff is assumed for you. Enter the rate from your bill, or ask an admin to add this sector's rate with its source.`,
  };
}
