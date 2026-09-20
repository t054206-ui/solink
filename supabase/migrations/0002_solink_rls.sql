-- ============================================================================
-- Solink — Row Level Security
-- Users see only their own data. Companies see cases assigned to them; manufacturers
-- manage their own catalogue rows.
-- Admin access uses user_profiles.role = 'admin' — the permission model is not
-- final: [PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS]
-- ============================================================================

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function my_provider_id() returns uuid language sql stable security definer set search_path = public as $$
  select provider_company_id from user_profiles where user_id = auth.uid();
$$;

create or replace function my_manufacturer_id() returns uuid language sql stable security definer set search_path = public as $$
  select manufacturer_id from user_profiles where user_id = auth.uid();
$$;

create or replace function owns_system(sid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from solar_systems where id = sid and user_id = auth.uid());
$$;

-- The caller's current role, read without re-entering user_profiles' own
-- policies. Used to stop a user from granting themselves a different role.
create or replace function my_role() returns user_role language sql stable security definer set search_path = public as $$
  select role from user_profiles where user_id = auth.uid();
$$;

-- enable
alter table user_profiles enable row level security;
alter table solar_profiles enable row level security;
alter table provider_companies enable row level security;
alter table provider_prices enable row level security;
alter table manufacturers enable row level security;
alter table data_sources enable row level security;
alter table solar_products enable row level security;
alter table product_versions enable row level security;
alter table product_documents enable row level security;
alter table product_imports enable row level security;
alter table product_import_rows enable row level security;
alter table solar_designs enable row level security;
alter table solar_systems enable row level security;
alter table system_panels enable row level security;
alter table inverters enable row level security;
alter table batteries enable row level security;
alter table solar_passports enable row level security;
alter table orders enable row level security;
alter table appointments enable row level security;
alter table production_records enable row level security;
alter table panel_production_records enable row level security;
alter table weather_records enable row level security;
alter table environmental_records enable row level security;
alter table maintenance_cases enable row level security;
alter table cleaning_records enable row level security;
alter table repair_records enable row level security;
alter table replacement_records enable row level security;
alter table incidents enable row level security;
alter table ai_analyses enable row level security;
alter table ai_conversations enable row level security;
alter table recommendations enable row level security;
alter table ai_alerts enable row level security;
alter table reports enable row level security;
alter table notifications enable row level security;
alter table platform_settings enable row level security;
alter table area_aggregates enable row level security;

-- user_profiles: self read/update; admin all
create policy "profiles self" on user_profiles for select using (user_id = auth.uid() or is_admin());
create policy "profiles self update" on user_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid() and role = my_role());
create policy "profiles admin" on user_profiles for all using (is_admin()) with check (is_admin());

-- solar_profiles: owner
create policy "solar_profiles owner" on solar_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "solar_profiles admin" on solar_profiles for select using (is_admin());

-- public catalog (read for everyone signed in), write admin
create policy "manufacturers read" on manufacturers for select using (true);
create policy "manufacturers admin" on manufacturers for all using (is_admin()) with check (is_admin());
create policy "data_sources read" on data_sources for select using (true);
create policy "data_sources admin" on data_sources for all using (is_admin()) with check (is_admin());
create policy "products read" on solar_products for select using (not is_archived or is_admin());
create policy "products admin" on solar_products for all using (is_admin()) with check (is_admin());
create policy "products provider own" on solar_products for all using (provider_id is not null and provider_id = my_provider_id()) with check (provider_id = my_provider_id());
-- Manufacturers publish and maintain their own panels. Verification stays an admin-only action:
-- the product trigger in 0003 demotes any self-set 'verified' with open flags, and nothing here
-- lets a manufacturer touch another manufacturer's rows.
create policy "products manufacturer own" on solar_products for all using (manufacturer_id is not null and manufacturer_id = my_manufacturer_id()) with check (manufacturer_id = my_manufacturer_id());
create policy "versions read" on product_versions for select using (true);
create policy "versions admin" on product_versions for all using (is_admin()) with check (is_admin());
create policy "documents read" on product_documents for select using (true);
create policy "documents admin" on product_documents for all using (is_admin()) with check (is_admin());
create policy "imports admin" on product_imports for all using (is_admin()) with check (is_admin());
create policy "import rows admin" on product_import_rows for all using (is_admin()) with check (is_admin());
create policy "providers read" on provider_companies for select using (true);
create policy "providers admin" on provider_companies for all using (is_admin()) with check (is_admin());
create policy "providers self update" on provider_companies for update using (id = my_provider_id()) with check (id = my_provider_id());
create policy "manufacturers self update" on manufacturers for update using (id = my_manufacturer_id()) with check (id = my_manufacturer_id());
create policy "documents manufacturer own" on product_documents for all using (exists (select 1 from solar_products p where p.id = product_id and p.manufacturer_id = my_manufacturer_id())) with check (exists (select 1 from solar_products p where p.id = product_id and p.manufacturer_id = my_manufacturer_id()));
create policy "prices read" on provider_prices for select using (true);
create policy "prices provider" on provider_prices for all using (provider_id = my_provider_id() or is_admin()) with check (provider_id = my_provider_id() or is_admin());

