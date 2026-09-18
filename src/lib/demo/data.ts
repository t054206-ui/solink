/**
 * DEMO DATA — NOT REAL.
 *
 * Everything in this file is a labeled placeholder so the Solink UI can be
 * exercised before real integrations exist. No manufacturer, model, price,
 * measurement, company, or person here is real. Every record carries
 * is_demo: true and the UI renders the DEMO badge for it.
 *
 * Replace by connecting Supabase (real records) and the real panel dataset:
 *   [PLACEHOLDER: REAL SOLAR PANEL DATA SOURCE]
 */
import type {
  Product, Manufacturer, ProviderCompany, SolarSystem, SolarPassport, ProductionRecord,
  MaintenanceCase, Incident, AiAlert, MonthlyReport, SolarProfile, Appointment, Notification,
} from "@/lib/types";

export const DEMO_USER_ID = "00000000-0000-0000-0000-00000000d3a0";
export const DEMO_BANNER = "DEMO DATA — NOT REAL";
export const DEMO_PRODUCT_BANNER = "DEMO PRODUCT — NOT REAL";
export const DEMO_PRODUCTION_BANNER = "SIMULATED PRODUCTION — NOT REAL";

const src = (overrides: Partial<Product["source"]> = {}): Product["source"] => ({
  data_source: "Demo dataset (not a real source)",
  source_url: null, datasheet_url: null, manufacturer_doc_url: null,
  date_added: "2026-09-01", date_last_updated: "2026-09-01",
  verification_status: "unverified", ...overrides,
});
const v = (value: number, unit?: string) => ({ value, unit });
const na = { value: null, status: "unavailable" as const };

