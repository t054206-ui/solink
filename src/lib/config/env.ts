/**
 * Environment access. Server-only secrets are read here and never exported
 * to client components. Public values use the NEXT_PUBLIC_ prefix.
 *
 * Required variables are documented in docs/ENVIRONMENT.md and .env.example.
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  googleMapsBrowserKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

export function isGoogleMapsBrowserConfigured(): boolean {
  return Boolean(publicEnv.googleMapsBrowserKey);
}

/* ---------- server-only below (never import into client components) ---------- */

export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser.");
  }
  return {
    claudeApiKey: process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? "",
    claudeModel: process.env.CLAUDE_MODEL ?? "claude-opus-5",
    weatherApiKey: process.env.WEATHER_API_KEY ?? "",
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    googleSolarApiKey: process.env.GOOGLE_SOLAR_API_KEY ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

export type IntegrationKey =
  | "supabase"
  | "claude"
  | "weather"
  | "googleMaps"
  | "googleSolar"
  | "monitoringHardware"
  | "panelLevelMonitoring"
  | "payment"
  | "notifications"
  | "realPanelData";

export interface IntegrationStatus {
  key: IntegrationKey;
  label: string;
  connected: boolean;
  /** Placeholder key from placeholders.ts when not connected */
  placeholder: string;
  envVars: string[];
}

/** Server-side snapshot of what is connected. Safe to pass to client (booleans only). */
export function integrationStatus(): IntegrationStatus[] {
  const s = serverEnv();
  return [
    { key: "supabase", label: "Supabase (database, auth, storage)", connected: isSupabaseConfigured(), placeholder: "SUPABASE_PROJECT", envVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] },
    { key: "claude", label: "Claude API (AI Solar Agent, image inspection)", connected: Boolean(s.claudeApiKey), placeholder: "CLAUDE_API_KEY", envVars: ["CLAUDE_API_KEY", "CLAUDE_MODEL"] },
    { key: "weather", label: "WeatherAPI.com", connected: Boolean(s.weatherApiKey), placeholder: "WEATHER_API_KEY", envVars: ["WEATHER_API_KEY"] },
    { key: "googleMaps", label: "Google Maps Platform", connected: Boolean(s.googleMapsApiKey), placeholder: "GOOGLE_MAPS_API_KEY", envVars: ["GOOGLE_MAPS_API_KEY", "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY"] },
    { key: "googleSolar", label: "Google Solar API (site data)", connected: Boolean(s.googleSolarApiKey), placeholder: "GOOGLE_SOLAR_SITE_DATA_SOURCE", envVars: ["GOOGLE_SOLAR_API_KEY"] },
    { key: "monitoringHardware", label: "Solar monitoring hardware / inverter API", connected: false, placeholder: "SOLAR_MONITORING_HARDWARE_API", envVars: [] },
    { key: "panelLevelMonitoring", label: "Panel-level monitoring", connected: false, placeholder: "PANEL_LEVEL_MONITORING_DATA_SOURCE", envVars: [] },
    { key: "payment", label: "Payment provider", connected: false, placeholder: "PAYMENT_PROVIDER", envVars: [] },
    { key: "notifications", label: "Email / notification provider", connected: false, placeholder: "EMAIL_NOTIFICATION_PROVIDER", envVars: [] },
    { key: "realPanelData", label: "Real solar-panel dataset", connected: false, placeholder: "REAL_SOLAR_PANEL_DATA_SOURCE", envVars: [] },
  ];
}
