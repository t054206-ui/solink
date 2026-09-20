-- ============================================================================
-- Solink — security hardening, from the Supabase advisor after 0001–0003 ran
-- for the first time (2026-09-20).
--
-- 1. The RLS helper functions are SECURITY DEFINER and lived in `public`, so
--    PostgREST exposed each one at /rest/v1/rpc/<name>. Revoking EXECUTE is
--    the wrong fix: policies run as the calling role and must be able to call
--    them. Moving them to a schema PostgREST does not expose removes the route
--    while every policy keeps working — Postgres stores the function OID in
--    the policy expression, not the name.
-- 2. The remaining public functions get a pinned search_path so a malicious
--    object earlier on a caller's path cannot be substituted for a table.
-- ============================================================================

create schema if not exists private;
-- Policy evaluation happens as the querying role, which therefore needs USAGE
-- on the schema. This does not expose it through the API: PostgREST serves only
-- the schemas listed in its "Exposed schemas" setting, and `private` is not one.
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_admin() set schema private;
alter function public.my_provider_id() set schema private;
alter function public.my_manufacturer_id() set schema private;
alter function public.my_role() set schema private;
alter function public.owns_system(uuid) set schema private;
alter function public.handle_new_user() set schema private;

-- A trigger function is never legitimately called by a client. Postgres does not
-- check EXECUTE when firing triggers, so this closes the door without side effects.
revoke execute on function private.handle_new_user() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = public;
alter function public.snapshot_product_version() set search_path = public;
alter function public.next_passport_number() set search_path = public;
alter function public.spec_num(jsonb, text) set search_path = public;
alter function public.validate_panel_specs(jsonb, product_category) set search_path = public;
alter function public.validate_product() set search_path = public;
