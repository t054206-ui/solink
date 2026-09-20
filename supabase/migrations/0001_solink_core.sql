-- ============================================================================
-- Solink — core schema (Phase 1)
-- Postgres / Supabase. Apply with `supabase db push` or the Supabase MCP
-- apply_migration once a Solink project exists: [PLACEHOLDER: SUPABASE PROJECT]
--
-- Conventions
--  * All user-owned tables carry user_id → auth.users and are protected by RLS.
--  * "SpecValue" JSON: {"value": <number|string>, "unit": "W"} or
--    {"value": null, "status": "unavailable|not_applicable|pending_verification"}.
--    Missing manufacturer data is represented honestly, never zero-filled.
--  * is_demo flags mark labeled demo records (DEMO DATA — NOT REAL).
--  * product_versions snapshot specs so historical passports never change
--    when a manufacturer updates a datasheet.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- enums
-- ----------------------------------------------------------------------------
create type verification_status as enum ('unverified', 'pending_verification', 'verified');
create type product_category as enum ('solar_panel','inverter','battery','installation_package','maintenance_package','cleaning_service','other_service');
create type house_type as enum ('villa','apartment_building','townhouse','commercial','other');
create type roof_orientation as enum ('N','NE','E','SE','S','SW','W','NW','flat','unknown');
create type system_status as enum ('designed','requested','purchased','installation_scheduled','installed','decommissioned');
create type production_granularity as enum ('hour','day','month','year');
create type data_class as enum ('source','calculated','estimated','ai','demo','user','unavailable');
create type maintenance_status as enum ('new','reviewing','scheduled','in_progress','resolved','closed');
create type maintenance_kind as enum ('cleaning','inspection','minor_maintenance','repair','replacement','annual_maintenance');
create type urgency as enum ('urgent','inspection','routine');
create type incident_status as enum ('open','investigating','resolved','closed');
create type monitor_status as enum ('normal','monitor','inspection_recommended','maintenance_recommended','insufficient_data');
create type appointment_kind as enum ('installation','maintenance','inspection','cleaning');
create type appointment_status as enum ('requested','confirmed','completed','cancelled');
-- Mirrors src/lib/roles.ts. 'homeowner' includes landlords; 'company' is an installer and/or
-- maintenance business (what it may do follows provider_companies.kind, not a second role).
create type user_role as enum ('homeowner','manufacturer','company','admin');
create type provider_kind as enum ('solar_company','installer','maintenance','cleaning');
create type order_status as enum ('draft','requested','quoted','accepted','paid_demo','installation_scheduled','installed','cancelled');

-- ----------------------------------------------------------------------------
-- helper: updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ----------------------------------------------------------------------------
-- users & profiles
-- ----------------------------------------------------------------------------
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  locale text not null default 'en',
  role user_role not null default 'homeowner',   -- [PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS] — permission model not final
  provider_company_id uuid,                       -- set for 'company' staff
  manufacturer_id uuid,                           -- set for 'manufacturer' staff
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_user_profiles_updated before update on user_profiles for each row execute function set_updated_at();

