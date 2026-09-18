# HANDOFF — Solink

_Last updated: 2026-09-19 (Session 1 — the build session). Folder: `~/Desktop/solink`
(Next.js 16 App Router + React 19 + TypeScript + Tailwind v4)._

Solink is a solar-energy platform for Kuwait and the GCC. It connects homeowners,
solar products, solar companies, installers, maintenance providers, system data and
one AI Solar Agent into a single journey:

**Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize**

---

## 0. Status — live, deployed, and running in demo mode on purpose

| | |
| --- | --- |
| Site | https://solink-nu.vercel.app |
| Repository | https://github.com/t054206-ui/solink — **private**, no collaborators |
| Vercel project | `solink`, team `t054206-3843` (Hobby) |
| Deploys | Push to `main` → Vercel builds (~1m 40s) |
| Deployment protection | **Off** — the site is publicly reachable by anyone with the link |
| Routes | 58 pages + 9 API routes, all returning 200 |
| Checks | `npx tsc --noEmit`, `npx eslint src`, `npm run build` — all clean |
| Data mode | **Demo.** No Supabase, no API keys. Everything is labeled demo or placeholder. |

**Nothing is half-finished in the code.** What is missing is not work — it is
seventeen decisions only the owner can make. They are listed in
`docs/DECISIONS-NEEDED.md` and summarised in section 8 below.

---

## 1. Ground rules — the whole point of this project, do not break them

These came from the original brief and are enforced throughout the codebase. A new
session that violates one of these has made the product worse, not better.

1. **Never invent real-world data.** No tariffs, prices, irradiance figures, panel
   specs, weather, production numbers, statistics, degradation rates, emission
   factors, company names or customer details. If a value is not provided, it stays
   a `[PLACEHOLDER: …]`.
2. **Every number carries its provenance.** Source data · Calculated · Estimate ·
   AI interpretation · User-provided · DEMO DATA — NOT REAL · Unavailable.
3. **No fake live features.** Without monitoring hardware the dashboard says
   "Live monitoring is not connected yet". It never says "your system is producing
   4.8 kW right now".
4. **Demo data is always labeled.** `is_demo` records render `<DemoBanner/>`;
   simulated production says `SIMULATED PRODUCTION — NOT REAL`.
5. **Do not silently substitute a service.** Weather is WeatherAPI.com or nothing.
   Maps is Google Maps Platform or nothing. AI is the Claude API or nothing.
6. **Secrets are server-only.** Read through `serverEnv()`, never in a client
   component, never under `NEXT_PUBLIC_`.
7. **Careful language.** "Cleaning may be recommended", "Inspection may be useful",
   "Additional data is required". Never "your panels definitely need cleaning" or
   "this equipment will fail". Correlation is not causation.
8. **PM2.5 / PM10 are environmental indicators, not measurements of dust on panels.**
   This is stated wherever they appear.

---

## 2. Architecture

```
Browser (client components) ──fetch──▶ /api/*  ──▶ server-only libs (ai, weather, maps)
        │                                  │
        │ server actions (writes)          └──▶ Supabase (RLS, session cookie)
        ▼
Server components ──▶ src/lib/data/repositories.ts ──▶ Supabase │ labeled demo dataset
```

- **Data mode** (`src/lib/data/mode.ts`): `supabase` when configured, otherwise
  `demo`. The UI never hides which mode it is in — a sticky DEMO banner sits at the
  top of the page and a DEMO chip stays in the header while scrolling.
- `src/proxy.ts` refreshes the Supabase session cookie and guards protected routes.
  **Next 16 renamed `middleware` to `proxy`** — do not recreate `middleware.ts`.
- Every feature reads through `repositories.ts`, so connecting Supabase changes the
  data source without touching a single page.

### The honesty system (the part that makes Solink what it is)

