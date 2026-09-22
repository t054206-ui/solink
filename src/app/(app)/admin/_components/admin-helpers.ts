/**
 * Admin feature helpers. Pure functions only. Validation here MIRRORS
 * supabase/migrations/0003_solink_validation.sql — it flags questionable data
 * for a human and never alters it.
 */
import type { Product, ProductCategory, SpecValue, VerificationStatus, MaintenanceStatus, IncidentStatus, SystemStatus } from "@/lib/types";

export type AnySpec = SpecValue<string | number>;

/** Local-browser store used ONLY in demo mode. Keyed by product id. */
export const ADMIN_PRODUCTS_STORE = "admin-products";
export type AdminProductStore = Record<string, Product>;

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  solar_panel: "Solar panel",
  inverter: "Inverter",
  battery: "Battery",
  installation_package: "Installation package",
  maintenance_package: "Maintenance package",
  cleaning_service: "Cleaning service",
  other_service: "Other service",
};
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as ProductCategory[];

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  pending_verification: "Pending verification",
  verified: "Verified",
  needs_changes: "Needs changes",
  rejected: "Rejected",
};
export const VERIFICATION_STATUSES = Object.keys(VERIFICATION_LABEL) as VerificationStatus[];

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  new: "New", reviewing: "Reviewing", scheduled: "Scheduled", in_progress: "In progress", resolved: "Resolved", closed: "Closed",
};
export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = { open: "Open", investigating: "Investigating", resolved: "Resolved", closed: "Closed" };
export const SYSTEM_STATUS_LABEL: Record<SystemStatus, string> = {
  designed: "Designed", requested: "Requested", purchased: "Purchased", installation_scheduled: "Installation scheduled", installed: "Installed", decommissioned: "Decommissioned",
};

/* ---------------- panel specification schema (PanelSpecifications) ---------------- */
export interface SpecFieldDef {
  key: string;
  label: string;
  unit?: string;
  kind: "number" | "text";
  required?: boolean;
  term?: string;
  help?: string;
}

export const PANEL_SPEC_FIELDS: SpecFieldDef[] = [
  { key: "rated_power_w", label: "Rated power (Pmax)", unit: "W", kind: "number", required: true, term: "peak_power" },
  { key: "module_efficiency_pct", label: "Module efficiency", unit: "%", kind: "number", required: true, term: "efficiency" },
  { key: "max_system_voltage_v", label: "Max system voltage", unit: "V", kind: "number" },
  { key: "voc_v", label: "Open-circuit voltage (Voc)", unit: "V", kind: "number", term: "voc" },
  { key: "isc_a", label: "Short-circuit current (Isc)", unit: "A", kind: "number", term: "isc" },
  { key: "vmp_v", label: "Voltage at max power (Vmp)", unit: "V", kind: "number", term: "vmp" },
  { key: "imp_a", label: "Current at max power (Imp)", unit: "A", kind: "number", term: "imp" },
  { key: "length_mm", label: "Length", unit: "mm", kind: "number", required: true },
  { key: "width_mm", label: "Width", unit: "mm", kind: "number", required: true },
  { key: "thickness_mm", label: "Thickness", unit: "mm", kind: "number" },
  { key: "weight_kg", label: "Weight", unit: "kg", kind: "number" },
  { key: "cell_technology", label: "Cell technology", kind: "text" },
  { key: "number_of_cells", label: "Number of cells", kind: "number" },
  { key: "temperature_coefficient_pmax_pct_per_c", label: "Temperature coefficient (Pmax)", unit: "%/°C", kind: "number", term: "temperature_coefficient" },
  { key: "operating_temperature_range_c", label: "Operating temperature range", kind: "text", help: "Free text as printed on the datasheet, e.g. “-40 to +85 °C”." },
  { key: "product_warranty_years", label: "Product warranty", unit: "years", kind: "number", term: "product_warranty" },
  { key: "performance_warranty_years", label: "Performance warranty", unit: "years", kind: "number", term: "performance_warranty" },
  { key: "performance_warranty_end_pct", label: "Guaranteed output at end of performance warranty", unit: "%", kind: "number" },
  { key: "expected_lifetime_years", label: "Expected lifetime", unit: "years", kind: "number", help: "Only if stated by the manufacturer or a real source." },
];

