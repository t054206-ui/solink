/**
 * Solink domain types. These mirror the Supabase schema in supabase/migrations
 * and are used by both the Supabase repositories and the labeled demo layer.
 */
import type { DataClass } from "./classification";

export type UUID = string;
export type ISODate = string;

export type VerificationStatus = "unverified" | "pending_verification" | "verified";
export type FieldAvailability = "unavailable" | "not_applicable" | "pending_verification";

/** A spec field that may legitimately be missing. Never force fake values in. */
export type SpecValue<T = number> = { value: T; unit?: string } | { value: null; status: FieldAvailability };

export type ProductCategory =
  | "solar_panel" | "inverter" | "battery" | "installation_package"
  | "maintenance_package" | "cleaning_service" | "other_service";

export interface Manufacturer {
  id: UUID;
  name: string;
  country?: string | null;
  website?: string | null;
  is_demo: boolean;
  verification_status: VerificationStatus;
}

export interface ProductSource {
  data_source: string;          // e.g. "Manufacturer datasheet", "Participating company", "CSV import"
  source_url?: string | null;
  datasheet_url?: string | null;
  manufacturer_doc_url?: string | null;
  date_added: ISODate;
  date_last_updated: ISODate;
  verification_status: VerificationStatus;
  verified_by?: UUID | null;
  verified_at?: ISODate | null;
  /** Required note recorded when an admin sets verification_status to 'verified'. */
  verification_note?: string | null;

  /* ---- provenance for records imported from a real source -----------------
   * Manufacturer facts and market facts are kept apart on purpose. A global
   * datasheet is good evidence for a specification and no evidence at all for
   * what a shop in Kuwait stocks or charges, so the two never share a field.
   * Everything here is optional: records imported before this existed, and
   * records with no market data, simply do not carry it. */

  /** Official manufacturer product page for this model. */
  manufacturer_url?: string | null;
  /** What the manufacturer source is and any caveat, e.g. a preliminary revision. */
  manufacturer_source_note?: string | null;

  /** Name of the local supplier whose listing supplied the market data below. */
  kuwait_supplier?: string | null;
  /** The supplier's page for this exact product. Never a homepage. */
  kuwait_supplier_url?: string | null;
  /** Price exactly as published locally, in KWD. Never converted from another currency. */
  kuwait_price_kwd?: number | null;
  /** The day the price above was read from that page. */
  kuwait_price_observed_at?: ISODate | null;
  /** 'listed_by_retailer' means a shop lists it. It does not mean stock was confirmed. */
  kuwait_availability?: "listed_by_retailer" | "unavailable" | null;
  kuwait_availability_note?: string | null;

  /** Field name -> the exact URL the value came from. */
  field_sources?: Record<string, string> | null;
  /** Set when sources disagreed, saying which value was kept and why. */
  source_conflict_note?: string | null;
}

export interface PanelSpecifications {
  rated_power_w: SpecValue;
  module_efficiency_pct: SpecValue;
  max_system_voltage_v: SpecValue;
  voc_v: SpecValue;
  isc_a: SpecValue;
  vmp_v: SpecValue;
  imp_a: SpecValue;
  length_mm: SpecValue;
  width_mm: SpecValue;
  thickness_mm: SpecValue;
  weight_kg: SpecValue;
  cell_technology: SpecValue<string>;
  number_of_cells: SpecValue;
  temperature_coefficient_pmax_pct_per_c: SpecValue;
  operating_temperature_range_c: SpecValue<string>;
  product_warranty_years: SpecValue;
  performance_warranty_years: SpecValue;
  performance_warranty_end_pct: SpecValue;
  expected_lifetime_years: SpecValue;
  additional: Record<string, SpecValue<string | number>>;
}

