# Solink — working conventions for Claude Code

@AGENTS.md

## Read HANDOFF.md first, before doing anything else

`HANDOFF.md` is the state of this project. Read it at the start of every session.
It has two parts, and **Session 2 at the end supersedes Session 1 on anything
visual.**

The current position, as of 2026-09-19:

- The site is live at https://solink-nu.vercel.app and works. It is v1.
- **Three visual designs have been rejected by the owner.** They are each
  described in Session 2 so you do not rebuild one by accident.
- The owner has asked for a **ground-up rebuild of the interface** and is sending
  reference websites.
- **Do not design anything until those references arrive.** When they do, build
  the landing page and the dashboard only, show them, and get a yes before
  touching the other fifty-six pages. Building everything before checking is the
  mistake that wasted three iterations.
- `git checkout v1-superseded` recovers the current version at any time.

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
