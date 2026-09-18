# Solink

**The complete solar-energy ecosystem for Kuwait and the GCC.**
Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize

Solink connects homeowners, solar products, solar companies, installers, maintenance providers, system data and one central AI Solar Agent into a single connected platform.

## Principles
1. **Nothing is invented.** No tariffs, prices, irradiance, production, statistics or products are made up. Undecided items are explicit `[PLACEHOLDER: …]` values (see `docs/DECISIONS-NEEDED.md`).
2. **Every number is labeled** — Source data · Calculated · Estimate · AI interpretation · User-provided · DEMO DATA — NOT REAL · Unavailable.
3. **No fake live features.** Without monitoring hardware the dashboard says so.
4. **Built for real data later.** Real panel datasets, hardware, payment and notifications connect without rebuilding.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill what you have; leave the rest empty
npm run dev
```
Without Supabase the app runs in clearly labeled **demo mode**.

## Deploying

The repository is connected to a Vercel project, so a push to `main` deploys to
production and any other branch gets a preview build.

| | |
|---|---|
| Repository | `t054206-ui/solink` (private) |
| Vercel project | `solink`, team `t054206-3843` |
| Production URL | https://solink-nu.vercel.app |
| Production branch | `main` |

With no environment variables set, the deployed site runs in demo mode: labeled
demo data, no accounts, and every integration showing its placeholder. See
`docs/ENVIRONMENT.md` to connect real services.

**Commit author email matters.** Vercel blocks a deployment when the commit
author email is not a real address on the GitHub account, which a default
`user@machine.local` git identity will trigger. Set it once per clone:

```bash
git config user.email "the-email-on-your-github-account"
```

## Docs
- `HANDOFF.md` — read this first when picking the project up in a new session
- `docs/ARCHITECTURE.md` — layers, honesty system, real-data architecture, future hooks
- `docs/ENVIRONMENT.md` — every environment variable and what happens when it is missing
- `docs/DATA-MODEL.md` — schema overview (`supabase/migrations` is authoritative)
- `docs/DECISIONS-NEEDED.md` — decisions the project owner still needs to make
- `/guide` in the app — the homeowner User Guide

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase · Claude API · WeatherAPI.com · Google Maps Platform · Vercel
