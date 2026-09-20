# HANDOFF — Solink

_Session 1 built the platform. Session 2 rejected three designs. **Session 3 rebuilt the
interface, connected Supabase and took sign-up live — read Session 3 first; it is the
state of the site now.** Session 4 added the hero panel's take-apart sequence.
Session 5 added the tariff sector, sourced two settings for the owner's yes, and
fixed the hero labels; its "What to do next" is the current list._
Folder: `~/Desktop/solink` (Next.js 16 App Router + React 19 + TypeScript + Tailwind v4)._

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


---
---

# SESSION 2 — 2026-09-19 (design, rejected three times, then a decision to rebuild)

## Read this before anything else

**The owner has asked for a ground-up rebuild and will send reference websites.
Do not start designing until those arrive.** Three designs have already been
rejected. A fourth guess is the one thing guaranteed not to work.

When the examples arrive, the agreed method is:

1. Pull the actual decisions out of the examples: type, colour, density, layout,
   how the homepage opens. Name them explicitly.
2. Build **two screens only**: the landing page and the dashboard.
3. Show those two and get a yes **before touching the other fifty-six**.

Session 1's mistake was building everything before checking. Do not repeat it.

## Goal of this session

Give Solink a visual identity the owner is happy with. Not achieved. The session
ended with a decision to start the interface again from zero.

## Current state

| | |
| --- | --- |
| Live site | https://solink-nu.vercel.app — **still up, still v1** |
| Repository | https://github.com/t054206-ui/solink (private) |
| Latest commit | `c603d13` |
| Recovery point | tag **`v1-superseded`** — `git checkout v1-superseded` |
| Rebuild | **not started**, blocked on reference examples from the owner |
| Checks | tsc, eslint, next build all clean across 68 routes |

Nothing is broken. v1 is complete, deployed and accessible. It is being replaced
because the owner does not like how it looks, not because it fails.

## Decision taken at the end of the session

The owner chose **"Everything, from zero"** over rebuilding the look only, and
chose to give direction by **sending example websites**.

I flagged, and they went ahead anyway, that the thing they disliked was the
interface, while the schema, the solar calculations, the data-labelling rules and
the Claude / WeatherAPI / Maps integrations were never the subject of any
complaint. If a future session can persuade them to reuse those, the rebuild gets
much faster. Otherwise, follow their call.

Everything in `docs/` carries over. The seventeen open decisions in
`docs/DECISIONS-NEEDED.md` are unaffected by a redesign: a new interface does not
supply an electricity tariff or a Supabase project.

## Things tried that failed — all three designs, in order

### Attempt 1 — the original build (Session 1)
Navy and amber, dark-first, spacious SaaS layout.
**Verdict: "didn't like the interface at all, I want it to show the website
identity."** It was anonymous. Swap the word Solink for anything else and nothing
about it would change.

### Attempt 2 — "Gulf light" (commit `0c5a9f2`)
Warm sand by day, deep indigo by night. Solar amber with terracotta and brass
hairlines. The motif was a photovoltaic cell overlaid with the same square turned
45°, producing the eight-point star of Gulf screenwork, used as logo, texture and
divider. IBM Plex Sans Arabic throughout, Arabic-ready.
**Verdict: rejected.**

### Attempt 3 — ui-ux-pro-max, first pass (commit `13dac3f`)
Data-Dense Dashboard style, "Industrial grey + safety orange" palette, Fira Sans
with Fira Code. 8px gaps, 12px card padding, 36px table rows, 240px sidebar.
**Verdict: rejected.**

### The pattern
All three were **my** taste, applied to all 58 pages before anyone looked. The
owner has never been shown a direction before it was fully built. That is the
failure, not any individual palette.

## The owner's banned list — binding, do not reintroduce

Purple-to-blue gradients · gradient hero text · emojis in headings · Inter as the
everywhere font · coloured border cards · glassmorphism · low-contrast dark mode ·
three icon boxes in a row · a badge above the headline · untouched shadcn
defaults · fade-in on scroll · cursor-following beams · buttons that fade on
hover · inconsistent spacing · em dashes throughout the copy · generic buzzword
copy · serif italic accents · Space Grotesk with Instrument Serif.

Also recorded at the end of `design-system/solink/MASTER.md`.