export const DEMO_MANUFACTURERS: Manufacturer[] = [
  { id: "m-demo-a", name: "Demo Manufacturer A", country: null, website: null, is_demo: true, verification_status: "unverified" },
  { id: "m-demo-b", name: "Demo Manufacturer B", country: null, website: null, is_demo: true, verification_status: "unverified" },
  { id: "m-demo-c", name: "Demo Manufacturer C", country: null, website: null, is_demo: true, verification_status: "unverified" },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "p-demo-panel-1", category: "solar_panel", manufacturer_id: "m-demo-a", manufacturer_name: "Demo Manufacturer A",
    model: "DEMO-MONO-400", name: "Demo Mono Panel 400 (NOT REAL)", description: "Illustrative monocrystalline panel record used to exercise the marketplace, comparison, designer and passport flows.",
    price: v(0, "KWD"), currency: "KWD", installation_cost: na, annual_maintenance_cost: na, cleaning_cost: na, expected_annual_production_kwh: na,
    images: [], is_demo: true, is_archived: false, is_outdated: false, current_version_id: "pv-demo-panel-1-v1",
    specs: {
      rated_power_w: v(400, "W"), module_efficiency_pct: v(20.5, "%"), max_system_voltage_v: v(1500, "V"),
      voc_v: v(37.2, "V"), isc_a: v(13.6, "A"), vmp_v: v(31.1, "V"), imp_a: v(12.9, "A"),
      length_mm: v(1722, "mm"), width_mm: v(1134, "mm"), thickness_mm: v(30, "mm"), weight_kg: v(21.5, "kg"),
      cell_technology: { value: "Demo mono PERC (illustrative)" }, number_of_cells: v(108),
      temperature_coefficient_pmax_pct_per_c: v(-0.35, "%/°C"), operating_temperature_range_c: { value: "-40 to +85 °C" },
      product_warranty_years: v(12, "years"), performance_warranty_years: v(25, "years"), performance_warranty_end_pct: v(84.8, "%"),
      expected_lifetime_years: na, additional: {},
    },
    source: src(),
  },
  {
    id: "p-demo-panel-2", category: "solar_panel", manufacturer_id: "m-demo-b", manufacturer_name: "Demo Manufacturer B",
    model: "DEMO-BIFACIAL-450", name: "Demo Bifacial Panel 450 (NOT REAL)", description: "Illustrative higher-power panel record with some specification fields intentionally left unavailable to demonstrate honest missing-data handling.",
    price: v(0, "KWD"), currency: "KWD", installation_cost: na, annual_maintenance_cost: na, cleaning_cost: na, expected_annual_production_kwh: na,
    images: [], is_demo: true, is_archived: false, is_outdated: false, current_version_id: "pv-demo-panel-2-v1",
    specs: {
      rated_power_w: v(450, "W"), module_efficiency_pct: v(21.3, "%"), max_system_voltage_v: v(1500, "V"),
      voc_v: v(41.5, "V"), isc_a: v(13.9, "A"), vmp_v: v(34.6, "V"), imp_a: v(13.0, "A"),
      length_mm: v(1903, "mm"), width_mm: v(1134, "mm"), thickness_mm: v(30, "mm"), weight_kg: na,
      cell_technology: { value: "Demo bifacial (illustrative)" }, number_of_cells: v(120),
      temperature_coefficient_pmax_pct_per_c: v(-0.30, "%/°C"), operating_temperature_range_c: { value: null, status: "pending_verification" },
      product_warranty_years: v(15, "years"), performance_warranty_years: v(30, "years"), performance_warranty_end_pct: na,
      expected_lifetime_years: na, additional: {},
    },
    source: src({ verification_status: "pending_verification" }),
  },
  {
    id: "p-demo-panel-3", category: "solar_panel", manufacturer_id: "m-demo-c", manufacturer_name: "Demo Manufacturer C",
    model: "DEMO-COMPACT-350", name: "Demo Compact Panel 350 (NOT REAL)", description: "Illustrative smaller panel for tight roofs.",
    price: v(0, "KWD"), currency: "KWD", installation_cost: na, annual_maintenance_cost: na, cleaning_cost: na, expected_annual_production_kwh: na,
    images: [], is_demo: true, is_archived: false, is_outdated: false, current_version_id: "pv-demo-panel-3-v1",
    specs: {
      rated_power_w: v(350, "W"), module_efficiency_pct: v(19.1, "%"), max_system_voltage_v: v(1000, "V"),
      voc_v: v(40.1, "V"), isc_a: v(11.2, "A"), vmp_v: v(33.4, "V"), imp_a: v(10.5, "A"),
      length_mm: v(1690, "mm"), width_mm: v(1046, "mm"), thickness_mm: v(35, "mm"), weight_kg: v(19.0, "kg"),
      cell_technology: { value: "Demo mono (illustrative)" }, number_of_cells: v(120),
      temperature_coefficient_pmax_pct_per_c: v(-0.37, "%/°C"), operating_temperature_range_c: { value: "-40 to +85 °C" },
      product_warranty_years: v(10, "years"), performance_warranty_years: v(25, "years"), performance_warranty_end_pct: v(80, "%"),
      expected_lifetime_years: na, additional: {},
    },
    source: src(),
  },
  {
    id: "p-demo-inverter-1", category: "inverter", manufacturer_id: "m-demo-a", manufacturer_name: "Demo Manufacturer A",
    model: "DEMO-INV-5K", name: "Demo String Inverter 5 kW (NOT REAL)", description: "Illustrative single-phase inverter record.",
    price: v(0, "KWD"), currency: "KWD", installation_cost: na, annual_maintenance_cost: na, cleaning_cost: na, expected_annual_production_kwh: na,
    images: [], is_demo: true, is_archived: false, is_outdated: false, current_version_id: null,
    specs: { rated_ac_power_kw: v(5, "kW"), max_dc_input_kw: v(7.5, "kW"), mppt_count: v(2), efficiency_pct: v(97.6, "%"), product_warranty_years: v(10, "years"), additional: {} },
    source: src(),
  },
  {
    id: "p-demo-battery-1", category: "battery", manufacturer_id: "m-demo-b", manufacturer_name: "Demo Manufacturer B",
    model: "DEMO-BAT-10", name: "Demo Home Battery 10 kWh (NOT REAL)", description: "Illustrative battery record.",
    price: v(0, "KWD"), currency: "KWD", installation_cost: na, annual_maintenance_cost: na, cleaning_cost: na, expected_annual_production_kwh: na,
    images: [], is_demo: true, is_archived: false, is_outdated: false, current_version_id: null,
    specs: { usable_capacity_kwh: v(10, "kWh"), chemistry: { value: "Demo LFP (illustrative)" }, cycles: na, product_warranty_years: v(10, "years"), additional: {} },
    source: src(),
  },
  {
    id: "p-demo-install-1", category: "installation_package", manufacturer_id: null, manufacturer_name: "Demo Installer Co.",
    model: "DEMO-INSTALL-RES", name: "Demo Residential Installation Package (NOT REAL)", description: "Illustrative installation service. Price: [PLACEHOLDER: INSTALLATION PRICE].",
    price: na, currency: "KWD", installation_cost: na, annual_maintenance_cost: na, cleaning_cost: na, expected_annual_production_kwh: na,
    images: [], is_demo: true, is_archived: false, is_outdated: false, current_version_id: null, provider_id: "c-demo-installer",
    specs: { additional: {} }, source: src(),
  },
  {
    id: "p-demo-maint-1", category: "maintenance_package", manufacturer_id: null, manufacturer_name: "Demo Maintenance Co.",
    model: "DEMO-MAINT-ANNUAL", name: "Demo Annual Maintenance Plan (NOT REAL)", description: "Illustrative annual inspection plan. Price: [PLACEHOLDER: MAINTENANCE PRICE].",
    price: na, currency: "KWD", installation_cost: na, annual_maintenance_cost: na, cleaning_cost: na, expected_annual_production_kwh: na,
    images: [], is_demo: true, is_archived: false, is_outdated: false, current_version_id: null, provider_id: "c-demo-maint",
    specs: { additional: {} }, source: src(),
  },
  {
    id: "p-demo-clean-1", category: "cleaning_service", manufacturer_id: null, manufacturer_name: "Demo Cleaning Co.",
    model: "DEMO-CLEAN-VISIT", name: "Demo Panel Cleaning Visit (NOT REAL)", description: "Illustrative cleaning service. Price: [PLACEHOLDER: MAINTENANCE PRICE].",
    price: na, currency: "KWD", installation_cost: na, annual_maintenance_cost: na, cleaning_cost: na, expected_annual_production_kwh: na,
    images: [], is_demo: true, is_archived: false, is_outdated: false, current_version_id: null, provider_id: "c-demo-clean",
    specs: { additional: {} }, source: src(),
  },
];

