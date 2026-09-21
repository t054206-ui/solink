# Solink — Decisions needed from the project owner

Solink is built so that none of these block the platform; each is a labeled placeholder
until decided. Nothing has been assumed silently. Decisions 19 and 20 were added 2026-09-21 (Session 7).

| # | Decision | Placeholder | Where it lands once decided |
|---|---|---|---|
| 1 | ~~**Supabase project**~~ **Done 2026-09-20.** Project `solink` (`bgwvztckesuwlydwcfkj`, ap-south-1) in `t054206-ui's Org`; `gahwa-house` was paused by the owner to free the slot. Migrations 0001–0005 applied. Still needed from the owner: `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel (admin/import actions), and the two public vars in Vercel. | — | done |
| 2 | ~~**Electricity tariff**~~ **Residential entered 2026-09-20**: 0.002 KWD/kWh, MEW Electrical Energy Statistical Yearbook 2020, p. 113, "Tariff Of Electricity In All Sectors Of Consumption". **All six sectors entered 2026-09-20 on the owner's yes** (`by_category`), so landlords of apartment buildings are priced at 5 fils, not 2. Since 2026-09-20 the profile carries a tariff sector (`solar_profiles.tariff_category`, migration 0006) and the setting accepts per-sector rates (`by_category`), so this is one admin entry, no code. The table, verbatim (fils/kWh): Governmental 25 · Residential 2 · Investmental & Commercial 5 · Industrial & Agriculture 5 · Productive Industrial & Agriculture (related facilities) 3 · Others 12. Ready SQL is in §"Proposed entries" below. | — | `platform_settings.electricity_tariff_per_kwh` → `by_category` |
| 3 | ~~**Solar resource data source**~~ **Done 2026-09-20 (platform-wide value; per-site data via Google Solar remains open).** Entered on the owner's yes: Global Solar Atlas (World Bank / ESMAP, Solargis model, data to 2025, read 2026-09-20) for Kuwait City 29.3759 N, 47.9774 E gives GHI **2037.5 kWh/m²/year = 5.58 kWh/m²/day** on a horizontal plane, GTI at the optimum 27° tilt 2238.4 kWh/m²/year = 6.13/day, and PVOUT 1717 kWh/kWp/year. See §"Proposed entries". | `[PLACEHOLDER: SOLAR RESOURCE DATA SOURCE]`, `[PLACEHOLDER: GOOGLE SOLAR / SOLAR SITE DATA SOURCE]` | `GOOGLE_SOLAR_API_KEY` or platform setting `peak_sun_hours_per_day` |
| 4 | ~~**Performance ratio / loss factor**~~ **Done 2026-09-20.** Entered on the owner's yes: NREL PVWatts default system losses 14 % → **0.86**, citing A. P. Dobos, *PVWatts Version 5 Manual*, NREL/TP-6A20-62641 (2014), §System Losses (soiling 2, shading 3, snow 0, mismatch 2, wiring 2, connections 0.5, LID 1.5, nameplate 1, age 0, availability 3; combined 14.08 %). Kuwait's soiling is heavier than 2 %; tighten later with KISR measurements. Cross-check: Global Solar Atlas's own simulation for Kuwait City implies PVOUT ÷ GTI = 0.77. See §"Proposed entries". | `[PLACEHOLDER: SYSTEM PERFORMANCE RATIO / LOSS FACTOR]` | platform setting `performance_ratio` |
| 5 | ~~**Grid CO₂ emission factor**~~ **Done 2026-09-20.** 0.635 kgCO₂e/kWh lifecycle, Ember (2026) via Our World in Data, Kuwait 2025. | — | done |
| 6 | **Real solar-panel data source** and **import method** | `[PLACEHOLDER: REAL SOLAR PANEL DATA SOURCE]`, `[PLACEHOLDER: SOLAR PANEL DATA IMPORT METHOD]` | Admin → Product Imports (CSV mapping UI exists; Excel/API pending) |
| 7 | **Payment provider** | `[PLACEHOLDER: PAYMENT PROVIDER]` | `src/app/(app)/purchase` step 3 + `orders.payment_provider` |
| 8 | **Email / notification provider** | `[PLACEHOLDER: EMAIL / NOTIFICATION PROVIDER]` | `notifications.delivery`; a server job to deliver |
| 9 | **Solar monitoring hardware / inverter API** (which vendors) | `[PLACEHOLDER: SOLAR MONITORING HARDWARE/API]` | ingestion job → `production_records`; `solar_systems.monitoring_source` |
| 10 | **Panel-level monitoring provider** | `[PLACEHOLDER: PANEL-LEVEL MONITORING DATA SOURCE]` | `panel_production_records` |
| 11 | **Production alert thresholds** | `[PLACEHOLDER: PRODUCTION ALERT THRESHOLDS]` | platform setting `production_alert_thresholds` |
| 12 | **Expected degradation rate** (from manufacturer warranty or real source) | `[PLACEHOLDER: EXPECTED PANEL DEGRADATION RATE]` | platform setting / per product spec |
| 13 | **TCO period** (years) | `[PLACEHOLDER: TCO PERIOD]` | platform setting `tco_period_years` |
| 14 | **End-of-life criteria** | `[PLACEHOLDER: END-OF-LIFE CRITERIA]` | platform setting `end_of_life_criteria` |
| 15 | **Admin permission structure** (roles, who can verify products) | `[PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS]` | `user_profiles.role`, RLS `is_admin()` |
| 16 | **Maintenance / installation prices** — entered by providers or platform | `[PLACEHOLDER: MAINTENANCE PRICE]`, `[PLACEHOLDER: INSTALLATION PRICE]` | `provider_prices`, product cost fields |
| 17 | **Nearby-system comparison** data-sharing & privacy design | `[PLACEHOLDER: ANONYMIZED NEARBY SYSTEM DATA]` | `area_aggregates` |
| 18 | ~~**GitHub remote**~~ **Done.** https://github.com/t054206-ui/solink, `main` deploys to Vercel. | — | done |
| 19 | **Legal operator, contact address and governing law** for the privacy policy and terms. `/privacy` and `/terms` were drafted 2026-09-21 from how the code actually behaves (what sign-up asks, what the schema stores, what each role can read under RLS, which services are called and with what). **Not yet reviewed by a lawyer.** Both pages carry a draft notice until these three values are supplied and the review is done; the sign-up form links to both. | `[PLACEHOLDER: LEGAL OPERATOR / ENTITY]`, `[PLACEHOLDER: PRIVACY / LEGAL CONTACT]`, `[PLACEHOLDER: GOVERNING LAW]` | `src/lib/config/placeholders.ts` (`LEGAL_OPERATOR`, `LEGAL_CONTACT`, `GOVERNING_LAW`); the copy in `dictionary.ts` reads them through `{operator}`, `{contact}`, `{law}` and needs no edit |
| 20 | ~~**Google sign-in provider**~~ **Done 2026-09-21, with the owner at the keyboard.** Google Cloud project `Solink` (id `triple-method-509315-n8`, organisation joincoded.com, owner's account), OAuth consent screen "Solink" (External, published to production, non-sensitive scopes only so no verification), web OAuth client "Solink web (Supabase Auth)" with redirect URI `https://bgwvztckesuwlydwcfkj.supabase.co/auth/v1/callback`. Branding: home page, `/privacy`, `/terms`, authorised domain `solink-nu.vercel.app`. Supabase → Authentication → Providers → Google enabled with the client ID; the owner pasted the client secret themselves. Redirect allow-list gained `http://localhost:3311/**`. `GET /auth/v1/settings` now returns `external.google: true`. Still to do when a real domain arrives: add it to Google's authorised domains and Supabase's redirect list. | — | Supabase Auth settings; Google Cloud project `Solink` |