| File | Role |
| --- | --- |
| `src/lib/classification.ts` | `Classified<T>` = `{ value \| null, cls, source, notes, reason }`. `cls ∈ source \| calculated \| estimated \| ai \| demo \| user \| unavailable` |
| `src/lib/config/placeholders.ts` | The registry of every undecided value. **Never replace one with an invented number.** |
| `src/components/ui/DataBadge.tsx` | Renders the label beside every metric |
| `src/components/ui/Metric.tsx` | Renders the reason when a value is unavailable, instead of a number |
| `src/components/ui/Placeholder.tsx` | `<Placeholder>` and `<PlaceholderNote>` |
| `src/lib/solar/calculations.ts` | Pure functions. **Every assumption is a parameter.** Missing input → `unavailable(reason)`. No constant for tariff, irradiance, losses, CO₂ or degradation exists anywhere. |
| `src/lib/ai/claude.ts` | One system prompt (`SOLINK_AI_RULES`) forbidding fabrication |
| `src/lib/ai/context.ts` | Retrieves the user's actual data before every AI answer |

### Real solar-panel data architecture

- `solar_products.specs` stores `SpecValue`s: `{value, unit}` **or**
  `{value: null, status: "unavailable" \| "not_applicable" \| "pending_verification"}`.
  Missing manufacturer data is represented honestly, never zero-filled.
- `source` JSON tracks data source, URLs, dates and verification status.
  **Verified is only ever set by an explicit admin action with a note.**
- `product_versions` is written by a DB trigger on every spec/price change.
  `solar_systems.panel_version_id` and `solar_passports.panel_snapshot` freeze what
  was installed, so a manufacturer changing a datasheet in 2027 does not rewrite a
  passport from 2025.
- `0003_solink_validation.sql` flags missing/invalid/inconsistent specs and demotes
  "verified" to "pending" — it never edits manufacturer data.
- Swapping demo → real means inserting rows with `is_demo = false`. No UI changes.

---

## 3. Environment variables

All in `.env.example`. Full table with "what happens when missing" in
`docs/ENVIRONMENT.md`.

| Variable | Missing → |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Demo mode: no accounts, labeled demo data, edits persist per-browser only |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin/import server actions return "requires Supabase" |
| `CLAUDE_API_KEY`, `CLAUDE_MODEL` | Every AI surface shows `[PLACEHOLDER: CLAUDE API KEY]`. No fake answers. |
| `WEATHER_API_KEY` | Weather cards unavailable. **No substitute provider.** |
| `GOOGLE_MAPS_API_KEY` | Address search unavailable; manual coordinates allowed, labeled user-provided |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Map view unavailable (this one is browser-side by design; restrict it by HTTP referrer) |
| `GOOGLE_SOLAR_API_KEY` | Site solar data unavailable |

Deliberately absent, because no provider has been chosen: payment, email/notifications,
monitoring hardware, panel-level monitoring.

> **Vercel already holds all ten of these as empty variables.** They were created
> automatically when the repo was imported. They are harmless (see section 6) and are
> convenient slots — fill one in rather than adding a new variable.

---

## 4. What exists — 58 pages

**Marketing** `/` landing · `/guide` the 13-section User Guide with quick-start
roadmap, three-layers-of-help explainer and a "how to read Solink's labels" block.

**Auth** `/login`, `/signup` (show a Supabase placeholder until it is connected).

**Plan** `/profile` (address via geocoding, roof, consumption, budget, roof photo) ·
`/analysis` (solar potential, every assumption visible and editable) ·
`/calculator` (savings + total cost of ownership).

**Choose** `/marketplace` + `/marketplace/[id]` (full spec table, source tracking,
verification status) · `/compare` (up to 4 panels) · `/recommend` (AI trade-offs) ·
`/designer` (drag/rotate real-size panels, geometric auto-fill, AI smart placement) ·
`/purchase` (system → review → request → installer → schedule; payment is a clearly
non-functional demo).

**Operate** `/dashboard` · `/passport` + `/passport/[systemId]` (frozen equipment
snapshots and full history) · `/monitoring` with `/weather`, `/cleaning`,
`/inspection`, `/panels`, `/nearby` · `/maintenance` + `/[id]` + `/book` ·
`/incidents` + `/[id]` + `/new` · `/reports` + `/[id]` · `/performance` ·
`/replacement` · `/notifications` · `/agent`.