export const DEMO_PROVIDERS: ProviderCompany[] = [
  { id: "c-demo-installer", name: "Demo Installer Co. (NOT REAL)", kind: ["solar_company", "installer"], is_demo: true, verification_status: "unverified", service_area: "Kuwait (demo)" },
  { id: "c-demo-maint", name: "Demo Maintenance Co. (NOT REAL)", kind: ["maintenance"], is_demo: true, verification_status: "unverified", service_area: "Kuwait (demo)" },
  { id: "c-demo-clean", name: "Demo Cleaning Co. (NOT REAL)", kind: ["cleaning"], is_demo: true, verification_status: "unverified", service_area: "Kuwait (demo)" },
];

export const DEMO_PROFILE: SolarProfile = {
  id: "prof-demo", user_id: DEMO_USER_ID, address: null, lat: null, lng: null, country_code: "KW", governorate: null,
  house_type: "villa", roof_length_m: 14, roof_width_m: 10, roof_area_m2: 140, available_roof_area_m2: 90,
  roof_orientation: "flat", roof_tilt_deg: 0, shading_notes: null, monthly_consumption_kwh: 2400, monthly_bill: null,
  currency: "KWD", budget: null, roof_photo_path: null, updated_at: "2026-09-01T00:00:00Z",
};

export const DEMO_SYSTEM: SolarSystem = {
  id: "sys-demo-1", user_id: DEMO_USER_ID, profile_id: "prof-demo", name: "Demo Home System (NOT REAL)", status: "installed",
  capacity_kwp: 8.0, panel_count: 20, panel_product_id: "p-demo-panel-1", panel_version_id: "pv-demo-panel-1-v1",
  inverter_product_id: "p-demo-inverter-1", inverter_version_id: null, battery_product_id: null,
  installer_id: "c-demo-installer", installation_date: "2025-03-15", commissioning_date: "2025-03-20",
  is_demo: true, monitoring_source: null, created_at: "2025-03-01T00:00:00Z",
};

