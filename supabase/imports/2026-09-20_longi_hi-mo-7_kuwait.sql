-- ============================================================================
-- Solink — real catalogue import, 2026-09-20
-- LONGi Hi-MO 7 (LR7-72HGD-585M / -615M / -620M), Kuwait market data.
--
-- Idempotent: fixed UUIDs plus ON CONFLICT on the schema's own unique keys, so
-- a second run updates in place and never duplicates. Safe to re-run after a
-- correction. Wrapped in one transaction.
--
-- Specifications: LONGi official datasheet, LR7-72HGD 585~620M, marked
--   Preliminary V05 (20230901)
--   https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf
-- Kuwait price and availability: Alwan Solar (Kuwait retailer), read 2026-09-20.
--
-- Deliberately NOT imported, see docs/DATA-CLEANING-LOG.md:
--   * JinkoSolar 590 W listing  (title 590 W vs body 550 W; no model, no specs)
--   * "BCT" 610 W listing       (BCT is the retailer's lighting house brand)
-- The retailer's own 615 W electrical values and 585 W efficiency are rejected
-- in favour of the datasheet; both conflicts are recorded in source_conflict_note.
--
-- No schema change. No existing row is deleted. Demo records are untouched.
-- product_versions rows are written automatically by trg_products_snapshot.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Manufacturer. `name` is unique, so this is the idempotency key.
-- ---------------------------------------------------------------------------
-- 2026-09-22 (migration 0008): the row is now the full company record. Name
-- shortened to 'LONGi', legal name and slug added, `country` renamed to
-- `headquarters_country`. Keyed on slug; the company seed in
-- 2026-09-22_manufacturers.sql fills the rest.
insert into manufacturers (name, legal_name, slug, headquarters_country, website, verification_status, is_demo)
values ('LONGi', 'LONGi Green Energy Technology Co., Ltd.', 'longi', 'China', 'https://www.longi.com/', 'unverified', false)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- The Kuwait supplier whose listing supplied the price and availability.
-- A real company: three branches in Kuwait, KNET/Visa/Mastercard, Kuwait-wide
-- delivery. Recorded as the product's provider so the market data has an owner.
-- ---------------------------------------------------------------------------
insert into provider_companies (id, name, kind, website, service_area, verification_status, is_demo)
values (
  'c1000000-0000-4000-8000-000000000001',
  'Alwan Solar (ألوان الطيف)',
  '{solar_company}',
  'https://alwansolar.com/',
  'Kuwait',
  'unverified',
  false
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Provenance registry. Manufacturer and market sources stay separate rows,
-- because they support different claims.
-- ---------------------------------------------------------------------------
insert into data_sources (id, name, kind, url, notes) values
  ('da100000-0000-4000-8000-000000000001',
   'LONGi official datasheet — LR7-72HGD 585~620M (Preliminary V05)',
   'datasheet',
   'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
   'Source for every technical specification. Marked Preliminary V05 (20230901). No text layer; page 2 rendered to read the tables.'),
  ('da100000-0000-4000-8000-000000000002',
   'Alwan Solar (Kuwait) — product listings',
   'participating_company',
   'https://alwansolar.com/',
   'Source for KWD price and retailer listing status only. Not used for any technical specification.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- The three panels.
--
-- Every specification below is from the datasheet. Only price, currency and
-- the kuwait_* keys come from the retailer, and field_sources records which
-- URL each value came from.
-- ---------------------------------------------------------------------------

-- LR7-72HGD-585M ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, 'c1000000-0000-4000-8000-000000000001',
  'LR7-72HGD-585M',
  'LONGi Hi-MO 7 LR7-72HGD-585M (585 W bifacial)',
  'Bifacial dual-glass module, HPDC half-cell. Specifications from the LONGi Preliminary V05 datasheet; Kuwait price from Alwan Solar.',
  '{"value":45,"unit":"KWD"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value":585,"unit":"W"}'::jsonb,
    'module_efficiency_pct', '{"value":21.7,"unit":"%"}'::jsonb,
    'max_system_voltage_v', '{"value":1500,"unit":"V"}'::jsonb,
    'voc_v', '{"value":51.89,"unit":"V"}'::jsonb,
    'isc_a', '{"value":14.25,"unit":"A"}'::jsonb,
    'vmp_v', '{"value":43.79,"unit":"V"}'::jsonb,
    'imp_a', '{"value":13.36,"unit":"A"}'::jsonb,
    'length_mm', '{"value":2382,"unit":"mm"}'::jsonb,
    'width_mm', '{"value":1134,"unit":"mm"}'::jsonb,
    'thickness_mm', '{"value":30,"unit":"mm"}'::jsonb,
    'weight_kg', '{"value":33.5,"unit":"kg"}'::jsonb,
    'cell_technology', '{"value":"HPDC half-cell, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value":144,"unit":"cells (6x24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value":-0.28,"unit":"%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value":"-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value":12,"unit":"years"}'::jsonb,
    'performance_warranty_years', '{"value":30,"unit":"years"}'::jsonb,
    'performance_warranty_end_pct', '{"value":87.4,"unit":"%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value":-0.23,"unit":"%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value":0.045,"unit":"%/°C"}'::jsonb,
      'noct_c', '{"value":45,"unit":"°C ±2"}'::jsonb,
      'bifaciality_pct', '{"value":80,"unit":"% ±5"}'::jsonb,
      'first_year_degradation_pct', '{"value":1,"unit":"% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value":0.4,"unit":"%/year"}'::jsonb,
      'power_tolerance_pct', '{"value":"0 ~ +3"}'::jsonb,
      'voc_isc_tolerance_pct', '{"value":"±3"}'::jsonb,
      'max_series_fuse_a', '{"value":30,"unit":"A"}'::jsonb,
      'glass', '{"value":"Dual glass, 2.0 + 2.0 mm semi-tempered"}'::jsonb,
      'frame', '{"value":"Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value":"IP68, three diodes"}'::jsonb,
      'front_load_pa', '{"value":5400,"unit":"Pa"}'::jsonb,
      'rear_load_pa', '{"value":2400,"unit":"Pa"}'::jsonb,
      'protection_class', '{"value":"Class II"}'::jsonb,
      'fire_rating', '{"value":"UL type 29 / IEC Class C"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'LONGi official datasheet (LR7-72HGD 585~620M, Preliminary V05) + Alwan Solar Kuwait listing',
    'source_url', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-585w',
    'manufacturer_url', 'https://www.longi.com/en/products/modules/hi-mo-7/',
    'datasheet_url', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
    'manufacturer_doc_url', 'https://www.longi.com/en/products/modules/hi-mo-7/',
    'manufacturer_source_note', 'LR7-72HGD 585~620M datasheet, marked Preliminary V05 (20230901). Not a final revision.',
    'kuwait_supplier', 'Alwan Solar (ألوان الطيف)',
    'kuwait_supplier_url', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-585w',
    'kuwait_price_kwd', 45,
    'kuwait_price_observed_at', '2026-09-20',
    'kuwait_availability', 'listed_by_retailer',
    'kuwait_availability_note', 'Listed by retailer, not independently verified. Retailer stock flag available:true on 2026-09-20.',
    'source_conflict_note', 'The retailer listed 22.6 % module efficiency; the datasheet gives 21.7 % for the 585 W bin (22.6 % belongs to the 610 W bin). The datasheet value is stored. See docs/DATA-CLEANING-LOG.md C-002.',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'module_efficiency_pct', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'voc_v', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'isc_a', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'vmp_v', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'imp_a', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'product_warranty_years', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'performance_warranty_years', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'price', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-585w',
      'kuwait_availability', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-585w'
    ),
    'date_added', '2026-09-20',
    'date_last_updated', '2026-09-20',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications confirmed against the official LONGi datasheet LR7-72HGD 585~620M, marked Preliminary V05 (20230901) and not a final revision. Kuwait price 45.000 KWD from Alwan Solar, observed 2026-09-20. Kuwait availability is retailer-listed and NOT independently verified. The retailer efficiency figure conflicting with the datasheet was rejected in favour of the datasheet. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'longi'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- LR7-72HGD-615M ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, 'c1000000-0000-4000-8000-000000000001',
  'LR7-72HGD-615M',
  'LONGi Hi-MO 7 LR7-72HGD-615M (615 W bifacial)',
  'Bifacial dual-glass module, HPDC half-cell. Specifications from the LONGi Preliminary V05 datasheet; Kuwait price from Alwan Solar.',
  '{"value":47.5,"unit":"KWD"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value":615,"unit":"W"}'::jsonb,
    'module_efficiency_pct', '{"value":22.8,"unit":"%"}'::jsonb,
    'max_system_voltage_v', '{"value":1500,"unit":"V"}'::jsonb,
    'voc_v', '{"value":52.55,"unit":"V"}'::jsonb,
    'isc_a', '{"value":14.73,"unit":"A"}'::jsonb,
    'vmp_v', '{"value":44.44,"unit":"V"}'::jsonb,
    'imp_a', '{"value":13.84,"unit":"A"}'::jsonb,
    'length_mm', '{"value":2382,"unit":"mm"}'::jsonb,
    'width_mm', '{"value":1134,"unit":"mm"}'::jsonb,
    'thickness_mm', '{"value":30,"unit":"mm"}'::jsonb,
    'weight_kg', '{"value":33.5,"unit":"kg"}'::jsonb,
    'cell_technology', '{"value":"HPDC half-cell, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value":144,"unit":"cells (6x24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value":-0.28,"unit":"%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value":"-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value":12,"unit":"years"}'::jsonb,
    'performance_warranty_years', '{"value":30,"unit":"years"}'::jsonb,
    'performance_warranty_end_pct', '{"value":87.4,"unit":"%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value":-0.23,"unit":"%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value":0.045,"unit":"%/°C"}'::jsonb,
      'noct_c', '{"value":45,"unit":"°C ±2"}'::jsonb,
      'bifaciality_pct', '{"value":80,"unit":"% ±5"}'::jsonb,
      'first_year_degradation_pct', '{"value":1,"unit":"% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value":0.4,"unit":"%/year"}'::jsonb,
      'power_tolerance_pct', '{"value":"0 ~ +3"}'::jsonb,
      'voc_isc_tolerance_pct', '{"value":"±3"}'::jsonb,
      'max_series_fuse_a', '{"value":30,"unit":"A"}'::jsonb,
      'glass', '{"value":"Dual glass, 2.0 + 2.0 mm semi-tempered"}'::jsonb,
      'frame', '{"value":"Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value":"IP68, three diodes"}'::jsonb,
      'front_load_pa', '{"value":5400,"unit":"Pa"}'::jsonb,
      'rear_load_pa', '{"value":2400,"unit":"Pa"}'::jsonb,
      'protection_class', '{"value":"Class II"}'::jsonb,
      'fire_rating', '{"value":"UL type 29 / IEC Class C"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'LONGi official datasheet (LR7-72HGD 585~620M, Preliminary V05) + Alwan Solar Kuwait listing',
    'source_url', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-615w',
    'manufacturer_url', 'https://www.longi.com/en/products/modules/hi-mo-7/',
    'datasheet_url', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
    'manufacturer_doc_url', 'https://www.longi.com/en/products/modules/hi-mo-7/',
    'manufacturer_source_note', 'LR7-72HGD 585~620M datasheet, marked Preliminary V05 (20230901). Not a final revision.',
    'kuwait_supplier', 'Alwan Solar (ألوان الطيف)',
    'kuwait_supplier_url', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-615w',
    'kuwait_price_kwd', 47.5,
    'kuwait_price_observed_at', '2026-09-20',
    'kuwait_availability', 'listed_by_retailer',
    'kuwait_availability_note', 'Listed by retailer, not independently verified. Retailer stock flag available:true on 2026-09-20.',
    'source_conflict_note', 'The retailer published Voc 48.58 V, Isc 16.00 A, Vmp 40.71 V, Imp 15.11 A. The datasheet gives 52.55 V, 14.73 A, 44.44 V, 13.84 A, and the retailer also stated 132 cells against the datasheet''s 144. The datasheet values are stored. See docs/DATA-CLEANING-LOG.md C-001 and C-003.',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'module_efficiency_pct', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'voc_v', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'isc_a', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'vmp_v', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'imp_a', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'product_warranty_years', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'performance_warranty_years', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'price', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-615w',
      'kuwait_availability', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-615w'
    ),
    'date_added', '2026-09-20',
    'date_last_updated', '2026-09-20',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications confirmed against the official LONGi datasheet LR7-72HGD 585~620M, marked Preliminary V05 (20230901) and not a final revision. Kuwait price 47.500 KWD from Alwan Solar, observed 2026-09-20. Kuwait availability is retailer-listed and NOT independently verified. The retailer electrical values and cell count conflicting with the datasheet were rejected in favour of the datasheet. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'longi'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- LR7-72HGD-620M ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, 'c1000000-0000-4000-8000-000000000001',
  'LR7-72HGD-620M',
  'LONGi Hi-MO 7 LR7-72HGD-620M (620 W bifacial)',
  'Bifacial dual-glass module, HPDC half-cell. Specifications from the LONGi Preliminary V05 datasheet; Kuwait price from Alwan Solar.',
  '{"value":47.5,"unit":"KWD"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value":620,"unit":"W"}'::jsonb,
    'module_efficiency_pct', '{"value":23.0,"unit":"%"}'::jsonb,
    'max_system_voltage_v', '{"value":1500,"unit":"V"}'::jsonb,
    'voc_v', '{"value":52.66,"unit":"V"}'::jsonb,
    'isc_a', '{"value":14.81,"unit":"A"}'::jsonb,
    'vmp_v', '{"value":44.55,"unit":"V"}'::jsonb,
    'imp_a', '{"value":13.92,"unit":"A"}'::jsonb,
    'length_mm', '{"value":2382,"unit":"mm"}'::jsonb,
    'width_mm', '{"value":1134,"unit":"mm"}'::jsonb,
    'thickness_mm', '{"value":30,"unit":"mm"}'::jsonb,
    'weight_kg', '{"value":33.5,"unit":"kg"}'::jsonb,
    'cell_technology', '{"value":"HPDC half-cell, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value":144,"unit":"cells (6x24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value":-0.28,"unit":"%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value":"-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value":12,"unit":"years"}'::jsonb,
    'performance_warranty_years', '{"value":30,"unit":"years"}'::jsonb,
    'performance_warranty_end_pct', '{"value":87.4,"unit":"%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value":-0.23,"unit":"%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value":0.045,"unit":"%/°C"}'::jsonb,
      'noct_c', '{"value":45,"unit":"°C ±2"}'::jsonb,
      'bifaciality_pct', '{"value":80,"unit":"% ±5"}'::jsonb,
      'first_year_degradation_pct', '{"value":1,"unit":"% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value":0.4,"unit":"%/year"}'::jsonb,
      'power_tolerance_pct', '{"value":"0 ~ +3"}'::jsonb,
      'voc_isc_tolerance_pct', '{"value":"±3"}'::jsonb,
      'max_series_fuse_a', '{"value":30,"unit":"A"}'::jsonb,
      'glass', '{"value":"Dual glass, 2.0 + 2.0 mm semi-tempered"}'::jsonb,
      'frame', '{"value":"Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value":"IP68, three diodes"}'::jsonb,
      'front_load_pa', '{"value":5400,"unit":"Pa"}'::jsonb,
      'rear_load_pa', '{"value":2400,"unit":"Pa"}'::jsonb,
      'protection_class', '{"value":"Class II"}'::jsonb,
      'fire_rating', '{"value":"UL type 29 / IEC Class C"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'LONGi official datasheet (LR7-72HGD 585~620M, Preliminary V05) + Alwan Solar Kuwait listing',
    'source_url', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-620w',
    'manufacturer_url', 'https://www.longi.com/en/products/modules/hi-mo-7/',
    'datasheet_url', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
    'manufacturer_doc_url', 'https://www.longi.com/en/products/modules/hi-mo-7/',
    'manufacturer_source_note', 'LR7-72HGD 585~620M datasheet, marked Preliminary V05 (20230901). Not a final revision.',
    'kuwait_supplier', 'Alwan Solar (ألوان الطيف)',
    'kuwait_supplier_url', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-620w',
    'kuwait_price_kwd', 47.5,
    'kuwait_price_observed_at', '2026-09-20',
    'kuwait_availability', 'listed_by_retailer',
    'kuwait_availability_note', 'Listed by retailer, not independently verified. Retailer stock flag available:true on 2026-09-20.',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'module_efficiency_pct', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'voc_v', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'isc_a', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'vmp_v', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'imp_a', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'product_warranty_years', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'performance_warranty_years', 'https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf',
      'price', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-620w',
      'kuwait_availability', 'https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-620w'
    ),
    'date_added', '2026-09-20',
    'date_last_updated', '2026-09-20',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications confirmed against the official LONGi datasheet LR7-72HGD 585~620M, marked Preliminary V05 (20230901) and not a final revision. Kuwait price 47.500 KWD from Alwan Solar, observed 2026-09-20. Kuwait availability is retailer-listed and NOT independently verified. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'longi'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

commit;

-- ----------------------------------------------------------------------------
-- Check after running:
--   select model, price->>'value' as kwd, specs->'rated_power_w'->>'value' as w,
--          source->>'verification_status' as status, validation_flags
--   from solar_products where model like 'LR7-72HGD-%' order by model;
--   select product_id, version, change_note from product_versions order by created_at desc limit 5;
--
-- Rollback (removes only these three products and the rows added here):
--   delete from solar_products where model in ('LR7-72HGD-585M','LR7-72HGD-615M','LR7-72HGD-620M');
--   delete from data_sources where id in ('da100000-0000-4000-8000-000000000001','da100000-0000-4000-8000-000000000002');
--   delete from provider_companies where id = 'c1000000-0000-4000-8000-000000000001';
--   delete from manufacturers where slug = 'longi';
-- ----------------------------------------------------------------------------