export interface Product {
  id: UUID;
  category: ProductCategory;
  manufacturer_id: UUID | null;
  manufacturer_name: string;       // denormalized for display
  model: string;
  name: string;
  description?: string | null;
  /** price is optional — never invented */
  price: SpecValue;
  currency: string;                // "KWD" default
  installation_cost: SpecValue;
  annual_maintenance_cost: SpecValue;
  cleaning_cost: SpecValue;
  expected_annual_production_kwh: SpecValue; // only if provided by a source; otherwise calculated elsewhere
  images: string[];
  specs: Partial<PanelSpecifications> & Record<string, unknown>;
  source: ProductSource;
  is_demo: boolean;
  is_archived: boolean;
  is_outdated: boolean;
  /** Current spec version id; passports snapshot a specific version */
  current_version_id: UUID | null;
  provider_id?: UUID | null;       // for services offered by a company
}

export interface ProductVersion {
  id: UUID;
  product_id: UUID;
  version: number;
  specs: Product["specs"];
  price: SpecValue;
  source: ProductSource;
  created_at: ISODate;
  change_note?: string | null;
}

export type HouseType = "villa" | "apartment_building" | "townhouse" | "commercial" | "other";
export type RoofOrientation = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "flat" | "unknown";
/**
 * The MEW consumption sector a property is billed under. These are the six
 * rows of "Tariff Of Electricity In All Sectors Of Consumption" (Electrical
 * Energy Statistical Yearbook 2020, p. 113). Rates are NOT here: they are a
 * platform setting entered with a source. A private house is residential; an
 * apartment building is investment_commercial.
 */
export type TariffCategory = "residential" | "investment_commercial" | "industrial_agricultural" | "productive_industrial_agricultural" | "governmental" | "other";

export interface SolarProfile {
  id: UUID;
  user_id: UUID;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  country_code: string;            // "KW"
  governorate?: string | null;
  house_type?: HouseType | null;
  tariff_category?: TariffCategory | null;
  roof_length_m?: number | null;
  roof_width_m?: number | null;
  roof_area_m2?: number | null;
  available_roof_area_m2?: number | null;
  roof_orientation?: RoofOrientation | null;
  roof_tilt_deg?: number | null;
  shading_notes?: string | null;
  monthly_consumption_kwh?: number | null;
  monthly_bill?: number | null;
  currency: string;
  budget?: number | null;
  roof_photo_path?: string | null;
  updated_at: ISODate;
}

export interface ProviderCompany {
  id: UUID;
  name: string;
  kind: ("solar_company" | "installer" | "maintenance" | "cleaning")[];
  is_demo: boolean;
  verification_status: VerificationStatus;
  contact_email?: string | null;
  phone?: string | null;
  service_area?: string | null;
}

export type SystemStatus = "designed" | "requested" | "purchased" | "installation_scheduled" | "installed" | "decommissioned";

export interface SolarSystem {
  id: UUID;
  user_id: UUID;
  profile_id: UUID | null;
  name: string;
  status: SystemStatus;
  capacity_kwp: number | null;
  panel_count: number | null;
  panel_product_id: UUID | null;
  panel_version_id: UUID | null;   // snapshot of specs at install
  inverter_product_id: UUID | null;
  inverter_version_id: UUID | null;
  battery_product_id: UUID | null;
  installer_id: UUID | null;
  installation_date: ISODate | null;
  commissioning_date: ISODate | null;
  is_demo: boolean;
  monitoring_source: string | null; // null until [PLACEHOLDER: SOLAR MONITORING HARDWARE/API]
  created_at: ISODate;
}

export interface SolarPassport {
  id: UUID;
  system_id: UUID;
  passport_number: string;
  installation_company: string | null;
  installer_id: UUID | null;
  installation_date: ISODate | null;
  panel_snapshot: { manufacturer: string; model: string; specs: Product["specs"]; version_id: UUID | null } | null;
  inverter_snapshot: { manufacturer: string; model: string; specs: Record<string, unknown>; version_id: UUID | null } | null;
  panel_count: number | null;
  capacity_kwp: number | null;
  warranty: { product_years: number | null; performance_years: number | null; installer_years: number | null; notes?: string };
  installation_notes?: string | null;
  is_demo: boolean;
  created_at: ISODate;
}

export interface ProductionRecord {
  id: UUID;
  system_id: UUID;
  period_start: ISODate;
  period_end: ISODate;
  granularity: "hour" | "day" | "month" | "year";
  energy_kwh: number;
  source: string;        // "hardware:<vendor>" | "demo"
  cls: DataClass;
}

