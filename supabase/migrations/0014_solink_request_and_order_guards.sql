-- Security fix (Orange, 2026-09-27): a signed-in person could skip the site's
-- forms and insert manufacturer messages or orders straight into the
-- database, unlimited, of any length, under any display name, with a
-- pre-filled answer or status. These triggers enforce on insert what the
-- forms already enforce, so the rule holds however the row arrives.
-- Existing rows are untouched; admins and server jobs (no auth.uid()) pass.

create or replace function private.guard_manufacturer_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
  profile_name text;
  meta_name text;
begin
  if auth.uid() is null or private.is_admin() then
    return new;
  end if;

  new.message := btrim(coalesce(new.message, ''));
  if char_length(new.message) < 10 or char_length(new.message) > 2000 then
    raise exception 'A message must be between 10 and 2000 characters' using errcode = 'check_violation';
  end if;

  select count(*) into recent from manufacturer_requests
  where requester_id = auth.uid() and created_at > now() - interval '1 hour';
  if recent >= 10 then
    raise exception 'Too many messages in the last hour. Please wait and try again.' using errcode = 'check_violation';
  end if;

  -- The sender's name and area come from their own records, never from the request.
  select full_name into profile_name from user_profiles where user_id = auth.uid();
  select raw_user_meta_data->>'full_name' into meta_name from auth.users where id = auth.uid();
  new.requester_display_name := coalesce(nullif(btrim(profile_name), ''), nullif(btrim(meta_name), ''), 'Solink user');
  select governorate into new.requester_governorate from solar_profiles where user_id = auth.uid();

  -- A new message has no answer yet.
  new.status := 'new';
  new.response := null;
  new.responded_at := null;
  return new;
end;
$$;

create trigger trg_manufacturer_requests_guard
  before insert on manufacturer_requests
  for each row
  execute function private.guard_manufacturer_request_insert();

create or replace function private.guard_order_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if auth.uid() is null or private.is_admin() then
    return new;
  end if;

  if new.status not in ('draft', 'requested') then
    raise exception 'A new order starts as a request' using errcode = 'check_violation';
  end if;
  if new.installer_id is not null or new.payment_provider is not null or new.payment_reference is not null then
    raise exception 'A new order cannot name an installer or a payment' using errcode = 'check_violation';
  end if;
  if char_length(coalesce(new.notes, '')) > 2000
     or octet_length(coalesce(new.items, '[]'::jsonb)::text) > 50000
     or octet_length(coalesce(new.totals, '{}'::jsonb)::text) > 10000 then
    raise exception 'This order is too large' using errcode = 'check_violation';
  end if;

  select count(*) into recent from orders
  where user_id = auth.uid() and created_at > now() - interval '1 hour';
  if recent >= 10 then
    raise exception 'Too many requests in the last hour. Please wait and try again.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_orders_guard
  before insert on orders
  for each row
  execute function private.guard_order_insert();