-- designs, systems & children: owner; admin read; assigned provider read
create policy "designs owner" on solar_designs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "systems owner" on solar_systems for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "systems admin read" on solar_systems for select using (is_admin());
create policy "systems installer read" on solar_systems for select using (installer_id is not null and installer_id = my_provider_id());
create policy "systems provider read via case" on solar_systems for select using (exists (select 1 from maintenance_cases m where m.system_id = solar_systems.id and m.provider_id = my_provider_id()));

create policy "system_panels owner" on system_panels for all using (owns_system(system_id)) with check (owns_system(system_id));
create policy "inverters owner" on inverters for all using (owns_system(system_id)) with check (owns_system(system_id));
create policy "batteries owner" on batteries for all using (owns_system(system_id)) with check (owns_system(system_id));
create policy "passports owner" on solar_passports for select using (owns_system(system_id) or is_admin());
create policy "passports installer" on solar_passports for all using (installer_id = my_provider_id() or is_admin()) with check (installer_id = my_provider_id() or is_admin());

create policy "orders owner" on orders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "orders installer read" on orders for select using (installer_id = my_provider_id() or is_admin());
create policy "appointments owner" on appointments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "appointments provider" on appointments for all using (provider_id = my_provider_id()) with check (provider_id = my_provider_id());

create policy "production owner read" on production_records for select using (owns_system(system_id) or is_admin());
create policy "panel production owner read" on panel_production_records for select using (owns_system(system_id) or is_admin());
-- production writes happen via service role (hardware ingestion) only.

create policy "weather read" on weather_records for select using (true);
create policy "environmental read" on environmental_records for select using (true);

create policy "maintenance owner" on maintenance_cases for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "maintenance provider" on maintenance_cases for all using (provider_id = my_provider_id()) with check (provider_id = my_provider_id());
create policy "maintenance admin" on maintenance_cases for select using (is_admin());
create policy "cleaning owner" on cleaning_records for select using (owns_system(system_id) or is_admin());
create policy "cleaning provider" on cleaning_records for all using (exists (select 1 from maintenance_cases m where m.id = maintenance_case_id and m.provider_id = my_provider_id()));
create policy "repairs owner" on repair_records for select using (owns_system(system_id) or is_admin());
create policy "repairs provider" on repair_records for all using (exists (select 1 from maintenance_cases m where m.id = maintenance_case_id and m.provider_id = my_provider_id()));
create policy "replacements owner" on replacement_records for select using (owns_system(system_id) or is_admin());
create policy "incidents owner" on incidents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "incidents provider read" on incidents for select using (exists (select 1 from maintenance_cases m where m.id = incidents.maintenance_case_id and m.provider_id = my_provider_id()) or is_admin());

create policy "ai_analyses owner" on ai_analyses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_conversations owner" on ai_conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recommendations owner" on recommendations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "alerts owner" on ai_alerts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reports owner read" on reports for select using (user_id = auth.uid() or is_admin());
create policy "reports owner write" on reports for insert with check (user_id = auth.uid() and owns_system(system_id));
create policy "reports owner update" on reports for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications owner" on notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "settings read" on platform_settings for select using (true);
create policy "settings admin" on platform_settings for all using (is_admin()) with check (is_admin());
create policy "aggregates read" on area_aggregates for select using (true);

-- ----------------------------------------------------------------------------
-- Storage buckets (private) — paths are prefixed by user id
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('roof-photos', 'roof-photos', false),
  ('panel-images', 'panel-images', false),
  ('incident-images', 'incident-images', false),
  ('maintenance-images', 'maintenance-images', false),
  ('product-documents', 'product-documents', false),
  ('reports', 'reports', false)
on conflict (id) do nothing;

create policy "own folder read" on storage.objects for select using (
  bucket_id in ('roof-photos','panel-images','incident-images','maintenance-images','reports') and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own folder write" on storage.objects for insert with check (
  bucket_id in ('roof-photos','panel-images','incident-images','maintenance-images') and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "own folder delete" on storage.objects for delete using (
  bucket_id in ('roof-photos','panel-images','incident-images','maintenance-images') and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "product docs read" on storage.objects for select using (bucket_id = 'product-documents');
create policy "product docs admin" on storage.objects for all using (bucket_id = 'product-documents' and public.is_admin()) with check (bucket_id = 'product-documents' and public.is_admin());
