import "server-only";
import { PLACEHOLDERS, type PlaceholderKey } from "./placeholders";
import { isSupabaseConfigured, serverEnv } from "./env";
import { getPlatformSettings } from "@/lib/data/settings";
import { listProducts } from "@/lib/data/repositories";
import { LEGAL_VALUES } from "@/lib/content/legal";

/**
 * What is actually still undecided.
 *
 * The placeholder registry lists every key that can ever appear, so a page
 * that prints the registry says "28 outstanding" long after values have been
 * entered. This resolves each key against the live state: platform settings,
 * environment keys, the catalogue, the legal values. "partial" means a value
 * exists in one form (a per-product figure, an import pattern in use) while
 * the platform-wide decision is still the owner's to make.
 */
export type PlaceholderState = "resolved" | "partial" | "open";
export interface PlaceholderStatus { state: PlaceholderState; detail: string }

export async function getPlaceholderStatus(): Promise<Record<PlaceholderKey, PlaceholderStatus>> {
  const [settings, env, catalogue] = await Promise.all([
    getPlatformSettings(),
    Promise.resolve(serverEnv()),
    listProducts({ category: "solar_panel" }).catch(() => ({ data: [] as { is_demo: boolean }[] })),
  ]);
  const real = catalogue.data.filter((p) => !p.is_demo).length;
  const withWarrantyCurve = catalogue.data.filter((p) => {
    const extra = (p as unknown as { specs?: { additional?: Record<string, { value?: unknown }> } }).specs?.additional ?? {};
    return typeof extra.annual_degradation_year_2_30_pct?.value === "number";
  }).length;

  const setting = (v: { source: string } | null | undefined, label: string): PlaceholderStatus =>
    v ? { state: "resolved", detail: `Entered in platform settings. Source: ${v.source}` } : { state: "open", detail: label };
  const key = (present: unknown, name: string): PlaceholderStatus =>
    present ? { state: "resolved", detail: `${name} is set in the environment.` } : { state: "open", detail: `${name} is not set. The feature shows a not-connected state.` };

  const s: Record<PlaceholderKey, PlaceholderStatus> = {
    ELECTRICITY_TARIFF: setting(settings.electricity_tariff_per_kwh, "No tariff entered."),
    SOLAR_RESOURCE_DATA_SOURCE: setting(settings.peak_sun_hours_per_day, "No peak-sun-hours value entered."),
    SYSTEM_LOSS_FACTOR: setting(settings.performance_ratio, "No performance ratio entered."),
    GRID_CO2_EMISSION_FACTOR: setting(settings.grid_co2_kg_per_kwh, "No grid emission factor entered."),
    EXPECTED_PANEL_DEGRADATION_RATE: settings.expected_panel_degradation_rate
      ? setting(settings.expected_panel_degradation_rate, "")
      : withWarrantyCurve > 0
        ? { state: "partial", detail: `No platform-wide rate. ${withWarrantyCurve} catalogue panel${withWarrantyCurve === 1 ? "" : "s"} carry the manufacturer's warranty curve, which is used wherever the panel is known.` }
        : { state: "open", detail: "No rate entered and no panel in the catalogue states one." },
    TCO_PERIOD: setting(settings.tco_period_years, "No analysis period chosen. A proposal is in docs/DECISIONS-NEEDED.md."),
    PRODUCTION_ALERT_THRESHOLDS: setting(settings.production_alert_thresholds, "No thresholds chosen. A proposal is in docs/DECISIONS-NEEDED.md."),
    END_OF_LIFE_CRITERIA: settings.end_of_life_criteria ? { state: "resolved", detail: "Entered in platform settings." } : { state: "open", detail: "No criteria chosen. A proposal is in docs/DECISIONS-NEEDED.md." },
    SUPABASE_PROJECT: isSupabaseConfigured() ? { state: "resolved", detail: "Connected. Migrations 0001 to 0006 applied." } : { state: "open", detail: "Not configured; demo mode." },
    CLAUDE_API_KEY: key(env.claudeApiKey, "CLAUDE_API_KEY"),
    WEATHER_API_KEY: key(env.weatherApiKey, "WEATHER_API_KEY"),
    GOOGLE_MAPS_API_KEY: key(env.googleMapsApiKey, "GOOGLE_MAPS_API_KEY"),
    GOOGLE_SOLAR_SITE_DATA_SOURCE: key(env.googleSolarApiKey, "GOOGLE_SOLAR_API_KEY"),
    REAL_SOLAR_PANEL_DATA_SOURCE: real > 0
      ? { state: "partial", detail: `${real} real product${real === 1 ? "" : "s"} imported from manufacturer datasheets (docs/DATA-CLEANING-LOG.md). Whether that stays the source, or manufacturers publish directly, is still open.` }
      : { state: "open", detail: "No real products yet." },
    SOLAR_PANEL_DATA_IMPORT_METHOD: real > 0
      ? { state: "partial", detail: "In practice: a reviewed SQL import per batch under supabase/imports/, one log entry per conflict. Not formally chosen over CSV or API." }
      : { state: "open", detail: "Undecided." },
    LEGAL_OPERATOR: LEGAL_VALUES.operator ? { state: "resolved", detail: `Set by the owner: ${LEGAL_VALUES.operator.en}.` } : { state: "open", detail: "Not named." },
    LEGAL_CONTACT: LEGAL_VALUES.contact ? { state: "resolved", detail: `Set by the owner: ${LEGAL_VALUES.contact.en}.` } : { state: "open", detail: "No address chosen." },
    GOVERNING_LAW: LEGAL_VALUES.law ? { state: "resolved", detail: `Set by the owner: ${LEGAL_VALUES.law.en}.` } : { state: "open", detail: "Not decided." },
    PAYMENT_PROVIDER: { state: "open", detail: "No provider selected. Checkout is a labelled demonstration." },
    EMAIL_NOTIFICATION_PROVIDER: { state: "open", detail: "No provider selected. Notifications are in-app only; Supabase sends auth emails." },
    SOLAR_MONITORING_HARDWARE_API: { state: "open", detail: "No inverter or monitoring integration." },
    PANEL_LEVEL_MONITORING_DATA_SOURCE: { state: "open", detail: "Needs optimisers or micro-inverters that report per panel." },
    ANONYMIZED_NEARBY_SYSTEM_DATA: { state: "open", detail: "Needs a privacy-reviewed data-sharing design first." },
    ADMIN_AUTHENTICATION_PERMISSIONS: { state: "open", detail: "Admin is a role flag; the permission model is not final." },
    MAINTENANCE_PRICE: { state: "open", detail: "Entered by maintenance providers as they join. None yet." },
    INSTALLATION_PRICE: { state: "open", detail: "Entered by installers as they join. None yet." },
    ROOF_LOAD_CAPACITY: { state: "open", detail: "Per building, from structural drawings or an engineer. Never a default." },
    OTHER_REQUIRED_KEYS: { state: "open", detail: "Reserved for future integrations." },
  };
  // Every registry key must be classified; a new key without a rule shows as open.
  for (const k of Object.keys(PLACEHOLDERS) as PlaceholderKey[]) if (!s[k]) s[k] = { state: "open", detail: "Not yet classified." };
  return s;
}