-- auto-create profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (user_id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();

create table solar_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  address text,
  lat double precision,
  lng double precision,
  place_id text,
  country_code text not null default 'KW',
  governorate text,
  house_type house_type,
  roof_length_m numeric,
  roof_width_m numeric,
  roof_area_m2 numeric,
  available_roof_area_m2 numeric,
  roof_orientation roof_orientation,
  roof_tilt_deg numeric,
  shading_notes text,
  monthly_consumption_kwh numeric,
  monthly_bill numeric,
  currency text not null default 'KWD',
  budget numeric,
  roof_photo_path text,                           -- storage: roof-photos/<user_id>/...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
create trigger trg_solar_profiles_updated before update on solar_profiles for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- providers (solar companies, installers, maintenance, cleaning)
-- ----------------------------------------------------------------------------
create table provider_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind provider_kind[] not null default '{}',
  contact_email text,
  phone text,
  website text,
  service_area text,
  verification_status verification_status not null default 'unverified',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_provider_companies_updated before update on provider_companies for each row execute function set_updated_at();
alter table user_profiles add constraint user_profiles_provider_fk foreign key (provider_company_id) references provider_companies(id) on delete set null;

create table provider_prices (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_companies(id) on delete cascade,
  service maintenance_kind not null,
  price jsonb not null,                            -- SpecValue; null → [PLACEHOLDER: MAINTENANCE PRICE]
  currency text not null default 'KWD',
  notes text,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- products & real-data architecture
-- ----------------------------------------------------------------------------
create table manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  website text,
  verification_status verification_status not null default 'unverified',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);
create trigger trg_manufacturers_updated before update on manufacturers for each row execute function set_updated_at();
alter table user_profiles add constraint user_profiles_manufacturer_fk foreign key (manufacturer_id) references manufacturers(id) on delete set null;

create table data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,                              -- e.g. "Manufacturer datasheet", "CSV import 2027-01"
  kind text not null,                              -- datasheet | manufacturer_site | participating_company | external_db | licensed_api | csv | excel | manual
  url text,
  notes text,
  created_at timestamptz not null default now()
);

create table solar_products (
  id uuid primary key default gen_random_uuid(),
  category product_category not null,
  manufacturer_id uuid references manufacturers(id) on delete set null,
  provider_id uuid references provider_companies(id) on delete set null,   -- for services
  model text not null,
  name text not null,
  description text,
  price jsonb not null default '{"value":null,"status":"unavailable"}',
  currency text not null default 'KWD',
  installation_cost jsonb not null default '{"value":null,"status":"unavailable"}',
  annual_maintenance_cost jsonb not null default '{"value":null,"status":"unavailable"}',
  cleaning_cost jsonb not null default '{"value":null,"status":"unavailable"}',
  expected_annual_production_kwh jsonb not null default '{"value":null,"status":"unavailable"}',
  images text[] not null default '{}',
  specs jsonb not null default '{}',               -- PanelSpecifications (SpecValue fields)
  source jsonb not null default '{}',              -- ProductSource: data_source, urls, dates, verification_status
  current_version_id uuid,
  is_demo boolean not null default false,
  is_archived boolean not null default false,
  is_outdated boolean not null default false,
  validation_flags jsonb not null default '[]',    -- populated by validation (see 0002)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manufacturer_id, model)                  -- duplicate manufacturer/model protection
);
create trigger trg_solar_products_updated before update on solar_products for each row execute function set_updated_at();
create index solar_products_category_idx on solar_products(category) where not is_archived;

-- Immutable snapshots of a product's specs/price. Passports reference a version.
create table product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references solar_products(id) on delete cascade,
  version integer not null,
  specs jsonb not null,
  price jsonb not null,
  source jsonb not null,
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product_id, version)
);
alter table solar_products add constraint solar_products_current_version_fk foreign key (current_version_id) references product_versions(id) on delete set null;

-- Snapshot on every spec/price change (data versioning)
create or replace function snapshot_product_version() returns trigger language plpgsql as $$
declare v integer;
begin
  if (tg_op = 'INSERT') or (old.specs is distinct from new.specs) or (old.price is distinct from new.price) then
    select coalesce(max(version),0)+1 into v from product_versions where product_id = new.id;
    insert into product_versions (product_id, version, specs, price, source, change_note)
      values (new.id, v, new.specs, new.price, new.source, case when tg_op='INSERT' then 'initial' else 'spec/price change' end)
      returning id into new.current_version_id;
  end if;
  return new;
end $$;
create trigger trg_products_snapshot before insert or update on solar_products for each row execute function snapshot_product_version();