export const DEMO_PASSPORT: SolarPassport = {
  id: "pass-demo-1", system_id: "sys-demo-1", passport_number: "SLK-DEMO-000001",
  installation_company: "Demo Installer Co. (NOT REAL)", installer_id: "c-demo-installer", installation_date: "2025-03-15",
  panel_snapshot: { manufacturer: "Demo Manufacturer A", model: "DEMO-MONO-400", specs: DEMO_PRODUCTS[0].specs, version_id: "pv-demo-panel-1-v1" },
  inverter_snapshot: { manufacturer: "Demo Manufacturer A", model: "DEMO-INV-5K", specs: DEMO_PRODUCTS[3].specs, version_id: null },
  panel_count: 20, capacity_kwp: 8.0,
  warranty: { product_years: 12, performance_years: 25, installer_years: null, notes: "Demo warranty values copied from the demo product record." },
  installation_notes: "Demo installation record.", is_demo: true, created_at: "2025-03-20T00:00:00Z",
};

/**
 * SIMULATED PRODUCTION — NOT REAL. A deterministic, obviously synthetic daily
 * series (smooth seasonal curve + small deterministic wobble) for the last 400
 * days. Used only to render charts in demo mode.
 */
export function demoDailyProduction(days = 400, capacityKwp = 8): ProductionRecord[] {
  const out: ProductionRecord[] = [];
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const doy = Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
    const seasonal = 0.75 + 0.25 * Math.cos(((doy - 172) / 365) * 2 * Math.PI); // arbitrary shape
    const wobble = 0.9 + 0.1 * Math.abs(Math.sin(i * 12.9898));
    const dip = i >= 40 && i < 55 ? 0.78 : 1; // an artificial "soiling-like" dip to demo alerts
    const kwh = capacityKwp * 4.5 * seasonal * wobble * dip; // 4.5 is an arbitrary demo multiplier, not a real solar resource figure
    const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1);
    out.push({ id: `prod-demo-${i}`, system_id: "sys-demo-1", period_start: d.toISOString(), period_end: next.toISOString(), granularity: "day", energy_kwh: Math.round(kwh * 10) / 10, source: "demo", cls: "demo" });
  }
  return out;
}

export const DEMO_MAINTENANCE: MaintenanceCase[] = [
  {
    id: "mc-demo-1", system_id: "sys-demo-1", user_id: DEMO_USER_ID, provider_id: "c-demo-clean", kind: "cleaning", status: "resolved", urgency: "routine",
    detected_issue: "Demo: production decline pattern consistent with soiling (illustrative).",
    ai_analysis: "DEMO — illustrative analysis text. In a real case this is generated by the AI Solar Agent from actual production and weather data.", ai_analysis_cls: "demo",
    appointment_at: "2026-07-18T08:00:00Z", technician_name: "Demo Technician", work_performed: "Demo cleaning of 20 panels.", parts: null,
    cost: { value: null, status: "unavailable" }, before_image_path: null, after_image_path: null,
    production_before_kwh: 26.1, production_after_kwh: 33.4, notes: "Demo record.", created_at: "2026-07-15T09:00:00Z", updated_at: "2026-07-18T11:00:00Z", is_demo: true,
  },
  {
    id: "mc-demo-2", system_id: "sys-demo-1", user_id: DEMO_USER_ID, provider_id: "c-demo-maint", kind: "inspection", status: "scheduled", urgency: "inspection",
    detected_issue: "Demo: one string reporting lower output than the other (illustrative).",
    ai_analysis: "DEMO — illustrative.", ai_analysis_cls: "demo", appointment_at: "2026-09-25T07:30:00Z", technician_name: null, work_performed: null, parts: null,
    cost: { value: null, status: "unavailable" }, created_at: "2026-09-10T09:00:00Z", updated_at: "2026-09-12T09:00:00Z", is_demo: true,
  },
];

