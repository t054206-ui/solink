-- ============================================================================
-- Solink — Manufacturer portal (written 2026-09-22; APPLIED 2026-09-22 on the
-- owner's instruction "do everything yourself", after 0008)
--
-- Written for the owner's yes. Everything the manufacturer portal does today
-- runs on 0001–0006: own-product writes ("products manufacturer own"),
-- company name/country/website ("manufacturers self update"), datasheet
-- links ("documents manufacturer own"). This migration adds what the owner's
-- brief asks for that the schema cannot hold yet. All changes are additive
-- and nullable; nothing existing is rewritten.
-- ============================================================================

-- 1. Company profile fields. Superseded 2026-09-22: migration 0008 (applied)
--    added logo_url and description together with the full company record.
--    Kept here, guarded, for contact details and categories.
alter table manufacturers
  add column if not exists logo_url text,
  add column if not exists description text,
  add column if not exists contact_email text,
  add column if not exists phone text,
  add column if not exists categories text[] not null default '{}';

-- 2. Manufacturers may upload files for their own products into the
--    product-documents bucket, under <product_id>/… of a product they own.
--    Reading stays open (existing "product docs read"); admins keep full rights.
--    Applied by 0008 §8 on 2026-09-22; guarded so this file still runs.
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
-- No delete policy on purpose: a replaced datasheet is a new row in
-- product_documents; the old file stays so a Solar Passport issued against it
-- can still cite it.

-- 3. Requests addressed to a manufacturer (product, availability, business,
--    distributor, partnership). Homeowners and companies create them; the
--    manufacturer reads and answers its own; admins see all.
create type manufacturer_request_kind as enum ('product_inquiry', 'availability', 'business', 'purchase', 'distributor', 'partnership');
create type manufacturer_request_status as enum ('new', 'reviewing', 'responded', 'in_progress', 'completed', 'closed');

create table manufacturer_requests (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers(id) on delete cascade,
  product_id uuid references solar_products(id) on delete set null,
  requester_id uuid not null references auth.users(id) on delete cascade,
  kind manufacturer_request_kind not null,
  status manufacturer_request_status not null default 'new',
  message text not null,
  -- What the manufacturer may see about the requester: a display name and a
  -- governorate, never the address, email or phone (the privacy rule the
  -- provider screens already follow).
  requester_display_name text,
  requester_governorate text,
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_manufacturer_requests_updated before update on manufacturer_requests for each row execute function set_updated_at();
alter table manufacturer_requests enable row level security;
create policy "mfr requests requester" on manufacturer_requests for select using (requester_id = auth.uid());
create policy "mfr requests create" on manufacturer_requests for insert with check (requester_id = auth.uid());
create policy "mfr requests manufacturer" on manufacturer_requests for select using (manufacturer_id = private.my_manufacturer_id());
create policy "mfr requests manufacturer answer" on manufacturer_requests for update using (manufacturer_id = private.my_manufacturer_id()) with check (manufacturer_id = private.my_manufacturer_id());
create policy "mfr requests admin" on manufacturer_requests for all using (private.is_admin()) with check (private.is_admin());

-- 4. Product activity, so "Product Performance" can show views and
--    comparisons without inventing them. Written by the app when a signed-in
--    person opens or compares a product; the manufacturer reads counts only.
create table product_events (
  id bigint generated always as identity primary key,
  product_id uuid not null references solar_products(id) on delete cascade,
  kind text not null check (kind in ('view', 'compare', 'design_use', 'purchase_request')),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on product_events (product_id, kind, created_at);
alter table product_events enable row level security;
create policy "product events insert" on product_events for insert with check (auth.uid() is not null);
create policy "product events manufacturer read" on product_events for select using (
  exists (select 1 from solar_products p where p.id = product_id and p.manufacturer_id = private.my_manufacturer_id())
);
create policy "product events admin" on product_events for all using (private.is_admin()) with check (private.is_admin());