## Entries made on the owner's yes (2026-09-20, Session 5)

Three platform values were sourced from primary or near-primary documents,
proposed, and **entered after the owner said yes**. The statements below are
the ones that ran, kept as the record of exactly what was written and why.

### Peak sun hours (decision 3)

Two honest options, because `calculations.ts` has no tilt model yet (Session 3
next-step 6):

- **GHI, 5.58 h/day** — irradiation on a horizontal plane. Right for the flat
  roofs most Kuwaiti houses have and for the demo profile (tilt 0°). Understates
  a tilted array by about 10 %.
- **GTI at optimum tilt, 6.13 h/day** — irradiation on a 27°-tilted,
  south-facing plane. Overstates a flat roof by the same 10 %.

Recommendation: GHI, and say so in the source, until tilt reaches the model.

```sql
update platform_settings set
  value = '{"value": 5.58, "unit": "kWh/m2/day", "plane": "horizontal (GHI)", "annual_kwh_m2": 2037.5, "gti_opta_kwh_m2": 2238.4, "opta_deg": 27, "pvout_kwh_kwp": 1717.1, "location": "Kuwait City 29.3759N 47.9774E"}'::jsonb,
  source = 'Global Solar Atlas 2.0 (World Bank Group / ESMAP, Solargis solar model, long-term average to 2025, data v2.2.68 updated 2026-04-01), point 29.3759 N 47.9774 E (Kuwait City): GHI 2037.5 kWh/m2/year = 5.58 kWh/m2/day. Horizontal plane; a 27-degree south-facing plane receives 2238.4 kWh/m2/year (6.13/day). https://globalsolaratlas.info/detail?c=29.3759,47.9774 (read 2026-09-20). CC BY 4.0.',
  updated_at = now()
where key = 'peak_sun_hours_per_day';
```

