# Solink — Decisions needed from the project owner

Solink is built so that none of these block the platform; each is a labeled placeholder
until decided. Nothing has been assumed silently. Decisions 19 to 22 were added in Session 7 (2026-09-21/22); decision 23 in Session 8 (2026-09-22).

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
| 11 | ~~**Production alert thresholds**~~ **Entered 2026-09-22 on the owner's yes**: warn at 10 % below expected, alert at 20 %, on a rolling 30-day total against the expected curve. A policy choice, to be tuned once real production data exists. | — | `platform_settings.production_alert_thresholds` |
| 12 | **Expected degradation rate.** **Partly resolved 2026-09-22**: where the panel is known, Solink now uses the manufacturer's performance-warranty curve from the datasheet (`src/lib/solar/degradation.ts`; the LONGi Hi-MO 7 rows carry 1 % in year one, then 0.4 %/year, 87.4 % guaranteed at year 30), labelled source, on the Long-term Performance page from the passport snapshot. Still open: a platform-wide default for panels whose datasheet states nothing. Recommendation: none; leave unavailable rather than assume. | `[PLACEHOLDER: EXPECTED PANEL DEGRADATION RATE]` | per product spec (`specs.additional.annual_degradation_year_2_30_pct`); platform setting only if the owner wants a default |
| 13 | ~~**TCO period**~~ **Entered 2026-09-22 on the owner's yes**: 25 years, the conventional residential PV analysis life, within the panels' 30-year performance warranty. | — | `platform_settings.tco_period_years` |
| 14 | ~~**End-of-life criteria**~~ **Entered 2026-09-22 on the owner's yes**: any one of output below 80 % of nameplate over a full calendar year; a safety defect on inspection (glass breakage, backsheet cracking or burn marks, junction-box damage, hot spots); a repair quoted above 50 % of replacement; product warranty expired plus a fault. The installer confirms every flag. | — | `platform_settings.end_of_life_criteria` |
| 15 | **Admin permission structure** (roles, who can verify products) | `[PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS]` | `user_profiles.role`, RLS `is_admin()` |
| 16 | **Maintenance / installation prices** — entered by providers or platform | `[PLACEHOLDER: MAINTENANCE PRICE]`, `[PLACEHOLDER: INSTALLATION PRICE]` | `provider_prices`, product cost fields |
| 17 | **Nearby-system comparison** data-sharing & privacy design | `[PLACEHOLDER: ANONYMIZED NEARBY SYSTEM DATA]` | `area_aggregates` |
| 18 | ~~**GitHub remote**~~ **Done.** https://github.com/t054206-ui/solink, `main` deploys to Vercel. | — | done |
| 19 | ~~**Legal operator, contact address and governing law**~~ **Set by the owner 2026-09-21**: the Solink team (Maria Alshammari, Noura Alsubaiei, Zahraa Almumen, Lolwah Alansari; unincorporated), `t054206@coded.edu.kw`, the laws and courts of Kuwait. Values in `src/lib/content/legal.ts` (`LEGAL_VALUES`); a null there brings the placeholder back. Documents reviewed clause by clause against the code and against Law 20/2014 and CITRA's regulation (`docs/LEGAL-NOTES.md`); explicit consent checkbox at sign-up with a versioned record on the user; `/consent` for accounts without one. **Still to do: a licensed Kuwaiti lawyer's review; naming a registered entity once one exists.** | — | done |
| 20 | ~~**Google sign-in provider**~~ **Done 2026-09-21, with the owner at the keyboard.** Google Cloud project `Solink` (id `triple-method-509315-n8`, organisation joincoded.com, owner's account), OAuth consent screen "Solink" (External, published to production, non-sensitive scopes only so no verification), web OAuth client "Solink web (Supabase Auth)" with redirect URI `https://bgwvztckesuwlydwcfkj.supabase.co/auth/v1/callback`. Branding: home page, `/privacy`, `/terms`, authorised domain `solink-nu.vercel.app`. Supabase → Authentication → Providers → Google enabled with the client ID; the owner pasted the client secret themselves. Redirect allow-list gained `http://localhost:3311/**`. `GET /auth/v1/settings` now returns `external.google: true`. Still to do when a real domain arrives: add it to Google's authorised domains and Supabase's redirect list. | — | Supabase Auth settings; Google Cloud project `Solink` |
| 21 | **Roof structural load capacity**, per roof. The Roof Planner (`/designer`, 2026-09-21) shows the panels' total weight and load per m² from the manufacturer's weight spec, and beside them the permissible load of the roof as a placeholder, because that figure belongs to one building: it comes from its structural drawings or a structural engineer (kN/m² or kg/m²). Once a source exists, add a nullable `roof_load_capacity_kg_m2` plus a source note to `solar_profiles` (additive migration), read it in the planner, and compare. Never a platform default. | `[PLACEHOLDER: ROOF STRUCTURAL LOAD CAPACITY]` | `solar_profiles` (new column), `src/lib/config/placeholders.ts` (`ROOF_LOAD_CAPACITY`) |
| 22 | **Apply migration 0007 (manufacturer portal extras)?** **Partly superseded 2026-09-22 (Session 8)**: the owner's manufacturer-company brief led to migration 0008, applied, which took over the profile columns (logo, description) and the storage policy for manufacturer uploads. Still proposed in 0007 and not applied: `contact_email`, `phone`, `categories`; the `manufacturer_requests` table with RLS; `product_events` for views/comparisons. Until applied, Requests, Performance and Reports in the portal show honest empty states. Additive and nullable; review the policies, then say yes. | — | `supabase/migrations/0007_solink_manufacturer_portal.sql` |
| 23 | **Manufacturer verification and Kuwait availability.** Five real manufacturer companies exist since 2026-09-22 (LONGi, JinkoSolar, Trina Solar, JA Solar, Canadian Solar), all **Unverified**, Kuwait and GCC availability **not yet verified**, headquarters city recorded only where the official About page stated it (JinkoSolar, Canadian Solar). Each needs an administrator's decision on `/admin/manufacturers/[id]` with a source and a note. Claude does not verify companies. Later that day eight modules (two per new company) were imported from official datasheets, all Unverified and without a Kuwait price; they wait in the product verification queue like the LONGi rows. | — | `manufacturers.verification_*`, `kuwait_available`, `gcc_available`, `availability_note`; sources in `manufacturer_sources` |

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

## Entries made on the owner's yes (2026-09-22, Session 7)

Three platform values are policy choices rather than facts, so no source could
settle them. Claude proposed the values below with the reasoning; **the owner
said yes to all three on 2026-09-22 and the SQL ran as written**, kept here as
the record of exactly what was entered and why.

### TCO analysis period (decision 13)

**Proposal: 25 years.** Reasoning: the conventional analysis life for a
residential PV system; inside the 30-year performance warranty of every panel
in the catalogue (LONGi Hi-MO 7), so the degradation curve is warranted for the
whole horizon; long enough to show payback and most of the lifetime saving,
short enough that tariff and technology assumptions are not absurd. The
alternative is 30 years (the warranty length itself), which flatters lifetime
savings by five more years of aged output. Either is defensible; 25 is the
cautious one.

```sql
update platform_settings set
  value = '{"value": 25, "unit": "years"}'::jsonb,
  source = 'Owner decision 2026-09-22 on Claude''s proposal: 25 years, the conventional residential PV analysis life, within the 30-year performance warranty of the catalogue''s panels. A policy choice, not a measurement.',
  updated_at = now()
where key = 'tco_period_years';
```

### Production alert thresholds (decision 11)

**Proposal: warn at 10 % below expected, alert at 20 % below, measured on a
rolling 30-day total against the expected curve.** Reasoning: month-to-month
production normally varies by several percent from weather and dust, so a
daily or 5 % trigger would cry wolf; a 10 % shortfall over a month is the
point where cleaning or a string fault becomes the likely cause, and 20 % is a
shortfall no amount of weather explains. The 30-day window is the shortest
that smooths weekend dust storms. These numbers are conventional O&M practice,
not a standard; the page will keep saying "may need cleaning", never "is
faulty".

```sql
update platform_settings set
  value = '{"warn_pct": 10, "alert_pct": 20, "window_days": 30, "basis": "rolling 30-day production vs expected curve"}'::jsonb,
  source = 'Owner decision 2026-09-22 on Claude''s proposal. Conventional O&M practice; a policy choice, to be tuned once real production data exists.',
  updated_at = now()
where key = 'production_alert_thresholds';
```

### End-of-life criteria (decision 14)

**Proposal: equipment is flagged end-of-life when any one holds:** (a) output
below 80 % of nameplate over a full year, the level below the classic 25-year
warranty floor and below LONGi's 87.4 % 30-year guarantee, so it means the
panel has failed its warranty or outlived it; (b) a safety defect found on
inspection: glass breakage, backsheet cracking or burn marks, junction-box
damage, hot spots; (c) a repair quoted at more than half the cost of a
replacement; (d) the product warranty has expired and a fault has occurred.
Solink would show the flag with the criterion that triggered it and the
records behind it, and a licensed installer confirms.

```sql
update platform_settings set
  value = '{"min_output_pct_of_nameplate": 80, "output_window": "full calendar year", "safety_defects": ["glass breakage", "backsheet cracking or burn marks", "junction box damage", "hot spots on inspection"], "repair_cost_over_replacement_pct": 50, "warranty_expired_and_fault": true, "rule": "any one criterion"}'::jsonb,
  source = 'Owner decision 2026-09-22 on Claude''s proposal. 80 % is the classic warranty floor; the rest is inspection practice. A policy choice; the installer confirms every flag.',
  updated_at = now()
where key = 'end_of_life_criteria';
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