export const DEMO_INCIDENTS: Incident[] = [
  { id: "inc-demo-1", system_id: "sys-demo-1", panel_index: null, occurred_at: "2026-07-14T10:00:00Z", reported_problem: "Demo: sustained production drop over two weeks.", ai_analysis: "DEMO — illustrative.", images: [], action_taken: "Demo cleaning booked and completed.", technician_name: "Demo Technician", cost: { value: null, status: "unavailable" }, result: "Demo: production recovered.", status: "closed", maintenance_case_id: "mc-demo-1", is_demo: true },
  { id: "inc-demo-2", system_id: "sys-demo-1", panel_index: 7, occurred_at: "2026-09-09T12:00:00Z", reported_problem: "Demo: string output imbalance.", ai_analysis: "DEMO — illustrative.", images: [], action_taken: null, technician_name: null, cost: { value: null, status: "unavailable" }, result: null, status: "investigating", maintenance_case_id: "mc-demo-2", is_demo: true },
];

export const DEMO_ALERTS: AiAlert[] = [
  { id: "al-demo-1", system_id: "sys-demo-1", status: "monitor", title: "Demo: production below recent average", message: "DEMO — illustrative alert. Production over the last 7 days is below the previous 30-day average in the demo series. Real thresholds are not defined: [PLACEHOLDER: PRODUCTION ALERT THRESHOLDS].", evidence: ["7-day mean vs 30-day mean (demo series)"], created_at: new Date().toISOString(), cls: "demo", acknowledged: false },
];

export const DEMO_REPORTS: MonthlyReport[] = [
  {
    id: "rep-demo-2026-08", system_id: "sys-demo-1", month: "2026-08",
    energy: { total_kwh: 1012.4, breakdown: [], trend_pct: -3.1, cls: "demo" },
    financial: { estimated_savings: null, maintenance_costs: null, currency: "KWD", cls: "unavailable", notes: ["[PLACEHOLDER: ELECTRICITY TARIFF]", "[PLACEHOLDER: MAINTENANCE PRICE]"] },
    maintenance: { incidents: 0, cleanings: 0, repairs: 0, replacements: 0 },
    environmental: { co2_kg: null, cls: "unavailable", notes: ["[PLACEHOLDER: GRID CO2 EMISSION FACTOR]"] },
    ai: { observations: [], issues: [], recommendations: [], cls: "unavailable" },
    generated_at: "2026-09-01T00:00:00Z", is_demo: true,
  },
  {
    id: "rep-demo-2026-07", system_id: "sys-demo-1", month: "2026-07",
    energy: { total_kwh: 1044.9, breakdown: [], trend_pct: -8.4, cls: "demo" },
    financial: { estimated_savings: null, maintenance_costs: null, currency: "KWD", cls: "unavailable", notes: ["[PLACEHOLDER: ELECTRICITY TARIFF]"] },
    maintenance: { incidents: 1, cleanings: 1, repairs: 0, replacements: 0 },
    environmental: { co2_kg: null, cls: "unavailable", notes: ["[PLACEHOLDER: GRID CO2 EMISSION FACTOR]"] },
    ai: { observations: [], issues: [], recommendations: [], cls: "unavailable" },
    generated_at: "2026-08-01T00:00:00Z", is_demo: true,
  },
];

export const DEMO_APPOINTMENTS: Appointment[] = [
  { id: "ap-demo-1", kind: "inspection", system_id: "sys-demo-1", provider_id: "c-demo-maint", scheduled_at: "2026-09-25T07:30:00Z", status: "confirmed", notes: "Demo appointment." },
];

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: "n-demo-1", user_id: DEMO_USER_ID, kind: "alert", title: "Demo: monitoring alert", body: "A demo monitoring alert was raised for your demo system.", created_at: new Date().toISOString(), read: false, delivery: "in_app_only" },
  { id: "n-demo-2", user_id: DEMO_USER_ID, kind: "appointment", title: "Demo: inspection scheduled", body: "Demo inspection confirmed for 25 Sep 2026.", created_at: "2026-09-12T09:00:00Z", read: true, delivery: "in_app_only" },
];
