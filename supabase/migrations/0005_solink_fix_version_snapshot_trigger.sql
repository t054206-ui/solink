-- ============================================================================
-- Solink — fix the product version snapshot (found by the first real insert,
-- 2026-09-20).
--
-- 0001 attached snapshot_product_version() as a BEFORE INSERT OR UPDATE
-- trigger. On insert it wrote a product_versions row referencing new.id before
-- the product row existed, so the foreign key failed and no product could ever
-- be inserted. Updates happened to work, which is why review missed it.
--
-- Now an AFTER trigger: the product exists, the version row is written, and
-- current_version_id is set with an explicit update. The trigger fires only on
-- INSERT or UPDATE OF specs, price, so that inner update — which touches
-- neither column — cannot re-enter it.
-- ============================================================================

drop trigger if exists trg_products_snapshot on solar_products;

create or replace function snapshot_product_version() returns trigger language plpgsql set search_path = public as $$
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

create trigger trg_products_snapshot after insert or update of specs, price on solar_products for each row execute function snapshot_product_version();