export const COST_FIELDS: { key: "price" | "installation_cost" | "annual_maintenance_cost" | "cleaning_cost" | "expected_annual_production_kwh"; label: string; unit: string; help: string }[] = [
  { key: "price", label: "Price", unit: "KWD", help: "Only a real quoted price. Zero is not a price." },
  { key: "installation_cost", label: "Installation cost", unit: "KWD", help: "Only if provided by an installer." },
  { key: "annual_maintenance_cost", label: "Annual maintenance cost", unit: "KWD", help: "Only if provided by a maintenance provider." },
  { key: "cleaning_cost", label: "Cleaning cost", unit: "KWD", help: "Only if provided by a cleaning provider." },
  { key: "expected_annual_production_kwh", label: "Expected annual production (from source)", unit: "kWh", help: "Only if stated by a source; Solink otherwise calculates this elsewhere." },
];

export const UNAVAILABLE: AnySpec = { value: null, status: "unavailable" };

/**
 * Narrows an editor spec to the numeric SpecValue the domain model uses
 * (price, costs, expected production). A value that cannot be read as a number
 * is reported as unavailable rather than coerced into an invented figure.
 */
export function toNumericSpec(v: AnySpec | undefined): SpecValue<number> {
  if (!v) return { value: null, status: "unavailable" };
  if (v.value === null) return v as SpecValue<number>;
  if (typeof v.value === "number") return Number.isFinite(v.value) ? { value: v.value, unit: v.unit } : { value: null, status: "unavailable" };
  const parsed = Number(String(v.value).trim());
  return String(v.value).trim() !== "" && Number.isFinite(parsed) ? { value: parsed, unit: v.unit } : { value: null, status: "unavailable" };
}

export function getSpec(specs: Record<string, unknown> | undefined | null, key: string): AnySpec | undefined {
  if (!specs) return undefined;
  const v = specs[key];
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) return v as AnySpec;
  return undefined;
}

export function specNumber(specs: Record<string, unknown> | undefined | null, key: string): number | null {
  const s = getSpec(specs, key);
  return s && typeof s.value === "number" && Number.isFinite(s.value) ? s.value : null;
}

/**
 * Mirror of validate_panel_specs() in 0003_solink_validation.sql.
 * Returns human-readable flags. NEVER changes the specs.
 */
export function validateProductSpecs(specs: Record<string, unknown> | undefined | null, category: ProductCategory): string[] {
  const flags: string[] = [];
  if (category !== "solar_panel") return flags;
  const p = specNumber(specs, "rated_power_w");
  const eff = specNumber(specs, "module_efficiency_pct");
  const l = specNumber(specs, "length_mm");
  const w = specNumber(specs, "width_mm");
  const voc = specNumber(specs, "voc_v");
  const vmp = specNumber(specs, "vmp_v");
  const isc = specNumber(specs, "isc_a");
  const imp = specNumber(specs, "imp_a");
  const tc = specNumber(specs, "temperature_coefficient_pmax_pct_per_c");

  if (p === null) flags.push("missing: rated_power_w (required)");
  if (eff === null) flags.push("missing: module_efficiency_pct (required)");
  if (l === null || w === null) flags.push("missing: dimensions (required for designer)");
  if (p !== null && (p <= 0 || p > 1500)) flags.push("suspicious: rated_power_w outside 0–1500 W");
  if (eff !== null && (eff <= 0 || eff > 35)) flags.push("suspicious: module_efficiency_pct outside 0–35 %");
  if (voc !== null && vmp !== null && vmp >= voc) flags.push("inconsistent: Vmp should be below Voc");
  if (isc !== null && imp !== null && imp >= isc) flags.push("inconsistent: Imp should be below Isc");
  if (vmp !== null && imp !== null && p !== null && p !== 0 && Math.abs(vmp * imp - p) / p > 0.05) flags.push("inconsistent: Vmp × Imp differs from rated power by >5 %");
  if (tc !== null && (tc > 0 || tc < -1)) flags.push("suspicious: temperature coefficient outside −1…0 %/°C");
  if (p !== null && l !== null && w !== null && eff !== null && l > 0 && w > 0) {
    const calcEff = (p / ((l / 1000) * (w / 1000) * 1000)) * 100; // STC 1000 W/m²
    if (Math.abs(calcEff - eff) > 1.5) flags.push(`inconsistent: efficiency from power/area is ${calcEff.toFixed(1)} % vs stated ${eff.toFixed(1)} %`);
  }
  return flags;
}

export function flagTone(flag: string): "warn" | "critical" | "neutral" {
  if (flag.startsWith("missing")) return "critical";
  if (flag.startsWith("inconsistent") || flag.startsWith("suspicious")) return "warn";
  return "neutral";
}