create table product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references solar_products(id) on delete cascade,
  kind text not null,                              -- datasheet | manual | warranty | certificate | image | other
  title text,
  storage_path text,                               -- storage: product-documents/<product_id>/...
  url text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table product_imports (
  id uuid primary key default gen_random_uuid(),
  method text not null,                            -- csv | excel | api | bulk | manual  → [PLACEHOLDER: SOLAR PANEL DATA IMPORT METHOD]
  data_source_id uuid references data_sources(id) on delete set null,
  file_path text,
  status text not null default 'pending',          -- pending | validating | needs_review | applied | rejected
  summary jsonb not null default '{}',             -- counts, validation flags
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create table product_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references product_imports(id) on delete cascade,
  row_number integer not null,
  raw jsonb not null,
  normalized jsonb,
  flags jsonb not null default '[]',               -- validation issues; never silently altered
  status text not null default 'pending',          -- pending | ok | flagged | duplicate | rejected | applied
  product_id uuid references solar_products(id) on delete set null
);

-- ----------------------------------------------------------------------------
-- systems, designs, passports
-- ----------------------------------------------------------------------------
create table solar_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references solar_profiles(id) on delete set null,
  name text not null default 'My design',
  roof jsonb not null,                             -- {length_m,width_m,obstacles:[...],orientation}
  panel_product_id uuid references solar_products(id) on delete set null,
  panel_version_id uuid references product_versions(id) on delete set null,
  layout jsonb not null default '[]',              -- [{x,y,rotation}] in metres
  summary jsonb not null default '{}',             -- panel_count, used_area, capacity_kwp (calculated)
  is_ai_suggested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_solar_designs_updated before update on solar_designs for each row execute function set_updated_at();

create table solar_systems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references solar_profiles(id) on delete set null,
  design_id uuid references solar_designs(id) on delete set null,
  name text not null,
  status system_status not null default 'designed',
  capacity_kwp numeric,
  panel_count integer,
  panel_product_id uuid references solar_products(id) on delete set null,
  panel_version_id uuid references product_versions(id) on delete set null,
  inverter_product_id uuid references solar_products(id) on delete set null,
  inverter_version_id uuid references product_versions(id) on delete set null,
  battery_product_id uuid references solar_products(id) on delete set null,
  installer_id uuid references provider_companies(id) on delete set null,
  installation_date date,
  commissioning_date date,
  monitoring_source text,                          -- null until [PLACEHOLDER: SOLAR MONITORING HARDWARE/API]
  monitoring_config jsonb not null default '{}',   -- vendor-specific ids (never secrets)
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_solar_systems_updated before update on solar_systems for each row execute function set_updated_at();
create index solar_systems_user_idx on solar_systems(user_id);

create table system_panels (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  panel_index integer not null,
  serial_number text,
  position jsonb,                                  -- {x,y,rotation} from design
  string_number integer,
  installed_at date,
  replaced_at date,
  replaced_by_panel_id uuid references system_panels(id) on delete set null,
  unique (system_id, panel_index)
);

create table inverters (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  product_id uuid references solar_products(id) on delete set null,
  version_id uuid references product_versions(id) on delete set null,
  serial_number text,
  installed_at date,
  replaced_at date
);

create table batteries (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  product_id uuid references solar_products(id) on delete set null,
  version_id uuid references product_versions(id) on delete set null,
  serial_number text,
  installed_at date,
  replaced_at date
);

create table solar_passports (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null unique references solar_systems(id) on delete cascade,
  passport_number text not null unique,
  installation_company text,
  installer_id uuid references provider_companies(id) on delete set null,
  installation_date date,
  panel_snapshot jsonb,                            -- frozen copy of manufacturer/model/specs/version_id
  inverter_snapshot jsonb,
  battery_snapshot jsonb,
  panel_count integer,
  capacity_kwp numeric,
  warranty jsonb not null default '{}',
  installation_notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_solar_passports_updated before update on solar_passports for each row execute function set_updated_at();

-- passport_number sequence helper
create sequence passport_seq;
create or replace function next_passport_number() returns text language sql as $$
  select 'SLK-' || to_char(now(),'YYYY') || '-' || lpad(nextval('passport_seq')::text, 6, '0');
$$;

-- ----------------------------------------------------------------------------
-- orders / purchase & installation workflow
-- ----------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  system_id uuid references solar_systems(id) on delete set null,
  status order_status not null default 'draft',
  items jsonb not null default '[]',               -- [{product_id, version_id, qty, price(SpecValue)}]
  installer_id uuid references provider_companies(id) on delete set null,
  totals jsonb not null default '{}',              -- calculated where prices exist; else unavailable
  payment_provider text,                           -- null → [PLACEHOLDER: PAYMENT PROVIDER]
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_orders_updated before update on orders for each row execute function set_updated_at();

create table appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  system_id uuid references solar_systems(id) on delete cascade,
  provider_id uuid references provider_companies(id) on delete set null,
  kind appointment_kind not null,
  scheduled_at timestamptz not null,
  status appointment_status not null default 'requested',
  notes text,
  created_at timestamptz not null default now()
);
create index appointments_provider_idx on appointments(provider_id, scheduled_at);