**Provider** `/provider` (case queue), `/provider/cases/[id]` (work record form,
forward-only status transitions), `/provider/services`, `/provider/appointments`.

**Admin** 20 pages: dashboard, users, products (+ new/edit with SpecValue editors and
client-side validation mirroring the SQL trigger), CSV import with column mapping and
duplicate detection, manufacturers, providers, datasheets, data sources, verification
queue, maintenance, systems, passports, incidents, reports, alerts, AI config,
integrations, platform settings (a value cannot be saved without a source).

**API** `/api/ai/{agent,recommend,monitor,inspect-image,placement,explain}`,
`/api/weather`, `/api/geocode`, `/api/integrations`.

**Server actions** live in `actions.ts` beside each feature: admin, designer,
incidents, maintenance, profile, provider, purchase, reports.

---

## 5. Database — written, reviewed, never executed

`supabase/migrations/`:

- `0001_solink_core.sql` — full schema (~40 tables), enums, the product-version
  snapshot trigger, passport numbering.
- `0002_solink_rls.sql` — RLS on every user table, storage buckets and policies.
- `0003_solink_validation.sql` — the spec validation function and trigger.
- `supabase/seed.sql` — optional labeled DEMO catalog.

**None of this has ever been run.** There is no Solink Supabase project (section 8,
decision 1) and there is no local Postgres or Docker on this Mac. Expect to iterate
on the SQL the first time it is applied.

RLS was hardened late in the session:
- `my_role()` is a SECURITY DEFINER helper, because the previous inline subquery in
  the `user_profiles` update policy re-entered that table's own policies.
- Owners can now insert and update their own `reports` — previously they could read
  reports but never generate one.
- Storage policies call `public.is_admin()`, schema-qualified, because they are
  evaluated in the `storage` schema.

---

## 6. Things tried that failed — read this before repeating them

**Supabase project could not be created.** The organisation `t054206-ui's Org` has
hit its 2-active-free-project limit (`wellness-cafe`, `gahwa-house`). Pause one,
upgrade, or use another org. This is why the whole app runs in demo mode.

**`gh` CLI is not installed** and there are no stored GitHub credentials. The repo
was created through the Chrome extension instead. **SSH does work** —
`ssh -T git@github.com` authenticates as `t054206-ui`, which is how pushes happen.

**Vercel blocked the first two deployments.** The commit author email was
`maria@MacBook-Pro-maria.local`, which is not an address on the GitHub account.
Fixed by setting the repo identity:
```bash
git config user.email "t054206@coded.edu.kw"
git config user.name  "t054206-ui"
```
Only the commits from `4add626` onward carry the correct author. Earlier commits were
left alone — rewriting published history was attempted with `git filter-branch` and
**refused by the permission system**, which was the right call. Do not retry it.

**The third build failed with `ERR_INVALID_URL`.** Importing the repo made Vercel
create a variable for every key in `.env.example`, each with an **empty value**.
Every env read used `??`, which only falls back on `undefined`, so an empty
`NEXT_PUBLIC_APP_URL` reached `new URL("")` in the root layout metadata. Fixed by
routing all reads through `envValue()` in `src/lib/config/env.ts`, which trims and
treats blank as missing. Reproduced locally with:
```bash
env NEXT_PUBLIC_APP_URL="" NEXT_PUBLIC_SUPABASE_URL="" npm run build
```

**Deploy hooks silently did nothing.** After a build for a commit is cancelled,
Vercel deduplicates and a hook re-trigger for the same SHA creates no deployment.
A new commit is required.

**One build hung in "Initializing" for 18 minutes** with no logs. Cancelling and
retriggering cleared it. Not a code problem.

**The production URL 404'd even after a successful build.** Two separate causes:
the deployment was `Production Staged` and needed **Promote** from the `…` menu, and
**Vercel Authentication was on**, so every URL served an SSO page that returns HTTP 200.
A 200 from a Vercel URL does not mean the site works — grep the HTML for real content.

**The Vercel MCP connector returns 403/401** for `list_deployments` and
`get_deployment_build_logs` on this project. Build logs had to be read in the browser.

**The in-app browser's `preview_start` could not find `.claude/launch.json`**, because
it resolved the path against the original scratch workspace rather than the project.
A dev server was run with `npm run dev` instead.