The raw response is saved in Session 5's notes in `HANDOFF.md` (monthly GHI
too, for a later month-by-month view).

### Performance ratio (decision 4)

```sql
update platform_settings set
  value = '{"value": 0.86, "unit": "fraction", "basis": "1 - 0.14 default system losses"}'::jsonb,
  source = 'A. P. Dobos, PVWatts Version 5 Manual, NREL/TP-6A20-62641, National Renewable Energy Laboratory, 2014, section "System Losses": default total losses 14 % (soiling 2, shading 3, snow 0, mismatch 2, wiring 2, connections 0.5, light-induced degradation 1.5, nameplate rating 1, age 0, availability 3; combined multiplicatively 14.08 %). Generic default, not a Kuwait measurement: soiling in Kuwait is heavier. https://www.nrel.gov/docs/fy14osti/62641.pdf (DOI 10.2172/1158421).',
  updated_at = now()
where key = 'performance_ratio';
```

Session 5 could not open nrel.gov from its network, before or after the yes;
the loss table above was confirmed against pvlib's `pvwatts_losses`
documentation, which reproduces the manual's defaults and cites it. **Still
worth one read of the manual's §System Losses from a network that reaches
nrel.gov**, to close the loop on the primary source.

### Tariff by sector (decision 2)

Same table the Residential rate came from. Adds the other five rows so a profile
that says "apartment building" gets 5 fils, not 2. Keeps the existing value and
source; only appends `by_category`.

```sql
update platform_settings set
  value = value || '{"by_category": {"residential": 0.002, "investment_commercial": 0.005, "industrial_agricultural": 0.005, "productive_industrial_agricultural": 0.003, "governmental": 0.025, "other": 0.012}}'::jsonb,
  source = source || ' Full table, fils/kWh: Governmental 25, Residential 2, Investmental & Commercial 5, Industrial & Agriculture 5, Productive Industrial & Agriculture (related facilities) 3, Others 12 (re-read 2026-09-20 with positioned text extraction, p. 113).',
  updated_at = now()
where key = 'electricity_tariff_per_kwh';
```

## Not yet verified

The SQL in `supabase/migrations/` was applied to the live project on 2026-09-20;
0001–0003 ran first time without edits beyond the role-enum change, and 0004 adds
the hardening the Supabase security advisor asked for, and 0005 fixes the product
snapshot trigger the first insert exposed. 0006 (tariff sector on the profile,
additive and nullable) was applied on 2026-09-20.

Everything above is a decision only you can make. The application itself runs
today in demo mode, and each decision swaps a placeholder for a real value
without any rebuild.
