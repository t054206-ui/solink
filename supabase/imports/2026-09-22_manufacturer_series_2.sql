-- ============================================================================
-- Solink — real catalogue import, part 2, 2026-09-22 (Session 9)
-- One flagship / utility-scale n-type series per manufacturer, EVERY power bin
-- the datasheet lists, read from the manufacturer's OFFICIAL datasheet only:
--
--   LONGi          Hi-MO X6 Scientist LR7-72HTH 620~630M      3 bins  (single glass, 15 y / 25 y, 89.4 %)
--   JinkoSolar     Tiger Neo 66HL4M-(V) 610~635 W mono-facial 6 bins  (12 y / 30 y, 87.4 %)
--   JA Solar       DeepBlue 4.0 Pro JAM72D42 LB 625~650 W     6 bins  (bifacial, 12 y / 30 y, 87.4 %)
--   Trina Solar    Vertex N TSM-NEG21C.20 700~725 W           6 bins  (bifacial, 12 y / 30 y, 87.4 %)
--   Canadian Solar TOPBiHiKu6 CS6.2-66TB-H 590~620 W          7 bins  (bifacial, 12 y / 30 y, end % not printed)
--
-- 28 rows. Generated from the datasheet readings by a script (gen_import.py,
-- session scratchpad); every value was checked Vmp × Imp ≈ Pmax, Vmp < Voc,
-- Imp < Isc and P / area ≈ efficiency before writing. Idempotent: ON CONFLICT
-- (manufacturer_id, model) updates in place; provenance rows are
-- delete-then-insert on today's date. product_versions rows come from
-- trg_products_snapshot. No existing row is touched.
--
-- Prices: none. No Kuwait retailer listing was found for any of these models
-- on 2026-09-22; price is unavailable, not estimated. Images: only a render the
-- manufacturer's own product page serves (JA Solar, Canadian Solar); LONGi,
-- JinkoSolar and Trina Solar rows have none, see docs/DATA-CLEANING-LOG.md
-- C-011 to C-016.
-- ============================================================================

begin;

