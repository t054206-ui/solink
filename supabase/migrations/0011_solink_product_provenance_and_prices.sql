-- ============================================================================
-- Solink — product provenance and supplier prices (2026-09-22, Session 8)
--
-- The catalogue already lives in `solar_products` (specs as labelled
-- SpecValues, `source` for where they came from), with `product_versions`
-- freezing every spec/price change and `solar_passports.panel_snapshot`
-- freezing what was installed. This migration adds the two things the
-- owner's real-data brief asks for that the schema could not hold as rows:
--
--   1. `series` on the product: the manufacturer's product family
--      (Hi-MO 7, Tiger Neo, Vertex S+ …), separate from the exact model.
--   2. `solar_product_sources`: one row per document a product's facts came
--      from (datasheet, product page, retailer listing), with version, date
--      and retrieval time. Backfilled from the existing `source` JSON.
--   3. `solar_product_prices`: commercial data kept apart from technical data.
--      The same panel can carry several supplier prices; nothing here is
--      ever estimated. Backfilled from the LONGi rows' Kuwait retailer price.
--
-- Additive only. No product row is deleted; the three LONGi Hi-MO 7 rows and
-- their versions are untouched. Historical snapshots are unaffected.
-- ============================================================================

alter table solar_products add column if not exists series text;

-- 2. Provenance per document ---------------------------------------------------
create table if not exists solar_product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references solar_products(id) on delete cascade,
  source_type text not null check (source_type in ('official_manufacturer_datasheet', 'official_manufacturer_product_page', 'official_manufacturer_website', 'retailer_listing', 'other_verified_source')),
  source_url text,
  document_name text not null,
  document_version text,                      -- as printed on the document, e.g. "Preliminary V05 (20230901)"
  source_date date,                           -- the date the document carries, when it carries one
  retrieved_at date not null default current_date,
  /** Which specification keys this document supports; empty = the record as a whole. */
  fields text[] not null default '{}',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists solar_product_sources_product_idx on solar_product_sources (product_id);
alter table solar_product_sources enable row level security;
create policy "product sources read" on solar_product_sources for select using (true);
create policy "product sources admin" on solar_product_sources for all using (private.is_admin()) with check (private.is_admin());
create policy "product sources manufacturer own" on solar_product_sources for insert with check (
  exists (select 1 from solar_products p where p.id = product_id and p.manufacturer_id = private.my_manufacturer_id()) and created_by = auth.uid()
);

-- 3. Supplier prices -----------------------------------------------------------
create table if not exists solar_product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references solar_products(id) on delete cascade,
  supplier_id uuid references provider_companies(id) on delete set null,
  supplier_name text not null,
  price_kwd numeric not null check (price_kwd > 0),
  currency text not null default 'KWD',
  availability text check (availability in ('listed_by_retailer', 'in_stock', 'on_request', 'unavailable')),
  source_url text,
  observed_at date not null,
  verification_status verification_status not null default 'unverified',
  notes text,
  is_demo boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, supplier_name, observed_at)
);
create trigger trg_solar_product_prices_updated before update on solar_product_prices for each row execute function set_updated_at();
create index if not exists solar_product_prices_product_idx on solar_product_prices (product_id, observed_at desc);
alter table solar_product_prices enable row level security;
create policy "product prices read" on solar_product_prices for select using (true);
create policy "product prices admin" on solar_product_prices for all using (private.is_admin()) with check (private.is_admin());
-- A supplier company records and maintains its own prices; it cannot mark them verified.
create policy "product prices supplier own" on solar_product_prices for all
  using (supplier_id is not null and supplier_id = private.my_provider_id())
  with check (supplier_id = private.my_provider_id() and verification_status <> 'verified');

-- Backfill: series for the rows that exist, one datasheet + one product-page
-- source per real product from its `source` JSON, and the LONGi Kuwait price.
update solar_products set series = case
  when model like 'LR7-72HGD%' then 'Hi-MO 7'
  when model like 'JKM%54HL4M-BDV' then 'Tiger Neo'
  when model like 'TSM-%NEG9R.28' then 'Vertex S+'
  when model like 'JAM54D40%' then 'DeepBlue 4.0 Pro'
  when model like 'CS6.1-54TM%' then 'TOPHiKu6'
  else series end
where series is null and not is_demo;

insert into solar_product_sources (product_id, source_type, source_url, document_name, document_version, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_datasheet', p.source->>'datasheet_url',
  coalesce(p.source->>'manufacturer_source_note', 'Manufacturer datasheet'),
  null, coalesce((p.source->>'date_added')::date, current_date),
  coalesce((select array_agg(k) from jsonb_object_keys(coalesce(p.source->'field_sources','{}'::jsonb)) k), '{}'),
  'Backfilled by 0011 from solar_products.source.'
from solar_products p
where not p.is_demo and p.source->>'datasheet_url' is not null
  and not exists (select 1 from solar_product_sources s where s.product_id = p.id and s.source_type = 'official_manufacturer_datasheet');

insert into solar_product_sources (product_id, source_type, source_url, document_name, retrieved_at, notes)
select p.id, 'official_manufacturer_product_page', coalesce(p.source->>'manufacturer_url', p.source->>'manufacturer_doc_url'),
  'Manufacturer product page', coalesce((p.source->>'date_added')::date, current_date), 'Backfilled by 0011 from solar_products.source.'
from solar_products p
where not p.is_demo and coalesce(p.source->>'manufacturer_url', p.source->>'manufacturer_doc_url') is not null
  and not exists (select 1 from solar_product_sources s where s.product_id = p.id and s.source_type = 'official_manufacturer_product_page');

insert into solar_product_prices (product_id, supplier_id, supplier_name, price_kwd, currency, availability, source_url, observed_at, verification_status, notes)
select p.id, p.provider_id, p.source->>'kuwait_supplier', (p.source->>'kuwait_price_kwd')::numeric, 'KWD',
  nullif(p.source->>'kuwait_availability', ''), p.source->>'kuwait_supplier_url', (p.source->>'kuwait_price_observed_at')::date,
  'unverified', 'Backfilled by 0011 from solar_products.source.kuwait_*; the 2026-09-20 import recorded it.'
from solar_products p
where not p.is_demo and p.source->>'kuwait_price_kwd' is not null and p.source->>'kuwait_supplier' is not null
on conflict (product_id, supplier_name, observed_at) do nothing;