/** Merge server products with the demo-mode local store (overrides by id + local additions). */
export function mergeLocalProducts(server: Product[], local: AdminProductStore | undefined): Product[] {
  if (!local || Object.keys(local).length === 0) return server;
  const seen = new Set<string>();
  const merged = server.map((p) => { seen.add(p.id); return local[p.id] ?? p; });
  for (const [id, p] of Object.entries(local)) if (!seen.has(id)) merged.push(p);
  return merged;
}

export function isLocalId(id: string) { return id.startsWith("local-"); }

export function newLocalId() { return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

/* ---------------- CSV ---------------- */
/**
 * Small, robust RFC-4180-style CSV parser: handles quoted fields, escaped
 * quotes (""), commas and newlines inside quotes, CRLF/LF line endings and a
 * UTF-8 BOM. Returns rows of raw strings — no coercion.
 */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1; // BOM
  for (; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { row.push(field); field = ""; continue; }
    if (ch === "\r") { if (text[i + 1] === "\n") i++; row.push(field); field = ""; rows.push(row); row = []; continue; }
    if (ch === "\n") { row.push(field); field = ""; rows.push(row); row = []; continue; }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // drop fully empty trailing rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Detect the delimiter from the header line (comma, semicolon or tab). */
export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [[",", 0], [";", 0], ["\t", 0]].map(([d]) => [d as string, head.split(d as string).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

/* ---------------- import field mapping ---------------- */
export interface ImportFieldDef { key: string; label: string; required?: boolean; kind: "text" | "number" | "url"; unit?: string; aliases: string[]; target: "identity" | "spec" | "cost" | "source" }

function SPEC_ALIASES_INIT(): Record<string, string[]> {
  return {
    rated_power_w: ["power", "pmax", "rated_power", "power_w", "wattage", "watts", "nominal_power", "stc_power"],
    module_efficiency_pct: ["efficiency", "module_efficiency", "eff", "efficiency_pct", "efficiency_percent"],
    max_system_voltage_v: ["max_system_voltage", "system_voltage", "vsys"],
    voc_v: ["voc", "open_circuit_voltage"],
    isc_a: ["isc", "short_circuit_current"],
    vmp_v: ["vmp", "vmpp", "voltage_at_max_power"],
    imp_a: ["imp", "impp", "current_at_max_power"],
    length_mm: ["length", "height", "length_mm", "module_length"],
    width_mm: ["width", "width_mm", "module_width"],
    thickness_mm: ["thickness", "depth", "thickness_mm"],
    weight_kg: ["weight", "weight_kg", "mass"],
    cell_technology: ["cell_type", "technology", "cell_technology", "cells_type"],
    number_of_cells: ["cells", "cell_count", "num_cells", "number_of_cells"],
    temperature_coefficient_pmax_pct_per_c: ["temp_coefficient", "temperature_coefficient", "tc_pmax", "temp_coeff_pmax", "pmax_temp_coefficient"],
    operating_temperature_range_c: ["operating_temperature", "operating_temp", "temperature_range"],
    product_warranty_years: ["product_warranty", "warranty", "warranty_years"],
    performance_warranty_years: ["performance_warranty", "power_warranty", "linear_warranty_years"],
    performance_warranty_end_pct: ["performance_warranty_end", "end_of_warranty_output", "guaranteed_output_pct"],
    expected_lifetime_years: ["lifetime", "expected_lifetime", "lifespan"],
  };
}
const SPEC_ALIASES = SPEC_ALIASES_INIT();

export const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "manufacturer", label: "Manufacturer", required: true, kind: "text", aliases: ["manufacturer", "brand", "maker", "manufacturer_name"], target: "identity" },
  { key: "model", label: "Model", required: true, kind: "text", aliases: ["model", "model_number", "model_no", "part_number", "sku"], target: "identity" },
  { key: "name", label: "Product name", kind: "text", aliases: ["name", "product_name", "title"], target: "identity" },
  ...PANEL_SPEC_FIELDS.map<ImportFieldDef>((f) => ({
    key: f.key, label: f.label, required: f.required, kind: f.kind, unit: f.unit, target: "spec",
    aliases: [f.key, ...SPEC_ALIASES[f.key] ?? []],
  })),
  { key: "price", label: "Price (KWD)", kind: "number", unit: "KWD", aliases: ["price", "price_kwd", "unit_price"], target: "cost" },
  { key: "datasheet_url", label: "Datasheet URL", kind: "url", aliases: ["datasheet", "datasheet_url", "datasheet_link", "pdf"], target: "source" },
  { key: "source_url", label: "Source URL", kind: "url", aliases: ["source", "source_url", "url", "link"], target: "source" },
  { key: "manufacturer_doc_url", label: "Manufacturer document URL", kind: "url", aliases: ["manufacturer_doc_url", "manufacturer_url", "manufacturer_page"], target: "source" },
];


export const IMPORT_REQUIRED_KEYS = IMPORT_FIELDS.filter((f) => f.required).map((f) => f.key);

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Suggest a mapping CSV header → field key based on aliases. */
export function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const h of headers) {
    const n = normalizeHeader(h);
    const f = IMPORT_FIELDS.find((d) => !used.has(d.key) && (d.key === n || d.aliases.some((a) => normalizeHeader(a) === n)));
    if (f) { map[h] = f.key; used.add(f.key); }
  }
  return map;
}

