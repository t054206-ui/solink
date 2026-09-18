# Solink — Environment & Integrations

All secrets live in environment variables. Server-only keys are read exclusively in
`src/lib/config/env.ts → serverEnv()` and in modules marked `import "server-only"`.
Nothing under `NEXT_PUBLIC_` may be secret.

| Variable | Scope | Used by | When missing |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | auth, RLS-scoped data access | **Demo mode**: no accounts; labeled demo data; edits persist per-browser only |
| `SUPABASE_SERVICE_ROLE_KEY` | server | imports, hardware ingestion, admin jobs | admin/import server actions return "requires Supabase" |
| `CLAUDE_API_KEY` (or `ANTHROPIC_API_KEY`), `CLAUDE_MODEL` | server | AI Solar Agent, image inspection, recommendations, monitoring assessment, placement, explanations | every AI surface shows `[PLACEHOLDER: CLAUDE API KEY]` and an unavailable state — no fake AI answers |
| `WEATHER_API_KEY` | server | WeatherAPI.com current/forecast/air-quality | weather cards show `[PLACEHOLDER: WEATHER API KEY]`; no substitute provider |
| `GOOGLE_MAPS_API_KEY` | server | Geocoding / reverse geocoding (`/api/geocode`) | address search unavailable; manual coordinates allowed (labeled user-provided) |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | browser (referrer-restricted) | Maps JavaScript API map view | map view unavailable state |
| `GOOGLE_SOLAR_API_KEY` | server | Building insights (roof/sun data) — **only if access is confirmed** | `[PLACEHOLDER: GOOGLE SOLAR / SOLAR SITE DATA SOURCE]` |

## Not yet selected (deliberately no variable)
- `[PLACEHOLDER: PAYMENT PROVIDER]` — checkout is a labeled non-functional demo.
- `[PLACEHOLDER: EMAIL / NOTIFICATION PROVIDER]` — notifications are stored in-app only.
- `[PLACEHOLDER: SOLAR MONITORING HARDWARE/API]` — `production_records` is written by a future ingestion job using the service role key; until then dashboards show demo/unavailable.
- `[PLACEHOLDER: PANEL-LEVEL MONITORING DATA SOURCE]` — `panel_production_records`.

## Vercel

The project is already imported and connected to Git:

| | |
|---|---|
| Repository | `t054206-ui/solink` (private) |
| Vercel project | `solink` |
| Vercel team | `t054206-3843` (Hobby) |
| Production branch | `main` |

Pushing to `main` deploys to production; every other branch gets a preview.

**No environment variables are set yet**, so the deployed site runs in demo mode:
labeled demo data, no accounts, and each integration showing its placeholder.
That is the intended state until the decisions in `DECISIONS-NEEDED.md` are made.

To connect a real integration:
1. Add its variables in *Settings → Environment Variables* (Production + Preview).
2. Set `NEXT_PUBLIC_APP_URL` to the deployment URL.
3. Redeploy so the new variables are picked up.
4. For Supabase, add the Vercel URL to *Authentication → URL configuration* in the
   Supabase dashboard, or sign-in redirects will be rejected.

## Supabase
1. Create a Solink project (the current organisation has reached its free-project limit — see `docs/DECISIONS-NEEDED.md`).
2. Apply `supabase/migrations/*.sql` in order (`supabase db push`, SQL editor, or the Supabase MCP `apply_migration`).
3. Optionally run `supabase/seed.sql` (labeled DEMO data).
4. Copy the project URL, anon key, and service-role key into the variables above.
5. Storage buckets are created by migration `0002` (private; per-user folders).