## The ui-ux-pro-max skill — how to actually use it

**The `Skill` tool returns `Unknown skill: ui-ux-pro-max`.** It was installed
after this session's registry was built. It is real and enabled; `SearchSkills`
finds it. Use it from disk instead:

```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --variance N --motion N --density N
```

Two things learned the hard way:

- **Do not take its first answer.** For Solink it proposed glassmorphism, a GSAP
  scroll-reveal preset and a `#22C55E` green accent. The first two are on the
  owner's banned list and the green is ruled out by the product brief. The skill
  itself says to verify fit and retry; do that.
- **Read its two reference files, not just run its searches.**
  `references/quick-reference.md` (119 UX rules) and `references/pro-rules.md`
  (the canonical pre-delivery checklist). Skipping them hid four real defects for
  a whole iteration.

`design-system/solink/MASTER.md` holds the persisted system, corrected to the
verified choices with the rejections documented. Regenerating it needs `--force`,
which needs the owner's authorisation.

## Accessibility defects found and fixed (commit `c603d13`)

These came from the rulebook, not from my own checklist, and all four were real:

- **No skip link anywhere.** A keyboard user tabbed the whole 240px sidebar on
  every page. Now in the app, marketing and auth shells, targeting `#main`.
- **40 decorative icons sat in the accessibility tree** beside their own visible
  text, so screen readers announced each label twice. All 212 icon elements now
  carry `aria-hidden`.
- **No label in the product was associated with its control.** `Field` rendered
  `<label>` as a sibling with no `htmlFor` and no nesting. Every form was
  affected. `Field` now wires `htmlFor` to the control id, links help and error
  text via `aria-describedby`, and sets `aria-invalid` on error. Verified: 13 of
  13 controls on `/profile` resolve to a label.
- **No `touch-action`**, so taps carried the 300ms delay.

**Keep all four in the rebuild.** They are not tied to any visual direction.

Checked and already correct: icon-only buttons all carry `aria-label` (an early
audit flagged four, all false positives in my own regex), every page has an `h1`
or takes one from its layout, colour is never the only signal, reduced motion is
respected, controls reach 44px under 768px.

## Copy changes that are not visual and should carry over

- **188 em dashes rewritten** to periods, commas or colons depending on whether
  the following clause could stand alone.
- **The demo markers keep their em dash.** `DEMO DATA — NOT REAL`,
  `DEMO PRODUCT — NOT REAL`, `SIMULATED PRODUCTION — NOT REAL` and the rest are
  fixed strings from the brief. An automated pass mangled 23 of them; they were
  restored. Do not "fix" them again.
- **80 standalone `"—"` table placeholders were left alone.** That is correct
  typography for an empty cell.
- **28 page titles were appending the brand twice** on top of the metadata
  template in the root layout. The template owns the suffix now; a page title
  must not include "Solink".

## Files this session touched

```
src/app/globals.css                    rewritten twice (token system)
src/app/layout.tsx                     fonts, theme colours, metadata template
src/components/brand/Logo.tsx          rewritten twice
src/components/brand/Lattice.tsx       created, then repurposed as a grid texture
src/components/ui/*                    Button, Card, Badge, DataBadge, Metric,
                                       States, Placeholder, DemoBanner, Form
src/components/layout/*                AppShell, MarketingNav, Footer, PageHeader
src/app/(marketing)/page.tsx           rewritten twice
src/app/(marketing)/guide/page.tsx     hero, badge removed
src/app/(auth)/layout.tsx              hero panel
design-system/solink/MASTER.md         created by the skill, then corrected
~75 files                              em dash copy pass
```

## What to do next

1. **Wait for the owner's reference websites.** Do not design before they arrive.
2. Ask, for each example, what they like about it. One word per site is enough to
   separate "the typography" from "the density" from "the colour".
3. Ask whether any example is a **dashboard or web app**, not just a landing
   page. Solink is mostly 50+ application screens, so marketing references only
   cover half the problem.
4. Extract explicit decisions from the examples. Write them down before coding.
5. Build **the landing page and the dashboard only**. Show them. Wait for a yes.
6. Only then apply the direction to the remaining screens.
7. Keep: the four accessibility fixes, the copy rules above, the data
   classification and placeholder discipline, and everything in `docs/`.

