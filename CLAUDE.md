# Solink — working conventions for Claude Code

@AGENTS.md

## Read HANDOFF.md first, before doing anything else

`HANDOFF.md` is the state of this project. Read it at the start of every session.
It has two parts, and **Session 2 at the end supersedes Session 1 on anything
visual.**

The current position, as of 2026-09-20:

- The rebuild is on `main` and deployed to https://solink-nu.vercel.app
  (owner's instruction "push and deploy", 2026-09-20). v1 is recoverable with
  `git checkout v1-superseded`.
- **The visual rebuild happened.** Direction "Studio" was chosen from the
  owner's reference sites and is recorded in `design-system/solink/DIRECTION.md`
  — read that file before touching anything visual. HANDOFF.md Session 3 has
  the full account.
- Built and approved by the owner: landing page with a draggable 3D panel,
  role-aware dashboard (`/dashboard?as=…`), English/Kuwaiti Arabic toggle with
  RTL, roof photo/video reader, and `/about`.
- Light theme is the default. Roles are homeowner (includes landlord),
  manufacturer, company, admin.
- Supabase is connected: project `bgwvztckesuwlydwcfkj`, migrations 0001–0005
  applied. Locally the app runs in Supabase mode when `.env.local` has the two
  public vars; production still needs them set in Vercel.
- Still placeholders: team roles/bios/photos, team description, and the
  platform settings (tariff, CO₂ factor, performance ratio) — sourced values
  exist in Session 3 but cannot take effect until the demo-mode settings path is
  built.
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
