-- 0006 — Electricity tariff category on the solar profile.
--
-- MEW (Kuwait) prices electricity by the sector the property belongs to, not
-- by who lives in it: Electrical Energy Statistical Yearbook 2020, ch. 4,
-- p. 113, "Tariff Of Electricity In All Sectors Of Consumption". A private
-- house is Residential; an apartment building is Investmental & Commercial.
-- The six sectors in that table are the enum below. No rate is stored here:
-- rates live in platform_settings.electricity_tariff_per_kwh, entered by an
-- admin with the source attached.
--
-- Nullable on purpose. A profile without a category keeps today's behaviour
-- (the platform's default, Residential, rate); a profile in another category
-- gets that category's rate, or "unavailable" until an admin enters one.

create type tariff_category as enum (
  'residential',
  'investment_commercial',
  'industrial_agricultural',
  'productive_industrial_agricultural',
  'governmental',
  'other'
);

alter table solar_profiles
  add column tariff_category tariff_category;

comment on column solar_profiles.tariff_category is
  'MEW consumption sector the property is billed under (yearbook 2020 p.113). Null = not stated; the platform default (Residential) rate applies.';