---
---

# SESSION 3 — 2026-09-19 → 2026-09-20 (rebuild, Supabase, live sign-up)

## Read this before anything else

This is the section that describes the website as it is **now**. Session 1
built the platform; Session 2 rejected three designs and decided to rebuild;
this session did the rebuild and then took the site live with a real database.
Session 4, after this one in the file, was another machine adding the hero
panel's take-apart sequence — read it too, it is short.

**Production is https://solink-nu.vercel.app, on `main`, in Supabase mode.**
Anyone can sign up. The owner's account is admin. The two platform settings
that were sourced this session are entered. Nothing is broken.

Open the folder and run `npx tsc --noEmit && npx eslint src && npm run build`
before touching anything — all three are clean at commit `3c613cd`.

## Goal of this session

1. Rebuild the interface from the owner's reference sites, landing page and
   dashboard first, and get a yes before touching anything else. **Done, and
   the owner then approved going further.**
2. Make the site bilingual, role-aware, and able to read a roof from a photo.
   **Done.**
3. Build the About page to the owner's brief without inventing anything.
   **Done; team roles, bios, photos and the team description remain
   placeholders.**
4. Connect Supabase and take sign-up live. **Done.**
5. Find real sources for the four platform numbers. **Two sourced and entered;
   two remain (see "What to do next").**

## Current state

| | |
| --- | --- |
| Production | https://solink-nu.vercel.app — the rebuild, Supabase mode, sign-up live |
| Repository | https://github.com/t054206-ui/solink, branch `main`, latest `3c613cd` |
| Recovery | tag `v1-superseded` = the old site |
| Vercel | project `solink`, team `t054206-3843`. **The Vercel MCP connector cannot see this team** (zero projects, zero deployments); use the CLI, which is logged in on the owner's Mac: `npx -y vercel@latest <cmd> --scope t054206-3843` |
| Supabase | project `solink`, ref `bgwvztckesuwlydwcfkj`, region `ap-south-1`, org `t054206-ui's Org`. Free tier. `gahwa-house` was paused by the owner to free the slot |
| Migrations | `0001`–`0005` applied and recorded; `list_migrations` shows five |
| Data | demo catalogue seeded (`is_demo = true`, three panels, each versioned). One user: the owner, `t0…@coded.edu.kw`, role `admin` |
| Settings entered | `electricity_tariff_per_kwh` 0.002 KWD/kWh (MEW yearbook 2020, Residential); `grid_co2_kg_per_kwh` 0.635 kgCO₂e/kWh lifecycle (Ember 2026 via OWID, 2025 data). Both carry full sources in the `source` column |
| Settings still null | `performance_ratio`, `peak_sun_hours_per_day` — so production figures are still "unavailable"; savings and CO₂ now compute |
| Auth | Site URL `https://solink-nu.vercel.app`; redirect allow-list `https://solink-nu.vercel.app/**` and `http://localhost:3412/**`. Email confirmation on, via Supabase's built-in mailer (test-grade, rate-limited) |
| Env, production | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (publishable values). **Not set:** `SUPABASE_SERVICE_ROLE_KEY`, `CLAUDE_API_KEY`, weather, maps, solar |
| Env, local | `.env.local` has the two Supabase vars and `NEXT_PUBLIC_APP_URL=http://localhost:3412`; `vercel link` appended a harmless `VERCEL_OIDC_TOKEN`. Claude key **still empty** — the owner has not pasted it |
| Dev server | `npm run dev -- -p 3412` (3000 is usually held by a stale server). `preview_start` with launch.json does not work here; open the URL with `preview_start url=` |
| Checks | tsc, eslint, next build — all clean, 65 routes |

## Files this session created or changed

**Design system and shell**
- `src/app/globals.css` — rewritten: the "Studio" tokens, light default, real dark theme, motion vocabulary, `.micro`, `.display`, `.figure`, RTL-aware skip link
- `src/app/layout.tsx` — Archivo / JetBrains Mono / IBM Plex Sans Arabic; `data-theme="light"` server-side; bootstrap via `next/script` `beforeInteractive` from `public/bootstrap.js`
- `public/bootstrap.js` — applies stored theme/locale before paint
- `src/components/layout/MarketingNav.tsx` (floating pill), `LocaleToggle.tsx`, `SkipLink.tsx` (new), `ThemeToggle.tsx` (light default), `Footer.tsx` (About link), `AppShell.tsx` (typed `Role`)
- `src/components/brand/Logo.tsx` — lit cell is now `--sun`

