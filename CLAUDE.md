# Solink — working conventions for Claude Code

@AGENTS.md

## Read HANDOFF.md first, before doing anything else

`HANDOFF.md` is the state of this project. Read it at the start of every session.
Session 3 describes the site as it is; Sessions 4, 5 and 6 are additions on top
of it. **Session 2 supersedes Session 1 on anything visual.**

The current position, as of 2026-09-21 evening (full account: HANDOFF.md,
"Session 6 closing state"):

- `main` at `552357e` is deployed to https://solink-nu.vercel.app by Vercel on
  push. Git-triggered deploys are healthy. v1 is recoverable with
  `git checkout v1-superseded`.
- **Direction "Studio"** is recorded in `design-system/solink/DIRECTION.md`;
  read it before touching anything visual.
- **The opening is the owner's own film**, the artifact `solink-intro.html`
  (2026-09-21), run verbatim from `src/components/intro/film/` on three.js r128
  vendored in `public/vendor/`. Do not redesign or modernise it; the owner's
  requested edits are marked `owner 2026-09-21` in `film.ts`. It plays on every
  page load (`INTRO_FREQUENCY` in `introStore.ts` and `FREQUENCY` in
  `public/bootstrap.js`, change together), runs about 20 s, and ends on the
  page it opened on. Replay button in the footer and on the sign-in aside.
- **Auth**: `/login` and `/signup` on the Studio palette with confirm-password
  and eye toggles, bilingual via `auth.*`. Sign out is in the app sidebar
  footer (desktop) and top bar (phones).
- **Marketplace** runs on the real catalogue: three LONGi Hi-MO 7 modules in
  `solar_products` with the manufacturer's renders as images. Supabase-mode
  listings exclude demo rows. Behind sign-in. Import pattern and provenance:
  `supabase/imports/`, `docs/DATA-CLEANING-LOG.md`.
- Supabase project `bgwvztckesuwlydwcfkj`, migrations 0001–0006 applied, both
  environments in Supabase mode, sign-up live, the owner's account is admin.
  Still needed: service-role key, SMTP sender, domain.
- Platform settings entered with sources on the owner's yes: tariff by MEW
  sector, CO₂ factor, peak sun hours 5.58 (GHI, Kuwait City), performance
  ratio 0.86. Never enter a platform number without the owner's yes;
  `docs/DECISIONS-NEEDED.md` records what was entered and why.
- Roles: homeowner (includes landlord), manufacturer, company, admin. Light
  theme default. Still placeholders: team roles/bios/photos, team description,
  privacy policy and terms.
- Two collaborators push to `main` (`t040262-cmyk`, `Lolwah AlAnsari`). Fetch
  before you work; coordinate before touching the intro or the import.
- Nothing is pushed or deployed without the owner's word.

## Working conventions

- Read `docs/ARCHITECTURE.md` before changing structure. `src/lib/config/placeholders.ts` is the registry of undecided values — never replace a placeholder with an invented value.
- Every user-facing metric must be a `Classified` value rendered with `DataBadge`/`Metric`. Demo data must show `DemoBanner`.
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
