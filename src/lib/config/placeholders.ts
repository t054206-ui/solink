/**
 * Solink placeholder registry.
 *
 * Every decision, data source, credential, or real-world value that has NOT
 * been provided by the project owner is represented here. Nothing in Solink is
 * allowed to invent a value for these. UI components render them with the
 * <Placeholder> component so they are impossible to miss.
 *
 * When a real value/provider is chosen, update the entry here (and, where
 * relevant, the corresponding environment variable or platform_settings row).
 */
export const PLACEHOLDERS = {
  ELECTRICITY_TARIFF: "[PLACEHOLDER: ELECTRICITY TARIFF]",
  REAL_SOLAR_PANEL_DATA_SOURCE: "[PLACEHOLDER: REAL SOLAR PANEL DATA SOURCE]",
  SOLAR_PANEL_DATA_IMPORT_METHOD: "[PLACEHOLDER: SOLAR PANEL DATA IMPORT METHOD]",
  PAYMENT_PROVIDER: "[PLACEHOLDER: PAYMENT PROVIDER]",
  EMAIL_NOTIFICATION_PROVIDER: "[PLACEHOLDER: EMAIL / NOTIFICATION PROVIDER]",
  SOLAR_MONITORING_HARDWARE_API: "[PLACEHOLDER: SOLAR MONITORING HARDWARE/API]",
  PANEL_LEVEL_MONITORING_DATA_SOURCE: "[PLACEHOLDER: PANEL-LEVEL MONITORING DATA SOURCE]",
  ANONYMIZED_NEARBY_SYSTEM_DATA: "[PLACEHOLDER: ANONYMIZED NEARBY SYSTEM DATA]",
  ADMIN_AUTHENTICATION_PERMISSIONS: "[PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS]",
  CLAUDE_API_KEY: "[PLACEHOLDER: CLAUDE API KEY]",
  WEATHER_API_KEY: "[PLACEHOLDER: WEATHER API KEY]",
  GOOGLE_MAPS_API_KEY: "[PLACEHOLDER: GOOGLE MAPS API KEY]",
  GOOGLE_SOLAR_SITE_DATA_SOURCE: "[PLACEHOLDER: GOOGLE SOLAR / SOLAR SITE DATA SOURCE]",
  SOLAR_RESOURCE_DATA_SOURCE: "[PLACEHOLDER: SOLAR RESOURCE DATA SOURCE]",
  MAINTENANCE_PRICE: "[PLACEHOLDER: MAINTENANCE PRICE]",
  TCO_PERIOD: "[PLACEHOLDER: TCO PERIOD]",
  PRODUCTION_ALERT_THRESHOLDS: "[PLACEHOLDER: PRODUCTION ALERT THRESHOLDS]",
  EXPECTED_PANEL_DEGRADATION_RATE: "[PLACEHOLDER: EXPECTED PANEL DEGRADATION RATE]",
  END_OF_LIFE_CRITERIA: "[PLACEHOLDER: END-OF-LIFE CRITERIA]",
  GRID_CO2_EMISSION_FACTOR: "[PLACEHOLDER: GRID CO2 EMISSION FACTOR]",
  SYSTEM_LOSS_FACTOR: "[PLACEHOLDER: SYSTEM PERFORMANCE RATIO / LOSS FACTOR]",
  INSTALLATION_PRICE: "[PLACEHOLDER: INSTALLATION PRICE]",
  SUPABASE_PROJECT: "[PLACEHOLDER: SUPABASE PROJECT]",
  OTHER_REQUIRED_KEYS: "[PLACEHOLDER: OTHER REQUIRED KEYS]",
  // Legal pages (/privacy, /terms). Drafted 2026-09-21; these three are the
  // owner's to supply, and a lawyer's review of both documents is pending.
  LEGAL_OPERATOR: "[PLACEHOLDER: LEGAL OPERATOR / ENTITY]",
  LEGAL_CONTACT: "[PLACEHOLDER: PRIVACY / LEGAL CONTACT]",
  GOVERNING_LAW: "[PLACEHOLDER: GOVERNING LAW]",
} as const;