export interface PanelProductionRecord {
  id: UUID;
  system_id: UUID;
  panel_index: number;
  period_start: ISODate;
  energy_kwh: number;
  status: "normal" | "underperforming" | "fault" | "unknown";
  source: string;
  cls: DataClass;
}

export interface WeatherSnapshot {
  observed_at: ISODate;
  temp_c: number | null;
  humidity_pct: number | null;
  wind_kph: number | null;
  cloud_pct: number | null;
  precip_mm: number | null;
  uv: number | null;
  condition: string | null;
  pm2_5: number | null;
  pm10: number | null;
  us_epa_index: number | null;
  source: "weatherapi.com" | "demo";
  cls: DataClass;
}

export type MaintenanceStatus = "new" | "reviewing" | "scheduled" | "in_progress" | "resolved" | "closed";
export type MaintenanceKind = "cleaning" | "inspection" | "minor_maintenance" | "repair" | "replacement" | "annual_maintenance";
export type Urgency = "urgent" | "inspection" | "routine";

export interface MaintenanceCase {
  id: UUID;
  system_id: UUID;
  user_id: UUID;
  provider_id: UUID | null;
  kind: MaintenanceKind;
  status: MaintenanceStatus;
  urgency: Urgency;
  detected_issue: string;
  ai_analysis?: string | null;
  ai_analysis_cls?: DataClass;
  appointment_at?: ISODate | null;
  technician_name?: string | null;
  work_performed?: string | null;
  parts?: string | null;
  cost: SpecValue;
  before_image_path?: string | null;
  after_image_path?: string | null;
  production_before_kwh?: number | null;
  production_after_kwh?: number | null;
  notes?: string | null;
  created_at: ISODate;
  updated_at: ISODate;
  is_demo: boolean;
}

export type IncidentStatus = "open" | "investigating" | "resolved" | "closed";

export interface Incident {
  id: UUID;
  system_id: UUID;
  panel_index?: number | null;
  occurred_at: ISODate;
  reported_problem: string;
  ai_analysis?: string | null;
  images: string[];
  action_taken?: string | null;
  technician_name?: string | null;
  cost: SpecValue;
  result?: string | null;
  status: IncidentStatus;
  maintenance_case_id?: UUID | null;
  is_demo: boolean;
}

export interface MonthlyReport {
  id: UUID;
  system_id: UUID;
  month: string; // YYYY-MM
  energy: { total_kwh: number | null; breakdown: { day: string; kwh: number }[]; trend_pct: number | null; cls: DataClass };
  financial: { estimated_savings: number | null; maintenance_costs: number | null; currency: string; cls: DataClass; notes: string[] };
  maintenance: { incidents: number; cleanings: number; repairs: number; replacements: number };
  environmental: { co2_kg: number | null; cls: DataClass; notes: string[] };
  ai: { observations: string[]; issues: string[]; recommendations: string[]; cls: "ai" | "unavailable" };
  generated_at: ISODate;
  is_demo: boolean;
}

export type MonitorStatus = "normal" | "monitor" | "inspection_recommended" | "maintenance_recommended" | "insufficient_data";

export interface AiAlert {
  id: UUID;
  system_id: UUID;
  status: MonitorStatus;
  title: string;
  message: string;
  evidence: string[];
  created_at: ISODate;
  cls: "ai" | "calculated" | "demo";
  acknowledged: boolean;
}

export interface Appointment {
  id: UUID;
  kind: "installation" | "maintenance" | "inspection" | "cleaning";
  system_id: UUID;
  provider_id: UUID | null;
  scheduled_at: ISODate;
  status: "requested" | "confirmed" | "completed" | "cancelled";
  notes?: string | null;
}

export interface Notification {
  id: UUID;
  user_id: UUID;
  kind: string;
  title: string;
  body: string;
  created_at: ISODate;
  read: boolean;
  delivery: "in_app_only"; // until [PLACEHOLDER: EMAIL / NOTIFICATION PROVIDER]
}

export interface AiConversationMessage {
  role: "user" | "assistant";
  content: string;
  created_at: ISODate;
  /** Context snapshot summary the answer was based on */
  context_used?: string[];
}