**Bilingual**
- `src/lib/i18n/dictionary.ts` — EN + light Kuwaiti Arabic, one `Dict` type so keys cannot drift. **All Arabic is Claude's draft, unreviewed by a Kuwaiti speaker.**
- `src/lib/i18n/provider.tsx` — `LocaleProvider`, `useT`, sets `lang`/`dir`

**3D panel** — `src/components/three/PanelScene.tsx`, `PanelStudio.tsx`, `panelTexture.ts`; Session 4 added `panelLayers.ts` and `src/lib/hooks/useOnScreen.ts`. `src/lib/hooks/useMediaQuery.ts` (new)

**Pages**
- `src/app/(marketing)/page.tsx` — landing, rewritten
- `src/app/(marketing)/about/page.tsx` + `AboutPage.tsx` (new); `src/lib/content/team.ts` (new, four names, rest placeholders)
- `src/app/(app)/dashboard/page.tsx` — role gate; `_role/{Homeowner,Manufacturer,Company,Admin}Dashboard.tsx`; `_components/RoleSwitcher.tsx` (demo only)
- `src/app/(app)/profile/RoofCapture.tsx` (new) + `ProfileForm.tsx` (wired); `src/app/api/ai/inspect-roof/route.ts` (new)
- `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `src/components/auth/AuthForm.tsx` — `?next=` read server-side, `emailRedirectTo` on sign-up
- `src/components/motion/Count.tsx` (new)

**Roles and data**
- `src/lib/roles.ts` (new) — `homeowner | manufacturer | company | admin`
- `src/lib/supabase/server.ts` — `getCurrentRole()`
- `src/app/(app)/admin/{_lib/data.ts,_lib/auth.ts,actions.ts,_components/RoleSelect.tsx}` — shared `Role` type
- `supabase/migrations/0001` (enum + `manufacturer_id` + FK), `0002` (manufacturer policies), `0004_solink_security_hardening.sql` (new), `0005_solink_fix_version_snapshot_trigger.sql` (new)

**Docs** — `CLAUDE.md`, `HANDOFF.md`, `design-system/solink/DIRECTION.md` (new, the design contract), `docs/DECISIONS-NEEDED.md` (decision 1 done), `.claude/launch.json`

## What changed, in the order it happened

1. **Direction.** Three reference sites (screen recordings from motionsites.com) → one through-line: *one real object in an empty room with its measurements hung off it.* Palette "Studio". Everything is in `DIRECTION.md`; read it before any visual work.
2. **Landing page** with a draggable, real-size 3D module; specs as micro-labels; annual output honestly "needs your roof"; sticky takeover into the honesty section.
3. **Bilingual toggle**, RTL mirroring, light Kuwaiti Arabic, direction set before paint.
4. **Roles.** Landlord = homeowner (owner's words). Company's install area follows `provider_companies.kind`. Manufacturer publishes and tracks verification state. Admin sees the verification queue and the 24 open placeholders.
5. **Roof reader.** Photos or video (frames extracted in the browser). Suggests, never measures; user confirms each field; nothing stored. Needs the Claude key.
6. **About page**, eleven sections, owner's vision and mission, four named people, Kuwait Vision 2035 wording sourced from MOFA and UN ESCWA. No founding story, by the owner's choice.
7. **Sources found:** MEW tariff table (primary, yearbook p.113), Ember CO₂ via OWID, NREL PVWatts for the performance ratio, WeatherAPI's `short_rad/dni/diff_rad/gti` fields (paid tier) for irradiance. Google Solar's Kuwait coverage remains **unverified**.
8. **Pushed and deployed** on the owner's "push and deploy".
9. **Supabase.** Project created, migrations applied, advisor-clean after `0004`, first insert exposed the trigger bug fixed in `0005`, demo catalogue seeded.
10. **Sign-up live** with the public vars set via the Vercel CLI; auth URLs set through the owner's Chrome; sign-in/sign-up server-rendered; role from the account.
11. **Owner promoted to admin; two settings entered with sources.**

## Things tried that failed — read before repeating

- **preview_start with launch.json** resolves against the original scratch workspace. Run the dev server from Bash and open the URL.
- **A raw `<script>` in the root layout** breaks React 19 hydration. Use `next/script` `beforeInteractive` with an external `src`.
- **"Script is not defined" after fixing the import** was a stale Turbopack cache. `rm -rf .next`.
- **`react-hooks/immutability`** rejects mutating a ref passed as a prop, mutating `gl.domElement.style`, a render-local array reached from `useFrame`, and assigning `scene.environment`. Keep mutable refs local; cursor in CSS; parts list in a ref; environment via `<primitive attach="environment">`. Session 4 hit two of these because it had no toolchain — **always run eslint after merging work from a session without one; `next build` does not catch this rule.**
- **Lucide 1.x has no brand icons** (`Github`, `Linkedin`). Text pills.
- **3D frame drawn as a solid box in front of the glass** hid every cell — z-order.
- **Camera too close** clipped the panel at high tilt. Distance is derived from the bounding sphere; see the comment on `CAMERA_POS`.
- **Sticky sections bleed through** later sections lacking their own background and z-index. On `/about` everything after the Problem section is one `relative z-10 bg-bg` layer.
- **Browser-pane screenshots come back blank** right after an instant scroll — compositor timing. Wait and shoot again; trust the DOM check.
- **MEW's investor portal 404s.** The yearbook PDF on mew.gov.kw is the primary source; `pymupdf` positioned text resolved the table columns that plain extraction scrambled.
- **The `0001` snapshot trigger was BEFORE INSERT** and could never insert a product. `0005`.
- **Revoking EXECUTE on RLS helper functions would break the policies** that call them. `0004` moves them to a `private` schema instead; policies hold the OID.
- **`useSearchParams()` in AuthForm** broke the build once Supabase was configured; wrapping in Suspense made the page a skeleton. Read `?next=` on the server.
- **`getPlatformSettings()` returns empty in demo mode** — was going to need a local config path; moot once production went to Supabase mode.
- **Vercel MCP connector**: zero visibility into this team. CLI works (auth already on the Mac). zsh does not word-split `$V` — use a shell function.
- **Supabase dashboard "one URL per line" box** flattens a programmatic newline into one string. Add rows with the dialog's "+ Add URL" button.
- **Stale demo copy after going live:** About CTA said "runs in demo mode today"; the dashboard role switcher still rendered and honoured `?as=`. Fixed; the hero's `DEMO PRODUCT — NOT REAL` chip is kept because the panel's specs genuinely are the demo catalogue's.

## Decisions the owner made (binding, all in DIRECTION.md)

Studio palette · light theme default · drag-to-rotate panel · cinematic motion,
no fade-in-on-scroll · landlord = homeowner · company services drive the install
area · light Kuwaiti Arabic drafted by Claude, owner reviews · fake panel data
only as labelled demo · sentence-case headings · About has no founding story ·
the owner's vision and mission text · a team of four · pause `gahwa-house` for
the Supabase slot · push and deploy to `main` · promote the owner to admin ·
enter the two sourced settings.

## What to do next, in priority order

1. **Performance ratio.** Owner has not yet said yes to NREL PVWatts' default
   (14 % losses → 0.86, cite the PVWatts v5 manual). Enter via `/admin/settings`
   or SQL with the source. Later tighten soiling with the KISR papers.
2. **Peak sun hours.** Needs a source: WeatherAPI paid tier (`short_rad`),
   Google Solar (test one Kuwaiti address first — coverage unverified), or NREL
   PVWatts for Kuwait City, cited. Until then production figures are
   unavailable.
3. **Email sender.** Supabase's mailer is test-grade. Needs a domain the owner
   owns (cannot send from `*.vercel.app`) and an SMTP provider. Claude may fill
   the non-secret SMTP fields; the API key is pasted by the owner. Same
   provider later closes the notification placeholder.
4. **Keys the owner pastes** (never Claude): `SUPABASE_SERVICE_ROLE_KEY` (admin
   imports), `CLAUDE_API_KEY` (roof reader, agent, recommendations) — into
   `.env.local` and Vercel as Sensitive.
5. **Wire Google Solar** — `getBuildingInsights` has zero callers.
6. **Tilt → output.** `calculations.ts` has no tilt/azimuth. Needs DNI/DHI/GHI
   plus a cited transposition model.
7. **Tariff category on the profile**: private house (2 fils) vs apartment
   building (5 fils) — MEW categorises by property type, not nationality.
8. **About page placeholders**: four roles, bios, photos; team description.
9. **A Kuwaiti speaker reads the Arabic.**
10. **Privacy policy and terms** — none exist; the site stores addresses, roof
    photos and bills.
11. **Domain** — also unblocks email.
12. **Real panel catalogue** via `/admin/products/import` once the supplier list
    or datasheets arrive.
13. The other 56 pages carry the new tokens but were not redesigned.

---
---

# SESSION 4 — 2026-09-20 (the hero panel takes itself apart)

## Read this before anything else

Owner's brief: make the intro's 3D visual stronger. The panel should arrive and
rotate slightly, break apart into its parts with a very short line of
explanation for each, reassemble, stay cinematic rather than busy, and work on
phones. Everything below is that brief and nothing else. No other page changed.

**Written without `tsc`, `eslint` or `next build`.** The machine this session
ran on has no Node, no npm and no git; the work reached GitHub through the web
UI. Vercel's build is what checked it. If you are picking this up with a real
toolchain, run all three before touching anything.

## What was built

| Area | Where | Notes |
| --- | --- | --- |
| The parts list | `src/components/three/panelLayers.ts` (new) | Glass, cells, backsheet, frame, junction box, front to back, with their assembled and exploded positions and their two dictionary keys. One list, so the order they separate in and the order the sentences appear in cannot drift. |
| The sequence | `src/components/three/PanelScene.tsx` | Enter 0.8s, hold 0.6s, one part every 1.45s, 1.0s beat, everything closes together in 1.3s. 10.6s in total. 1.45s is a reading speed, not a movement speed. |
| Reflections | `StudioEnv` in the same file | `scene.environment` from a 64 × 32 canvas gradient through `PMREMGenerator`. No HDRI, no CDN request in the hero's critical path. The frame reads as anodised aluminium because of this, not because of its roughness value. |
| Captions | `src/components/three/PanelStudio.tsx` | One slot with a reserved height under the object. The scene reports the index of the part being explained, so React renders five times in ten seconds rather than sixty times a second. `aria-live="polite"`. |
| Copy | `src/lib/i18n/dictionary.ts` | `panel.*`, English and Arabic. Same standing caveat: the Arabic is Claude's draft. |
| Phones | `PanelStudio` | The canvas now runs on phones, which it did not before. Lower dpr, half the shadow map, smaller contact shadow. |
| Battery | `src/lib/hooks/useOnScreen.ts` (new) | `frameloop="never"` once the hero scrolls away. `useSyncExternalStore`, like `useMediaQuery`, so nothing is set in an effect. |

## Decisions worth keeping

- **No drag on touch screens.** Reading a drag needs `touch-action: none` on the
  canvas, and a hero-sized element that swallows vertical swipes is a page
  nobody can scroll. Phones get the sequence and the readouts, not the grab.
- **The sequence keeps its own clock.** r3f resets `clock.elapsedTime` when
  `frameloop` changes, and this scene parks itself off-screen, so absolute time
  would jump backwards mid-sequence. The delta is capped at 50 ms because a
  backgrounded tab hands back one enormous frame on return.
- **The glass pane is 6% opaque while closed** and fades to 44% as it leaves the
  stack. The sheen that makes the object read as glass belongs to the laminate,
  where it already was; a white sheet over the cells turns the only dark mass on
  the page pale.
- **The glass casts no shadow.** A transparent mesh still casts an opaque one in
  three, and a hard rectangle landing on the cells 300 mm below it is precisely
  what glass does not do.
- **The group scales to 0.82 while open.** The exploded assembly reaches radius
  1.13 m and the camera was placed for 1.052 m. Scale it; do not dolly in.
- **`prefers-reduced-motion` gets the five sentences as a plain list** beside the
  still panel. The explanation is never something you have to watch an animation
  to receive.
- **The note under the object** says it is a generic assembly and not one
  manufacturer's cross section, because an anatomy diagram of a panel is a claim
  about panels.

## Not done

1. **The intro video.** The brief asked the sequence to hand off to it. There is
   no intro video anywhere in this repository and none was supplied, so the
   sequence hands off to the page instead. Ask the owner for the asset.
2. Clicking a part to hold its explanation open. The sequence is timed; there is
   no raycast picking, and adding it means separating a click from a drag.
3. Leader lines from the parts to their labels, which `DIRECTION.md` still calls
   for. The caption slot does the job for now and survives RTL and 375 px.
4. The three `SpecLabel` markers in `page.tsx` are positioned against the
   container, not the object, so they drift by the 18% the group scales down
   during the sequence.

---
---

# SESSION 5 — 2026-09-20 (tariff by sector, two settings sourced, hero labels)

## Read this before anything else

Picked up Session 3's "What to do next" with a full toolchain. Of the thirteen
items, seven need the owner (keys, domain, SMTP, team bios, Arabic review,
supplier list, a yes on two numbers). This session did the unblocked ones and
prepared the owner-gated ones so each is one yes away. **Nothing was pushed
and no platform value was written**: the owner has said "push and deploy" once,
for Session 3, and every platform number so far went in after an explicit yes.
Commits are local on `main`. **Late in the session the owner said yes to the
three entries and they were written** (see "What to do next", item 1).

All three checks were clean at the start (`a95d7ae`) and at the end.

## What was done

| Item | Where | Notes |
| --- | --- | --- |
| Session 3 next-step 7, **tariff category on the profile** | migration `supabase/migrations/0006_solink_tariff_category.sql` (**applied** to the live project, additive and nullable), `src/lib/types.ts` (`TariffCategory`), `src/lib/solar/tariff.ts` (new), `src/lib/data/settings.ts`, `src/app/(app)/profile/{ProfileForm,actions}.tsx`, `_plan/AssumptionField.tsx`, `analysis/PotentialAnalysis.tsx`, `dashboard/_role/HomeownerDashboard.tsx`, `admin/_components/SettingsForm.tsx`, `src/lib/demo/data.ts` | The MEW yearbook table (p. 113) was re-read with positioned text; it has six sectors, now the `tariff_category` enum. The profile has an "Electricity tariff sector" select, suggested from the house type the moment one is chosen and never overwriting a choice. The tariff setting's value may carry `by_category`; `tariffFor()` picks the rate for the profile's sector, and when the platform has no rate for that sector it returns **nothing and a sentence**, never the Residential rate. The admin settings form has a per-sector editor for the tariff. No rate was added to the database; the SQL is in `docs/DECISIONS-NEEDED.md`. |
| Session 3 next-step 2, **peak sun hours sourced** | `docs/DECISIONS-NEEDED.md` §Proposed entries | Global Solar Atlas API for Kuwait City: GHI 2037.5 kWh/m²/year = **5.58 h/day** (horizontal), GTI at optimum 27° = 6.13/day, PVOUT 1717 kWh/kWp/year. Recommendation GHI until tilt is modelled. Entered on the owner's yes, with the full citation in `source`. |
| Session 3 next-step 1, **performance ratio** | same | 0.86 from PVWatts v5 defaults, loss table confirmed via pvlib's documentation because nrel.gov was unreachable from this network. Entered on the owner's yes. |
| Session 4 not-done 4, **spec labels drift** | `src/components/three/PanelStudio.tsx` (`labels` prop), `src/app/(marketing)/page.tsx` | The three labels moved into the stage and show only when the module is closed and at rest (after the sequence, or the moment a drag cancels it); hidden again on replay. Verified in the browser: 3 labels → 0 during the tour → 3 after. `DIRECTION.md` records it. |
| Docs | `docs/DECISIONS-NEEDED.md` (rows 2, 3, 4, 5, 18 updated; new §Proposed entries), `CLAUDE.md`, `design-system/solink/DIRECTION.md` | |

## Things tried that failed

- **nrel.gov, docs.nrel.gov and osti.gov are unreachable from this network**
  (DNS/HTTP 000). The PVWatts manual could not be opened; its loss defaults were
  taken from pvlib's `pvwatts_losses` page, which reproduces and cites them.
  Read the manual once before entering 0.86.
- **PVWatts v8 API with `DEMO_KEY`** also returned nothing (same network).
- **Global Solar Atlas** has no documented API, but the site's own endpoint
  `https://api.globalsolaratlas.info/data/lta?loc=LAT,LNG` answers with the
  long-term averages the web app shows (CC BY 4.0). Response saved below.