export interface NormalizedImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  manufacturer: string;
  model: string;
  name: string;
  specs: Record<string, AnySpec>;
  price: AnySpec;
  source: { datasheet_url: string | null; source_url: string | null; manufacturer_doc_url: string | null };
  flags: string[];
  status: "ok" | "flagged" | "duplicate" | "rejected";
}

function parseNumberCell(v: string): number | null {
  const cleaned = v.replace(/[^0-9eE+\-.,]/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Build normalized rows + flags from parsed CSV and a header→field mapping. Values are never corrected. */
export function normalizeImportRows(headers: string[], rows: string[][], mapping: Record<string, string>): NormalizedImportRow[] {
  const out: NormalizedImportRow[] = [];
  const seen = new Map<string, number>();
  const fieldByKey = new Map(IMPORT_FIELDS.map((f) => [f.key, f]));
  rows.forEach((cells, idx) => {
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = (cells[i] ?? "").trim(); });
    const get = (key: string) => { const h = Object.keys(mapping).find((hh) => mapping[hh] === key); return h ? raw[h] ?? "" : ""; };
    const specs: Record<string, AnySpec> = {};
    const flags: string[] = [];
    for (const f of IMPORT_FIELDS) {
      if (f.target !== "spec") continue;
      const cell = get(f.key);
      if (cell === "") { specs[f.key] = { value: null, status: "unavailable" }; continue; }
      if (f.kind === "number") {
        const n = parseNumberCell(cell);
        if (n === null) { flags.push(`unreadable: ${f.key} = “${cell}” is not a number`); specs[f.key] = { value: null, status: "pending_verification" }; }
        else specs[f.key] = f.unit ? { value: n, unit: f.unit } : { value: n };
      } else specs[f.key] = { value: cell };
    }
    const manufacturer = get("manufacturer");
    const model = get("model");
    const name = get("name") || (manufacturer && model ? `${manufacturer} ${model}` : model);
    const priceCell = get("price");
    let price: AnySpec = { value: null, status: "unavailable" };
    if (priceCell !== "") {
      const n = parseNumberCell(priceCell);
      if (n === null) flags.push(`unreadable: price = “${priceCell}” is not a number`);
      else if (n <= 0) flags.push("suspicious: price is zero or negative (not stored as a price)");
      else price = { value: n, unit: "KWD" };
    }
    for (const k of IMPORT_REQUIRED_KEYS) {
      const def = fieldByKey.get(k)!;
      if (def.target === "identity" && get(k) === "") flags.push(`missing: ${k} (required)`);
    }
    flags.push(...validateProductSpecs(specs, "solar_panel").filter((f) => !flags.includes(f)));
    const dupKey = `${manufacturer.toLowerCase().trim()}||${model.toLowerCase().trim()}`;
    let status: NormalizedImportRow["status"] = flags.length ? "flagged" : "ok";
    if (!manufacturer || !model) status = "rejected";
    else if (seen.has(dupKey)) { status = "duplicate"; flags.push(`duplicate: same manufacturer + model as row ${seen.get(dupKey)}`); }
    else seen.set(dupKey, idx + 2);
    const url = (k: string) => { const v = get(k); return v === "" ? null : v; };
    out.push({ rowNumber: idx + 2, raw, manufacturer, model, name, specs, price, source: { datasheet_url: url("datasheet_url"), source_url: url("source_url"), manufacturer_doc_url: url("manufacturer_doc_url") }, flags, status });
  });
  return out;
}

/** Header-only CSV template (no sample values — nothing is invented). */
export function csvTemplate(): string {
  return IMPORT_FIELDS.map((f) => f.key).join(",") + "\n";
}

export function verificationTone(s: VerificationStatus): "good" | "warn" | "neutral" | "serious" | "critical" {
  return s === "verified" ? "good" : s === "pending_verification" ? "warn" : s === "needs_changes" ? "serious" : s === "rejected" ? "critical" : "neutral";
}
