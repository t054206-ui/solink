# Solink — agreed visual direction (2026-09-19)

Supersedes every visual decision in `MASTER.md`. The banned list at the end of
`MASTER.md` still applies in full.

Chosen by the owner after three rejected designs. Extracted from three reference
sites they sent as screen recordings, all from motionsites.com.

## The references and what was taken from each

| Ref | Site | Decision taken |
| --- | --- | --- |
| A | HALION, quantum AI wearable | One photoreal object, lit from behind, alone on an empty backdrop. Micro-labels on leader lines pointing at parts of it. Numbered sections that advance on scroll. |
| B | "Intelligence designed to evolve" | Light page. Floating pill nav. Centred hero. Stat row pinned along the bottom edge. Display face with real personality. |
| C | "Flawless clean for your car" | Near-white studio. Hero object with four stats parked in the corners around it. A saturated full-bleed section that slides up over the hero carrying big-type content. |

**The through-line, and the actual brief: one real object in an empty room with
numbers hung off it.** No card grids. All three rejected designs were card grids.

## Palette — "Studio"

| Token | Hex | Where it goes |
| --- | --- | --- |
| `--bg` | `#F4F3EF` | Page. Bone, not pure white. |
| `--surface` | `#FFFFFF` | Raised surfaces only. |
| `--ink` | `#0E1116` | All body and heading text. |
| `--panel` | `#1A3A63` | Primary UI colour. It is the panel's own glass blue. |
| `--sun` | `#F0A02A` | **Energy and production figures only.** Never a background, never a button fill, never decoration. |
| `--hairline` | `#D8D6CF` | Rules, table borders, dividers. |

The panel object is the only dark mass on the page. Colour comes from the
product, not from the chrome.

## Typography

- Display: **Archivo**, tight tracking, for headlines and section numbers.
- Body and Arabic: **IBM Plex Sans Arabic**.
- Micro-labels and every figure: **JetBrains Mono**, uppercase, wide tracking,
  tabular figures.

No Inter as the everywhere font. No Space Grotesk with Instrument Serif. No
serif italic accents.

## The 3D panel

- Built in code as geometry (three.js / react-three-fiber). No model file.
- **Draggable.** The user grabs and rotates it.
- **Tilt does NOT yet feed a production figure.** Corrected after reading the
  code: `src/lib/solar/calculations.ts` has no tilt or azimuth parameter, and
  `annualProductionKwh` needs `peakSunHoursPerDay` and `performanceRatio`, both
  of which are placeholders. In demo mode it returns `unavailable`. So the hero
  panel rotates and reports its **angle**, which is geometry the user set and is
  therefore honest `user`-classified data. A kWh figure appears next to it only
  once a solar resource source and a performance ratio exist, and only then via
  a tilt-aware model whose constants come with a citation.
- Micro-labels on leader lines: glass, cells, frame, junction box.
- The three spec labels (rated power, efficiency, area) hang off the stage
  the module sits in and are shown only while it is closed and at rest
  (Session 5, 2026-09-20). During the take-apart the parts are 800 mm apart
  and the group is 18 % smaller, so a label pointing at the cells would point
  at air; they appear when the sequence closes or the moment a drag cancels
  it, and go away again on replay. Desktop only, like the drag.
