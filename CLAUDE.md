# Solink — working conventions for Claude Code

@AGENTS.md

## Read HANDOFF.md first, before doing anything else

`HANDOFF.md` is the state of this project. Read it at the start of every session.
Session 3 describes the site as it is; Sessions 4, 5, 6, 7, 8 and 9 are additions on top
of it. **Session 2 supersedes Session 1 on anything visual.**

The current position, as of 2026-09-22 (full account: HANDOFF.md,
"Session 8 closing state" then "Session 9 closing state"):

- `main` is deployed to https://solink-nu.vercel.app by Vercel on push;
  Session 7 pushed several times on the owner's word (2026-09-21/22), see
  `git log`. Git-triggered deploys are healthy. v1 is recoverable with
  `git checkout v1-superseded`.
- **Direction "Studio"** is recorded in `design-system/solink/DIRECTION.md`;
  read it before touching anything visual.
- **The opening is the owner's own film**, the artifact `solink-intro.html`
  (2026-09-21), run verbatim from `src/components/intro/film/` on three.js r128
  vendored in `public/vendor/`. Do not redesign or modernise it; the owner's
  requested edits are marked `owner 2026-09-21` in `film.ts`. It plays once
  per browser tab since 2026-09-22 (`INTRO_FREQUENCY = "session"` in
  `introStore.ts` and `FREQUENCY` in `public/bootstrap.js`, change together;
  the owner accepted the audit's recommendation), runs about 20 s, and ends
  on the page it opened on. Replay button in the footer and on the sign-in aside.
- **Auth**: `/login` and `/signup` on the Studio palette with confirm-password
  and eye toggles, bilingual via `auth.*`. **Continue with Google** (Supabase
  OAuth, back through `/auth/callback`) sits under the primary button and is
  **live**: the provider was enabled in Supabase on 2026-09-21 (decision 20,
  Google Cloud project `Solink`, `triple-method-509315-n8`). The pages still
  read Supabase's public settings and would disable the button, with a plain
  sentence, if the provider were ever switched off. "Continue as a guest"
  under the form leads to `/`. Sign out is in the app sidebar footer
  (desktop) and top bar (phones).
- **Marketplace** runs on the real catalogue (46 real panels, Sessions 8–9) in
  `solar_products` with the manufacturers' own renders as images.
  Supabase-mode listings exclude demo rows. `/marketplace`, `/marketplace/[id]`
  and `/compare` are **public** (2026-09-23, not behind sign-in); everything
  else in the app stays gated. Import pattern and provenance:
  `supabase/imports/`, `docs/DATA-CLEANING-LOG.md`.
- **Basket and checkout gate** (2026-09-23): a per-browser basket
  (`src/lib/basket.ts`, `localStorage`, versioned key) works for guests and
  signed-in people alike, on `/basket`; the login/signup wall shows only at
  Checkout, never at add-to-basket (`CheckoutGateModal`). Checkout writes one
  `orders` row, same as the Purchase wizard's "Request a quote" — never
  before a real signed-in user id. Full account: HANDOFF.md, "Addendum,
  2026-09-23 — guest browsing, a basket, and a checkout wall."
- Supabase project `bgwvztckesuwlydwcfkj`, migrations 0001–0011 applied, both
  environments in Supabase mode, sign-up live, the owner's account is admin.
  Still needed: service-role key, SMTP sender, domain. Leaked-password
  protection needs the Pro plan (Session 9 tried the toggle; Supabase refused).
  **Never press "Harden Data API"** in Supabase: it removes `public` from the
  exposed schemas and every read in the app fails (2026-09-22 outage).
- Platform settings entered with sources on the owner's yes: tariff by MEW
  sector, CO₂ factor, peak sun hours 5.58 (GHI, Kuwait City), performance
  ratio 0.86. Never enter a platform number without the owner's yes;
  `docs/DECISIONS-NEEDED.md` records what was entered and why. TCO period
  (25 y), alert thresholds (10 %/20 %, 30-day) and end-of-life criteria were
  entered 2026-09-22 on the owner's yes.
  Degradation comes from each panel's datasheet warranty curve
  (`src/lib/solar/degradation.ts`); there is no platform default. The admin
  dashboard's decisions card checks live state (`placeholderStatus.ts`).
- Roles: homeowner (includes landlord), manufacturer, company, admin. Light
  theme default. Still placeholders: team roles/bios/photos, team description.
- **Privacy policy and terms** exist at `/privacy` and `/terms` (Session 7,
  2026-09-21): public, bilingual, drafted from how the code behaves, and
  marked on the page as an unreviewed draft. Operator, contact address and
  governing law are placeholders (`LEGAL_OPERATOR`, `LEGAL_CONTACT`,
  `GOVERNING_LAW`) filled from `LEGAL_VALUES` in `src/lib/content/legal.ts`
  on the owner's word (the Solink team, `t054206@coded.edu.kw`, Kuwait).
  Copy under `legal.*`, `privacy.*`, `terms.*`. Reviewed against the code and
  Kuwaiti law by Claude (`docs/LEGAL-NOTES.md`); a licensed lawyer's review is
  still pending. **Consent** is an explicit checkbox at sign-up recorded on
  the user (`user_metadata.consent`, versioned by `LEGAL_UPDATED`); accounts
  without it are sent to `/consent` by `proxy.ts`. Bump `LEGAL_UPDATED` when
  the documents change and everyone is asked again.
- **Roof Planner** at `/designer` (2026-09-21): panels from the catalogue plus
  walkway/planter/seating/pergola modules at typed sizes, setback and walkway
  clearances, a photo underlay with hand tracing, three deterministic
  "Get inspired" layouts, panel weight and a `ROOF_LOAD_CAPACITY` placeholder
  (decision 21). Geometry in `src/app/(app)/designer/geometry.ts`.
- **Navigation is per role** (`src/lib/navigation.ts`, `AppShell.tsx`, 2026-09-22):
  homeowner journey, provider workload, admin platform, manufacturer portal.
  Items with no page are dimmed `[SOON]`, never invented routes. No icon-only
  collapsed mode by the owner's choice.
- **Products** (Sessions 8–9): 46 real panels from official datasheets across
  the five manufacturers (two series each plus LONGi LR8-66HGD, every bin), versions and passport
  snapshots as before, plus `solar_products.series`, `solar_product_sources`
  (provenance per document) and `solar_product_prices` (supplier prices apart
  from datasheet data), migration 0011. Marketplace filters (power,
  efficiency, technology family, bifacial, verification), Compare rows for
  cells/bifaciality/Voc/Vmp/Isc/Imp/degradation, a catalogue panel picker in
  the Savings Calculator, and "Documents on record" / "Prices on record"
  cards on the product and admin product pages (Session 9). All products are
  still Unverified; verification is the owner's click.
- **Manufacturer companies** (Session 8, 2026-09-22, migration 0008 applied):
  `manufacturers` is the company record (legal name, slug, logo, HQ, website,
  type and market classification, tri-state Kuwait/GCC availability,
  verification with source and note, archive) with `manufacturer_versions`
  and `manufacturer_sources`. Five real companies exist (LONGi with its three
  Hi-MO 7 products; JinkoSolar, Trina Solar, JA Solar, Canadian Solar with
  none), **all five Verified on 2026-09-22 on the owner's instruction**
  (Kuwait/GCC availability still not verified). Directory `/marketplace/manufacturers`, profile by
  slug, admin at `/admin/manufacturers`, marketplace filter `?manufacturer=`.
  Passports freeze the manufacturer version by trigger. A manufacturer
  account cannot change its own standing (trigger). Never invent a logo, HQ
  city, availability or verification: decision 23.
- **Manufacturer portal** at `/manufacturer/*`: own products, add/edit (never
  self-verifies), datasheet links and uploads, company profile with contact
  details, Requests inbox (`manufacturer_requests`, sent from the public
  profile), Product Performance and Reports from `product_events` (0007,
  applied 2026-09-22). Orders and Settings remain honest empty states.
- **Designer is simple by default**; "Show more options" reveals the rest.
  Blocks and obstacles resize; panels never do. `InfoTip` opens on hover. The
  roof photo card sits outside "more options" since 2026-09-23: it left the
  Solar Profile and the Designer is the only page with a photo reader.
- **Solar Site Analysis runs on rules, not a model** (2026-09-22):
  `src/lib/solar/analysisEngine.ts` is pure and deterministic, the thresholds
  live in `SOLINK_ENVIRONMENT_THRESHOLDS`, and `ai_analyses.model` reads
  `solink-rule-engine`. Google Maps and WeatherAPI are required and live in
  production; Google Solar is optional; no Claude key is involved. `/workflow`
  explains the chain and imports the thresholds so it cannot drift. Never put
  a roof measurement, a production figure or a zero where a provider returned
  nothing.
- **Solar Placement Guide** at `/placement` (2026-09-23): direction and tilt
  from a browser location or a typed address (through the existing
  `/api/geocode`), worked out in `src/lib/solar/placement.ts`. Kuwait's 20-25°
  band comes from the owner's two studies and is labelled source data;
  elsewhere is a latitude rule of thumb, labelled an estimate. What it
  resolves is carried to Solar Potential in sessionStorage, never a URL.
- **The Solar Profile no longer asks for a location or a roof photo**
  (2026-09-23). Coordinates arrive from a Solar Potential run or the Placement
  Guide via `saveProfileLocation`, which writes address, lat and lng only.
- **CI runs the checks**: `.github/workflows/ci.yml` runs `npm ci`, typegen,
  `tsc --noEmit`, `eslint` and `next build` on every push to `main`, every PR
  into it, and any `ci/**` branch. When the machine has no Node, validate on a
  `ci/…` branch and fast-forward `main` only once the run is green.
- Two collaborators push to `main` (`t040262-cmyk`, `Lolwah AlAnsari`). Fetch
  before you work; coordinate before touching the intro or the import.
- Nothing is pushed or deployed without the owner's word.

## Working conventions

- Read `docs/ARCHITECTURE.md` before changing structure. `src/lib/config/placeholders.ts` is the registry of undecided values — never replace a placeholder with an invented value.
- Every user-facing metric must be a `Classified` value rendered with `DataBadge`/`Metric`. Demo data must show `DemoBanner`.
- **Homeowner screens never show an unavailable state (owner, 2026-09-24).** Never fabricate missing data. Do not expose raw unavailable/placeholder/developer states to homeowners. Hide unavailable metrics or replace them with a useful product-level visual, input, workflow, or explanation. In practice: render a `Metric` only when `hasValue()`; no "N/A" badge (`DataBadge` hides `unavailable` outside audit mode); `<Placeholder>` renders product words from `PLACEHOLDER_PRODUCT` and `<PlaceholderNote>` renders nothing, except inside `<AuditMode>` (admin, provider, manufacturer layouts), which keeps the raw tokens; `PlaceholderGuard` in the app shell rewrites any stray `[PLACEHOLDER: …]` text; AI features that cannot run show `<AiResting>`, never env-var names; a missing datasheet value reads "Not stated"; a missing price reads "Price on request from supplier". When a platform setting exists, show its real value (`src/lib/content/platformFacts.ts`). Illustrations for these states live in `src/components/illustrations/`. This supersedes the older "Unavailable stays Unavailable" rule for homeowner UI; the data model and its null checks are unchanged.
- Secrets: server-only, via `serverEnv()`; never in client components or `NEXT_PUBLIC_*`.
- Calculations live in `src/lib/solar/calculations.ts` and take all assumptions as parameters.
- AI calls go only through `src/lib/ai/claude.ts`; context comes from `src/lib/ai/context.ts`.
- Data access goes through `src/lib/data/repositories.ts` (Supabase or labeled demo).
- Do not present demo/simulated data as real. Do not add fake live features.
- Check `npx tsc --noEmit` and `npm run lint` before finishing.

## Design rules the owner has set (binding)

Never use: purple-to-blue gradients, gradient hero text, emojis in headings,
Inter as the everywhere font, coloured border cards, glassmorphism, low-contrast
dark mode, three icon boxes in a row, a badge above the headline, untouched
shadcn defaults, fade-in on scroll, cursor-following beams, buttons that fade on
hover, inconsistent spacing, em dashes throughout the copy, generic buzzword
copy, serif italic accents, or Space Grotesk with Instrument Serif.

Keep the four accessibility fixes from Session 2 regardless of visual direction:
skip links, `aria-hidden` on decorative icons, labels associated with their
controls, and `touch-action` on interactive elements.

The design system lives in `design-system/solink/MASTER.md`. The
`ui-ux-pro-max` skill cannot be reached through the `Skill` tool; run it from
`~/.claude/skills/ui-ux-pro-max/scripts/search.py` instead. See Session 2.
