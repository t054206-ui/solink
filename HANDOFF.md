# HANDOFF — Solink

_Session 1 built the platform. Session 2 rejected three designs. **Session 3 rebuilt the
interface, connected Supabase and took sign-up live — read Session 3 first; it is the
state of the site now.** Session 4 added the hero panel's take-apart sequence.
Session 5 added the tariff sector, sourced two settings for the owner's yes, and
fixed the hero labels. Session 6 ran two days: the opening film, sign in and sign
up, the Marketplace on the real catalogue. Session 7 (2026-09-21/22) added the
legal pages and consent, Google sign-in, the roof planner, per-role navigation
and the manufacturer portal. **Start with the last section of this file,
"Session 7 closing state", which is the consolidated position and the current
to-do list.** Session 6 closing state remains accurate for everything it covers._
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
**Late in the session the owner said yes to the three entries and they were
written, then said "push and deploy"**: pushed as `4a7b0e0` + `1a1e0b3` on top
of another session's intro commits, and `627bfa1` deployed to production by
CLI because `main` did not build (see "What to do next", items 1 and 2).

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
2. ~~Push and deploy~~ **Done, with a wrinkle.** The owner said "push and
   deploy". `main` had moved: another session (GitHub account `t040262-cmyk`)
   was pushing an opening sequence (`src/components/intro/*`, a curtain in
   `public/bootstrap.js` and `layout.tsx`) commit by commit, and every
   git-triggered production build since 18:47 failed on `tsc`: the intro uses
   dictionary keys `intro.label`, `intro.skip`, `intro.replay` that do not exist
   in `dictionary.ts`. Session 5 rebased onto their tip and pushed (`1a1e0b3`),
   then deployed its own verified commit `627bfa1` straight to production with
   `vercel deploy --prod` from a detached worktree. **solink-nu.vercel.app now
   serves `627bfa1`** (tariff sectors, entered settings, hero labels). It does
   not contain the intro. The next git push that builds will replace it, and
   will include everything. **Whoever finishes the intro: add the three
   `intro.*` keys to both languages in `dictionary.ts`, then run all three
   checks.** Session 5 deliberately did not add them into someone else's
   in-flight work.
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

---
---

# SESSION 6 — 2026-09-20 evening (the opening, and sign in / sign up)

## Read this before anything else

Same machine and toolchain as Session 5, later the same day, a new brief from
the owner: a cinematic 3D intro that plays on entering the site (the module
arrives, comes apart with one line per part, reassembles), an automatic
transition into the site, a replay button, a clean sign-up (full name, email,
password, confirm password) and sign-in (email, password) with eye toggles on
both password fields, all in the site's own design. **The intended journey:
enter → opening → sign up or sign in → the site.**

Another session (GitHub account `t040262-cmyk`) had started the opening an hour
earlier and pushed six commits to `main` that did not build (`intro.*`
dictionary keys missing, no CSS). It went quiet for a quarter of an hour, so
this session took the work over and finished it in place. If that session
resumes, its next push will conflict with `IntroSequence.tsx`; this section is
the record of what changed and why.

## What was built

| Area | Where | Notes |
| --- | --- | --- |
| Opening, finished | `src/components/intro/IntroSequence.tsx` (rewritten), `introStore.ts` (+`markShown`, `introShownThisLoad`, `isReplay`), `IntroHost.tsx`, `ReplayIntroButton.tsx` (unchanged), `public/bootstrap.js` (curtain attribute, unchanged), `src/app/layout.tsx` (mount, unchanged), `src/app/globals.css` (all `.intro-*` styles, new) | Header with the mark and Skip; ink stage with a blue light pool and a fading grid; title card while the module arrives; five ticks in sun amber; the site headline on the closed module for 1.9 s; wipe upward in 720 ms. Escape and Skip go through the same exit. |
| Hand-off to sign-up | `IntroSequence.tsx` `leave()` | Not a replay, not already on `/login` or `/signup`, Supabase configured, no session → `router.push("/signup")` (with `?next=` when the visitor arrived on a deeper page), 340 ms for the route to render behind the curtain, then the curtain drops and the wipe reveals the form. Otherwise the wipe reveals the page they were on. |
| Hero defers to the opening | `src/components/three/PanelStudio.tsx`, `PanelScene.tsx` (`autoplay` prop) | The hero is `paused` while the overlay is up (two WebGL contexts, one invisible) and, once the opening has played in this page load, declines its own tour: labels shown, replay button ready. |
| Dark stage | `PanelScene.tsx` (`stage="dark"`) | No contact shadow, rim 1.2, ambient 0.42, key 3. The light stage is untouched. |
| Copy | `src/lib/i18n/dictionary.ts` | `intro.*` (5 keys) and `auth.*` (24 keys), English and light Kuwaiti Arabic. Same standing caveat: the Arabic is Claude's draft. |
| Replay button | `src/components/layout/Footer.tsx` (bottom bar), `src/components/auth/AuthAside.tsx` | Hidden under `prefers-reduced-motion`, like the opening itself. |
| Sign in / sign up | `src/components/auth/AuthForm.tsx` (rewritten), `PasswordInput.tsx` (new), `AuthAside.tsx` (new), `AuthMobileHeader.tsx` (new), `src/app/(auth)/layout.tsx` (rewritten), `login/page.tsx`, `signup/page.tsx` | Confirm password checked client-side before the request; eye toggle is a real button with `aria-pressed` and a label; `Field` wires label → input through `PasswordInput`. Pages redirect a signed-in visitor onward and pass `?confirmed=1` down as a notice. "Look around first" under the form leads to `/`. |

## Verified in the browser

Desktop 1440 × 900 and phone 375 × 812, Supabase mode, storage cleared:
opening plays (title → five parts → headline → wipe) and lands on `/signup`
without a click. Sign-up: both eye buttons flip their own field between
`password` and `text`, `aria-pressed` and the label follow, mismatched
passwords show "The two passwords do not match." and mark the field invalid;
every label is wired to its input. Footer replay on `/`: overlay mounts,
plays, unmounts, path stays `/`, hero at rest with labels and its own replay.

## Things tried that failed, or to know

- **The three.js chunk takes a few seconds on the dev server** on first load,
  so the module appears late in the opening there. Production is quicker; the
  title card covers the gap either way.
- **`useRef(introOn)` to detect "the opening is up" at hero mount** does not
  work: the store's server snapshot is false and the true value arrives a
  render later. The module-level `introShownThisLoad()` flag, set when the
  sequence mounts, is what the hero reads.
- **`forced` is cleared in `finishIntro()`**, so `isReplay()` must be read at
  the start of `leave()`, before the timeout. It is.
- **A dark half-page aside** was considered for sign-in and rejected: the
  direction says the panel is the only dark mass on a light page. The aside is
  `--bg-sunken` with the object as the dark mass, like the hero.

## Decisions (owner's brief, and two of Claude's, flagged)

- Journey exactly as briefed: opening → sign-up → site. **Claude added a quiet
  "Look around first" link** under the form so the marketing pages are not
  locked behind an account; remove it if the owner wants the gate hard.
- **After sign-in the destination is `/dashboard`**, the app's home, unless a
  `?next=` says otherwise. "Main website" for a signed-in person is the app.
- The opening is the same sequence as the hero, on purpose: one object, one
  set of sentences, two rooms.

## Addendum, later the same evening — the opening became "From sunlight to your home"