**The first wave of six parallel subagents was killed mid-run** by a usage limit.
Their partial files were recovered, type-checked and fixed by hand. Work survives in
the tree even when an agent dies.

---

## 7. Gotchas that still apply

- **Do not export non-component values from a `"use client"` module and import them
  into a server component.** `ADMIN_SECTIONS` did this and the server received a
  client reference proxy, not an array — the build failed with
  `ADMIN_SECTIONS.filter is not a function`. It now lives in
  `src/app/(app)/admin/_components/admin-sections.ts`.
- **`formatDate` uses `toLocaleString` when the options include a time component.**
  `toLocaleDateString` throws on `timeStyle`, which broke a prerender.
- **Never call `Date.now()` or `new Date()` in a component body.** ESLint's
  `react-hooks/purity` fails the build. Read the clock in a data function
  (`loadOperateContext()` returns `nowIso`, or use `requestNow()`) and pass it as a prop.
  This also keeps server and client markup identical.
- **Never call `setState` inside an effect.** `react-hooks/set-state-in-effect` is an
  error. `useLocalStore` is built on `useSyncExternalStore` for this reason, and it
  also exports `useHydrated()` and `readLocalStore()`.
- **`useLocalStore` keys are prefixed `solink:`.** The theme is `solink:theme`, and
  the inline script in `src/app/layout.tsx` must stay in sync with it.
- **The demo banner is deliberately not sticky.** An earlier version offset the
  sticky header by a hardcoded 33px, and a banner that wrapped on a phone sat under
  the header controls. The DEMO chip in the header carries the warning while scrolling.
- **The logo mark uses solid fills, not a gradient.** A shared `<defs>` id left the
  sun disc unpainted wherever a second mark rendered on the same page.
- **`params` and `searchParams` are Promises** in Next 16 — `await` them.
- A stray local dev server may still be running on **port 3123**.

---

## 8. What to do next

**Decision 1 unblocks the most.** Everything below it is currently placeholder text.

1. **Supabase project** — free-tier limit is the blocker. Then apply
   `supabase/migrations/*.sql` in order, optionally `seed.sql`, and set the three
   Supabase variables in Vercel. This alone turns on accounts, real persistence,
   RLS and storage.
2. **Electricity tariff** (per kWh, with source) → unlocks every savings and payback
   figure across the calculator, analysis, dashboard and reports.
3. **Solar resource + performance ratio** → unlocks production estimates.
4. **Grid CO₂ factor** → unlocks the environmental figures.
5. **Real solar-panel data source and import method** → the CSV mapper at
   `/admin/products/import` is built and waiting.
6. **Claude API key** → the AI Solar Agent, image inspection, recommendations,
   monitoring assessment and smart placement all light up at once.
7. **WeatherAPI.com key** → weather and air-quality intelligence.
8. **Google Maps key** → address search and the map view.

Then, in rough order: payment provider, notification provider, monitoring hardware,
panel-level monitoring, alert thresholds, degradation rate, TCO period, end-of-life
criteria, admin permission model, provider prices, and the nearby-comparison privacy
design. Full table with placeholder names and landing points in
`docs/DECISIONS-NEEDED.md`.

**Do not** start by redesigning the UI or "filling in" the placeholders with
plausible numbers. The placeholders are the feature.

---

## 9. Key facts

- Eleven commits on `main`, all pushed. Latest: `d15fb4c` "Record the production URL".
- Docs: `README.md`, `docs/ARCHITECTURE.md`, `docs/ENVIRONMENT.md`,
  `docs/DATA-MODEL.md`, `docs/DECISIONS-NEEDED.md`, and `CLAUDE.md` for conventions.
- `AGENTS.md` is written by `next dev` — committing it keeps the tree clean.
- Design tokens are in `src/app/globals.css`: solar amber `#f5a524` on graphite/navy,
  with light and dark selected independently. Charts follow a validated
  colourblind-safe categorical order.
- Local checks before finishing anything:
  ```bash
  npx tsc --noEmit && npx eslint src && npm run build
  ```