export type PlaceholderKey = keyof typeof PLACEHOLDERS;

/** Human explanation of what each placeholder is waiting for (shown in tooltips / admin). */
export const PLACEHOLDER_NOTES: Record<PlaceholderKey, string> = {
  ELECTRICITY_TARIFF: "Kuwait / GCC electricity price per kWh has not been provided. Savings cannot be calculated without it.",
  REAL_SOLAR_PANEL_DATA_SOURCE: "The verified manufacturer/product dataset has not been chosen (datasheets, participating companies, licensed API, CSV import…).",
  SOLAR_PANEL_DATA_IMPORT_METHOD: "How real panel data will be loaded (CSV, Excel, API, bulk upload, manual admin entry) is undecided.",
  PAYMENT_PROVIDER: "No payment provider has been selected. The checkout UI is a non-functional demonstration.",
  EMAIL_NOTIFICATION_PROVIDER: "No email / push / SMS provider has been selected. Notifications are stored but not delivered.",
  SOLAR_MONITORING_HARDWARE_API: "No inverter / monitoring hardware integration exists yet. Live production data is unavailable.",
  PANEL_LEVEL_MONITORING_DATA_SOURCE: "Panel-by-panel data requires hardware (optimizers / micro-inverters) that is not connected.",
  ANONYMIZED_NEARBY_SYSTEM_DATA: "Aggregated neighbourhood comparison data needs a privacy-reviewed data-sharing design.",
  ADMIN_AUTHENTICATION_PERMISSIONS: "The admin role / permission model is not finalized. Admin routes are gated by a configurable role flag only.",
  CLAUDE_API_KEY: "Set CLAUDE_API_KEY (server-side only) to enable the AI Solar Agent, image inspection and recommendations.",
  WEATHER_API_KEY: "Set WEATHER_API_KEY for WeatherAPI.com to enable weather and air-quality intelligence.",
  GOOGLE_MAPS_API_KEY: "Set GOOGLE_MAPS_API_KEY (server) and NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY (browser, referrer-restricted) for maps and geocoding.",
  GOOGLE_SOLAR_SITE_DATA_SOURCE: "Google Solar API access has not been confirmed. Roof/sun-exposure site data is unavailable.",
  SOLAR_RESOURCE_DATA_SOURCE: "A solar irradiance / peak-sun-hour data source for the site has not been selected.",
  MAINTENANCE_PRICE: "Maintenance providers have not entered prices. No maintenance cost is assumed.",
  TCO_PERIOD: "The Total Cost of Ownership analysis period (e.g. years) has not been chosen.",
  PRODUCTION_ALERT_THRESHOLDS: "Alert thresholds for production deviation have not been defined.",
  EXPECTED_PANEL_DEGRADATION_RATE: "An annual degradation rate must come from the manufacturer warranty or a real source.",
  END_OF_LIFE_CRITERIA: "Criteria for declaring equipment end-of-life have not been defined.",
  GRID_CO2_EMISSION_FACTOR: "The grid emission factor (kg CO2 per kWh) for Kuwait has not been provided from a real source.",
  SYSTEM_LOSS_FACTOR: "The performance ratio / system loss assumption used to convert irradiance to production has not been set.",
  INSTALLATION_PRICE: "Installation providers have not entered prices.",
  SUPABASE_PROJECT: "A Supabase project for Solink has not been created/connected. The app runs in local demo mode.",
  OTHER_REQUIRED_KEYS: "Additional credentials for future integrations.",
  LEGAL_OPERATOR: "The person or company that operates Solink and is responsible for users' data has not been named.",
  LEGAL_CONTACT: "No address for privacy and legal requests (a copy of data, a correction, deletion) has been chosen. Depends on the email provider decision.",
  GOVERNING_LAW: "The governing law and jurisdiction for the privacy policy and terms have not been decided. A lawyer's review of both documents is pending.",
};

export function placeholder(key: PlaceholderKey): string {
  return PLACEHOLDERS[key];
}