The owner sent an HTML mock of a different opening (ivory stage, a sun, a light
beam, the panel, a house, an "energy path", the journey as pills, a rail of the
panel's layers, a progress bar) and asked for it "added, but shorter". The mock's
700-line script was not in the message, so the story was rebuilt inside the
existing opening rather than pasted: same curtain, store, hand-off and replay.

- **`src/components/three/tourTiming.ts` (new)**: the take-apart's clock as
  data (`TourTiming`, `schedule()`), free of three.js. `HERO_TIMING` is Session
  4's 10.6 s; `INTRO_TIMING` is 9.25 s with a 1.2 s delay for the sun.
  `PanelScene` takes `timing` and hides the module until its cue.
- **`IntroSequence.tsx`** owns the story clock (frame deltas capped at 50 ms,
  like the scene's, started on the scene's first frame) and draws the sun, the
  light wash, the house with its flowing current, the layer rail, the ten
  journey pills and the progress hairline around the scene. Five beats, 12.3 s,
  then the wipe. Light stage now (`stage="light"`), so the contact shadow is
  back and the module is the only dark mass.
- **Copy**: `intro.open` rewritten, `intro.panel` and `intro.layers` added,
  both languages. The journey pills reuse `journey.1` to `journey.10`.
- **Palette discipline**: sun amber only on the sun itself; progress, rail and
  pill dots are panel blue.

**Testing note.** The Browser pane was hidden for the whole of this pass, and a
hidden pane runs requestAnimationFrame at one or two frames a second. Both
clocks cap their step, so the twelve-second story took about seven minutes and
was verified beat by beat through the DOM and screenshots. It is not a defect
in the opening; the earlier ink version measured the same when hidden.

## 2026-09-21, late — the Marketplace on the real catalogue

The owner (or Lolwah) had run the LONGi import: `solar_products` holds the
three Hi-MO 7 modules (`is_demo = false`) next to the three demo rows from
Session 3. The path `listProducts()` → `/marketplace` → `MarketplaceGrid` →
`ProductCard` → `getProduct()` → `/marketplace/[id]` → `SourceReferences`
already worked; four things were wrong or missing and were fixed, nothing else
touched:

- **Demo rows leaked into Supabase mode.** `listProducts` now adds
  `.eq("is_demo", false)` in its Supabase branch. `getProduct` still resolves a
  demo id (old systems/passports may point at one) and the page labels it.
- **Prices rounded to whole dinars.** `PriceCell` formats a fractional amount
  with three decimals: 47.500 KWD, not 48 KWD.
- **Cards said nothing about Kuwait.** `ProductCard` adds one line under the
  price: supplier, "listed by retailer, not independently verified", and the
  date the price was observed, all from `source.*`.
- **The explainer card still showed the "no real dataset" placeholder** above
  three real products. It now states the count, the manufacturers and the
  Kuwait suppliers from the data, and keeps the placeholder for demo mode.

**Verified without a session.** `/marketplace` is behind sign-in and this
session has no credentials, so the components were rendered with
`react-dom/server` (via `npx tsx`, nothing installed) against the live rows
fetched with the public key and the same row mapping: three cards, LONGi
Green Energy Technology from the `manufacturers` join, models, 585/615/620 W,
21.7/22.8/23 %, 45.000/47.500/47.500 KWD, Unverified, supplier line; the grid
counts "3 products"; `SourceReferences` renders all six rows with the real
LONGi and Alwan Solar URLs, the observed date and the conflict note;
`SpecTable` renders the electrical rows and the `additional` specs;
`rankPanels` + `MatchCard` produce "Select this panel" → `/designer?panel=<real
id>` and "View sources". tsc, eslint and `next build` pass. Not pushed.

## 2026-09-21, later that night — every layer darker

Owner: "make the color of glass more dark and all parts clearer darker since
background is light". Glass `0x8FB3D6` at .66, film `0xE3BE78` at .84, cells
`#2458A8`/`#123670`, backsheet `0xB9A98C`, frame `0x7F8B99`, unfocused layers
dim only to .88 (a see-through dark layer over a light stage reads pale, which was most of the problem), the sun and beam drop to .22/.16 while a layer is explained instead of .4/.3, and tone-mapping exposure is 1.0 instead of 1.12. Same places in `film.ts`, same markers.

## 2026-09-21, night — twenty seconds, and one tone per layer

Owner: "make the intro 20 seconds and the parts of the panel more clear".
Inside `film.ts`: scene durations now total 19.2 s (+0.4 s hold +0.26 s delay
= 19.9 s from load), damping rates at ×1.8 of the file's originals. Colours:
glass cool blue-white `0xD6E9FB` at .56; solar film warm light `0xFFF0CC` at
.74; cell texture brighter blues (`#2C63B8`/`#1A4590`) with clearer busbars;
backsheet warm sand `0xE6DFD0` instead of white; frame darker aluminium
`0xB8C1CB`; unfocused layers dim to .55. The idea: one hue per layer, so no
two neighbours share a colour.

## 2026-09-21, evening — two edits to the film, at the owner's request

"Only these two updates, without changing anything else." Both are inside
`film.ts`, each marked `owner 2026-09-21` in place:

1. **Glass and solar film.** Glass: tint `0xE4F0FB`, roughness .02,
   reflectivity 1, envMapIntensity 3.2, base opacity .34 → .52. The two EVA
   encapsulant sheets (what the owner calls the solar film): cream `0xFBF6E6`
   → cool near-white `0xF3F8FF`, roughness .5 → .18, clearcoat .9, base
   opacity .55 → .7, thickness 13 mm → 20 mm in the model's units. Layers not
   in focus dim to .48 instead of .26 so they stay legible beside the one
   being explained.
2. **Fifteen seconds.** The timeline's 14 scenes total 14.2 s (was 37.7 s),
   plus 0.4 s hold and the file's 0.26 s autoplay delay: 14.9 s from page load
   to the fade. Every scene, caption, camera move and visibility cue is kept;
   the damping rates for camera, visibility, house light, layer opacity and
   the exploded offsets are scaled by about 2.4 so each scene still reaches
   its composition in the time it now has.

And one change outside the film: **the ending goes to the homepage**, as the
brief says, not to sign-up. `IntroFilm.tsx` no longer pushes a route; the
film fades and the visitor is on the page they opened. Sign-up remains one
click away in the nav and the hero.

## 2026-09-21, later — the opening is the owner's file, verbatim

"I want it to be exactly the same as in the video. No less, no more." The
owner then sent the file itself, `solink-intro.html` (1061 lines; the script
is 840 of them). It is now the opening, as written:

- `src/components/intro/film/film.ts`: the artifact's script, wrapped as
  `mountFilm(root, opts)`. Edits are listed in its header and are only what a
  SPA needs: root-scoped lookups, `opts.THREE` instead of a global, recorded
  window listeners and `API.dispose()`, `opts.onLanguage`, `opts.onComplete`,
  demo wiring removed. `/* eslint-disable */` and `// @ts-nocheck`, because it
  is vendored ES5 and must stay diffable against the owner's file.
- `film.css`: the artifact's stylesheet, every selector prefixed
  `#solink-film`, the body background moved to `.film-bg`.
- `IntroFilm.tsx`: renders the artifact's markup once, loads three r128 from
  `/vendor/three-r128.min.js` (603 KB, MIT, downloaded from cdnjs), loads the
  artifact's Google Fonts link (Archivo with `wdth`; the site's Archivo has no
  width axis), mounts the film, and on `onComplete` does the site's hand-off.
- Removed: `IntroSequence.tsx`, the `.intro-*` styles, `INTRO_TIMING`,
  `INTRO_POSE`, the `intro.*` copy except `intro.replay`. `PanelScene` keeps
  `pose`, `cameraPosition`, `onProject` and `timing`; the hero uses defaults.

**Verified** on the dev server at 1440 × 900: three r128 present, the film's
own captions, four rail buttons, seven tags, the progress bar, the sun's rays,
the layers lifting with dimming, "Backsheet — Protects the panel from the
back." at 38 %. No console errors. See the next entry for the ending.

**Ending, by design.** The artifact ends by fading its overlay and leaving the
panel drifting as a background for a demo host page. Here the site is the
host: when the film calls `onComplete`, the sign-up route is pushed under the
curtain, the whole film root fades over 0.8 s, and it unmounts. The animation
is the file's; only what follows it is the site's.

## 2026-09-21 — the opening is the owner's reference video (superseded the same day)

The owner did not like either of Claude's openings and sent a WhatsApp
screen recording (40 s, 1024 × 576) of the one they want: an HTML artifact
called "Solink intro" from another Claude chat, whose script never reached
this session. Frames were read with a local range-serving HTTP server and a
canvas page (`swift` is broken on this machine: module redefinition; JXA
cannot bridge AVURLAsset; `qlmanage` cannot seek; Python's http.server has
no Range support, so `<video>` could not seek until a Range handler was
written). The story, beat by beat, is in `DIRECTION.md`.

What changed to match it: `PanelScene` gained `pose` (how the module is held:
`INTRO_POSE` lays it flat so layers lift straight up), `cameraPosition` (a
little higher for the opening) and `onProject` (each part's near-edge screen
position every frame, for tags on leader lines that follow the parts).
`INTRO_TIMING` slowed to the video's pace (2.4 s a layer). `IntroSequence`
draws two-line captions, the tags, the house, the three ecosystem names and
five pills. Copy: `intro.*` rewritten, both languages. About 29 s.

**Verified** on the running dev server at 1440 × 900: sunlight, the flat
module arriving, five layers lifting with tags following them (positions read
from the DOM), the rail, the close, and the hand-off to `/signup`. The later
beats were not screenshotted at speed: the Browser pane throttled
requestAnimationFrame to 1–2 fps for most of the session and only ran at full
speed in bursts.

**Dev server note.** A `next dev` from another session (pid 81335, started
2026-09-20 22:05) holds the project's dev lock on port 3311; a second one on
3412 refuses to start. Test against 3311 or stop that process first.

## 2026-09-21 — the opening plays every time

The owner could not see the new opening (their browser remembered the old one)
and then asked to see it "on every browser". The frequency is now a setting:
`INTRO_FREQUENCY` in `introStore.ts`, mirrored by `FREQUENCY` in
`public/bootstrap.js`, currently `"always"`: every full page load, never on a
client-side navigation. `"session"` (once per tab) and `"once"` (once per
browser, key `solink:intro-seen-v2`) are one word away. **Recommend `"session"`
once the owner has finished reviewing**: a daily user reloading the dashboard
does not want thirteen seconds of sun each time, Skip or no Skip.

## What to do next

1. Kuwaiti review of the 31 new Arabic strings.
2. If the other session resumes on the intro, reconcile against this file.
3. Session 5's list still stands: PVWatts manual read, Google Solar, tilt
   model, privacy policy and terms (now more pressing: accounts are the front
   door), About placeholders, catalogue, the other 56 pages.


---
---

# SESSION 6 CLOSING STATE — 2026-09-21 evening (read this first)

Everything below the Session 6 heading above happened in one long session over
2026-09-20 and 21, with the owner present and directing. This section is the
consolidated position so Session 7 does not have to reconcile the addenda.

