-- ============================================================================
-- Solink — product data validation
-- Flags questionable manufacturer data for human review. NEVER alters it.
-- ============================================================================

create or replace function spec_num(specs jsonb, key text) returns numeric language sql immutable as $$
  select case when jsonb_typeof(specs->key->'value') = 'number' then (specs->key->>'value')::numeric else null end;
$$;

create or replace function validate_panel_specs(specs jsonb, category product_category) returns jsonb language plpgsql immutable as $$
declare flags jsonb := '[]'::jsonb;
  p numeric := spec_num(specs,'rated_power_w');
  eff numeric := spec_num(specs,'module_efficiency_pct');
  l numeric := spec_num(specs,'length_mm');
  w numeric := spec_num(specs,'width_mm');
  voc numeric := spec_num(specs,'voc_v');
  vmp numeric := spec_num(specs,'vmp_v');
  isc numeric := spec_num(specs,'isc_a');
  imp numeric := spec_num(specs,'imp_a');
  tc numeric := spec_num(specs,'temperature_coefficient_pmax_pct_per_c');
  calc_eff numeric;
begin
  if category <> 'solar_panel' then return flags; end if;
  if p is null then flags := flags || '["missing: rated_power_w (required)"]'; end if;
  if eff is null then flags := flags || '["missing: module_efficiency_pct (required)"]'; end if;
  if l is null or w is null then flags := flags || '["missing: dimensions (required for designer)"]'; end if;
  if p is not null and (p <= 0 or p > 1500) then flags := flags || '["suspicious: rated_power_w outside 0–1500 W"]'; end if;
  if eff is not null and (eff <= 0 or eff > 35) then flags := flags || '["suspicious: module_efficiency_pct outside 0–35 %"]'; end if;
  if voc is not null and vmp is not null and vmp >= voc then flags := flags || '["inconsistent: Vmp should be below Voc"]'; end if;
  if isc is not null and imp is not null and imp >= isc then flags := flags || '["inconsistent: Imp should be below Isc"]'; end if;
  if vmp is not null and imp is not null and p is not null and abs(vmp*imp - p) / p > 0.05 then flags := flags || '["inconsistent: Vmp × Imp differs from rated power by >5 %"]'; end if;
  if tc is not null and (tc > 0 or tc < -1) then flags := flags || '["suspicious: temperature coefficient outside −1…0 %/°C"]'; end if;
  if p is not null and l is not null and w is not null and eff is not null then
    calc_eff := p / ((l/1000.0)*(w/1000.0)*1000.0) * 100.0;   -- STC 1000 W/m²
    if abs(calc_eff - eff) > 1.5 then flags := flags || to_jsonb(array[format('inconsistent: efficiency from power/area is %.1f %% vs stated %.1f %%', calc_eff, eff)]); end if;
  end if;
  return flags;
end $$;

create or replace function validate_product() returns trigger language plpgsql as $$
begin
  new.validation_flags := validate_panel_specs(new.specs, new.category);
  -- Never auto-verify. If flags exist and status is verified, demote to pending for review.
  if jsonb_array_length(new.validation_flags) > 0 and (new.source->>'verification_status') = 'verified' then
    new.source := jsonb_set(new.source, '{verification_status}', '"pending_verification"');
  end if;
  return new;
end $$;
create trigger trg_products_validate before insert or update on solar_products for each row execute function validate_product();
