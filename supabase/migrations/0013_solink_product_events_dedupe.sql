-- Security fix (Yellow, 2026-09-24): any signed-in person could insert
-- unlimited fake view/compare counts for the same product by calling
-- Supabase directly — nothing checked whether they'd already logged one
-- recently. Fixed at the database, the only place a rule like this holds
-- regardless of how the insert is made.
--
-- BEFORE INSERT, per row: if the same person already logged the same kind
-- of event for the same product within the last 5 minutes, the row is
-- silently skipped (RETURN NULL) rather than rejected with an error, so a
-- legitimate batch insert (e.g. comparing three products at once) still
-- records the other two even when one is a repeat. The calling code
-- (recordProductEventAction, marketplace/actions.ts) never inspects the
-- insert result, so this changes nothing it can see.
create or replace function private.dedupe_product_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and exists (
    select 1 from product_events
    where product_id = new.product_id
      and kind = new.kind
      and user_id = new.user_id
      and created_at > now() - interval '5 minutes'
  ) then
    return null;
  end if;
  return new;
end;
$$;

create trigger trg_product_events_dedupe
  before insert on product_events
  for each row
  execute function private.dedupe_product_event();