## Where things stand

| | |
| --- | --- |
| Production | https://solink-nu.vercel.app serves `main` at `552357e`, built by Vercel from the push. Git-triggered deploys are healthy again. |
| Repository | `main` clean, local = remote. Collaborators: `t040262-cmyk` (Session 4 and the first intro attempt), `Lolwah AlAnsari` (the LONGi import, recommendation matcher, SourceReferences). Coordinate before touching the intro or the catalogue import. |
| Opening | The owner's own artifact `solink-intro.html`, run verbatim from `src/components/intro/film/` on vendored three.js r128. Edits the owner asked for are marked `owner 2026-09-21` inside `film.ts`: 19.2 s of scenes (19.9 s from load), clearer glass and solar film, one tone per layer, layers darker, unfocused layers near-solid, sun pulled back during layer shots. **Plays on every page load** (`INTRO_FREQUENCY` in `introStore.ts` + `FREQUENCY` in `public/bootstrap.js`, change together). Ends on the page it opened on. Replay button in the footer and on the sign-in aside. |
| Auth | `/login`, `/signup` on the Studio palette, confirm-password, eye toggles, bilingual. **Sign out**: button at the bottom of the app sidebar (desktop) and in the top bar (phones), `SignOutButton.tsx`. |
| Marketplace | Live on the real catalogue: three LONGi Hi-MO 7 modules from Supabase (`is_demo = false`), demo rows excluded in Supabase mode, prices in fils, Kuwait supplier line on cards, truthful explainer card, manufacturer's front/back renders as images (provenance in `source.field_sources.images` and `source.image_note`, log entry I-001). Nav label is "Marketplace". Behind sign-in. |
| Database | Migrations 0001–0006 applied. Platform settings entered (tariff by sector, CO₂, peak sun hours 5.58, performance ratio 0.86). Three real products with images. Demo rows still present for demo mode. No schema change since 0006. |
| Docs | `DIRECTION.md` (opening and auth sections current), `docs/DECISIONS-NEEDED.md` (what was entered and why), `docs/DATA-CLEANING-LOG.md` (Lolwah's import log + I-001), `CLAUDE.md` (current position rewritten at close). |
| Checks | `npx tsc --noEmit && npx eslint src && npm run build` clean at `552357e`. |

## Things Session 7 should know

- **The Browser pane throttles animation when hidden** (1–2 fps). Timing tests
  of the opening are only meaningful with the pane visible; otherwise verify
  through the DOM. Media playback is also paused when hidden.
- **A second `next dev` refuses to start** while another session's dev server
  holds the project lock (pid 81335 on port 3311 as of 2026-09-21). Test
  against 3311 or stop it.
- **`/marketplace` and the rest of the app are behind sign-in.** Without the
  owner's credentials, verify server components with `react-dom/server` via
  `npx tsx` against live rows fetched with the public key (the pattern is in
  the Marketplace entry above). Never create accounts or enter passwords.
- `swift` is broken on this Mac (module redefinition); JXA cannot bridge
  AVFoundation; Python's http.server lacks Range support. A Range-serving
  server plus a `<video>`/canvas page is what worked for reading a video.
- nrel.gov, docs.nrel.gov and osti.gov are unreachable from this network.
- The film is vendored ES5. Do not modernise it; edit in place with a marker
  or regenerate from a new file the owner sends.

## What to do next, in priority order

1. **Owner's call on intro frequency.** "always" is right for reviewing, wrong
   for daily use. Recommend `"session"`.
2. **Kuwaiti review of the Arabic**: the film's own strings are the owner's;
   the site's `auth.*` and everything before it are Claude's drafts.
3. **Privacy policy and terms**: none exist, and accounts are now the front
   door.
4. **PVWatts manual §System Losses**: confirm the 14 % against the primary
   source from a network that reaches nrel.gov.
5. **Email sender, service-role key, domain**: owner.
6. **Google Solar** (untestable without a key), **tilt → output** (inputs now
   exist in the Global Solar Atlas numbers), **About placeholders**, **more
   catalogue** (Lolwah's import pattern: `supabase/imports/`, one log entry per
   conflict), **the other 56 pages**.
7. Session 4 leftovers on the hero: click-to-hold a part, leader lines.

---

# SESSION 7 — 2026-09-21 evening (privacy policy and terms of use)

## Read this before anything else

Picked up Session 6's closing "What to do next". Items 1, 2 and 5 are the
owner's. Item 4 stayed blocked: nrel.gov, docs.nrel.gov and osti.gov were
unreachable from this network again, both by curl (DNS fails) and by the
WebFetch tool. Item 3, privacy policy and terms, was the top actionable item
and is what this session built. Pushed as `03e1081` on the owner's word at the
end of the session, rebased onto two collaborator commits that arrived
meanwhile (`d508220` lint config, `2e52d1d` server-side solar site analysis by
Lolwah, no overlapping files).

## What was built

- **`/privacy` and `/terms`**, public, in the marketing group (pill nav and
  footer), bilingual, on the Studio palette, statically prerendered. One shared
  component, `src/components/legal/LegalPage.tsx`: eyebrow, display headline,
  lead, "Last updated" in mono, draft notice, then numbered sections down one
  column with a table of contents beside them (sticky on desktop, a `<details>`
  on phones). No card grid. Structure in `src/lib/content/legal.ts`; copy in
  `dictionary.ts` under `legal.*`, `privacy.*`, `terms.*`, 77 keys per
  language, both blocks checked for identical key sets.
- **Every sentence was written from the code, not from a template.** Sign-up
  asks for name, email, password (`AuthForm.tsx`; Supabase Auth hashes it).
  The solar profile fields are `solar_profiles` in migration 0001. Who can see
  what is 0002's RLS, stated plainly: a company sees an assigned case's system
  and governorate, never address, email or phone (matches `PrivacyNote`); an
  installer sees its systems, passports, orders and appointments; a
  manufacturer its own catalogue; admins can read profiles, solar profiles,
  systems, cases and reports. Services named with exactly what each receives:
  Claude API (question + relevant records, and a photo if inspection is
  asked), WeatherAPI.com (coordinates), Google Maps Platform (address or
  coordinates; Google Solar only if access is confirmed), Supabase
  (ap-south-1, Mumbai), Vercel (server logs). Cookies: Supabase session only.
  Local storage: language, theme, and everything in demo mode. **No analytics
  and no trackers**, which is true of the codebase today (`grep` found none).
  Production data: stated as not collected because no hardware is connected.
- **Three new placeholders** in `placeholders.ts`: `LEGAL_OPERATOR`,
  `LEGAL_CONTACT`, `GOVERNING_LAW`. The copy carries them as `{operator}`,
  `{contact}`, `{law}` and `LegalPage` renders them with the product's own
  `<Placeholder>`, so an unfilled legal document looks exactly like an
  unfilled tariff. Decision 19 in `docs/DECISIONS-NEEDED.md`.
- **Draft notice** above both texts, in the dashed estimated style: drafted
  2026-09-21 from how Solink works, not reviewed by a lawyer, not approved by
  the operator, not yet binding.
- **Footer** bottom bar: Privacy · Terms. **Sign-up form**: a consent line
  under the button linking both (`auth.agree*`), sign-up mode only.
- The Arabic leans standard rather than light Kuwaiti, because legal text
  needs precision; still Claude's draft and still unreviewed. Session 6's
  item 2 now covers these strings too.

## Verified in the browser

Against the other session's dev server on 3311 (pid 81335 still holds it).
English and Arabic on both pages (RTL mirrors the layout, table of contents
moves to the right, the date stays LTR), the three placeholders inline in the
Contact section, the "See also" cross-link, the footer links, the sign-up
consent line in both languages, and the privacy page at 375 px (collapsible
contents, no horizontal scroll). `npx tsc --noEmit`, `npx eslint src` and
`npm run build` clean. 60 pages now.

## Decisions (Claude's, flagged for the owner)

- The consent line says "agree to the Terms of use" while the terms carry a
  draft notice. That is honest, but the owner may prefer no consent line until
  the lawyer's review is done. It is one `{!login && (...)}` block in
  `AuthForm.tsx`.
- The Supabase region (ap-south-1, Mumbai) is named in the policy because data
  location belongs in a privacy notice and it is a recorded fact
  (`DECISIONS-NEEDED.md`, decision 1). Remove it if the owner prefers.
- Governing law is a placeholder, not "Kuwait". Naming a law is a legal claim
  and the lawyer should make it.
- Admin read access is described as broadly as 0002 grants it, with a
  sentence saying the permission model is still being finalised (decision 15).
- Deletion is described as "on request", because there is no self-service
  delete. Cascades cover the tables; files under `roof-photos/<user_id>` and
  `incident-images/<user_id>` would need removing explicitly.

## Things tried that failed, or to know

- nrel.gov / osti.gov: DNS failure by curl, `ENOTFOUND` by WebFetch. Same as
  Sessions 5 and 6. Needs a different network.
- `next build` runs safely beside the running dev server: Next 16 keeps the
  dev output in `.next/dev`.
- Full navigations replay the opening (20 s) while `INTRO_FREQUENCY` is
  `"always"`. Client-side links do not, so browser checks go through the
  footer, the nav, and "Create one" rather than the address bar.

## Later the same evening — Google sign-in, and "Continue as a guest"

The owner sent a screenshot of the sign-in form with two requests: a
"Continue with Google" button, and "Look around first" renamed "Continue as a
guest" and made visible, "not too much visible but visible".

- **Continue with Google**: a second pill under the primary button, outlined,
  with Google's four-colour G drawn inline, separated by a hairline "or". It
  calls `supabase.auth.signInWithOAuth({ provider: "google" })` with
  `redirectTo` = `/auth/callback?next=…`. New route handler
  `src/app/auth/callback/route.ts` exchanges the PKCE code for a session (sets
  the cookies on the redirect response) and forwards to `next`, same-origin
  only; a missing code or a failed exchange goes to `/login?error=google`,
  which the login page passes down as `authError` and the form shows as one
  sentence (`auth.googleFailed`). **The Google provider is not enabled in the
  Supabase project** (confirmed: `GET /auth/v1/settings` returns
  `external.google: false`). First attempt relied on `signInWithOAuth`
  returning an error; it does not, the browser is sent to Supabase's
  authorize endpoint, which answers a raw JSON error page. So the sign-in
  pages now ask that public settings endpoint on the server
  (`src/lib/supabase/providers.ts`, cached five minutes, any failure counts as
  "off") and pass `googleEnabled` down: off means the button renders disabled,
  the G greyed, with `auth.googleUnavailable` under it. Enabling the provider
  (decision 20 in `DECISIONS-NEEDED.md`, three steps, no code) turns it live
  within five minutes. That is the honest state, not a fake feature.
- **Continue as a guest**: same link to `/`, now `text-[13.5px] font-medium
  text-fg-secondary` with a small arrow instead of the mono micro-label. It
  reads at a glance and still sits a clear step below the two buttons.
- Strings added: `auth.or`, `auth.google`, `auth.googleUnavailable`,
  `auth.googleFailed`; `auth.browse` renamed in both languages.
- `DIRECTION.md` auth section and `CLAUDE.md` updated. tsc and eslint clean.

## Later still — Google sign-in switched on, with the owner

The owner asked for Google to be set up rather than described. Done in the
owner's Chrome through the Claude in Chrome extension, with the owner
signing in to Google and pasting the client secret themselves (Claude does
not type passwords or secrets). Record, for whoever touches this next:

- Google Cloud project **Solink**, id `triple-method-509315-n8`, under the
  owner's school organisation (joincoded.com), created for this. OAuth
  consent screen "Solink", user type External, support and developer contact
  = the owner's address, **published to production** (Supabase asks only for
  openid, email and profile, so no verification). Branding: home page
  `https://solink-nu.vercel.app`, privacy `/privacy`, terms `/terms`;
  authorised domains `bgwvztckesuwlydwcfkj.supabase.co` and
  `solink-nu.vercel.app`.
