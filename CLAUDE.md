# Solink — working conventions for Claude Code

@AGENTS.md

## Read HANDOFF.md first, before doing anything else

`HANDOFF.md` is the state of this project. Read it at the start of every session.
Session 3 describes the site as it is; Sessions 4, 5 and 6 are additions on top
of it. **Session 2 supersedes Session 1 on anything visual.**

The current position, as of 2026-09-20:

- The rebuild is on `main` and deployed to https://solink-nu.vercel.app
  (owner's instruction "push and deploy", 2026-09-20). v1 is recoverable with
  `git checkout v1-superseded`.
- **The visual rebuild happened.** Direction "Studio" was chosen from the
  owner's reference sites and is recorded in `design-system/solink/DIRECTION.md`
  — read that file before touching anything visual. HANDOFF.md Session 3 has
  the full account.
- **The opening is the owner's own film**, the artifact `solink-intro.html`
  they sent on 2026-09-21, run verbatim from `src/components/intro/film/`
  (`film.ts`, `film.css`) on three.js r128 vendored in `public/vendor/`. Do
  not redesign or hand-edit it; regenerate from a new file if one arrives. It
  lands a signed-out visitor on `/signup` and **plays on every page load**;
  `INTRO_FREQUENCY` in `introStore.ts` and `FREQUENCY` in `public/bootstrap.js`
  switch that, together. Since 2026-09-21 evening it runs 14.9 s and ends on
  the homepage, not sign-up; the two material and timing edits the owner asked
  for are marked `owner 2026-09-21` inside `film.ts`.
  `src/components/intro/*`, curtain attribute in `public/bootstrap.js`,
  mounted in the root layout. Replay in the footer and on the sign-in aside.
- **Auth** (Session 6): `/login` and `/signup` redesigned on the Studio palette;
  sign-up has full name, email, password, confirm password; both password
  fields have the eye toggle (`PasswordInput`). Bilingual via `auth.*` keys.
- Built and approved by the owner: landing page with a draggable 3D panel,
  role-aware dashboard (`/dashboard?as=…`), English/Kuwaiti Arabic toggle with
  RTL, roof photo/video reader, and `/about`.
- Light theme is the default. Roles are homeowner (includes landlord),
  manufacturer, company, admin.
- Supabase is connected: project `bgwvztckesuwlydwcfkj`, migrations 0001–0006
  applied. Both local and production run in Supabase mode (public vars set on Vercel via
  the logged-in CLI). Sign-up is live and Supabase Auth URLs are configured; the owner's account is
  admin; still needed: service-role key, an SMTP sender, and a domain.
- Platform settings entered with sources (all on the owner's yes): tariff by
  MEW sector, CO₂ factor, peak sun hours (5.58, GHI, Kuwait City), performance
  ratio (0.86). Still null: degradation rate, TCO period, alert thresholds,
  end-of-life criteria. Never enter a platform number without the owner's yes;
  the record of what was entered and why is in `docs/DECISIONS-NEEDED.md`.
- The profile carries an MEW tariff sector (`solar_profiles.tariff_category`,
  migration 0006, applied). The tariff setting accepts per-sector rates in
  `by_category`; `src/lib/solar/tariff.ts` decides which applies and says so
  in words when none does. Still placeholders: team roles/bios/photos, team
  description.
- Nothing is pushed or deployed without the owner's word. Session 5 pushed and
  deployed on "push and deploy" (2026-09-20 evening). **Production serves
  Session 5's `627bfa1` via a CLI deploy; `main` itself does not build** until
  the intro sequence another session is adding gets its three `intro.*`
  dictionary keys. See HANDOFF Session 5, "What to do next" item 2.
- `git checkout v1-superseded` still recovers v1.

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