- Loaded only on routes that use it. Static render for `prefers-reduced-motion`.
- **It comes apart** (2026-09-20, the owner's second brief for the hero). The
  module arrives, settles, separates into glass, cells, backsheet, frame and
  junction box one part at a time with one short sentence each, then closes
  again and returns to the sway. Ten and a half seconds, once, and dragging it
  cancels it. A button replays it.
- The five sentences are the whole text. The object is the explanation and the
  caption is a caption.
- Phones run the sequence too, at a lower dpr and half the shadow map, but
  cannot drag: a hero-sized canvas with `touch-action: none` is a page nobody
  can scroll. `prefers-reduced-motion` gets the still panel and the same five
  sentences as a list.
- The exploded stack is 820 mm deep. A real laminate is 10 mm. It is a diagram,
  and the line under the object says so.

## Motion — cinematic, both marketing and product

- Scroll-driven section takeovers: sections slide over the previous one.
- Panel rotates on scroll where it is not being dragged.
- Figures count up once on arrival.
- Magnetic buttons.
- Not fade-in-on-scroll. That is on the banned list and is not what the
  references do.
- Every effect respects `prefers-reduced-motion`.

## Roles — confirmed by the owner

| Role | Notes |
| --- | --- |
| `homeowner` | **Landlord is the same role.** The owner's words: "the landlord is the same as homeowner, I just used another word." |
| `manufacturer` | Publishes panels so homeowners can pick one for their roof space and sun direction, and watches the tracking state of what they published. |
| `company` | One account. Whether it sees the installation area depends on the services it offers, not on a second role. `ProviderCompany.kind` already carries installer / maintenance / cleaning, so nothing new was added to the data model. |
| `admin` | Verification and platform settings. |

In demo mode the role rides in the query string (`/dashboard?as=…`) so every
dashboard stays a server component, and the last choice is remembered per
browser. When Supabase lands, `user_profiles.role` takes over and the switcher
goes away.

## Bilingual — English and Kuwaiti Arabic

One button in the nav, showing the language you would switch to. Locale lives in
`solink:locale`; `lang` and `dir` are applied before paint by `public/bootstrap.js`.
The whole layout mirrors, because the CSS uses logical properties throughout.

The Arabic is **light Kuwaiti**, at the owner's choice: everyday phrasing, not
Modern Standard Arabic and not heavily colloquial. `منين جاي` rather than
`من أين أتى`. It is drafted by Claude and **has not been reviewed by a Kuwaiti
speaker** — the owner corrects what reads oddly. All of it is in one file,
`src/lib/i18n/dictionary.ts`.

## Data

Demo data for now, at the owner's instruction: "use fake data for the solar
panels, but make it a demo mode". That is what the existing demo dataset already
does — fictional manufacturers, `is_demo: true`, a DEMO badge on every figure —
so nothing about the honesty system had to bend to allow it.

The owner is sending a **supplier list**: company names, panel models, wattages,
prices. `REAL_SOLAR_PANEL_DATA_SOURCE` in `src/lib/config/placeholders.ts` stays
a placeholder until that list is in hand. No real company name appears next to an
invented figure.

## Carried over from Session 2, not up for redesign

- The four accessibility fixes: skip links, `aria-hidden` on decorative icons,
  labels wired to their controls, `touch-action`.
- The copy rules: no em dashes in prose, demo markers keep theirs, page titles
  do not repeat the brand.
- The data classification system: `Classified` values, `DataBadge`, `Metric`,
  `DemoBanner`, `Placeholder`.

## Two ways to describe a roof

The homeowner can type every field, or photograph the roof and confirm what
Solink reads off it. Both are always available; neither is the "advanced" path.

`/api/ai/inspect-roof` takes stills, or frames a browser pulled out of a video,
and returns suggestions with per-item confidence. `RoofCapture.tsx` shows each
one with a "Use this" button — nothing reaches the form until the homeowner
accepts it, at which point it stops being an AI interpretation and becomes their
own answer.

**A photograph cannot measure, and the endpoint is built around that.** No area,
no dimensions, no true compass bearing: there is no scale in a phone photo, and a
vision model asked for a roof size will return a confident wrong number. The
system prompt refuses, and anything it could not determine comes back as an
explicit `cannot_determine` list rather than as silence. Area still comes from
the homeowner or from the Solar API. What the photo does supply is what aerial
data misses: water tanks, AC condensers, stairwells, parapets, neighbouring
buildings and palms — and therefore how much of the roof is actually usable.

Video frames are extracted **in the browser** with a canvas, and only the frames
upload. A roof clip off a phone is tens of megabytes, ffmpeg is not in the
serverless runtime, and nobody should upload a whole video to get five pictures
out of it.

Nothing is stored. Frames go to Claude and are discarded, which is also why this
works before Supabase exists.

## About page — /about

Built to the owner's brief of 2026-09-20. Eleven sections in the order given,
bilingual through the same dictionary, and integrated into the nav and footer.

Every statement on it is one of three things: a fact already recorded in the
project (README, HANDOFF, glossary), the intended architecture as the owner
described it, or a visible placeholder. Team and team description are `[PLACEHOLDER: …]` / `[TEAM MEMBER …]` and
render in the same dashed style the product uses for undecided values. Vision
and mission are the owner's own words (2026-09-20). The team is four people,
confirmed by the owner; their details are still placeholders. The owner
declined a founding story, so the page has none. The
team lives in `src/lib/content/team.ts`; three placeholder slots show the layout
only and say nothing about head-count — the grid adapts to one, two, three or
more.

Three places the page departs from the brief, each on purpose:

- **Headings are sentence case** ("A smarter way to go solar"), because every
  heading on the site is, and the brief asked the page to follow the existing
  typography over its own suggestions.
- **No fade-in-on-scroll.** The brief listed it as an example; the owner's
  binding banned list forbids it. The page uses the landing page's vocabulary
  instead — clip wipe on load, sticky takeover from Problem to Solution, press
  on hover.
- **The `<title>` is "About"**, not "About Solink | …". The root template
  appends " · Solink" and the copy rules say a page title must not repeat the
  brand.

The Vision section names Kuwait Vision 2035 (New Kuwait). The pillar wording —
sustainable diversified economy, less dependence on oil, sustainable living
environment — is taken from the Ministry of Foreign Affairs page and the UN
ESCWA planning portal. No percentages or targets are quoted, and the copy says
"aligned with, not part of": Solink is an independent project.

The Problem section is `sticky`; everything after it sits inside one
`relative z-10 bg-bg` wrapper. Without that wrapper any later section without
its own background let the Problem show through — found in review, fixed.

## Theme

**Light is the default**, regardless of the operating system setting. Solink is a
daylight product and the owner asked for light colours, so a first-time visitor
on a dark-mode laptop still gets the bone-white studio. Dark is still there,
behind the toggle, and it is a real theme rather than a dimmed one — body text
sits above 13:1.

## Method

Landing page and dashboard only. Show them. Get a yes before the other
fifty-six pages. Nothing is pushed or deployed without the owner seeing it first.