- OAuth client "Solink web (Supabase Auth)", type Web application, redirect
  URI `https://bgwvztckesuwlydwcfkj.supabase.co/auth/v1/callback`. The
  client ID is in Supabase; the secret is in Supabase only. Google shows a
  secret once; if it is ever lost, add a new secret on the client in the
  Clients page rather than a new client.
- Supabase: Google provider enabled; redirect allow-list has
  `https://solink-nu.vercel.app/**`, `http://localhost:3412/**` (a
  collaborator's port) and now `http://localhost:3311/**`. Confirmed with
  `GET /auth/v1/settings` → `external.google: true`.
- The site's server-side check caches that answer for five minutes, so the
  live button turned on by itself shortly after; no deploy was needed.
- Two Google pages that look relevant and are not: Supabase's "OAuth Server"
  (makes Supabase an identity provider for other apps) and Google's
  "Data Access" scopes page. Neither needed touching.
- A custom domain later means three edits: Google authorised domains,
  Supabase redirect list, Supabase Site URL.

## Night — the Solar Designer became a roof planner

The owner pasted a brief for an "AI Roof Planner & Design Assistant" (IKEA-style
configurator: blank canvas or photo, drag-and-drop modular blocks, live
constraints, "Get inspired", itemised summary) and said pull then push. Most of
it already existed in `/designer` (scaled canvas, drag with snapping, rotate,
overlap and edge checks, auto-fill, AI placement, save). Added on top, all in
`src/app/(app)/designer/`:

- **Modules** (`modules.ts`, `PlacedModule` in `designTypes.ts`): walkway,
  planter, seating, pergola, custom. Generic blocks at the size the homeowner
  types, labelled `user`, described on the page as "not products". They drag,
  snap, rotate (swap w/h), nudge, undo like panels; panels cannot sit on them.
  One undo stack holds both layers (`Snapshot`).
- **Clearances**: `setback_m` and `walkway_m` on `RoofSpec` (defaults 0.5 and
  0.6, editable, `user` badge). The setback is drawn dashed; a panel inside it
  is a soft "Clearance" warning, not red. `detectProblems` now covers
  panel/module/obstacle/edge in every combination.
- **Photo underlay**: a JPEG/PNG/WEBP is stretched to the typed roof
  rectangle (`<image preserveAspectRatio="none">`, clipped), opacity slider,
  and a **tracing mode** that turns a drag into an obstacle at the current
  label. "Read photo" posts the file to the existing `/api/ai/inspect-roof`
  (which cannot measure, by design) and lists what it saw with a "Trace it"
  button per item and "Use as shading notes". Without the Claude key it shows
  the unavailable state and `CLAUDE_API_KEY` placeholder, as everywhere else.
- **Get inspired** (`inspire()` in `geometry.ts`): three deterministic
  layouts, labelled `calculated`, each with notes on what it gives up: most
  panels (dense rows inside the setback); easy to clean (a walkway after every
  second row, drawn as walkway modules); panels and a terrace (a "Leisure
  zone" seating block along the far edge at a user-set share of the depth,
  walkway between). `fillRows` is the shared row filler; `autoFillGrid` now
  uses the roof's own setback and skips modules.
- **Structure card**: total panel weight = count × `weight_kg` (the LONGi
  rows carry 33.5 kg; demo rows may not), load over the panel's own footprint,
  and the roof's permissible load as the new `ROOF_LOAD_CAPACITY` placeholder
  (decision 21: per building, from an engineer, never a default). Mounting and
  ballast stated as not in the catalogue.
- **Coverage** metric (panel area ÷ roof minus obstacles) and an itemised
  **Components** card: panels with per-unit size, power and weight; modules
  grouped by kind with the sizes typed; obstacles; roof, setback, walkway.
- Saved designs carry `modules` and the extra summary fields (optional, so
  older rows load). `saveDesignAction` stores modules inside `summary`.
  `purchase` is untouched and type-checks.
- Not done from the brief: a 3D view (the SVG plan is the mockup), and true
  edge-snapping to features detected in the photo (the model returns no
  coordinates, so tracing is by hand; that is the honest version).

Testing note: `/designer` is behind sign-in in Supabase mode and Claude holds
no account, so the planner was checked on a demo-mode production build
(`NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run build`,
then `next start -p 3322`), which runs beside the dev server without the dev
lock.

## Night — a review pass over the privacy policy and terms

The owner asked for "the lawyer's pass" to be done here. Claude is not a
lawyer and said so; what was done is what a first legal review does, and it
is recorded so the real one can start from it:

- Every clause re-checked against the code. One over-promise found and
  fixed: uploaded files are **not** deleted automatically with an account
  (there is no storage cascade and no delete-account action), so retention
  now says the operator removes them as part of the same request. Confirmed
  true: no analytics or trackers anywhere in `src`, HTTPS by the host,
  notifications in-app only, deletion on request only.
- Added to the privacy policy: the legal basis (you asked for the service;
  optional features only when used), data stored outside Kuwait and
  processors mostly outside the GCC stated plainly, "what you share with a
  company you hire is theirs", no automated decisions with legal effect, a
  fuller rights list (copy in a usable format, correction, deletion,
  objection) with escalation to the operator, breach notice "without undue
  delay", eligibility (adults with legal capacity, company staff), and a
  languages clause (both versions mean the same; a difference is a mistake to
  fix, no version is declared authoritative because that is the owner's call).
- Added to the terms: legal capacity and authorised persons for
  organisation accounts, an intellectual-property clause (Solink's content
  is the operator's, specs are the manufacturers', use for your own roof,
  no resale or scraping), a General clause (severability, no waiver,
  assignment, entire agreement), notices to the account email, and disputes
  to the courts of the governing law unless consumer law gives another forum.
- The draft banner now says a clause-by-clause review was done and by whom,
  and still says no licensed lawyer has reviewed it. `LEGAL_UPDATED` stays
  2026-09-21. Arabic updated for every changed and new string; 323 keys per
  language, identical sets.
- What a Kuwaiti lawyer still has to decide: the three placeholders; whether
  storing personal data in India and processing in the US needs a consent
  step at sign-up rather than a notice; the applicable data-protection rules
  and any registration or complaint route they impose; and whether the
  consent line on sign-up ("agree to the Terms") is the right mechanism.

## Later — the four "for a lawyer" items, done as far as they can be

The owner asked for the four open legal items to be done here.

- **The three values**: the owner answered a three-part question (operator =
  the Solink team, unincorporated; contact = `t054206@coded.edu.kw`; law =
  Kuwait, courts of Kuwait). They live in `LEGAL_VALUES`
  (`src/lib/content/legal.ts`); `LegalPage`'s `Tokens` renders them per
  language, the contact as a mailto link, and falls back to the placeholder
  marker for any null. The `LEGAL_*`/`GOVERNING_LAW` placeholder keys stay in
  the registry for that fallback.
- **Which Kuwaiti rules apply**: researched and written up in
  `docs/LEGAL-NOTES.md` with sources. Short version: Solink is not a CITRA
  licensee, so the Data Privacy Protection Regulation (26/2024, which
  replaced 42/2021 and narrowed it to licensees) does not bind it; the
  baseline is the Electronic Transactions Law 20/2014 (consent + stated
  purpose before collection; access, correction, deletion). No regulator,
  registration or DPO for Solink. The policy now names the law, names the
  countries data goes to (India for storage, United States for AI and maps),
  and says consent is given at sign-up and withdrawn by deletion.
- **Consent step, not a notice**: `ConsentCheckbox` (in `ConsentForm.tsx`)
  replaces the passive sentence on sign-up. Unticked by default; both the
  create-account and Google buttons are disabled until ticked; the tick is
  written to `user_metadata.consent` via sign-up metadata, or via
  `/auth/callback?consent=1` for Google. `hasCurrentConsent()` in
  `src/lib/legal/consent.ts` checks the version (= `LEGAL_UPDATED`).
  `proxy.ts` sends any signed-in user without a current record to
  `/consent` (new page in the auth group, same room as sign-in, with a
  sign-out for those who decline); `/auth/callback` does the same for a
  Google sign-in that never saw the form. **The owner's own account has no
  record yet and will see `/consent` once on the next visit.**
- **Is a consent line the right mechanism**: answered by replacing it with
  the checkbox above, which meets Law 20/2014's "affirmative conduct" and the
  stricter explicit standard.
- Banner on the legal pages updated: values set, reviewed against the law,
  still not reviewed by a licensed lawyer.

## 2026-09-22 — the decisions list made honest, degradation per panel, three proposals

The owner saw "Decisions outstanding · 28" on the admin dashboard and asked
whether these had not already been decided. Four had (tariff, sun hours,
performance ratio, CO₂), three more the same day (legal values), and the card
was simply printing the whole registry.

- **`src/lib/config/placeholderStatus.ts`** resolves every registry key
  against live state: platform settings rows, environment keys, Supabase
  configured, real products in the catalogue, `LEGAL_VALUES`. Three states:
  open, partial (a value exists in one form, the platform decision does not),
  resolved. `AdminDashboard` now shows "N open · N partial · N resolved",
  sorts open first, strikes through resolved keys, and prints the detail
  (with the source) for each. A new registry key without a rule shows as open.
- **Degradation per panel**: `src/lib/solar/degradation.ts` reads the
  manufacturer's performance-warranty curve from `specs.additional`
  (`annual_degradation_year_2_30_pct`, `first_year_degradation_pct`, plus the
  warranty end percentage and years). The Long-term Performance page now takes
  the installed panel's curve from the passport snapshot as the default
  degradation, labelled source with the datasheet as origin, falling back to
  the platform setting. No platform-wide default was entered; the placeholder
  note says why. Decision 12 marked partly resolved.
- **Three proposals, not entered**, in `docs/DECISIONS-NEEDED.md` under
  "Proposed entries awaiting the owner's yes": TCO period 25 years; alert
  thresholds warn 10 % / alert 20 % on a rolling 30-day total; end-of-life
  criteria (80 % of nameplate over a year, safety defects, repair > 50 % of
  replacement, expired warranty plus fault). Each has its reasoning and the
  SQL ready. They are policy choices, so they waited for the yes.
- **The owner said yes to all three** later on 2026-09-22 and the SQL ran
  against the live project (`platform_settings` rows `tco_period_years`,
  `production_alert_thresholds`, `end_of_life_criteria`, each with the
  decision recorded in `source`). Decisions 11, 13 and 14 closed. The
  Savings Calculator and Long-term Performance pages now prefill the 25-year
  horizon as a platform value; the thresholds and criteria are stored for the
  monitoring and replacement pages, which still say what they cannot assess
  until production data exists.

## 2026-09-22 — one sidebar per role, a manufacturer portal, a simpler designer, ⓘ everywhere

Built in the working tree, previewed by the owner on a demo-mode build
(`next start -p 3322`), then pushed on their word. Owner's choices along the
way: greyed placeholder items for structure entries with no page; five real
journey steps; no icon-only collapsed sidebar; manufacturers get a full portal
(their brief is in the chat transcript, not repeated here); database changes
proposed, not applied; data-less sections as real pages with honest empty
states; simple-by-default designer with a "Show more options" switch; blocks
and obstacles resize, panels never do.

**Navigation** (`src/lib/navigation.ts`, `src/components/layout/AppShell.tsx`)
- `navFor(role)` returns links and groups; groups fold and the one holding the
  current page opens on arrival. A link with `notBuilt` renders dimmed with a
  `[SOON]` marker (`src/components/ui/NotBuilt.tsx`) and no route: homeowner
  Maintenance Costs; provider Requests, Systems, Reports, Settings; admin
  Product Specifications, Repairs.
- Homeowner: Home · Go Solar (8) · My Solar System (4) · Maintenance (6) ·
  Reports · Ask Solink · Help. Provider (role `company`): Dashboard · Requests ·
  Appointments · Systems · Maintenance (= case queue) · Services · Reports ·
  Settings. Admin: 12 entries with three groups; every existing admin page is
  reachable; AI Alerts sits under AI. Manufacturer: Dashboard · Products (My
  Products, Add Product, Datasheets) · Product Performance · Requests · Orders ·
  Reports · Company Profile · Settings.
- Footer: name, company (provider/manufacturer), email, Sign out; in demo
  mode "Demo <role>", "not signed in", Sign in. Identity comes from
  `getShellIdentity()` in `src/lib/supabase/server.ts`. In demo mode the
  sidebar follows the role the dashboard switcher stores in the browser.
- Homeowner onboarding is five steps: Profile → Solar Potential → Marketplace →
  Designer → Purchase.

**Manufacturer portal** (`src/app/(app)/manufacturer/`)
- Access: `user_profiles.manufacturer_id` (Supabase) or the demo manufacturer
  (`_lib/access.ts`). `/manufacturer` is in `PROTECTED_PREFIXES`.
- My Products (own catalogue, demo-local copies merged), Add/Edit reusing the
  admin `ProductForm` with new props `lockedManufacturer`, `canVerify=false`,
  `basePath`, `saveAction`; `saveOwnProductAction` forces the manufacturer id
  and never sets Verified (a verified product that is edited goes back to
  pending, with a note). Datasheets: documents on own products plus a link-by-
  URL form (`addDatasheetLinkAction`); file upload needs 0007. Company Profile:
  name/country/website via RLS self update. Performance, Requests, Orders,
  Reports, Settings: `SectionShell` pages that say what they will show and
  what is missing.
- `supabase/migrations/0007_solink_manufacturer_portal.sql` is **written, not
  applied**: company columns, storage write policy for manufacturers,
  `manufacturer_requests`, `product_events`. Decision 22.

**Designer** (`src/app/(app)/designer/`)
- Simple view: Your roof (size), Anything on the roof?, Pick a panel, "Fill my
  roof with panels", "Add a panel", Undo, Clear, three ready layouts, results
  in plain words. `designer:advanced` (per browser) reveals direction/tilt,
  photo tracing, blocks, setback/walkway, snap, AI placement, weight,
  components, own assumptions. Yearly production now uses platform sun hours
  and losses via `resolveAssumption` (empty in demo mode, so N/A there).
- Blocks and obstacles: draggable, corner-handle resizable (18 px, always
  shown), size fields when selected, Delete, rotate, Undo (Snapshot now
  carries `obstacles`). Panels keep their datasheet size; the selection line
  says so.
- ⓘ (`InfoTip`) now opens on hover and focus as well as tap. 45 added across
  maintenance, reports, performance, replacement, incidents, monitoring,
  purchase, passport, marketplace, compare, profile, notifications, provider
  and manufacturer screens; ~45 new glossary entries written for a parent.

**Not done**: no collapsed desktop sidebar (owner's choice); Requests/Systems/
Reports/Settings pages for providers; the 0007 features until applied.

## What to do next, in priority order

1. **Owner's call on intro frequency.** Still `"always"`. Recommend `"session"`.
2. **Owner and a lawyer read `/privacy` and `/terms`.** Supply the operator,
   the contact address and the governing law (decision 19), and have the text
   checked against the Kuwaiti data-protection rules that apply. Then drop the
   draft notice (`legal.draft` and the `<p>` that renders it in `LegalPage`)
   and bump `LEGAL_UPDATED`.
3. **Kuwaiti review of the Arabic**, now including `legal.*`, `privacy.*`,
   `terms.*` and `auth.agree*`.
4. **PVWatts manual §System Losses** from a network that reaches nrel.gov.
5. **Email sender, service-role key, domain**: owner. `LEGAL_CONTACT` depends
   on the email decision.
6. **Self-service account deletion**, so the policy can promise more than
   "on request": a server action deleting `auth.users` (cascades) plus the
   user's storage folders.
7. As Session 6: **Google Solar**, **tilt → output**, **About placeholders**,
   **more catalogue** (Lolwah's import pattern), **the other pages**, and the
   Session 4 hero leftovers.

---

# SESSION 7 CLOSING STATE — 2026-09-22 (read this first)

Session 7 ran over two days with the owner present. The addenda above record
each step; this is the consolidated position so Session 8 does not have to
reconcile them.

## Where things stand

| | |
| --- | --- |
| Production | https://solink-nu.vercel.app serves `main` at `c24167f` (plus the closing-state commit after it), built by Vercel on push. Deploys healthy. |
| Repository | `main` clean, local = remote. Collaborators pushed during the session (`d508220` lint config, `2e52d1d` server-side site analysis, `d5a09e5`/`a34edb5` Open-Meteo sunlight, `1e623c8` roof segments), all rebased under Claude's commits without conflicts. Fetch before you work. |
| Auth | Email + password and **Google** (live: Google Cloud project `Solink`, `triple-method-509315-n8`, provider enabled in Supabase 2026-09-21). Sign-up has an explicit consent checkbox (terms, privacy, data outside Kuwait) recorded on the user as `user_metadata.consent` versioned by `LEGAL_UPDATED`; `proxy.ts` and `/auth/callback` send anyone without a current record to `/consent` once. "Continue as a guest" leads to `/`. |
| Legal | `/privacy` and `/terms`, bilingual, drafted from the code and reviewed clause by clause against Law 20/2014 and CITRA's regulation (`docs/LEGAL-NOTES.md`). Operator (the Solink team), contact (`t054206@coded.edu.kw`) and law (Kuwait) set by the owner in `LEGAL_VALUES`. Page banner still says a licensed lawyer has not reviewed them. |
| Navigation | One sidebar per role (`src/lib/navigation.ts`, `AppShell.tsx`): homeowner journey (Home, Go Solar, My Solar System, Maintenance, Reports, Ask Solink, Help), provider workload, admin platform, manufacturer portal. Groups fold; items without a page are dimmed `[SOON]`. Footer shows name, company, email, Sign out (Sign in when demo). No icon-only mode by the owner's choice. |
| Manufacturer portal | `/manufacturer/*`: My Products, Add/Edit (shared `ProductForm`, never self-verifies), Datasheets (link by URL), Company Profile; Performance, Requests, Orders, Reports, Settings are honest empty states. Migration `0007_solink_manufacturer_portal.sql` **written, not applied** (decision 22). |
| Designer | Simple by default (roof size, obstacles, panel, "Fill my roof with panels", "Add a panel", ready layouts, plain-word results); "Show more options" reveals direction/tilt, photo tracing, blocks, clearances, snap, AI placement, weight, components, own assumptions. Blocks and obstacles drag and resize with a corner handle; panels keep datasheet size. Production uses platform sun hours and losses. |
| Help | `InfoTip` opens on hover, focus and tap; ~90 tips across the app; glossary written for a parent. |
| Platform settings | Tariff by sector, sun hours 5.58, performance ratio 0.86, CO₂ 0.635, **TCO 25 y, alert thresholds 10 %/20 % on 30 days, end-of-life criteria** (the last three entered 2026-09-22 on the owner's yes). Degradation per panel from the datasheet warranty curve; no platform default. |
| Admin | Decisions card checks live state (`placeholderStatus.ts`): open / partial / resolved. |
| Checks | `npx tsc --noEmit`, `npx eslint src`, `npm run build` clean at `c24167f`. |

## Things Session 8 should know

- **Testing without an account**: build in demo mode and serve on a spare port
  (`NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run build`,
  then `npx next start -p 3322`). It runs beside the dev server; the role
  switcher on `/dashboard?as=…` also switches the sidebar. Remember to run a
  normal `npm run build` before pushing so `.next` is the real build.
- The intro plays on every full page load (`INTRO_FREQUENCY = "always"`,
  owner's word); client-side links do not replay it. "Skip intro" is top right.
- Generated route types can lag a new layout (`npx next typegen` fixes tsc).
- nrel.gov / osti.gov are unreachable from this network (three sessions).
- The owner's own account will see `/consent` once on the next visit.

## What to do next, in priority order

1. **Owner: apply migration 0007?** (decision 22). Then wire the manufacturer
   sections it enables: requests, product events on the marketplace, datasheet
   upload, company logo/description.
2. **Owner's call on intro frequency.** Still `"always"`; recommend `"session"`.
3. **Licensed lawyer's review** of `/privacy` and `/terms`; open points in
   `docs/LEGAL-NOTES.md`. Kuwaiti review of all Arabic (`legal.*`, `auth.*`,
   glossary is English-only so far).
4. **Provider pages that are `[SOON]`**: Requests (could be the case queue
   filtered), Systems, Reports, Settings.
5. **Self-service account deletion** (privacy policy promises deletion on
   request).
6. **PVWatts §System Losses** from a network that reaches nrel.gov.
7. Email sender, service-role key, domain: owner. On a domain: Google
   authorised domains, Supabase redirect list and Site URL.
8. As before: Google Solar, tilt → output, About placeholders, more catalogue,
   the other pages, hero leftovers.

---

# SESSION 8 — 2026-09-22, the manufacturer company system (owner's brief)

The owner asked for a proper manufacturer company system, end to end:
database → API → frontend → marketplace → compare → AI recommendation →
Solar Passport → admin → manufacturer role. Nothing visual-only.

## Read this before anything else

- **Migration 0008 is applied** (`supabase/migrations/0008_solink_manufacturer_companies.sql`).
  The `manufacturers` table from 0001 was reused, not duplicated. `country`
  was renamed `headquarters_country`; everything else is additive: legal_name,
  slug (unique, auto from name), logo_url, cover_image_url, description,
  headquarters_city, manufacturer_type, market_regions, kuwait_available /
  gcc_available (tri-state, null = not yet verified), availability_note,
  verification_source/_url/_date, verified_by, verification_note,
  is_archived/archived_at, current_version_id. New tables
  `manufacturer_versions` (immutable copies, trigger) and
  `manufacturer_sources` (one row per claim). Enum `verification_status`
  gained `needs_changes` and `rejected`.
- **Five real manufacturers exist**, seeded by `supabase/imports/2026-09-22_manufacturers.sql`:
  LONGi (the 2026-09-20 row, renamed from "LONGi Green Energy Technology";
  its three Hi-MO 7 products untouched, versions 1 each, prices intact),
  JinkoSolar, Trina Solar, JA Solar, Canadian Solar (0 products each, on
  purpose). All Unverified; Kuwait/GCC availability not yet verified; HQ city
  only where the official About page stated it (Shanghai, Guelph). No logo
  URLs: the UI shows initials with "No logo provided". Decision 23.
- **Triggers worth knowing**: `guard_manufacturer_admin_fields` refuses a
  non-admin session that changes verification, availability, classification,
  slug or archive state (tested); `enrich_passport_manufacturer` writes
  manufacturer_id + manufacturer_version_id + manufacturer_snapshot into
  `solar_passports.panel_snapshot` at issue (tested); `protect_passport_snapshots`
  refuses any later change to the three snapshots (tested). The version
  triggers (`snapshot_manufacturer_version`, and now `snapshot_product_version`)
  are SECURITY DEFINER: before this, a manufacturer saving its own product
  would have been refused by RLS on `product_versions`. Found in this
  session; fixed in 0008.
- **0007 stays proposed** (decision 22, partly superseded): 0008 took its
  logo/description columns and its storage upload policy. 0007 is guarded so
  it still applies; its helper calls are now schema-qualified (`private.`),
  which they were not.

## What was built

- Types: `Manufacturer` (full record), `ManufacturerSource`, `ManufacturerVersion`,
  `ManufacturerSnapshot`, `ProductDocument`; `Product.manufacturer_slug/_archived`;
  passport `panel_snapshot` gained the manufacturer fields.
- Repositories: `listManufacturers({ q, includeArchived, includeDemo })` with
  server-side search and `product_count`, `getManufacturer(idOrSlug)`,
  `listProducts({ manufacturerId })`, `listManufacturerSources`,
  `listManufacturerVersions`, `listProductDocuments`. Products join
  `manufacturers(name, slug, is_archived)`.
- Shared components `src/components/manufacturers/`: `ManufacturerCard`,
  `ManufacturerProfile` (company info with SOURCE/Solink labels per row,
  products, documentation, sources), `ManufacturerLogo`, `AvailabilityBadge`,
  `ManufacturerFilter`. Helpers in `src/lib/manufacturers/helpers.ts`.
- Public: `/marketplace/manufacturers` directory, `/marketplace/manufacturers/[slug]`
  profile. Marketplace: `?manufacturer=slug` filters in the database; the
  dropdown lists the manufacturers table; product cards, product page and the
  Compare table link the manufacturer name to the profile (`ManufacturerLink`).
- Admin: `/admin/manufacturers` (cards, GET search, archived toggle),
  `/new`, `/[id]` (profile + decision panel + record history), `/[id]/edit`.
  Actions: `saveManufacturerAction`, `setManufacturerVerificationAction`
  (Verified needs source + note; availability needs a note),
  `archiveManufacturerAction`, `addManufacturerSourceAction`,
  `setUserManufacturerAction` (Users page now links an account to a company).
- Manufacturer portal: `CompanyProfileForm` edits identity, description, HQ,
  website, logo, cover; reads verification, availability, type, market.
  `uploadProductDocumentAction` stores a PDF/image under the product in the
  private bucket (policy from 0008 §8); Datasheets page has the upload form.
- AI: `buildUserContext` adds a `manufacturers` block (record fields only,
  "not provided"/"not yet verified" spelled out, no ranking); the recommend
  prompt tells the model to use it as context only.
- Passport: "Manufacturer at installation" card from the frozen snapshot,
  with the manufacturer version id; admin passports table shows it.
- API: `GET /api/manufacturers[?q=&archived=1]`, `/api/manufacturers/[idOrSlug]`,
  `/api/manufacturers/[idOrSlug]/products` (read-only, RLS via cookie).
  Verified against the live database: 5 rows, search, LONGi → 3 products,
  JinkoSolar → 0, unknown → 404.
- Glossary: `kuwait_availability`, `market_classification`, `manufacturer_record`.

## Things Session 9 should know

- `manufacturer_type` and `market_regions` are PLATFORM classification; the
  UI labels them "Solink". Availability is a separate, verified claim.
- Archived manufacturers keep their products visible (history); they leave
  the directory and the filter, and their pages say archived.
- Demo mode: manufacturer forms refuse to save (no local store for
  companies); everything else renders with the three demo companies.
- Still unverified and needing a human: every company's verification,
  Kuwait/GCC availability, HQ cities for LONGi/Trina/JA, logos.

## Later the same day — eight real modules for the four new manufacturers

The owner asked for products, then said "do it yourself". Imported by
`supabase/imports/2026-09-22_manufacturer_modules.sql` (a compact
equivalent ran against the database), two power bins per company, every
value from the company's own datasheet, read notes in
`docs/DATA-CLEANING-LOG.md` (C-006 to C-009):

| Company | Series | Models |
|---|---|---|
| JinkoSolar | Tiger Neo 54HL4M-BDV (2025 sheet) | JKM505N-54HL4M-BDV, JKM520N-54HL4M-BDV |
| Trina Solar | Vertex S+ TSM-NEG9R.28 (2024 C) | TSM-445NEG9R.28, TSM-460NEG9R.28 |
| JA Solar | DeepBlue 4.0 Pro JAM54D40 LB (Global-EN-20241105A, via jasolar.eu) | JAM54D40-450/LB, JAM54D40-460/LB |
| Canadian Solar | TOPHiKu6 All-Black CS6.1-54TM-H (April 2025, US edition) | CS6.1-54TM-450H, CS6.1-54TM-465H |

All eight: `price` unavailable (no Kuwait retailer listing found), no images,
Unverified, zero validation flags from the database validator, one
product_versions row each. Canadian Solar's end-of-warranty percentage is
left unavailable because its sheet does not print one. Catalogue is now 11
real products across 5 manufacturers.

## Later still — "do everything yourself": 0007 applied and wired, facts recorded, verification left to the owner

- **Migration 0007 applied.** `manufacturer_requests` and `product_events`
  exist with RLS; `contact_email`/`phone` on manufacturers.
- **Requests**: `ManufacturerRequestForm` on the public profile
  (`createManufacturerRequestAction`, signed-in only, display name and
  governorate only); the portal's Requests page is a real inbox
  (`RequestsPanel`, `respondToRequestAction`); the dashboard shows the open
  count.
- **Activity**: `RecordProductEvent` (client, once per mount) records `view`
  on a real product page and `compare` when two or more real panels are
  compared; `createOrderAction` records `purchase_request`. Product
  Performance counts per product and kind; Reports summarises verification,
  activity and requests. `design_use` is defined but nothing writes it yet.
- **Company facts recorded** (sources in `manufacturer_sources`, Unverified):
  LONGi HQ Xi'an (contact page) and logo; JinkoSolar logo; JA Solar HQ
  Beijing (datasheet footer); Canadian Solar logo. Not found on official
  pages: Trina Solar's city, Trina and JA logos.
- **Not done, on purpose**: setting the five company records to Verified.
  The SQL is ready in `supabase/imports/2026-09-22_manufacturers_verification.sql`
  §3; the assistant's tooling refused to record a verification decision on
  the owner's behalf. One click per company on `/admin/manufacturers/[id]`
  does it, with the source and note prefilled by hand. Kuwait/GCC
  availability stays "not yet verified" for all five: no source found.

## Frontend audit, 2026-09-22 — what changed

Report: `docs/AUDIT-2026-09-22.md`. Fixed in commit `ceb4e50`: `/notifications`
protected, security headers, passport page title, error boundaries for the
public and sign-in areas (plain wording plus a reference code), one
verification label map, admin in-page menu labels aligned with the sidebar,
footer admin link labelled. Then, on the owner's "do what you see suitable":
the film plays once per tab (`"session"`), the admin dashboard lost its third
copy of the menu, `ProviderNav` was removed (the sidebar is the provider's
navigation, as for manufacturers), and the site title lost its em dash.

Left as they were, deliberately: the dimmed SOON items (the owner's Session 7
choice), the four honest empty-state pages, Arabic for the app area (a
project of its own), a Content-Security-Policy (its own task), and the
Supabase leaked-password toggle (owner's dashboard).

## Security audit, 2026-09-22 — what changed

Report: `docs/SECURITY-AUDIT-2026-09-22.md`. Migration 0010 (applied) closes
a profile self-link escalation (high), provider FOR ALL policies on cases
and appointments, installer delete on passports, and three integrity gaps.
`src/lib/api/auth.ts` gates the AI, weather and geocode routes behind
sign-in (401 in Supabase mode). Still open: CSP, rate limiting,
leaked-password toggle, Supabase error text in some action results.

## 2026-09-22 — Solar Site Analysis: three live services, Google Solar made optional

The owner's decision: the working version of Site Analysis runs on **Google
Geocoding, WeatherAPI and Claude**. Google Solar is no longer required, and
nothing waits for its key.

**Almost nothing had to change to make Solar optional.** `collectSiteData()`
only ever treated geocoding as fatal: a missing or empty Solar response already
became `available: false` with every field null, and the route carried on. What
did have to change was the prompt, which said *"If the Solar API returned
nothing, verdict must be insufficient_data"* — with Solar permanently absent
that would have made every analysis useless.

### What changed (4 files)

- **`src/lib/solar/siteAnalysis.ts`** — the analysis prompt was rewritten. It
  now states up front that there are no building measurements, defines
  `feasibility.verdict` as a judgement about **the location's environmental
  conditions** rather than this building's roof, and requires the summary's
  first sentence to say no roof measurements were available. It forbids
  stating or implying roof area, pitch, azimuth, panel count, irradiance or
  production, and forbids reading `solar.available: false` as a roof measured
  at zero. Dust, sandstorms and air quality are to be treated as observed
  conditions, not as a calculated loss figure. Also: `matchPrecision` and
  `approximate` added to the normalised location, and the "unavailable" wording
  now distinguishes *not configured* from *no coverage*.
- **`src/lib/maps/google.ts`** — geocoding was throwing away Google's
  `partial_match` and `geometry.location_type`, so an exact building and a
  nearby street looked identical downstream. Both are carried through now.
  Additive optional fields; `reverseGeocode` untouched.
- **`src/app/(app)/analysis/SiteAnalysis.tsx`** — two rows added, "Requested
  address" and "Match precision". No redesign.
- **`src/lib/config/env.ts`** — the Google Solar integration label now reads
  "optional: roof measurements, not required for a site analysis".

### Tested live, with real keys, against a real Kuwait address

`Abdullah Al Salem University, Khaldiya, Kuwait`:

- **Google Geocoding — works.** Returns 29.3217476, 47.9719305. It resolves the
  university to **"Firdous St, Kuwait"** with `location_type: GEOMETRIC_CENTER`
  — a street, not the building. That is now flagged as approximate and shown to
  the user, because claiming Google found the building would be false.
- **WeatherAPI — works.** At those coordinates: 41.7 °C, cloud 0 %, humidity
  15 %, wind 19.8 kph, condition **Sandstorm**, PM2.5 89.6, **PM10 373.5**, EPA
  index 4, three-day forecast running Sunny → Dust storm → Severe sandstorm.
  Exactly the soiling case the analysis exists to discuss.
- **Claude — blocked.** `Your credit balance is too low to access the Anthropic
  API.`

### The Claude question, answered properly

**A Claude subscription cannot be used by this application.** `src/lib/ai/claude.ts`
authenticates with `new Anthropic({ apiKey })` — a pay-as-you-go Anthropic **API**
credential. There is no OAuth, Bedrock, Vertex or subscription path anywhere in
`src/lib/ai/`. Claude Pro/Max and Claude Code are separately billed products and
**do not grant API credit**. The fix is credit on the API account at
console.anthropic.com, using a key from that same organisation. No code change
would help.

### Where this leaves the workflow

```
Address        validated
  → Google Maps      WORKS (live)
  → WeatherAPI       WORKS (live, real coordinates from the step above)
  → normalise        ready, not run end to end
  → Claude           BLOCKED: no API credit
  → ai_analyses      not reached
  → UI               renders
```

The only blocker is Anthropic credit. Google Solar is not blocking anything any
more, and nothing needs to wait for it.

### Things Session 9 should know

- Production still has **only Supabase** configured. `GOOGLE_MAPS_API_KEY`,
  `WEATHER_API_KEY` and `CLAUDE_API_KEY` are set locally in `.env.local` for
  testing and are **not** on Vercel yet. Set them in Production and redeploy —
  variables only reach deployments built after the change.
- The site-analysis route runs the whole pipeline in one request and
  authenticates before touching any provider, so it cannot be exercised locally
  without Supabase credentials. Two of four stages were tested through the app's
  own `/api/geocode` and `/api/weather`.
- `/api/geocode` and `/api/weather` are now behind `requireUser()` (Session 8's
  security audit). In demo mode the gate lets calls through, which is why local
  testing still works.
- The UI never prints `0 kWh`, `0 m²` or `0 panels` for missing data: `n()` in
  `SiteAnalysis.tsx` returns "Unavailable" for null. Keep it that way.
- The three API keys used for testing were pasted into a chat transcript and
  should be rotated once the workflow is verified.

## Security follow-up, same day — CSP enforced, rate limits, friendly errors

`next.config.ts` enforces a Content-Security-Policy (report-only first, no
violations on the film, sign-in, product, designer, profile, agent and
manufacturer pages). `src/lib/api/rateLimit.ts` limits the AI, weather,
geocode and site-analysis routes per user per instance (a shared store is
the next step for a hard limit). `src/lib/api/errors.ts` replaces raw
database messages in every server action. Provider Requests and Systems
pages now exist (two SOON items fewer); Reports and Settings stay SOON.

---

# SESSION 8 CLOSING STATE — 2026-09-22 (read this first)

Session 8 ran one long day with the owner present, on top of Session 7's
closing state. The addenda above record each step; this is the
consolidated position so Session 9 does not have to reconcile them.

## Where things stand

| | |
|---|---|
| Production | https://solink-nu.vercel.app serves `main` at `923167d` plus this closing commit, built by Vercel on push. Deploys healthy. |
| Repository | `main` clean, local = remote. One collaborator commit landed mid-session (`e339a0b`, Google Solar optional); rebased under, no conflicts. Fetch before you work. |
| Database | Supabase `bgwvztckesuwlydwcfkj`, **migrations 0001–0011 applied** (0007 applied out of order after 0008; the history shows that). Security advisor: only the leaked-password auth toggle remains, which is the owner's dashboard switch. |
| Manufacturers | Five real companies (`manufacturers`): LONGi, JinkoSolar, Trina Solar, JA Solar, Canadian Solar. All **Unverified**; Kuwait/GCC availability **not yet verified**; HQ cities where an official page stated them (Xi'an, Shanghai, Beijing, Guelph; Trina none); logos for LONGi, JinkoSolar, Canadian Solar from their homepages. `manufacturer_versions`, `manufacturer_sources` hold history and provenance. Verification of the five is prepared in `supabase/imports/2026-09-22_manufacturers_verification.sql` §3 but **not run**: one click per company on `/admin/manufacturers/[id]`. |
| Products | **11 real panels**, all from official datasheets, all Unverified, zero validation flags, one version each: LONGi Hi-MO 7 ×3 (unchanged from Session 6, with the Kuwait retailer price), JinkoSolar Tiger Neo 54HL4M-BDV 505/520, Trina Vertex S+ NEG9R.28 445/460, JA Solar DeepBlue 4.0 Pro JAM54D40 450/460, Canadian Solar TOPHiKu6 CS6.1-54TM 450/465. Official renders on every row. Reading notes C-001 to C-010 in `docs/DATA-CLEANING-LOG.md`. |
| Manufacturer system | Directory `/marketplace/manufacturers`, profile by slug, admin `/admin/manufacturers` (+ new, detail with decision panel and history, edit), marketplace filter `?manufacturer=`, links from cards, product page and Compare, AI context block, passport "Manufacturer at installation" card frozen by trigger, portal company form with contact details, Requests inbox, Product Performance and Reports from `product_events`, read API `GET /api/manufacturers[/slug[/products]]`. |
| Smart Maintenance Agent | `smart_maintenance_runs` (0009) exists, empty, RLS on; enums **UPPERCASE** (`PENDING`, `AWAITING_APPROVAL`, `MAINTENANCE_RECOMMENDED`, `NOT_REQUIRED` …) to match the Agent session's brief. Each row is one run; `id` is the run_id. The Agent is built in another session not visible here. A run needs a real `solar_systems` row; production has none yet. |
| Security | `docs/SECURITY-AUDIT-2026-09-22.md`. 0010 closed a profile self-link escalation (high), provider FOR ALL policies on cases and appointments, installer passport delete, three integrity gaps. Paid routes (AI ×7, weather, geocode) require sign-in and are rate-limited per instance (`src/lib/api/rateLimit.ts`); server actions return plain sentences (`src/lib/api/errors.ts`); CSP enforced after a report-only pass. |
| Frontend audit | `docs/AUDIT-2026-09-22.md`. Fixed: notifications route protection, security headers, passport title, error boundaries, one label map, admin label drift, footer admin link. Owner accepted: film once per tab, admin dashboard menu card removed, `ProviderNav` removed, no em dash in the site title. Provider Requests and Systems pages built (two SOON items fewer). Consent is mandatory (no "Prefer not to?"). |
| Checks | `npx tsc --noEmit`, `npx eslint src`, `npm run build` clean at the closing commit. |

## In progress when the owner asked to close: the real-catalogue brief

The owner's brief "implement REAL solar panel product data throughout"
was started and stopped at the owner's word mid-way. What exists:

- **Migration 0011 applied**: `solar_products.series`; `solar_product_sources`
  (one row per document, with version, dates, fields, RLS read-all /
  admin / manufacturer-own-insert); `solar_product_prices` (supplier
  prices apart from technical data, RLS read-all / admin / supplier-own,
  never verified by the supplier). Backfilled: series for the 11 rows,
  datasheet + product-page source rows for each, and the LONGi Kuwait
  retailer price as three price rows.
- **Types and repositories** for `ProductSourceDocument`, `ProductPrice`,
  `ProductVersion`; `listProductSources`, `listProductPrices`,
  `listProductVersions`; `Product.series` mapped. Type-checks.
- **Five official datasheets read and parsed, not yet imported** (texts in
  the session scratchpad only; re-download from these URLs):
  LONGi Hi-MO X6 Max Scientist LR7-72HTH 620/625/630M
  (`https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf`,
  15-y product / 25-y power, 89.4 % at 25 y, single glass, 28.5 kg, 144 cells);
  JinkoSolar Tiger Neo 3.0 JKM610–635N-66HL4M-(V), six bins
  (`https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf`, mono-facial, 12-y/30-y);
  JA Solar DeepBlue 4.0 Pro JAM72D42-625…650/LB, six bins
  (`https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf`, Global-EN-20241122A, 12-y/30-y, 34.6 kg);
  Trina Vertex N TSM-NEG21C.20 700–725 W, six bins
  (`https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf`, TSM_APAC_EN_2024_B, 132 cells 2384×1303×33, 38.3 kg, 12-y/30-y);
  Canadian Solar TOPBiHiKu6 CS6.2-66TB-590…620H, seven bins
  (`https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf`, US edition, 12-y/30-y, bifaciality 80 %).
  The 2025 Trina 715–740 URL returned 404; use the 2024 B sheet above.
- **Not started**: the import file for those ~28 variants (follow
  `supabase/imports/2026-09-22_manufacturer_modules.sql` and the compact
  DO-block form used to run it); marketplace filters for power, efficiency,
  technology, bifacial and verification; Compare rows for cell count,
  bifaciality, Voc/Vmp/Isc/Imp and degradation; a catalogue panel picker in
  the Savings Calculator (it has a free `panelW` field today); showing
  `solar_product_sources` and `solar_product_prices` on the product page and
  admin product page; a manufacturer filter on the admin products table.
  Designer, purchase (`items[].product_id`), passport snapshots and AI
  context already read the catalogue and need no change.

## Things Session 9 should know

- Testing without an account: `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run build`
  then `npx next start -p 3322`; run a normal `npm run build` before pushing.
  The intro now plays once per tab; "Skip intro" is top right.
- The admin's own account will see `/consent` once on the next visit.
- Datasheets without a text layer (LONGi Hi-MO 7, JA Solar) were rendered
  with PyMuPDF and read from the image; note it in the cleaning log.
- `jasolar.com` refuses automated requests; `jasolar.eu` is JA Solar's own
  European site and serves the same datasheets.
- The security tooling refused to record a verification decision on the
  owner's behalf; verification stays a click in the admin UI.

## What to do next, in priority order

1. **Finish the real-catalogue brief**: import the five parsed series
   (~28 variants), then the frontend items listed above; test the full flow
   (marketplace → compare → recommend → designer → purchase → passport).
2. **Owner: verify the five manufacturers** and, when checked, the products.
3. **Owner: Supabase Auth leaked-password protection** (dashboard toggle).
4. Rate limiting with a shared store (Upstash / Vercel KV) for a hard limit.
5. Arabic for the app area (a project); provider Reports and Settings (SOON).
6. As before: lawyer's review of legal pages, PVWatts losses, domain and
   email sender, service-role key for n8n and the Agent.
