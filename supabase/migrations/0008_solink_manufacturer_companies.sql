-- ============================================================================
-- Solink — Manufacturer companies (2026-09-22, Session 8, owner's brief)
--
-- The `manufacturers` table from 0001 already holds the relationship every
-- solar product has (solar_products.manufacturer_id, FK, unique per model) and
-- the three LONGi Hi-MO 7 rows already point at their LONGi row. This
-- migration turns that row into a proper company record and adds what the
-- brief asks for, without touching a single product row:
--
--   1. Two more verification states for the admin workflow.
--   2. Company fields: legal name, slug, logo, cover, description, HQ,
--      type, market classification, Kuwait/GCC availability (tri-state),
--      verification source/date/note, archive flag.
--   3. `manufacturer_versions`: an immutable copy of the company record on
--      every meaningful change, so a Solar Passport can freeze the
--      manufacturer as it stood at installation.
--   4. `manufacturer_sources`: source tracking per claim.
--   5. Passport triggers: the panel snapshot is enriched with the
--      manufacturer version at issue time, and equipment snapshots can never
--      be rewritten afterwards.
--   6. A guard so a manufacturer account cannot change its own verification,
--      availability, classification or archive state.
--   7. Version triggers become SECURITY DEFINER: they insert into *_versions
--      tables whose RLS only lets admins write, so a manufacturer saving its
--      own product or profile would otherwise be refused by the trigger.
--   8. The storage policy from 0007 §2 (manufacturers upload under their own
--      products), guarded so 0007 stays applyable.
--
-- Everything is additive and nullable. No row is deleted. `country` is
-- renamed to `headquarters_country` (same data), which is the one rename.
-- ============================================================================

-- 1. Verification workflow states -------------------------------------------
alter type verification_status add value if not exists 'needs_changes';
alter type verification_status add value if not exists 'rejected';

-- 2. Company fields ----------------------------------------------------------
alter table manufacturers rename column country to headquarters_country;

alter table manufacturers
  add column if not exists legal_name text,
  add column if not exists slug text,
  add column if not exists logo_url text,
  add column if not exists cover_image_url text,
  add column if not exists description text,
  add column if not exists headquarters_city text,
  add column if not exists manufacturer_type text,                  -- e.g. 'Solar Panel Manufacturer' (platform classification)
  add column if not exists market_regions text[] not null default '{}', -- platform classification, e.g. {Kuwait,GCC}; not a presence claim
  add column if not exists kuwait_available boolean,                -- null = not yet verified by Solink
  add column if not exists gcc_available boolean,                   -- null = not yet verified by Solink
  add column if not exists availability_note text,
  add column if not exists verification_source text,
  add column if not exists verification_source_url text,
  add column if not exists verification_date date,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verification_note text,
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists current_version_id uuid;

create or replace function slugify(input text) returns text language sql immutable set search_path = public as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

update manufacturers set slug = slugify(name) where slug is null or slug = '';
alter table manufacturers alter column slug set not null;
create unique index if not exists manufacturers_slug_key on manufacturers (slug);
create index if not exists manufacturers_active_name_idx on manufacturers (name) where not is_archived;
create index if not exists solar_products_manufacturer_idx on solar_products (manufacturer_id) where not is_archived;

create or replace function manufacturer_defaults() returns trigger language plpgsql set search_path = public as $$
begin
  if new.slug is null or new.slug = '' then new.slug := slugify(new.name); end if;
  if new.is_archived and new.archived_at is null then new.archived_at := now(); end if;
  if not new.is_archived then new.archived_at := null; end if;
  return new;
end $$;
drop trigger if exists trg_manufacturers_defaults on manufacturers;
create trigger trg_manufacturers_defaults before insert or update on manufacturers for each row execute function manufacturer_defaults();

-- 3. Immutable company versions ----------------------------------------------
create table if not exists manufacturer_versions (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,                         -- the company row as it stood
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (manufacturer_id, version)
);
alter table manufacturers drop constraint if exists manufacturers_current_version_fk;
alter table manufacturers add constraint manufacturers_current_version_fk foreign key (current_version_id) references manufacturer_versions(id) on delete set null;

-- SECURITY DEFINER on purpose (see header §7): the row is written by the
-- function's owner, so the caller's RLS on manufacturer_versions does not
-- apply. The function writes only the row it was handed.
create or replace function snapshot_manufacturer_version() returns trigger language plpgsql security definer set search_path = public as $$
declare v integer; vid uuid; snap jsonb; who uuid;
begin
  snap := to_jsonb(new) - 'current_version_id' - 'updated_at';
  -- Only record an author that exists; a stale token must not block the save.
  select id into who from auth.users where id = auth.uid();
  select coalesce(max(version), 0) + 1 into v from manufacturer_versions where manufacturer_id = new.id;
  insert into manufacturer_versions (manufacturer_id, version, snapshot, change_note, created_by)
    values (new.id, v, snap, case when tg_op = 'INSERT' then 'initial' else 'company record change' end, who)
    returning id into vid;
  update manufacturers set current_version_id = vid where id = new.id;
  return null;
end $$;
drop trigger if exists trg_manufacturers_snapshot on manufacturers;
create trigger trg_manufacturers_snapshot after insert or update of
  name, legal_name, slug, logo_url, description, headquarters_country, headquarters_city, website,
  manufacturer_type, market_regions, kuwait_available, gcc_available, availability_note,
  verification_status, verification_source, verification_source_url, verification_date, verification_note,
  is_archived, is_demo
  on manufacturers for each row execute function snapshot_manufacturer_version();

-- Backfill one version per existing manufacturer so every row has history.
do $$
declare m record; vid uuid;
begin
  for m in select * from manufacturers where current_version_id is null loop
    insert into manufacturer_versions (manufacturer_id, version, snapshot, change_note)
      values (m.id, 1, to_jsonb(m) - 'current_version_id' - 'updated_at', 'initial (backfilled by 0008)')
      returning id into vid;
    update manufacturers set current_version_id = vid where id = m.id;
  end loop;
end $$;

-- Same fix for product versions: the trigger from 0005 ran as the caller, and
-- product_versions only lets admins write, so a manufacturer saving its own
-- product would have been refused at the version insert.
create or replace function snapshot_product_version() returns trigger language plpgsql security definer set search_path = public as $$
declare v integer; vid uuid;
begin
  if (tg_op = 'INSERT') or (old.specs is distinct from new.specs) or (old.price is distinct from new.price) then
    select coalesce(max(version),0)+1 into v from product_versions where product_id = new.id;
    insert into product_versions (product_id, version, specs, price, source, change_note)
      values (new.id, v, new.specs, new.price, new.source, case when tg_op='INSERT' then 'initial' else 'spec/price change' end)
      returning id into vid;
    update solar_products set current_version_id = vid where id = new.id;
  end if;
  return null;
end $$;

-- 4. Source tracking per claim -----------------------------------------------
create table if not exists manufacturer_sources (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers(id) on delete cascade,
  field text,                                      -- which claim this supports: website | legal_name | headquarters | kuwait_availability | gcc_availability | company (null = the company as a whole)
  source_name text not null,
  source_url text,
  source_type text not null check (source_type in ('official_manufacturer_website', 'official_manufacturer_datasheet', 'official_manufacturer_documentation', 'other_verified_source')),
  date_checked date,
  verification_status verification_status not null default 'unverified',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists manufacturer_sources_manufacturer_idx on manufacturer_sources (manufacturer_id);

-- 5. Solar Passport: freeze the manufacturer, and never rewrite a snapshot ----
-- At issue time the panel snapshot gains the manufacturer id, the manufacturer
-- version in force and a copy of the identifying fields. Future edits to the
-- company change `manufacturers`; they never reach this JSON.
create or replace function enrich_passport_manufacturer() returns trigger language plpgsql security definer set search_path = public as $$
declare mid uuid; m record;
begin
  if new.panel_snapshot is null or new.panel_snapshot ? 'manufacturer_version_id' then return new; end if;
  select p.manufacturer_id into mid
    from solar_systems s join solar_products p on p.id = s.panel_product_id
    where s.id = new.system_id;
  if mid is null and new.panel_snapshot ? 'manufacturer_id' then mid := (new.panel_snapshot->>'manufacturer_id')::uuid; end if;
  if mid is null then return new; end if;
  select * into m from manufacturers where id = mid;
  if not found then return new; end if;
  new.panel_snapshot := new.panel_snapshot || jsonb_build_object(
    'manufacturer_id', m.id,
    'manufacturer_version_id', m.current_version_id,
    'manufacturer_snapshot', jsonb_build_object(
      'name', m.name, 'legal_name', m.legal_name, 'slug', m.slug,
      'headquarters_country', m.headquarters_country, 'website', m.website,
      'verification_status', m.verification_status),
    'snapshot_at', now());
  if new.panel_snapshot->>'manufacturer' is null then new.panel_snapshot := new.panel_snapshot || jsonb_build_object('manufacturer', m.name); end if;
  return new;
end $$;
drop trigger if exists trg_passports_enrich_manufacturer on solar_passports;
create trigger trg_passports_enrich_manufacturer before insert or update of panel_snapshot on solar_passports for each row execute function enrich_passport_manufacturer();

create or replace function protect_passport_snapshots() returns trigger language plpgsql set search_path = public as $$
begin
  if old.panel_snapshot is not null and new.panel_snapshot is distinct from old.panel_snapshot then
    raise exception 'Solar Passport panel snapshot is immutable once issued (passport %)', old.passport_number using errcode = 'check_violation';
  end if;
  if old.inverter_snapshot is not null and new.inverter_snapshot is distinct from old.inverter_snapshot then
    raise exception 'Solar Passport inverter snapshot is immutable once issued (passport %)', old.passport_number using errcode = 'check_violation';
  end if;
  if old.battery_snapshot is not null and new.battery_snapshot is distinct from old.battery_snapshot then
    raise exception 'Solar Passport battery snapshot is immutable once issued (passport %)', old.passport_number using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists trg_passports_protect_snapshots on solar_passports;
-- Named to sort before the enrich trigger (Postgres fires same-event triggers alphabetically).
create trigger trg_passports_a_protect_snapshots before update on solar_passports for each row execute function protect_passport_snapshots();

-- 6. A manufacturer account edits its profile, never its standing -------------
-- auth.uid() is null for the service role and for SQL run from the dashboard,
-- which are the platform's own hands; a signed-in non-admin is what this stops.
create or replace function guard_manufacturer_admin_fields() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or private.is_admin() then return new; end if;
  -- The version trigger's own write of current_version_id arrives nested
  -- (depth 2); a client statement arrives at depth 1.
  if pg_trigger_depth() > 1 then return new; end if;
  if new.verification_status is distinct from old.verification_status
     or new.verification_source is distinct from old.verification_source
     or new.verification_source_url is distinct from old.verification_source_url
     or new.verification_date is distinct from old.verification_date
     or new.verified_by is distinct from old.verified_by
     or new.verification_note is distinct from old.verification_note
     or new.kuwait_available is distinct from old.kuwait_available
     or new.gcc_available is distinct from old.gcc_available
     or new.availability_note is distinct from old.availability_note
     or new.manufacturer_type is distinct from old.manufacturer_type
     or new.market_regions is distinct from old.market_regions
     or new.is_archived is distinct from old.is_archived
     or new.is_demo is distinct from old.is_demo
     or new.slug is distinct from old.slug
     or new.current_version_id is distinct from old.current_version_id then
    raise exception 'Only a Solink administrator can change a manufacturer''s verification, availability, classification or archive state' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
drop trigger if exists trg_manufacturers_guard on manufacturers;
create trigger trg_manufacturers_guard before update on manufacturers for each row execute function guard_manufacturer_admin_fields();

-- 7. Row level security for the new tables -----------------------------------
alter table manufacturer_versions enable row level security;
alter table manufacturer_sources enable row level security;

create policy "manufacturer versions read" on manufacturer_versions for select using (true);
create policy "manufacturer versions admin" on manufacturer_versions for all using (private.is_admin()) with check (private.is_admin());

create policy "manufacturer sources read" on manufacturer_sources for select using (true);
create policy "manufacturer sources admin" on manufacturer_sources for all using (private.is_admin()) with check (private.is_admin());
-- A manufacturer may add a source for its own company; it arrives unverified
-- and cannot be edited or removed by the manufacturer afterwards.
create policy "manufacturer sources own insert" on manufacturer_sources for insert
  with check (manufacturer_id = private.my_manufacturer_id() and verification_status = 'unverified' and created_by = auth.uid());

-- 8. Manufacturers may upload files under their own products (0007 §2) -------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'product docs manufacturer write') then
    create policy "product docs manufacturer write" on storage.objects for insert with check (
      bucket_id = 'product-documents' and exists (
        select 1 from public.solar_products p
        where p.id::text = (storage.foldername(name))[1] and p.manufacturer_id = private.my_manufacturer_id()
      )
    );
  end if;
end $$;

-- 9. Trigger functions are never legitimately called by a client. The three
--    SECURITY DEFINER ones above would otherwise be reachable at
--    /rest/v1/rpc/<name> (Supabase advisor, 2026-09-22); Postgres does not
--    check EXECUTE when firing a trigger, so this closes the route cleanly.
revoke execute on function public.snapshot_manufacturer_version() from public, anon, authenticated;
revoke execute on function public.snapshot_product_version() from public, anon, authenticated;
revoke execute on function public.enrich_passport_manufacturer() from public, anon, authenticated;
revoke execute on function public.protect_passport_snapshots() from public, anon, authenticated;
revoke execute on function public.guard_manufacturer_admin_fields() from public, anon, authenticated;
revoke execute on function public.manufacturer_defaults() from public, anon, authenticated;
