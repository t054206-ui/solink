-- ============================================================================
-- Solink — authorization hardening from the security audit (2026-09-22)
--
-- Every finding below was verified against the live policies and, where a
-- write was involved, demonstrated in a rolled-back transaction with a real
-- non-admin user id before fixing. Nothing here widens any access.
--
--   1. HIGH   user_profiles: "profiles self update" let a signed-in person set
--             their own manufacturer_id / provider_company_id and instantly
--             act for that company (products, documents, requests). The role
--             column was already guarded; the two company links were not.
--   2. MEDIUM maintenance_cases / appointments: the provider policies were
--             FOR ALL, so a provider could insert a case or appointment on any
--             homeowner's system (and, through "systems provider read via
--             case", read that system) or re-point an existing case at another
--             system. Providers now read and update their cases; homeowners
--             and admins create them, and the case's system and owner cannot
--             be moved by a non-admin.
--   3. MEDIUM solar_passports: "passports installer" was FOR ALL, so an
--             installer could delete a passport (the permanent record) or
--             issue one for a system it did not install. Delete is admin only;
--             insert requires the installer to be the system's installer.
--   4. LOW    cleaning_records / repair_records: system_id was free text next
--             to the case reference; it now always follows the case.
--   5. LOW    incidents: the owner could file an incident against another
--             person's system id; the row must reference a system they own.
--   6. LOW    product_events: user_id could be set to someone else's id.
-- ============================================================================

-- 1. A person edits their own profile, never their standing -------------------
create or replace function guard_profile_admin_fields() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or private.is_admin() then return new; end if;
  if new.role is distinct from old.role
     or new.manufacturer_id is distinct from old.manufacturer_id
     or new.provider_company_id is distinct from old.provider_company_id then
    raise exception 'Only a Solink administrator can change a role or link an account to a company' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
drop trigger if exists trg_user_profiles_guard on user_profiles;
create trigger trg_user_profiles_guard before update on user_profiles for each row execute function guard_profile_admin_fields();
revoke execute on function public.guard_profile_admin_fields() from public, anon, authenticated;

-- 2. Providers work on their cases; they do not create them or move them ------
drop policy if exists "maintenance provider" on maintenance_cases;
create policy "maintenance provider read" on maintenance_cases for select using (provider_id = private.my_provider_id());
create policy "maintenance provider update" on maintenance_cases for update using (provider_id = private.my_provider_id()) with check (provider_id = private.my_provider_id());
-- The owner policy stays FOR ALL, but a new case must be on a system the owner owns.
drop policy if exists "maintenance owner" on maintenance_cases;
create policy "maintenance owner" on maintenance_cases for all using (user_id = auth.uid()) with check (user_id = auth.uid() and private.owns_system(system_id));

create or replace function guard_case_scope() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or private.is_admin() then return new; end if;
  if new.system_id is distinct from old.system_id or new.user_id is distinct from old.user_id then
    raise exception 'A maintenance case cannot be moved to another system or owner' using errcode = 'insufficient_privilege';
  end if;
  -- A provider may hand a case back (null) but not to another company.
  if auth.uid() <> old.user_id and new.provider_id is distinct from old.provider_id and new.provider_id is not null then
    raise exception 'Only the homeowner or an administrator can assign a case to a provider' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
drop trigger if exists trg_maintenance_cases_guard on maintenance_cases;
create trigger trg_maintenance_cases_guard before update on maintenance_cases for each row execute function guard_case_scope();
revoke execute on function public.guard_case_scope() from public, anon, authenticated;

drop policy if exists "appointments provider" on appointments;
create policy "appointments provider read" on appointments for select using (provider_id = private.my_provider_id());
create policy "appointments provider update" on appointments for update using (provider_id = private.my_provider_id()) with check (provider_id = private.my_provider_id());
create or replace function guard_appointment_scope() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or private.is_admin() then return new; end if;
  if new.system_id is distinct from old.system_id or new.user_id is distinct from old.user_id then
    raise exception 'An appointment cannot be moved to another system or person' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
drop trigger if exists trg_appointments_guard on appointments;
create trigger trg_appointments_guard before update on appointments for each row execute function guard_appointment_scope();
revoke execute on function public.guard_appointment_scope() from public, anon, authenticated;

-- 3. Passports: installers issue and update their own; only admins delete ----
drop policy if exists "passports installer" on solar_passports;
create policy "passports installer read" on solar_passports for select using (installer_id = private.my_provider_id());
create policy "passports installer insert" on solar_passports for insert with check (
  installer_id = private.my_provider_id()
  and exists (select 1 from solar_systems s where s.id = system_id and s.installer_id = private.my_provider_id())
);
create policy "passports installer update" on solar_passports for update using (installer_id = private.my_provider_id()) with check (installer_id = private.my_provider_id());
create policy "passports admin" on solar_passports for all using (private.is_admin()) with check (private.is_admin());

-- 4. A cleaning or repair record belongs to its case's system, always ----------
create or replace function align_record_system() returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if new.maintenance_case_id is not null then
    select system_id into sid from maintenance_cases where id = new.maintenance_case_id;
    if sid is not null then new.system_id := sid; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_cleaning_records_align on cleaning_records;
create trigger trg_cleaning_records_align before insert or update on cleaning_records for each row execute function align_record_system();
drop trigger if exists trg_repair_records_align on repair_records;
create trigger trg_repair_records_align before insert or update on repair_records for each row execute function align_record_system();
revoke execute on function public.align_record_system() from public, anon, authenticated;

-- 5. An incident is filed against a system the person owns ----------------------
drop policy if exists "incidents owner" on incidents;
create policy "incidents owner" on incidents for all using (user_id = auth.uid()) with check (user_id = auth.uid() and private.owns_system(system_id));

-- 6. Activity rows carry the caller's own id or none ----------------------------
drop policy if exists "product events insert" on product_events;
create policy "product events insert" on product_events for insert with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));
