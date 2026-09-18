# Solink — Decisions needed from the project owner

Solink is built so that none of these block the platform; each is a labeled placeholder
until decided. Nothing has been assumed silently.

| # | Decision | Placeholder | Where it lands once decided |
|---|---|---|---|
| 1 | **Supabase project** — the organisation `t054206-ui's Org` has hit the 2-active-free-project limit (wellness-cafe, gahwa-house). Options: pause one, upgrade, or create the Solink project in another org. | `[PLACEHOLDER: SUPABASE PROJECT]` | `.env.local` / Vercel env; apply `supabase/migrations` |
| 2 | **Electricity tariff** (per kWh, with source, incl. any tiered/subsidised structure) | `[PLACEHOLDER: ELECTRICITY TARIFF]` | Admin → Platform Settings (`platform_settings.electricity_tariff_per_kwh`) |
| 3 | **Solar resource data source** for sites (peak sun hours / irradiance): Google Solar API, another dataset, or manual | `[PLACEHOLDER: SOLAR RESOURCE DATA SOURCE]`, `[PLACEHOLDER: GOOGLE SOLAR / SOLAR SITE DATA SOURCE]` | `GOOGLE_SOLAR_API_KEY` or platform setting `peak_sun_hours_per_day` |
| 4 | **Performance ratio / loss factor** assumption (or per-design engineering input) | `[PLACEHOLDER: SYSTEM PERFORMANCE RATIO / LOSS FACTOR]` | platform setting `performance_ratio` |
| 5 | **Grid CO₂ emission factor** (kg CO₂/kWh, with source) | `[PLACEHOLDER: GRID CO2 EMISSION FACTOR]` | platform setting `grid_co2_kg_per_kwh` |
| 6 | **Real solar-panel data source** and **import method** | `[PLACEHOLDER: REAL SOLAR PANEL DATA SOURCE]`, `[PLACEHOLDER: SOLAR PANEL DATA IMPORT METHOD]` | Admin → Product Imports (CSV mapping UI exists; Excel/API pending) |
| 7 | **Payment provider** | `[PLACEHOLDER: PAYMENT PROVIDER]` | `src/app/(app)/purchase` step 3 + `orders.payment_provider` |
| 8 | **Email / notification provider** | `[PLACEHOLDER: EMAIL / NOTIFICATION PROVIDER]` | `notifications.delivery`; a server job to deliver |
| 9 | **Solar monitoring hardware / inverter API** (which vendors) | `[PLACEHOLDER: SOLAR MONITORING HARDWARE/API]` | ingestion job → `production_records`; `solar_systems.monitoring_source` |
| 10 | **Panel-level monitoring provider** | `[PLACEHOLDER: PANEL-LEVEL MONITORING DATA SOURCE]` | `panel_production_records` |
| 11 | **Production alert thresholds** | `[PLACEHOLDER: PRODUCTION ALERT THRESHOLDS]` | platform setting `production_alert_thresholds` |
| 12 | **Expected degradation rate** (from manufacturer warranty or real source) | `[PLACEHOLDER: EXPECTED PANEL DEGRADATION RATE]` | platform setting / per product spec |
| 13 | **TCO period** (years) | `[PLACEHOLDER: TCO PERIOD]` | platform setting `tco_period_years` |
| 14 | **End-of-life criteria** | `[PLACEHOLDER: END-OF-LIFE CRITERIA]` | platform setting `end_of_life_criteria` |
| 15 | **Admin permission structure** (roles, who can verify products) | `[PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS]` | `user_profiles.role`, RLS `is_admin()` |
| 16 | **Maintenance / installation prices** — entered by providers or platform | `[PLACEHOLDER: MAINTENANCE PRICE]`, `[PLACEHOLDER: INSTALLATION PRICE]` | `provider_prices`, product cost fields |
| 17 | **Nearby-system comparison** data-sharing & privacy design | `[PLACEHOLDER: ANONYMIZED NEARBY SYSTEM DATA]` | `area_aggregates` |
| 18 | **GitHub remote** — `gh` CLI is not installed on this machine; the repo is committed locally only. Provide the remote URL (or install `gh`) to push. | — | `git remote add origin …` |

## Not yet verified

The SQL in `supabase/migrations/` has not been executed anywhere. No Solink
Supabase project exists (decision 1), and there is no local Postgres or Docker on
this machine, so the schema, policies and triggers are reviewed but unrun. Expect
to iterate on them the first time they are applied.

Everything above is a decision only you can make. The application itself runs
today in demo mode, and each decision swaps a placeholder for a real value
without any rebuild.