-- ----------------------------------------------------------------------------
-- monitoring data
-- ----------------------------------------------------------------------------
create table production_records (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  granularity production_granularity not null,
  energy_kwh numeric not null,
  source text not null,                            -- 'hardware:<vendor>' | 'manual' | 'demo'
  cls data_class not null default 'source',
  raw jsonb,
  unique (system_id, granularity, period_start)
);
create index production_records_lookup on production_records(system_id, granularity, period_start desc);

create table panel_production_records (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  panel_index integer not null,
  period_start timestamptz not null,
  energy_kwh numeric not null,
  status text not null default 'unknown',
  source text not null,                            -- [PLACEHOLDER: PANEL-LEVEL MONITORING DATA SOURCE]
  cls data_class not null default 'source',
  unique (system_id, panel_index, period_start)
);

create table weather_records (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  observed_at timestamptz not null,
  temp_c numeric, humidity_pct numeric, wind_kph numeric, cloud_pct numeric, precip_mm numeric, uv numeric,
  condition text,
  source text not null default 'weatherapi.com',
  raw jsonb
);
create index weather_records_lookup on weather_records(lat, lng, observed_at desc);

create table environmental_records (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  observed_at timestamptz not null,
  pm2_5 numeric, pm10 numeric, us_epa_index integer,
  source text not null default 'weatherapi.com',
  raw jsonb
);
create index environmental_records_lookup on environmental_records(lat, lng, observed_at desc);