- **The first grep for the tariff table** matched nothing because the PDF's
  text is Arabic-first and the English is split into separate words; searching
  for "tariff" alone found page index 113 (printed 113/114).
- **A second `next dev` on another port refuses to start** while one is running
  on the same project (Next's dev lock). Stop the first; demo mode is
  `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npx next dev -p 3412`.
- **Clicking the replay button through the browser pane's ref click** scrolled
  the page instead of replaying; `button.click()` from the JS tool did. Trust
  DOM checks over screenshots for the hero, as Session 3 said.
- **Import `src/lib/data/settings.ts` from a client component** would pull the
  server Supabase client in. That is why the tariff logic lives in
  `src/lib/solar/tariff.ts` with no server imports.

## Decisions worth keeping

- **A profile that names a sector the platform has no rate for gets no
  tariff**, not the Residential one. An apartment building is billed at two and
  a half times the private-house rate; assuming 2 fils would understate the
  bill and every savings figure with it.
- **A profile with no sector keeps today's behaviour** (headline rate) with a
  sentence saying which sector that is.
- **The house type suggests the sector, once, and only into an empty field.**
- **Labels are hidden during the take-apart rather than scaled with the
  group**, because scaling would keep them aligned with where the parts were,
  not where they are.

## Global Solar Atlas response, Kuwait City (29.3759 N, 47.9774 E), read 2026-09-20

Annual: PVOUT_csi 1717.12 kWh/kWp · GHI 2037.51 kWh/m² · DNI 1834.59 · DIF 829.33 ·
GTI_opta 2238.39 · OPTA 27° · TEMP 26.5 °C · ELE 19 m. Data version 2.2.68
(updated 2026-04-01), Solargis model, period to 2025.
Monthly GHI (kWh/m²): Jan 106.9 · Feb 119.3 · Mar 167.8 · Apr 176.6 · May 211.6 ·
Jun 236.0 · Jul 233.8 · Aug 222.1 · Sep 195.6 · Oct 157.6 · Nov 109.9 · Dec 100.3.
Monthly PVOUT (kWh/kWp): 124.2 · 123.5 · 151.5 · 140.2 · 151.2 · 157.3 · 158.6 ·
161.3 · 160.0 · 148.7 · 120.3 · 120.2.

## What to do next, in priority order

1. ~~Owner's yes on three entries~~ **Done.** The owner said yes at the end of
   the session and the three statements ran: peak sun hours 5.58 (GHI),
   performance ratio 0.86, tariff by sector. All eight production-relevant
   settings except degradation, TCO period and thresholds are now entered.
   Production figures light up on the live site immediately, because the
   deployed code reads `value.value` and ignores the extras; the per-sector
   rates take effect once the new code is deployed.
2. **Push and deploy** when the owner says so. Migration 0006 is already live
   and the settings are entered, so the deployed code and the database agree
   either way.
3. **Read the PVWatts manual §System Losses** from a network that reaches
   nrel.gov, to confirm the 14 % against the primary source (Session 5 only had
   pvlib's reproduction of it).
4. **Email sender, keys, domain** (Session 3 items 3, 4, 11): owner.
5. **Wire Google Solar** (Session 3 item 5). Not started: the key is absent and
   Kuwait coverage is unverified, so any wiring would be untestable here.
   Suggested shape when it happens: a "Read from Google Solar" step beside the
   coordinates in `ProfileForm`, same confirm-each-field pattern as
   `RoofCapture`, area classified `source`.
6. **Tilt → output** (item 6) now has the inputs it needs from Global Solar
   Atlas (GHI, DNI, DIF); still needs a cited transposition model.
7. **Privacy policy and terms** (item 10): none exist. Draft for the owner's
   review; the site stores addresses, roof photos and bills.
8. Session 4's remaining items: click-to-hold a part, leader lines from parts
   to labels, the intro video asset.
9. About page placeholders, Kuwaiti review of the Arabic, real catalogue,
   the other 56 pages.
