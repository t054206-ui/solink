/**
 * Builds the equipment table for the Replacement page from the frozen passport
 * snapshot and the system record. Everything here is either copied from those
 * records (source) or simple date arithmetic on them (calculated). No lifetime,
 * wear estimate or end-of-life judgement is produced: that needs
 * [PLACEHOLDER: END-OF-LIFE CRITERIA].
 */
import type { MaintenanceCase, Product, SolarPassport, SolarSystem } from "@/lib/types";
import { addYears, ageYears } from "../../_ops/production";

export interface WarrantyInfo {
  years: number | null;
  endIso: string | null;
  expired: boolean;
  /** Where the number of years came from. */
  source: string | null;
}

export interface EquipmentRow {
  key: "panels" | "inverter" | "battery";
  label: string;
  /** Manufacturer · model (and count), when a snapshot exists. */
  identity: string | null;
  installedIso: string | null;
  ageYears: number | null;
  product: WarrantyInfo;
  performance: WarrantyInfo;
  /** Power the performance warranty still promises at the end of its term. */
  performanceEndPct: number | null;
  expectedLifetimeYears: number | null;
  expectedLifetimeEndIso: string | null;
  replacements: MaintenanceCase[];
  /** Present when there is no record for this component at all. */
  missing: string | null;
}

function spec(specs: Record<string, unknown> | undefined, key: string): number | null {
  const s = specs?.[key];
  if (s && typeof s === "object" && "value" in s && typeof (s as { value: unknown }).value === "number") return (s as { value: number }).value;
  return null;
}

function warranty(years: number | null, fromIso: string | null, nowIso: string, source: string | null): WarrantyInfo {
  const endIso = addYears(fromIso, years);
  return { years, endIso, expired: endIso ? new Date(endIso).getTime() < new Date(nowIso).getTime() : false, source: years === null ? null : source };
}

export const REPLACEMENT_KIND = "replacement" as const;

/** Replacement cases whose text names the component, so the row only claims what a record says. */
function replacementsFor(cases: MaintenanceCase[], keywords: string[]): MaintenanceCase[] {
  return cases.filter((c) => {
    const text = `${c.detected_issue} ${c.work_performed ?? ""} ${c.parts ?? ""}`.toLowerCase();
    return keywords.some((k) => text.includes(k));
  });
}

export function buildEquipmentRows({ system, passport, battery, cases, nowIso }: {
  system: SolarSystem;
  passport: SolarPassport | null;
  battery: Product | null;
  cases: MaintenanceCase[];
  nowIso: string;
}): EquipmentRow[] {
  const installed = passport?.installation_date ?? system.installation_date ?? null;
  const age = ageYears(installed, new Date(nowIso));
  const replacementCases = cases.filter((c) => c.kind === REPLACEMENT_KIND);

  const panelSpecs = (passport?.panel_snapshot?.specs ?? undefined) as Record<string, unknown> | undefined;
  const inverterSpecs = (passport?.inverter_snapshot?.specs ?? undefined) as Record<string, unknown> | undefined;

  const panelProductYears = passport?.warranty.product_years ?? spec(panelSpecs, "product_warranty_years");
  const panelPerformanceYears = passport?.warranty.performance_years ?? spec(panelSpecs, "performance_warranty_years");
  const panelLifetime = spec(panelSpecs, "expected_lifetime_years");
  const inverterYears = spec(inverterSpecs, "product_warranty_years");
  const batteryYears = battery ? spec(battery.specs as Record<string, unknown>, "product_warranty_years") : null;

  const panelCount = passport?.panel_count ?? system.panel_count ?? null;
  const ps = passport?.panel_snapshot;
  const inv = passport?.inverter_snapshot;

  return [
    {
      key: "panels",
      label: "Solar panels",
      identity: ps ? `${ps.manufacturer} · ${ps.model}${panelCount ? ` × ${panelCount}` : ""}` : null,
      installedIso: installed,
      ageYears: age,
      product: warranty(panelProductYears, installed, nowIso, passport ? "Passport snapshot" : null),
      performance: warranty(panelPerformanceYears, installed, nowIso, passport ? "Passport snapshot" : null),
      performanceEndPct: spec(panelSpecs, "performance_warranty_end_pct"),
      expectedLifetimeYears: panelLifetime,
      expectedLifetimeEndIso: addYears(installed, panelLifetime),
      replacements: replacementsFor(replacementCases, ["panel", "module"]),
      missing: ps ? null : "No panel specification snapshot is recorded in the passport.",
    },
    {
      key: "inverter",
      label: "Inverter",
      identity: inv ? `${inv.manufacturer} · ${inv.model}` : null,
      installedIso: installed,
      ageYears: age,
      product: warranty(inverterYears, installed, nowIso, passport ? "Passport snapshot" : null),
      performance: warranty(null, installed, nowIso, null),
      performanceEndPct: null,
      expectedLifetimeYears: spec(inverterSpecs, "expected_lifetime_years"),
      expectedLifetimeEndIso: addYears(installed, spec(inverterSpecs, "expected_lifetime_years")),
      replacements: replacementsFor(replacementCases, ["inverter"]),
      missing: inv ? null : "No inverter specification snapshot is recorded in the passport.",
    },
    {
      key: "battery",
      label: "Battery",
      identity: battery ? `${battery.manufacturer_name} · ${battery.model}` : null,
      installedIso: battery ? installed : null,
      ageYears: battery ? age : null,
      product: warranty(batteryYears, battery ? installed : null, nowIso, battery ? "Product record" : null),
      performance: warranty(null, null, nowIso, null),
      performanceEndPct: null,
      expectedLifetimeYears: battery ? spec(battery.specs as Record<string, unknown>, "expected_lifetime_years") : null,
      expectedLifetimeEndIso: battery ? addYears(installed, spec(battery.specs as Record<string, unknown>, "expected_lifetime_years")) : null,
      replacements: replacementsFor(replacementCases, ["battery"]),
      missing: battery ? null : system.battery_product_id ? "A battery is linked to this system but its product record could not be read." : "No battery is part of this system.",
    },
  ];
}

/** Replacement cases that no component keyword matched, so nothing is silently dropped. */
export function unattributedReplacements(cases: MaintenanceCase[], rows: EquipmentRow[]): MaintenanceCase[] {
  const claimed = new Set(rows.flatMap((r) => r.replacements.map((c) => c.id)));
  return cases.filter((c) => c.kind === REPLACEMENT_KIND && !claimed.has(c.id));
}