-- ----------------------------------------------------------------------------
-- maintenance, cleaning, repairs, incidents
-- ----------------------------------------------------------------------------
create table maintenance_cases (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references provider_companies(id) on delete set null,
  kind maintenance_kind not null,
  status maintenance_status not null default 'new',
  urgency urgency not null default 'routine',
  detected_issue text not null,
  ai_analysis text,
  ai_analysis_cls data_class,
  appointment_at timestamptz,
  technician_name text,
  work_performed text,
  parts text,
  cost jsonb not null default '{"value":null,"status":"unavailable"}',
  before_image_path text,
  after_image_path text,
  production_before_kwh numeric,
  production_after_kwh numeric,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_maintenance_cases_updated before update on maintenance_cases for each row execute function set_updated_at();
create index maintenance_cases_provider_idx on maintenance_cases(provider_id, status);

create table cleaning_records (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  maintenance_case_id uuid references maintenance_cases(id) on delete set null,
  cleaned_at timestamptz not null,
  method text,
  cost jsonb not null default '{"value":null,"status":"unavailable"}',
  production_before_kwh numeric,
  production_after_kwh numeric,
  notes text
);

create table repair_records (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  maintenance_case_id uuid references maintenance_cases(id) on delete set null,
  repaired_at timestamptz not null,
  component text,                                  -- panel | inverter | battery | wiring | other
  panel_index integer,
  description text,
  parts text,
  cost jsonb not null default '{"value":null,"status":"unavailable"}',
  warranty_claim boolean not null default false
);

create table replacement_records (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  replaced_at timestamptz not null,
  component text not null,
  old_product_version_id uuid references product_versions(id) on delete set null,
  new_product_version_id uuid references product_versions(id) on delete set null,
  reason text,
  cost jsonb not null default '{"value":null,"status":"unavailable"}',
  notes text
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  panel_index integer,
  occurred_at timestamptz not null default now(),
  reported_problem text not null,
  ai_analysis text,
  images text[] not null default '{}',             -- storage: incident-images/<user_id>/...
  action_taken text,
  technician_name text,
  cost jsonb not null default '{"value":null,"status":"unavailable"}',
  result text,
  status incident_status not null default 'open',
  maintenance_case_id uuid references maintenance_cases(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- AI, alerts, reports, notifications
-- ----------------------------------------------------------------------------
create table ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  system_id uuid references solar_systems(id) on delete cascade,
  kind text not null,                              -- image_inspection | monitoring | recommendation | placement | report_explanation | cleaning
  input_summary jsonb not null default '{}',       -- what data the AI was given (for auditability)
  output jsonb not null,
  model text,
  image_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  system_id uuid references solar_systems(id) on delete set null,
  title text,
  messages jsonb not null default '[]',            -- [{role, content, created_at, context_used}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_ai_conversations_updated before update on ai_conversations for each row execute function set_updated_at();

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inputs jsonb not null,
  candidates jsonb not null,                       -- product ids + versions considered
  output jsonb not null,                           -- AI trade-off explanation
  model text,
  created_at timestamptz not null default now()
);

create table ai_alerts (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status monitor_status not null,
  title text not null,
  message text not null,
  evidence jsonb not null default '[]',
  cls data_class not null default 'ai',
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references solar_systems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,                             -- YYYY-MM
  energy jsonb not null default '{}',
  financial jsonb not null default '{}',
  maintenance jsonb not null default '{}',
  environmental jsonb not null default '{}',
  ai jsonb not null default '{}',
  pdf_path text,
  is_demo boolean not null default false,
  generated_at timestamptz not null default now(),
  unique (system_id, month)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  delivery text not null default 'in_app_only',    -- [PLACEHOLDER: EMAIL / NOTIFICATION PROVIDER]
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, read, created_at desc);

-- ----------------------------------------------------------------------------
-- platform settings (admin-editable placeholders; NULL = not provided)
-- ----------------------------------------------------------------------------
create table platform_settings (
  key text primary key,
  value jsonb,                                     -- null means "not provided" → placeholder shown in UI
  description text,
  source text,                                     -- where the value came from (required when set)
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into platform_settings (key, value, description) values
 ('electricity_tariff_per_kwh', null, '[PLACEHOLDER: ELECTRICITY TARIFF] — currency per kWh with source'),
 ('peak_sun_hours_per_day', null, '[PLACEHOLDER: SOLAR RESOURCE DATA SOURCE] — site solar resource'),
 ('performance_ratio', null, '[PLACEHOLDER: SYSTEM PERFORMANCE RATIO / LOSS FACTOR]'),
 ('grid_co2_kg_per_kwh', null, '[PLACEHOLDER: GRID CO2 EMISSION FACTOR]'),
 ('expected_panel_degradation_rate', null, '[PLACEHOLDER: EXPECTED PANEL DEGRADATION RATE]'),
 ('tco_period_years', null, '[PLACEHOLDER: TCO PERIOD]'),
 ('production_alert_thresholds', null, '[PLACEHOLDER: PRODUCTION ALERT THRESHOLDS]'),
 ('end_of_life_criteria', null, '[PLACEHOLDER: END-OF-LIFE CRITERIA]'),
 ('payment_provider', null, '[PLACEHOLDER: PAYMENT PROVIDER]'),
 ('notification_provider', null, '[PLACEHOLDER: EMAIL / NOTIFICATION PROVIDER]');

-- ----------------------------------------------------------------------------
-- nearby comparison (anonymized aggregates only) — [PLACEHOLDER: ANONYMIZED NEARBY SYSTEM DATA]
-- ----------------------------------------------------------------------------
create table area_aggregates (
  id uuid primary key default gen_random_uuid(),
  area_code text not null,                         -- coarse cell/governorate; never a precise location
  period_start date not null,
  granularity production_granularity not null,
  system_count integer not null,
  specific_yield_kwh_per_kwp numeric,
  source text not null default 'aggregate',
  unique (area_code, granularity, period_start)
);
