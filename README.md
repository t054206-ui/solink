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

## Docs
- `docs/ARCHITECTURE.md` — layers, honesty system, real-data architecture, future hooks
- `docs/ENVIRONMENT.md` — every environment variable and what happens when it is missing
- `docs/DATA-MODEL.md` — schema overview (`supabase/migrations` is authoritative)
- `docs/DECISIONS-NEEDED.md` — decisions the project owner still needs to make
- `/guide` in the app — the homeowner User Guide

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase · Claude API · WeatherAPI.com · Google Maps Platform · Vercel
