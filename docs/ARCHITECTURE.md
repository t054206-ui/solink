# Solink — Architecture

## Stack
- **Next.js 16** (App Router, React 19, TypeScript, Tailwind v4) — `src/app`
- **Supabase** — Postgres + Auth + Storage, RLS on every user table — `supabase/migrations`
- **Claude API** (`@anthropic-ai/sdk`) — single server-only client — `src/lib/ai/claude.ts`
- **WeatherAPI.com**, **Google Maps Platform** — server-only clients — `src/lib/weather`, `src/lib/maps`
- **Vercel** — deployment; all secrets as environment variables

## Layers
```
Browser (client components)  ──fetch──▶  Route handlers /api/*  ──▶  server-only libs (ai, weather, maps)
        │                                          │
        │ server actions (writes)                  └──▶ Supabase (RLS, user session cookie)
        ▼
Server components ──▶ src/lib/data/repositories.ts ──▶ Supabase │ labeled demo dataset (src/lib/demo)
```
- Secrets never reach the client. `src/lib/config/env.ts → serverEnv()` throws in the browser.
- `src/proxy.ts` refreshes the Supabase session cookie and guards protected routes (Next 16 renamed middleware → proxy).
- **Data mode** (`src/lib/data/mode.ts`): `supabase` when configured, otherwise `demo`. The UI never hides which mode it is in (sticky DEMO banner).

## Honesty system (non-negotiable)
- `src/lib/classification.ts` — every metric is a `Classified<T>` = `{ value | null, cls, source, notes, reason }`. `cls ∈ source | calculated | estimated | ai | demo | user | unavailable`.
- `src/components/ui/DataBadge.tsx` renders the label; `Metric` renders unavailable reasons instead of numbers.
- `src/lib/config/placeholders.ts` — the registry of every undecided value/provider. `Placeholder`/`PlaceholderNote` components render them.
- `src/lib/solar/calculations.ts` — pure functions; every assumption is a parameter; missing → `unavailable(reason)`. No constants for tariff, irradiance, losses, emission factor, degradation.
- `src/lib/ai/claude.ts` — one system prompt (`SOLINK_AI_RULES`) forbids fabrication; `src/lib/ai/context.ts` retrieves the user's actual data before every answer.

## Real solar-panel data architecture
- `solar_products.specs` stores `SpecValue`s: `{value, unit}` or `{value:null, status}` — fields may be unavailable / not applicable / pending verification.
- `source` JSON tracks data source, URLs, dates, verification status. **Verified** is only set by an explicit admin action.
- `product_versions` is written by a trigger on every spec/price change; `solar_systems.panel_version_id` and `solar_passports.panel_snapshot` freeze what was installed (data versioning).
- `0003_solink_validation.sql` flags missing/invalid/inconsistent specs into `validation_flags` and demotes "verified" to "pending" on flags; it never edits manufacturer data.
- `product_imports` / `product_import_rows` support CSV/Excel/API/bulk/manual imports; the admin CSV mapper lives at `/admin/products/import`.
- Swapping demo → real: insert real rows (is_demo=false); the repositories and every UI surface are unchanged.

## Future integrations (no rebuild required)
| Integration | Hook point |
|---|---|
| Monitoring hardware | ingestion job writes `production_records` (`source='hardware:<vendor>'`, `cls='source'`); set `solar_systems.monitoring_source` |
| Panel-level data | `panel_production_records` → `/monitoring/panels` |
| Payment | `/purchase` step 3 + `orders.payment_provider/reference` |
| Notifications | deliver rows from `notifications`; set `delivery` |
| Solar resource | `platform_settings.peak_sun_hours_per_day` or Google Solar via `getBuildingInsights()` |
| More GCC countries | `solar_profiles.country_code`, currency per profile |

## Directory map
```
src/app/(marketing)   landing, /guide
src/app/(auth)        /login, /signup
src/app/(app)         everything behind the app shell (dashboard … admin)
src/app/api           server route handlers (ai/*, weather, geocode, integrations)
src/components        ui kit, charts, layout, help (InfoTip), agent (chat)
src/lib               config, classification, glossary, calculations, data layer, demo, ai, weather, maps, supabase
supabase/migrations   0001 core schema · 0002 RLS + storage · 0003 validation
docs                  this file, ENVIRONMENT, DECISIONS-NEEDED, DATA-MODEL
```