insert into data_sources (id, name, kind, url, notes) values
  ('da100000-0000-4000-8000-000000000007', 'LONGi official datasheet — Hi-MO X6 Scientist LR7-72HTH 620~630M (20240511 V2)', 'datasheet', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf', 'Text layer present. Source for every technical specification of the three LONGi LR7-72HTH rows.'),
  ('da100000-0000-4000-8000-000000000008', 'JinkoSolar official datasheet — Tiger Neo 66HL4M-(V) 610~635 W mono-facial (JKM610-635N-66HL4M-(V)-F2-EN, © 2024)', 'datasheet', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf', 'Text layer present. Source for every technical specification of the six Jinko 66HL4M-(V) rows.'),
  ('da100000-0000-4000-8000-000000000009', 'JA Solar official datasheet — DeepBlue 4.0 Pro JAM72D42 LB 625~650 W bifacial (Global-EN-20241122A)', 'datasheet', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf', 'From JA Solar''s official European site (jasolar.com refuses automated requests). Text layer present. Source for every technical specification of the six JA JAM72D42 rows.'),
  ('da100000-0000-4000-8000-000000000010', 'Trina Solar official datasheet — Vertex N TSM-NEG21C.20 700~725 W bifacial dual glass (TSM_APAC_EN_2024_B)', 'datasheet', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf', 'Text layer present; the STC table''s values are interleaved with NOCT and BNPI columns in the extracted text and were paired by Vmp × Imp ≈ Pmax. Source for every technical specification of the six Trina NEG21C.20 rows.'),
  ('da100000-0000-4000-8000-000000000011', 'Canadian Solar official datasheet — TOPBiHiKu6 CS6.2-66TB-H 590~620 W bifacial (V1.1_F68_L2B_TX, April 2026)', 'datasheet', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf', 'US (TX) regional edition, ''Assembled in the US from imported components''. Text layer present. Electrical and mechanical figures are module figures; certificates and warranty terms are region-dependent per its own footnotes.')
on conflict (id) do nothing;


-- LR7-72HTH-620M ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'LR7-72HTH-620M',
  'LONGi Hi-MO X6 Scientist LR7-72HTH-620M (620 W)',
  'Single-glass 144-half-cell module of LONGi''s Hi-MO X6 Scientist series for the distribution market. Specifications from the LONGi May 2024 datasheet (V2).',
  'Hi-MO X6 Scientist',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 620, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.0, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 52.72, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 14.93, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 44.48, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 13.94, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.5, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "Mono-crystalline half-cell, single glass (Hi-MO X6 series; the datasheet states the 144-cell 6×24 layout, the Hi-MO X6 page describes the series'' HPBC back-contact cells)"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.28, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 15, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 89.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.23, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.05, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max, printed as <1 %)"}'::jsonb,
      'annual_degradation_year_2_25_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 25, "unit": "A"}'::jsonb,
      'glass', '{"value": "Single glass, 3.2 mm coated tempered glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy frame"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'hail_test', '{"value": "25 mm hailstone at 23 m/s"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (single glass, mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
    'datasheet_url', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
    'manufacturer_doc_url', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
    'manufacturer_url', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
    'manufacturer_source_note', 'LONGi datasheet LR7-72HTH 620~630M, Scientist, 20240511 V2, linked from the official Hi-MO X6 page',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'module_efficiency_pct', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'max_system_voltage_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'voc_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'isc_a', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'vmp_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'imp_a', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'length_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'width_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'thickness_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'weight_kg', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'cell_technology', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
      'number_of_cells', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'operating_temperature_range_c', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'product_warranty_years', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'performance_warranty_years', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'performance_warranty_end_pct', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (LONGi datasheet LR7-72HTH 620~630M, Scientist, 20240511 V2, linked from the official Hi-MO X6 page) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet states the cell layout (144, 6×24) but not the cell type; the cell technology wording follows the official Hi-MO X6 product page and is sourced to it in field_sources. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'longi'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- LR7-72HTH-625M ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'LR7-72HTH-625M',
  'LONGi Hi-MO X6 Scientist LR7-72HTH-625M (625 W)',
  'Single-glass 144-half-cell module of LONGi''s Hi-MO X6 Scientist series for the distribution market. Specifications from the LONGi May 2024 datasheet (V2).',
  'Hi-MO X6 Scientist',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 625, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.1, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 52.87, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.01, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 44.63, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.01, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.5, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "Mono-crystalline half-cell, single glass (Hi-MO X6 series; the datasheet states the 144-cell 6×24 layout, the Hi-MO X6 page describes the series'' HPBC back-contact cells)"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.28, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 15, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 89.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.23, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.05, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max, printed as <1 %)"}'::jsonb,
      'annual_degradation_year_2_25_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 25, "unit": "A"}'::jsonb,
      'glass', '{"value": "Single glass, 3.2 mm coated tempered glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy frame"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'hail_test', '{"value": "25 mm hailstone at 23 m/s"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (single glass, mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
    'datasheet_url', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
    'manufacturer_doc_url', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
    'manufacturer_url', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
    'manufacturer_source_note', 'LONGi datasheet LR7-72HTH 620~630M, Scientist, 20240511 V2, linked from the official Hi-MO X6 page',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'module_efficiency_pct', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'max_system_voltage_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'voc_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'isc_a', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'vmp_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'imp_a', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'length_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'width_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'thickness_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'weight_kg', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'cell_technology', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
      'number_of_cells', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'operating_temperature_range_c', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'product_warranty_years', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'performance_warranty_years', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'performance_warranty_end_pct', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (LONGi datasheet LR7-72HTH 620~630M, Scientist, 20240511 V2, linked from the official Hi-MO X6 page) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet states the cell layout (144, 6×24) but not the cell type; the cell technology wording follows the official Hi-MO X6 product page and is sourced to it in field_sources. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'longi'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- LR7-72HTH-630M ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'LR7-72HTH-630M',
  'LONGi Hi-MO X6 Scientist LR7-72HTH-630M (630 W)',
  'Single-glass 144-half-cell module of LONGi''s Hi-MO X6 Scientist series for the distribution market. Specifications from the LONGi May 2024 datasheet (V2).',
  'Hi-MO X6 Scientist',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 630, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.3, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 53.02, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.07, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 44.78, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.07, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.5, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "Mono-crystalline half-cell, single glass (Hi-MO X6 series; the datasheet states the 144-cell 6×24 layout, the Hi-MO X6 page describes the series'' HPBC back-contact cells)"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.28, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 15, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 89.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.23, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.05, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max, printed as <1 %)"}'::jsonb,
      'annual_degradation_year_2_25_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 25, "unit": "A"}'::jsonb,
      'glass', '{"value": "Single glass, 3.2 mm coated tempered glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy frame"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'hail_test', '{"value": "25 mm hailstone at 23 m/s"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (single glass, mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
    'datasheet_url', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
    'manufacturer_doc_url', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
    'manufacturer_url', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
    'manufacturer_source_note', 'LONGi datasheet LR7-72HTH 620~630M, Scientist, 20240511 V2, linked from the official Hi-MO X6 page',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'module_efficiency_pct', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'max_system_voltage_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'voc_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'isc_a', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'vmp_v', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'imp_a', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'length_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'width_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'thickness_mm', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'weight_kg', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'cell_technology', 'https://www.longi.com/en/products/modules/hi-mo-x6/',
      'number_of_cells', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'operating_temperature_range_c', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'product_warranty_years', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'performance_warranty_years', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf',
      'performance_warranty_end_pct', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (LONGi datasheet LR7-72HTH 620~630M, Scientist, 20240511 V2, linked from the official Hi-MO X6 page) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet states the cell layout (144, 6×24) but not the cell type; the cell technology wording follows the official Hi-MO X6 product page and is sourced to it in field_sources. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'longi'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- Provenance rows for the Hi-MO X6 Scientist rows (delete-then-insert keeps the file re-runnable)
delete from solar_product_sources s using solar_products p, manufacturers m
  where s.product_id = p.id and p.manufacturer_id = m.id and m.slug = 'longi' and p.model in ('LR7-72HTH-620M', 'LR7-72HTH-625M', 'LR7-72HTH-630M')
    and s.retrieved_at = date '2026-09-22' and s.source_type in ('official_manufacturer_datasheet', 'official_manufacturer_product_page');
insert into solar_product_sources (product_id, source_type, source_url, document_name, document_version, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_datasheet', 'https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf', 'LONGi datasheet LR7-72HTH 620~630M, Scientist, 20240511 V2, linked from the official Hi-MO X6 page', '20240511 V2', date '2026-09-22', array['rated_power_w', 'module_efficiency_pct', 'max_system_voltage_v', 'voc_v', 'isc_a', 'vmp_v', 'imp_a', 'length_mm', 'width_mm', 'thickness_mm', 'weight_kg', 'cell_technology', 'number_of_cells', 'temperature_coefficient_pmax_pct_per_c', 'operating_temperature_range_c', 'product_warranty_years', 'performance_warranty_years', 'performance_warranty_end_pct'], 'Text layer present. Source for every technical specification of the three LONGi LR7-72HTH rows.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'longi' and p.model in ('LR7-72HTH-620M', 'LR7-72HTH-625M', 'LR7-72HTH-630M');
insert into solar_product_sources (product_id, source_type, source_url, document_name, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_product_page', 'https://www.longi.com/en/products/modules/hi-mo-x6/', 'Manufacturer product page', date '2026-09-22', '{}'::text[],
  'The official page the datasheet is linked from. No product render was taken from it.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'longi' and p.model in ('LR7-72HTH-620M', 'LR7-72HTH-625M', 'LR7-72HTH-630M');

-- JKM610N-66HL4M-(V) ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JKM610N-66HL4M-(V)',
  'JinkoSolar Tiger Neo JKM610N-66HL4M-(V) (610 W mono-facial)',
  'N-type TOPCon mono-facial module, 66 half-cell pairs (132 cells), HOT 3.0 technology. Specifications from the JinkoSolar 2024 datasheet.',
  'Tiger Neo',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 610, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.58, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 48.63, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 16.01, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.56, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 15.04, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 35, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.2, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline TOPCon, half-cell, mono-facial"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells (66×2)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +70"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'max_system_voltage_note', '{"value": "1000/1500 VDC (IEC) as printed; 1500 stored"}'::jsonb,
      'glass', '{"value": "3.2 mm anti-reflection coated, high-transmission, low-iron tempered front glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'datasheet_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'manufacturer_doc_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_source_note', 'JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'module_efficiency_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'max_system_voltage_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'voc_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'isc_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'vmp_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'imp_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'length_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'width_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'thickness_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'weight_kg', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'cell_technology', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'number_of_cells', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'operating_temperature_range_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'product_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_end_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the operating range as -40 to +70 °C and the system voltage as 1000/1500 VDC (IEC); both stored as printed. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'jinkosolar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JKM615N-66HL4M-(V) ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JKM615N-66HL4M-(V)',
  'JinkoSolar Tiger Neo JKM615N-66HL4M-(V) (615 W mono-facial)',
  'N-type TOPCon mono-facial module, 66 half-cell pairs (132 cells), HOT 3.0 technology. Specifications from the JinkoSolar 2024 datasheet.',
  'Tiger Neo',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 615, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.77, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 48.79, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 16.08, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.73, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 15.1, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 35, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.2, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline TOPCon, half-cell, mono-facial"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells (66×2)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +70"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'max_system_voltage_note', '{"value": "1000/1500 VDC (IEC) as printed; 1500 stored"}'::jsonb,
      'glass', '{"value": "3.2 mm anti-reflection coated, high-transmission, low-iron tempered front glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'datasheet_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'manufacturer_doc_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_source_note', 'JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'module_efficiency_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'max_system_voltage_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'voc_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'isc_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'vmp_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'imp_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'length_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'width_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'thickness_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'weight_kg', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'cell_technology', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'number_of_cells', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'operating_temperature_range_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'product_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_end_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the operating range as -40 to +70 °C and the system voltage as 1000/1500 VDC (IEC); both stored as printed. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'jinkosolar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JKM620N-66HL4M-(V) ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JKM620N-66HL4M-(V)',
  'JinkoSolar Tiger Neo JKM620N-66HL4M-(V) (620 W mono-facial)',
  'N-type TOPCon mono-facial module, 66 half-cell pairs (132 cells), HOT 3.0 technology. Specifications from the JinkoSolar 2024 datasheet.',
  'Tiger Neo',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 620, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.95, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 48.95, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 16.15, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.9, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 15.16, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 35, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.2, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline TOPCon, half-cell, mono-facial"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells (66×2)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +70"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'max_system_voltage_note', '{"value": "1000/1500 VDC (IEC) as printed; 1500 stored"}'::jsonb,
      'glass', '{"value": "3.2 mm anti-reflection coated, high-transmission, low-iron tempered front glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'datasheet_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'manufacturer_doc_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_source_note', 'JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'module_efficiency_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'max_system_voltage_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'voc_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'isc_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'vmp_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'imp_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'length_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'width_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'thickness_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'weight_kg', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'cell_technology', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'number_of_cells', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'operating_temperature_range_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'product_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_end_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the operating range as -40 to +70 °C and the system voltage as 1000/1500 VDC (IEC); both stored as printed. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'jinkosolar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JKM625N-66HL4M-(V) ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JKM625N-66HL4M-(V)',
  'JinkoSolar Tiger Neo JKM625N-66HL4M-(V) (625 W mono-facial)',
  'N-type TOPCon mono-facial module, 66 half-cell pairs (132 cells), HOT 3.0 technology. Specifications from the JinkoSolar 2024 datasheet.',
  'Tiger Neo',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 625, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.14, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 49.11, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 16.22, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 41.07, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 15.22, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 35, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.2, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline TOPCon, half-cell, mono-facial"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells (66×2)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +70"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'max_system_voltage_note', '{"value": "1000/1500 VDC (IEC) as printed; 1500 stored"}'::jsonb,
      'glass', '{"value": "3.2 mm anti-reflection coated, high-transmission, low-iron tempered front glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'datasheet_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'manufacturer_doc_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_source_note', 'JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'module_efficiency_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'max_system_voltage_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'voc_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'isc_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'vmp_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'imp_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'length_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'width_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'thickness_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'weight_kg', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'cell_technology', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'number_of_cells', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'operating_temperature_range_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'product_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_end_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the operating range as -40 to +70 °C and the system voltage as 1000/1500 VDC (IEC); both stored as printed. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'jinkosolar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JKM630N-66HL4M-(V) ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JKM630N-66HL4M-(V)',
  'JinkoSolar Tiger Neo JKM630N-66HL4M-(V) (630 W mono-facial)',
  'N-type TOPCon mono-facial module, 66 half-cell pairs (132 cells), HOT 3.0 technology. Specifications from the JinkoSolar 2024 datasheet.',
  'Tiger Neo',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 630, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.32, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 49.27, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 16.29, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 41.23, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 15.28, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 35, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.2, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline TOPCon, half-cell, mono-facial"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells (66×2)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +70"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'max_system_voltage_note', '{"value": "1000/1500 VDC (IEC) as printed; 1500 stored"}'::jsonb,
      'glass', '{"value": "3.2 mm anti-reflection coated, high-transmission, low-iron tempered front glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'datasheet_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'manufacturer_doc_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_source_note', 'JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'module_efficiency_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'max_system_voltage_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'voc_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'isc_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'vmp_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'imp_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'length_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'width_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'thickness_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'weight_kg', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'cell_technology', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'number_of_cells', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'operating_temperature_range_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'product_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_end_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the operating range as -40 to +70 °C and the system voltage as 1000/1500 VDC (IEC); both stored as printed. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'jinkosolar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JKM635N-66HL4M-(V) ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JKM635N-66HL4M-(V)',
  'JinkoSolar Tiger Neo JKM635N-66HL4M-(V) (635 W mono-facial)',
  'N-type TOPCon mono-facial module, 66 half-cell pairs (132 cells), HOT 3.0 technology. Specifications from the JinkoSolar 2024 datasheet.',
  'Tiger Neo',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 635, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.51, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 49.43, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 16.36, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 41.39, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 15.34, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 35, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 28.2, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline TOPCon, half-cell, mono-facial"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells (66×2)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +70"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'max_system_voltage_note', '{"value": "1000/1500 VDC (IEC) as printed; 1500 stored"}'::jsonb,
      'glass', '{"value": "3.2 mm anti-reflection coated, high-transmission, low-iron tempered front glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "IEC Class C"}'::jsonb,
      'bifacial', '{"value": "No (mono-facial)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'datasheet_url', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
    'manufacturer_doc_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_source_note', 'JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'module_efficiency_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'max_system_voltage_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'voc_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'isc_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'vmp_v', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'imp_a', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'length_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'width_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'thickness_mm', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'weight_kg', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'cell_technology', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'number_of_cells', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'operating_temperature_range_c', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'product_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_years', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf',
      'performance_warranty_end_pct', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the operating range as -40 to +70 °C and the system voltage as 1000/1500 VDC (IEC); both stored as printed. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'jinkosolar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- Provenance rows for the Tiger Neo rows (delete-then-insert keeps the file re-runnable)
delete from solar_product_sources s using solar_products p, manufacturers m
  where s.product_id = p.id and p.manufacturer_id = m.id and m.slug = 'jinkosolar' and p.model in ('JKM610N-66HL4M-(V)', 'JKM615N-66HL4M-(V)', 'JKM620N-66HL4M-(V)', 'JKM625N-66HL4M-(V)', 'JKM630N-66HL4M-(V)', 'JKM635N-66HL4M-(V)')
    and s.retrieved_at = date '2026-09-22' and s.source_type in ('official_manufacturer_datasheet', 'official_manufacturer_product_page');
insert into solar_product_sources (product_id, source_type, source_url, document_name, document_version, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_datasheet', 'https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf', 'JinkoSolar datasheet JKM610-635N-66HL4M-(V)-F2-EN, © 2024, from jinkosolar.com/uploads', 'JKM610-635N-66HL4M-(V)-F2-EN, © 2024', date '2026-09-22', array['rated_power_w', 'module_efficiency_pct', 'max_system_voltage_v', 'voc_v', 'isc_a', 'vmp_v', 'imp_a', 'length_mm', 'width_mm', 'thickness_mm', 'weight_kg', 'cell_technology', 'number_of_cells', 'temperature_coefficient_pmax_pct_per_c', 'operating_temperature_range_c', 'product_warranty_years', 'performance_warranty_years', 'performance_warranty_end_pct'], 'Text layer present. Source for every technical specification of the six Jinko 66HL4M-(V) rows.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'jinkosolar' and p.model in ('JKM610N-66HL4M-(V)', 'JKM615N-66HL4M-(V)', 'JKM620N-66HL4M-(V)', 'JKM625N-66HL4M-(V)', 'JKM630N-66HL4M-(V)', 'JKM635N-66HL4M-(V)');
insert into solar_product_sources (product_id, source_type, source_url, document_name, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_product_page', 'https://www.jinkosolar.com/en/site/tigerneo', 'Manufacturer product page', date '2026-09-22', '{}'::text[],
  'The official page the datasheet is linked from. No product render was taken from it.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'jinkosolar' and p.model in ('JKM610N-66HL4M-(V)', 'JKM615N-66HL4M-(V)', 'JKM620N-66HL4M-(V)', 'JKM625N-66HL4M-(V)', 'JKM630N-66HL4M-(V)', 'JKM635N-66HL4M-(V)');

-- JAM72D42-625/LB ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JAM72D42-625/LB',
  'JA Solar DeepBlue 4.0 Pro JAM72D42-625/LB (625 W bifacial)',
  'N-type bifacial double-glass module, 144 half-cells (6×24), MBB half-cell technology. Specifications from the JA Solar November 2024 datasheet.',
  'DeepBlue 4.0 Pro',
  array['https://www.jasolar.eu/fileadmin/data/4.0/JAM72D42_LB/JAM_72_D42_LB_winkel_vorne.jpg'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 625, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.4, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 52.27, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.16, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 43.71, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.3, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2465, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 34.6, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline, MBB half-cell, bifacial double glass"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm front glass / 2.0 mm back glass"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 diodes"}'::jsonb,
      'connector', '{"value": "QC 4.10-351 / MC4-EVO2A"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL Type 29 / Class C"}'::jsonb,
      'bifacial', '{"value": "Yes (double glass, bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'datasheet_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'manufacturer_doc_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_source_note', 'JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'module_efficiency_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'max_system_voltage_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'voc_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'isc_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'vmp_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'imp_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'length_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'width_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'thickness_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'weight_kg', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'cell_technology', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'number_of_cells', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'operating_temperature_range_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'product_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_end_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'images', 'https://www.jasolar.eu/en/products/jam72d42-lb'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. Unlike the JAM54D40 sheet imported earlier, this PDF has a text layer; the STC table was read from it and each Vmp × Imp checked against Pmax. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'ja-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JAM72D42-630/LB ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JAM72D42-630/LB',
  'JA Solar DeepBlue 4.0 Pro JAM72D42-630/LB (630 W bifacial)',
  'N-type bifacial double-glass module, 144 half-cells (6×24), MBB half-cell technology. Specifications from the JA Solar November 2024 datasheet.',
  'DeepBlue 4.0 Pro',
  array['https://www.jasolar.eu/fileadmin/data/4.0/JAM72D42_LB/JAM_72_D42_LB_winkel_vorne.jpg'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 630, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.5, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 52.47, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.21, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 43.9, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.35, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2465, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 34.6, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline, MBB half-cell, bifacial double glass"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm front glass / 2.0 mm back glass"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 diodes"}'::jsonb,
      'connector', '{"value": "QC 4.10-351 / MC4-EVO2A"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL Type 29 / Class C"}'::jsonb,
      'bifacial', '{"value": "Yes (double glass, bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'datasheet_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'manufacturer_doc_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_source_note', 'JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'module_efficiency_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'max_system_voltage_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'voc_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'isc_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'vmp_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'imp_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'length_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'width_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'thickness_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'weight_kg', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'cell_technology', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'number_of_cells', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'operating_temperature_range_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'product_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_end_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'images', 'https://www.jasolar.eu/en/products/jam72d42-lb'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. Unlike the JAM54D40 sheet imported earlier, this PDF has a text layer; the STC table was read from it and each Vmp × Imp checked against Pmax. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'ja-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JAM72D42-635/LB ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JAM72D42-635/LB',
  'JA Solar DeepBlue 4.0 Pro JAM72D42-635/LB (635 W bifacial)',
  'N-type bifacial double-glass module, 144 half-cells (6×24), MBB half-cell technology. Specifications from the JA Solar November 2024 datasheet.',
  'DeepBlue 4.0 Pro',
  array['https://www.jasolar.eu/fileadmin/data/4.0/JAM72D42_LB/JAM_72_D42_LB_winkel_vorne.jpg'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 635, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.7, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 52.67, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.26, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 44.1, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.4, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2465, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 34.6, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline, MBB half-cell, bifacial double glass"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm front glass / 2.0 mm back glass"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 diodes"}'::jsonb,
      'connector', '{"value": "QC 4.10-351 / MC4-EVO2A"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL Type 29 / Class C"}'::jsonb,
      'bifacial', '{"value": "Yes (double glass, bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'datasheet_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'manufacturer_doc_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_source_note', 'JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'module_efficiency_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'max_system_voltage_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'voc_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'isc_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'vmp_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'imp_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'length_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'width_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'thickness_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'weight_kg', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'cell_technology', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'number_of_cells', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'operating_temperature_range_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'product_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_end_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'images', 'https://www.jasolar.eu/en/products/jam72d42-lb'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. Unlike the JAM54D40 sheet imported earlier, this PDF has a text layer; the STC table was read from it and each Vmp × Imp checked against Pmax. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'ja-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JAM72D42-640/LB ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JAM72D42-640/LB',
  'JA Solar DeepBlue 4.0 Pro JAM72D42-640/LB (640 W bifacial)',
  'N-type bifacial double-glass module, 144 half-cells (6×24), MBB half-cell technology. Specifications from the JA Solar November 2024 datasheet.',
  'DeepBlue 4.0 Pro',
  array['https://www.jasolar.eu/fileadmin/data/4.0/JAM72D42_LB/JAM_72_D42_LB_winkel_vorne.jpg'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 640, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.9, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 52.87, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.31, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 44.29, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.45, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2465, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 34.6, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline, MBB half-cell, bifacial double glass"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm front glass / 2.0 mm back glass"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 diodes"}'::jsonb,
      'connector', '{"value": "QC 4.10-351 / MC4-EVO2A"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL Type 29 / Class C"}'::jsonb,
      'bifacial', '{"value": "Yes (double glass, bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'datasheet_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'manufacturer_doc_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_source_note', 'JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'module_efficiency_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'max_system_voltage_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'voc_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'isc_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'vmp_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'imp_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'length_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'width_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'thickness_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'weight_kg', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'cell_technology', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'number_of_cells', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'operating_temperature_range_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'product_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_end_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'images', 'https://www.jasolar.eu/en/products/jam72d42-lb'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. Unlike the JAM54D40 sheet imported earlier, this PDF has a text layer; the STC table was read from it and each Vmp × Imp checked against Pmax. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'ja-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JAM72D42-645/LB ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JAM72D42-645/LB',
  'JA Solar DeepBlue 4.0 Pro JAM72D42-645/LB (645 W bifacial)',
  'N-type bifacial double-glass module, 144 half-cells (6×24), MBB half-cell technology. Specifications from the JA Solar November 2024 datasheet.',
  'DeepBlue 4.0 Pro',
  array['https://www.jasolar.eu/fileadmin/data/4.0/JAM72D42_LB/JAM_72_D42_LB_winkel_vorne.jpg'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 645, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.1, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 53.07, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.36, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 44.49, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.5, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2465, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 34.6, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline, MBB half-cell, bifacial double glass"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm front glass / 2.0 mm back glass"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 diodes"}'::jsonb,
      'connector', '{"value": "QC 4.10-351 / MC4-EVO2A"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL Type 29 / Class C"}'::jsonb,
      'bifacial', '{"value": "Yes (double glass, bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'datasheet_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'manufacturer_doc_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_source_note', 'JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'module_efficiency_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'max_system_voltage_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'voc_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'isc_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'vmp_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'imp_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'length_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'width_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'thickness_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'weight_kg', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'cell_technology', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'number_of_cells', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'operating_temperature_range_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'product_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_end_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'images', 'https://www.jasolar.eu/en/products/jam72d42-lb'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. Unlike the JAM54D40 sheet imported earlier, this PDF has a text layer; the STC table was read from it and each Vmp × Imp checked against Pmax. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'ja-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JAM72D42-650/LB ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JAM72D42-650/LB',
  'JA Solar DeepBlue 4.0 Pro JAM72D42-650/LB (650 W bifacial)',
  'N-type bifacial double-glass module, 144 half-cells (6×24), MBB half-cell technology. Specifications from the JA Solar November 2024 datasheet.',
  'DeepBlue 4.0 Pro',
  array['https://www.jasolar.eu/fileadmin/data/4.0/JAM72D42_LB/JAM_72_D42_LB_winkel_vorne.jpg'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 650, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.3, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 53.27, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.41, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 44.67, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.55, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2465, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 34.6, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline, MBB half-cell, bifacial double glass"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells (6×24)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm front glass / 2.0 mm back glass"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 diodes"}'::jsonb,
      'connector', '{"value": "QC 4.10-351 / MC4-EVO2A"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL Type 29 / Class C"}'::jsonb,
      'bifacial', '{"value": "Yes (double glass, bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'datasheet_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
    'manufacturer_doc_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_url', 'https://www.jasolar.eu/en/products/jam72d42-lb',
    'manufacturer_source_note', 'JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'module_efficiency_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'max_system_voltage_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'voc_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'isc_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'vmp_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'imp_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'length_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'width_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'thickness_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'weight_kg', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'cell_technology', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'number_of_cells', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'operating_temperature_range_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'product_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'performance_warranty_end_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf',
      'images', 'https://www.jasolar.eu/en/products/jam72d42-lb'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. Unlike the JAM54D40 sheet imported earlier, this PDF has a text layer; the STC table was read from it and each Vmp × Imp checked against Pmax. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'ja-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- Provenance rows for the DeepBlue 4.0 Pro rows (delete-then-insert keeps the file re-runnable)
delete from solar_product_sources s using solar_products p, manufacturers m
  where s.product_id = p.id and p.manufacturer_id = m.id and m.slug = 'ja-solar' and p.model in ('JAM72D42-625/LB', 'JAM72D42-630/LB', 'JAM72D42-635/LB', 'JAM72D42-640/LB', 'JAM72D42-645/LB', 'JAM72D42-650/LB')
    and s.retrieved_at = date '2026-09-22' and s.source_type in ('official_manufacturer_datasheet', 'official_manufacturer_product_page');
insert into solar_product_sources (product_id, source_type, source_url, document_name, document_version, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_datasheet', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf', 'JA Solar datasheet JAM72D42 LB, version Global-EN-20241122A, from JA Solar''s official European site', 'Global-EN-20241122A', date '2026-09-22', array['rated_power_w', 'module_efficiency_pct', 'max_system_voltage_v', 'voc_v', 'isc_a', 'vmp_v', 'imp_a', 'length_mm', 'width_mm', 'thickness_mm', 'weight_kg', 'cell_technology', 'number_of_cells', 'temperature_coefficient_pmax_pct_per_c', 'operating_temperature_range_c', 'product_warranty_years', 'performance_warranty_years', 'performance_warranty_end_pct'], 'From JA Solar''s official European site (jasolar.com refuses automated requests). Text layer present. Source for every technical specification of the six JA JAM72D42 rows.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'ja-solar' and p.model in ('JAM72D42-625/LB', 'JAM72D42-630/LB', 'JAM72D42-635/LB', 'JAM72D42-640/LB', 'JAM72D42-645/LB', 'JAM72D42-650/LB');
insert into solar_product_sources (product_id, source_type, source_url, document_name, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_product_page', 'https://www.jasolar.eu/en/products/jam72d42-lb', 'Manufacturer product page', date '2026-09-22', array['images'],
  'The official page the datasheet is linked from; also the page that serves the product render stored in images.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'ja-solar' and p.model in ('JAM72D42-625/LB', 'JAM72D42-630/LB', 'JAM72D42-635/LB', 'JAM72D42-640/LB', 'JAM72D42-645/LB', 'JAM72D42-650/LB');

-- TSM-700NEG21C.20 ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'TSM-700NEG21C.20',
  'Trina Solar Vertex N TSM-700NEG21C.20 (700 W bifacial)',
  'N-type i-TOPCon bifacial dual-glass module on the 210 mm platform, 132 cells. Specifications from the Trina Solar 2024 APAC datasheet (version B).',
  'Vertex N',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 700, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.5, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 48.6, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 18.32, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.5, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 17.29, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2384, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1303, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 33, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 38.3, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type i-TOPCon mono-crystalline, half-cut, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.24, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.04, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 43, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +5"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm AR-coated heat-strengthened front glass / 2.0 mm heat-strengthened back glass (white coating)"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68 rated"}'::jsonb,
      'connector', '{"value": "TS4 Plus / TS4"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'datasheet_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_source_note', 'Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'module_efficiency_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'max_system_voltage_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'voc_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'isc_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'vmp_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'imp_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'length_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'width_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'thickness_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'weight_kg', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'cell_technology', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'number_of_cells', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'operating_temperature_range_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'product_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_end_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The 2025 edition of this datasheet (715–740 W) was not reachable (HTTP 404), so the 2024 B edition the static server serves was used. No product page for this series could be opened without JavaScript; the manufacturer URL is the official site''s home page. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'trina-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- TSM-705NEG21C.20 ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'TSM-705NEG21C.20',
  'Trina Solar Vertex N TSM-705NEG21C.20 (705 W bifacial)',
  'N-type i-TOPCon bifacial dual-glass module on the 210 mm platform, 132 cells. Specifications from the Trina Solar 2024 APAC datasheet (version B).',
  'Vertex N',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 705, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.7, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 48.8, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 18.36, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.7, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 17.33, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2384, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1303, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 33, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 38.3, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type i-TOPCon mono-crystalline, half-cut, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.24, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.04, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 43, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +5"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm AR-coated heat-strengthened front glass / 2.0 mm heat-strengthened back glass (white coating)"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68 rated"}'::jsonb,
      'connector', '{"value": "TS4 Plus / TS4"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'datasheet_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_source_note', 'Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'module_efficiency_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'max_system_voltage_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'voc_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'isc_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'vmp_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'imp_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'length_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'width_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'thickness_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'weight_kg', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'cell_technology', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'number_of_cells', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'operating_temperature_range_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'product_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_end_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The 2025 edition of this datasheet (715–740 W) was not reachable (HTTP 404), so the 2024 B edition the static server serves was used. No product page for this series could be opened without JavaScript; the manufacturer URL is the official site''s home page. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'trina-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- TSM-710NEG21C.20 ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'TSM-710NEG21C.20',
  'Trina Solar Vertex N TSM-710NEG21C.20 (710 W bifacial)',
  'N-type i-TOPCon bifacial dual-glass module on the 210 mm platform, 132 cells. Specifications from the Trina Solar 2024 APAC datasheet (version B).',
  'Vertex N',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 710, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.9, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 49.0, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 18.4, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.9, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 17.36, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2384, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1303, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 33, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 38.3, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type i-TOPCon mono-crystalline, half-cut, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.24, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.04, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 43, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +5"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm AR-coated heat-strengthened front glass / 2.0 mm heat-strengthened back glass (white coating)"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68 rated"}'::jsonb,
      'connector', '{"value": "TS4 Plus / TS4"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'datasheet_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_source_note', 'Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'module_efficiency_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'max_system_voltage_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'voc_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'isc_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'vmp_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'imp_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'length_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'width_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'thickness_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'weight_kg', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'cell_technology', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'number_of_cells', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'operating_temperature_range_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'product_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_end_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The 2025 edition of this datasheet (715–740 W) was not reachable (HTTP 404), so the 2024 B edition the static server serves was used. No product page for this series could be opened without JavaScript; the manufacturer URL is the official site''s home page. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'trina-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- TSM-715NEG21C.20 ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'TSM-715NEG21C.20',
  'Trina Solar Vertex N TSM-715NEG21C.20 (715 W bifacial)',
  'N-type i-TOPCon bifacial dual-glass module on the 210 mm platform, 132 cells. Specifications from the Trina Solar 2024 APAC datasheet (version B).',
  'Vertex N',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 715, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.0, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 49.2, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 18.44, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 41.1, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 17.4, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2384, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1303, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 33, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 38.3, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type i-TOPCon mono-crystalline, half-cut, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.24, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.04, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 43, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +5"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm AR-coated heat-strengthened front glass / 2.0 mm heat-strengthened back glass (white coating)"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68 rated"}'::jsonb,
      'connector', '{"value": "TS4 Plus / TS4"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'datasheet_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_source_note', 'Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'module_efficiency_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'max_system_voltage_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'voc_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'isc_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'vmp_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'imp_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'length_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'width_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'thickness_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'weight_kg', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'cell_technology', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'number_of_cells', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'operating_temperature_range_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'product_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_end_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The 2025 edition of this datasheet (715–740 W) was not reachable (HTTP 404), so the 2024 B edition the static server serves was used. No product page for this series could be opened without JavaScript; the manufacturer URL is the official site''s home page. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'trina-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- TSM-720NEG21C.20 ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'TSM-720NEG21C.20',
  'Trina Solar Vertex N TSM-720NEG21C.20 (720 W bifacial)',
  'N-type i-TOPCon bifacial dual-glass module on the 210 mm platform, 132 cells. Specifications from the Trina Solar 2024 APAC datasheet (version B).',
  'Vertex N',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 720, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.2, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 49.4, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 18.49, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 41.3, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 17.44, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2384, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1303, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 33, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 38.3, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type i-TOPCon mono-crystalline, half-cut, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.24, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.04, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 43, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +5"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm AR-coated heat-strengthened front glass / 2.0 mm heat-strengthened back glass (white coating)"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68 rated"}'::jsonb,
      'connector', '{"value": "TS4 Plus / TS4"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'datasheet_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_source_note', 'Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'module_efficiency_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'max_system_voltage_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'voc_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'isc_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'vmp_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'imp_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'length_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'width_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'thickness_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'weight_kg', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'cell_technology', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'number_of_cells', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'operating_temperature_range_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'product_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_end_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The 2025 edition of this datasheet (715–740 W) was not reachable (HTTP 404), so the 2024 B edition the static server serves was used. No product page for this series could be opened without JavaScript; the manufacturer URL is the official site''s home page. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'trina-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- TSM-725NEG21C.20 ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'TSM-725NEG21C.20',
  'Trina Solar Vertex N TSM-725NEG21C.20 (725 W bifacial)',
  'N-type i-TOPCon bifacial dual-glass module on the 210 mm platform, 132 cells. Specifications from the Trina Solar 2024 APAC datasheet (version B).',
  'Vertex N',
  '{}'::text[],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 725, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.3, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 49.6, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 18.54, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 41.5, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 17.47, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2384, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1303, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 33, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 38.3, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type i-TOPCon mono-crystalline, half-cut, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.24, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.04, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 43, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +5"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm AR-coated heat-strengthened front glass / 2.0 mm heat-strengthened back glass (white coating)"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68 rated"}'::jsonb,
      'connector', '{"value": "TS4 Plus / TS4"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'datasheet_url', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
    'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_source_note', 'Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'module_efficiency_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'max_system_voltage_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'voc_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'isc_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'vmp_v', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'imp_a', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'length_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'width_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'thickness_mm', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'weight_kg', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'cell_technology', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'number_of_cells', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'operating_temperature_range_c', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'product_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_years', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf',
      'performance_warranty_end_pct', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The 2025 edition of this datasheet (715–740 W) was not reachable (HTTP 404), so the 2024 B edition the static server serves was used. No product page for this series could be opened without JavaScript; the manufacturer URL is the official site''s home page. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'trina-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- Provenance rows for the Vertex N rows (delete-then-insert keeps the file re-runnable)
delete from solar_product_sources s using solar_products p, manufacturers m
  where s.product_id = p.id and p.manufacturer_id = m.id and m.slug = 'trina-solar' and p.model in ('TSM-700NEG21C.20', 'TSM-705NEG21C.20', 'TSM-710NEG21C.20', 'TSM-715NEG21C.20', 'TSM-720NEG21C.20', 'TSM-725NEG21C.20')
    and s.retrieved_at = date '2026-09-22' and s.source_type in ('official_manufacturer_datasheet', 'official_manufacturer_product_page');
insert into solar_product_sources (product_id, source_type, source_url, document_name, document_version, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_datasheet', 'https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf', 'Trina Solar datasheet Vertex N TSM-NEG21C.20 700-725W, version TSM_APAC_EN_2024_B', 'TSM_APAC_EN_2024_B', date '2026-09-22', array['rated_power_w', 'module_efficiency_pct', 'max_system_voltage_v', 'voc_v', 'isc_a', 'vmp_v', 'imp_a', 'length_mm', 'width_mm', 'thickness_mm', 'weight_kg', 'cell_technology', 'number_of_cells', 'temperature_coefficient_pmax_pct_per_c', 'operating_temperature_range_c', 'product_warranty_years', 'performance_warranty_years', 'performance_warranty_end_pct'], 'Text layer present; the STC table''s values are interleaved with NOCT and BNPI columns in the extracted text and were paired by Vmp × Imp ≈ Pmax. Source for every technical specification of the six Trina NEG21C.20 rows.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'trina-solar' and p.model in ('TSM-700NEG21C.20', 'TSM-705NEG21C.20', 'TSM-710NEG21C.20', 'TSM-715NEG21C.20', 'TSM-720NEG21C.20', 'TSM-725NEG21C.20');
insert into solar_product_sources (product_id, source_type, source_url, document_name, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_product_page', 'https://www.trinasolar.com/en-glb/', 'Manufacturer product page', date '2026-09-22', '{}'::text[],
  'The official page the datasheet is linked from. No product render was taken from it.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'trina-solar' and p.model in ('TSM-700NEG21C.20', 'TSM-705NEG21C.20', 'TSM-710NEG21C.20', 'TSM-715NEG21C.20', 'TSM-720NEG21C.20', 'TSM-725NEG21C.20');

-- CS6.2-66TB-590H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.2-66TB-590H',
  'Canadian Solar TOPBiHiKu6 CS6.2-66TB-590H (590 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 132 cells [2 × (11 × 6)]. Specifications from the Canadian Solar April 2026 datasheet (US regional edition).',
  'TOPBiHiKu6',
  array['https://www.canadiansolar.com/na/wp-content/uploads/sites/3/2020/06/TOPBiHiKu6-Detailed.png'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 590, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 21.8, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 47.2, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.73, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.0, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.76, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 40, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 33.4, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells [2 × (11 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": null, "status": "unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 41, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm heat-strengthened front glass with anti-reflective coating / 2.0 mm heat-strengthened back glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'connector', '{"value": "T6 or MC4-EVO2 or MC4-EVO2A"}'::jsonb,
      'snow_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 5400, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL 61730 Type 29 / IEC 61730 Class C"}'::jsonb,
      'product_warranty_note', '{"value": "12-year enhanced product warranty on materials and workmanship, according to the applicable Canadian Solar Limited Warranty Statement (regional)"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'images', 'https://www.canadiansolar.com/na/topbihiku6/'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed, as for the TOPHiKu6 rows. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- CS6.2-66TB-595H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.2-66TB-595H',
  'Canadian Solar TOPBiHiKu6 CS6.2-66TB-595H (595 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 132 cells [2 × (11 × 6)]. Specifications from the Canadian Solar April 2026 datasheet (US regional edition).',
  'TOPBiHiKu6',
  array['https://www.canadiansolar.com/na/wp-content/uploads/sites/3/2020/06/TOPBiHiKu6-Detailed.png'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 595, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.0, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 47.4, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.79, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.2, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.81, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 40, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 33.4, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells [2 × (11 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": null, "status": "unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 41, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm heat-strengthened front glass with anti-reflective coating / 2.0 mm heat-strengthened back glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'connector', '{"value": "T6 or MC4-EVO2 or MC4-EVO2A"}'::jsonb,
      'snow_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 5400, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL 61730 Type 29 / IEC 61730 Class C"}'::jsonb,
      'product_warranty_note', '{"value": "12-year enhanced product warranty on materials and workmanship, according to the applicable Canadian Solar Limited Warranty Statement (regional)"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'images', 'https://www.canadiansolar.com/na/topbihiku6/'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed, as for the TOPHiKu6 rows. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- CS6.2-66TB-600H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.2-66TB-600H',
  'Canadian Solar TOPBiHiKu6 CS6.2-66TB-600H (600 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 132 cells [2 × (11 × 6)]. Specifications from the Canadian Solar April 2026 datasheet (US regional edition).',
  'TOPBiHiKu6',
  array['https://www.canadiansolar.com/na/wp-content/uploads/sites/3/2020/06/TOPBiHiKu6-Detailed.png'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 600, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.2, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 47.6, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.85, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.4, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.86, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 40, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 33.4, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells [2 × (11 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": null, "status": "unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 41, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm heat-strengthened front glass with anti-reflective coating / 2.0 mm heat-strengthened back glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'connector', '{"value": "T6 or MC4-EVO2 or MC4-EVO2A"}'::jsonb,
      'snow_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 5400, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL 61730 Type 29 / IEC 61730 Class C"}'::jsonb,
      'product_warranty_note', '{"value": "12-year enhanced product warranty on materials and workmanship, according to the applicable Canadian Solar Limited Warranty Statement (regional)"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'images', 'https://www.canadiansolar.com/na/topbihiku6/'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed, as for the TOPHiKu6 rows. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- CS6.2-66TB-605H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.2-66TB-605H',
  'Canadian Solar TOPBiHiKu6 CS6.2-66TB-605H (605 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 132 cells [2 × (11 × 6)]. Specifications from the Canadian Solar April 2026 datasheet (US regional edition).',
  'TOPBiHiKu6',
  array['https://www.canadiansolar.com/na/wp-content/uploads/sites/3/2020/06/TOPBiHiKu6-Detailed.png'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 605, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.4, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 47.8, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.91, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.6, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.91, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 40, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 33.4, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells [2 × (11 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": null, "status": "unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 41, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm heat-strengthened front glass with anti-reflective coating / 2.0 mm heat-strengthened back glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'connector', '{"value": "T6 or MC4-EVO2 or MC4-EVO2A"}'::jsonb,
      'snow_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 5400, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL 61730 Type 29 / IEC 61730 Class C"}'::jsonb,
      'product_warranty_note', '{"value": "12-year enhanced product warranty on materials and workmanship, according to the applicable Canadian Solar Limited Warranty Statement (regional)"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'images', 'https://www.canadiansolar.com/na/topbihiku6/'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed, as for the TOPHiKu6 rows. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- CS6.2-66TB-610H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.2-66TB-610H',
  'Canadian Solar TOPBiHiKu6 CS6.2-66TB-610H (610 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 132 cells [2 × (11 × 6)]. Specifications from the Canadian Solar April 2026 datasheet (US regional edition).',
  'TOPBiHiKu6',
  array['https://www.canadiansolar.com/na/wp-content/uploads/sites/3/2020/06/TOPBiHiKu6-Detailed.png'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 610, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.6, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 48.0, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.97, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 40.8, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.96, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 40, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 33.4, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells [2 × (11 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": null, "status": "unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 41, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm heat-strengthened front glass with anti-reflective coating / 2.0 mm heat-strengthened back glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'connector', '{"value": "T6 or MC4-EVO2 or MC4-EVO2A"}'::jsonb,
      'snow_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 5400, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL 61730 Type 29 / IEC 61730 Class C"}'::jsonb,
      'product_warranty_note', '{"value": "12-year enhanced product warranty on materials and workmanship, according to the applicable Canadian Solar Limited Warranty Statement (regional)"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'images', 'https://www.canadiansolar.com/na/topbihiku6/'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed, as for the TOPHiKu6 rows. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- CS6.2-66TB-615H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.2-66TB-615H',
  'Canadian Solar TOPBiHiKu6 CS6.2-66TB-615H (615 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 132 cells [2 × (11 × 6)]. Specifications from the Canadian Solar April 2026 datasheet (US regional edition).',
  'TOPBiHiKu6',
  array['https://www.canadiansolar.com/na/wp-content/uploads/sites/3/2020/06/TOPBiHiKu6-Detailed.png'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 615, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.8, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 48.2, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 16.02, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 41.0, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 15.01, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 40, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 33.4, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells [2 × (11 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": null, "status": "unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 41, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm heat-strengthened front glass with anti-reflective coating / 2.0 mm heat-strengthened back glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'connector', '{"value": "T6 or MC4-EVO2 or MC4-EVO2A"}'::jsonb,
      'snow_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 5400, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL 61730 Type 29 / IEC 61730 Class C"}'::jsonb,
      'product_warranty_note', '{"value": "12-year enhanced product warranty on materials and workmanship, according to the applicable Canadian Solar Limited Warranty Statement (regional)"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'images', 'https://www.canadiansolar.com/na/topbihiku6/'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed, as for the TOPHiKu6 rows. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- CS6.2-66TB-620H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description, series, images,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.2-66TB-620H',
  'Canadian Solar TOPBiHiKu6 CS6.2-66TB-620H (620 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 132 cells [2 × (11 × 6)]. Specifications from the Canadian Solar April 2026 datasheet (US regional edition).',
  'TOPBiHiKu6',
  array['https://www.canadiansolar.com/na/wp-content/uploads/sites/3/2020/06/TOPBiHiKu6-Detailed.png'],
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 620, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.0, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 48.4, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 16.08, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 41.2, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 15.06, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 2382, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 40, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 33.4, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 132, "unit": "cells [2 × (11 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 12, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": null, "status": "unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value": null, "status": "unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 41, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (power bifaciality)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "2.0 mm heat-strengthened front glass with anti-reflective coating / 2.0 mm heat-strengthened back glass"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'connector', '{"value": "T6 or MC4-EVO2 or MC4-EVO2A"}'::jsonb,
      'snow_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 5400, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'fire_rating', '{"value": "UL 61730 Type 29 / IEC 61730 Class C"}'::jsonb,
      'product_warranty_note', '{"value": "12-year enhanced product warranty on materials and workmanship, according to the applicable Canadian Solar Limited Warranty Statement (regional)"}'::jsonb,
      'bifacial', '{"value": "Yes (dual glass, power bifaciality 80 % ±5)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/topbihiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf',
      'images', 'https://www.canadiansolar.com/na/topbihiku6/'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed, as for the TOPHiKu6 rows. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, series = excluded.series, images = excluded.images,
  price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- Provenance rows for the TOPBiHiKu6 rows (delete-then-insert keeps the file re-runnable)
delete from solar_product_sources s using solar_products p, manufacturers m
  where s.product_id = p.id and p.manufacturer_id = m.id and m.slug = 'canadian-solar' and p.model in ('CS6.2-66TB-590H', 'CS6.2-66TB-595H', 'CS6.2-66TB-600H', 'CS6.2-66TB-605H', 'CS6.2-66TB-610H', 'CS6.2-66TB-615H', 'CS6.2-66TB-620H')
    and s.retrieved_at = date '2026-09-22' and s.source_type in ('official_manufacturer_datasheet', 'official_manufacturer_product_page');
insert into solar_product_sources (product_id, source_type, source_url, document_name, document_version, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_datasheet', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf', 'Canadian Solar datasheet TOPBiHiKu6 CS6.2-66TB-H, V1.1_F68_L2B_TX (April 2026, US regional edition)', 'V1.1_F68_L2B_TX, April 2026', date '2026-09-22', array['rated_power_w', 'module_efficiency_pct', 'max_system_voltage_v', 'voc_v', 'isc_a', 'vmp_v', 'imp_a', 'length_mm', 'width_mm', 'thickness_mm', 'weight_kg', 'cell_technology', 'number_of_cells', 'temperature_coefficient_pmax_pct_per_c', 'operating_temperature_range_c', 'product_warranty_years', 'performance_warranty_years'], 'US (TX) regional edition, ''Assembled in the US from imported components''. Text layer present. Electrical and mechanical figures are module figures; certificates and warranty terms are region-dependent per its own footnotes.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'canadian-solar' and p.model in ('CS6.2-66TB-590H', 'CS6.2-66TB-595H', 'CS6.2-66TB-600H', 'CS6.2-66TB-605H', 'CS6.2-66TB-610H', 'CS6.2-66TB-615H', 'CS6.2-66TB-620H');
insert into solar_product_sources (product_id, source_type, source_url, document_name, retrieved_at, fields, notes)
select p.id, 'official_manufacturer_product_page', 'https://www.canadiansolar.com/na/topbihiku6/', 'Manufacturer product page', date '2026-09-22', array['images'],
  'The official page the datasheet is linked from; also the page that serves the product render stored in images.'
from solar_products p join manufacturers m on m.id = p.manufacturer_id where m.slug = 'canadian-solar' and p.model in ('CS6.2-66TB-590H', 'CS6.2-66TB-595H', 'CS6.2-66TB-600H', 'CS6.2-66TB-605H', 'CS6.2-66TB-610H', 'CS6.2-66TB-615H', 'CS6.2-66TB-620H');

commit;

-- Rollback (manual): delete from solar_products where model in ('LR7-72HTH-620M', 'LR7-72HTH-625M', 'LR7-72HTH-630M', 'JKM610N-66HL4M-(V)', 'JKM615N-66HL4M-(V)', 'JKM620N-66HL4M-(V)', 'JKM625N-66HL4M-(V)', 'JKM630N-66HL4M-(V)', 'JKM635N-66HL4M-(V)', 'JAM72D42-625/LB', 'JAM72D42-630/LB', 'JAM72D42-635/LB', 'JAM72D42-640/LB', 'JAM72D42-645/LB', 'JAM72D42-650/LB', 'TSM-700NEG21C.20', 'TSM-705NEG21C.20', 'TSM-710NEG21C.20', 'TSM-715NEG21C.20', 'TSM-720NEG21C.20', 'TSM-725NEG21C.20', 'CS6.2-66TB-590H', 'CS6.2-66TB-595H', 'CS6.2-66TB-600H', 'CS6.2-66TB-605H', 'CS6.2-66TB-610H', 'CS6.2-66TB-615H', 'CS6.2-66TB-620H');

-- ----------------------------------------------------------------------------
-- Addendum, 2026-09-23: official product renders for the three series that had
-- none (owner: "why in marketplace the photos are not showing"). The product
-- pages need JavaScript; opened with a browser this time. Each address is the
-- image the manufacturer's own series page serves; cell counts checked against
-- the datasheet before storing. Ran against the database the same day. See
-- docs/DATA-CLEANING-LOG.md C-017.
-- ----------------------------------------------------------------------------
begin;
update solar_products p set images = array['https://jinkosolarcdn.shwebspace.com/uploads/665d7326/60-182x182%20V.jpg'],
  source = p.source || jsonb_build_object('field_sources', coalesce(p.source->'field_sources','{}'::jsonb) || jsonb_build_object('images', 'https://www.jinkosolar.com/en/site/tigerneo'), 'date_last_updated', '2026-09-23')
from manufacturers m where m.id = p.manufacturer_id and m.slug = 'jinkosolar' and p.model like 'JKM6%N-66HL4M-(V)';
update solar_product_sources s set fields = array['images'], notes = 'The official Tiger Neo page; also serves the product render stored in images (placed beside "Tiger Neo 66HC 635Wp, Efficiency 23.51%", this series; the file name reads 60 while the page places it with the 66-cell module). Render checked 2026-09-23: 6 × 22 = 132 cells.'
from solar_products p, manufacturers m where s.product_id = p.id and p.manufacturer_id = m.id and m.slug = 'jinkosolar' and p.model like 'JKM6%N-66HL4M-(V)' and s.source_type = 'official_manufacturer_product_page';
update solar_products p set images = array['https://static.longi.com/Scientist_new2_7168a03441.png'],
  source = p.source || jsonb_build_object('manufacturer_url', 'https://www.longi.com/en/products/modules/hi-mo-x6-scientist/', 'manufacturer_doc_url', 'https://www.longi.com/en/products/modules/hi-mo-x6-scientist/', 'field_sources', coalesce(p.source->'field_sources','{}'::jsonb) || jsonb_build_object('images', 'https://www.longi.com/en/products/modules/hi-mo-x6-scientist/'), 'date_last_updated', '2026-09-23')
from manufacturers m where m.id = p.manufacturer_id and m.slug = 'longi' and p.model like 'LR7-72HTH-%M';
update solar_product_sources s set source_url = 'https://www.longi.com/en/products/modules/hi-mo-x6-scientist/', fields = array['images'], notes = 'The official Hi-MO X6 Scientist series page (the series page covers LR5 and LR7 Scientist models); also serves the product render stored in images. Render checked 2026-09-23: 6 × 24 = 144 cells, back-contact front.'
from solar_products p, manufacturers m where s.product_id = p.id and p.manufacturer_id = m.id and m.slug = 'longi' and p.model like 'LR7-72HTH-%M' and s.source_type = 'official_manufacturer_product_page';
update solar_products p set images = array['https://www-cdn.trinasolar.com/wwwstorage/sites/3/720W-TSM-NEG21C.20.png'],
  source = p.source || jsonb_build_object('manufacturer_url', 'https://www.trinasolar.com/en-glb/NEG21C.20/', 'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/NEG21C.20/', 'field_sources', coalesce(p.source->'field_sources','{}'::jsonb) || jsonb_build_object('images', 'https://www.trinasolar.com/en-glb/VertexN/'), 'date_last_updated', '2026-09-23')
from manufacturers m where m.id = p.manufacturer_id and m.slug = 'trina-solar' and p.model like 'TSM-7%NEG21C.20';
update solar_product_sources s set source_url = 'https://www.trinasolar.com/en-glb/NEG21C.20/', fields = array['images'], notes = 'The official NEG21C.20 product page, opened with a browser on 2026-09-23 (the home page was recorded on import). The Vertex N series page serves the render stored in images (720W-TSM-NEG21C.20.png; checked: 6 × 22 = 132 cells). The product page links a newer datasheet, DT-M-0042-G-EN-J 2025 C (up to 740 W), not yet read; the rows follow the 2024 B edition.'
from solar_products p, manufacturers m where s.product_id = p.id and p.manufacturer_id = m.id and m.slug = 'trina-solar' and p.model like 'TSM-7%NEG21C.20' and s.source_type = 'official_manufacturer_product_page';
commit;
