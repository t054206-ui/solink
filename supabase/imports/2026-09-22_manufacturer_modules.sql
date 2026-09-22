-- ============================================================================
-- Solink — real catalogue import, 2026-09-22 (Session 8)
-- One current residential/rooftop n-type module series per manufacturer,
-- two power bins each, read from the manufacturer's OFFICIAL datasheet only:
--
--   JinkoSolar     Tiger Neo 54HL4M-BDV (495–520 W)   JKM505N / JKM520N-54HL4M-BDV
--   Trina Solar    Vertex S+ TSM-NEG9R.28 (430–460 W) TSM-445NEG9R.28 / TSM-460NEG9R.28
--   JA Solar       DeepBlue 4.0 Pro JAM54D40 LB        JAM54D40-450/LB / JAM54D40-460/LB
--   Canadian Solar TOPHiKu6 CS6.1-54TM-H (435–465 W)  CS6.1-54TM-450H / CS6.1-54TM-465H
--
-- Idempotent: ON CONFLICT (manufacturer_id, model) updates in place. Wrapped
-- in one transaction. No existing row is deleted; the LONGi rows are untouched.
-- product_versions rows are written automatically by trg_products_snapshot.
--
-- What is NOT here, on purpose: prices (no Kuwait retailer listing was found
-- for any of these models on 2026-09-22), images (no official image URL was
-- recorded), and anything the datasheet does not state. See
-- docs/DATA-CLEANING-LOG.md, import 2026-09-22, for the reading notes.
-- ============================================================================

begin;

insert into data_sources (id, name, kind, url, notes) values
  ('da100000-0000-4000-8000-000000000003', 'JinkoSolar official datasheet — Tiger Neo 54HL4M-BDV 495~520 W (JKM495-520N-54HL4M-BDV-F1-EN, © 2025)', 'datasheet', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf', 'Linked from https://www.jinkosolar.com/en/site/tigerneo (JinkoSolar CDN). Text layer present. Source for every technical specification of the two Jinko rows.'),
  ('da100000-0000-4000-8000-000000000004', 'Trina Solar official datasheet — Vertex S+ TSM-NEG9R.28 430~460 W (TSM_EN_2024_C)', 'datasheet', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf', 'Text layer present. Source for every technical specification of the two Trina rows.'),
  ('da100000-0000-4000-8000-000000000005', 'JA Solar official datasheet — DeepBlue 4.0 Pro JAM54D40 LB 435~460 W (Global-EN-20241105A)', 'datasheet', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf', 'From JA Solar''s official European site (jasolar.com refused automated requests). No text layer; both pages rendered to images and read. Source for every technical specification of the two JA rows.'),
  ('da100000-0000-4000-8000-000000000006', 'Canadian Solar official datasheet — TOPHiKu6 All-Black CS6.1-54TM-H 435~465 W (V1.4C25_F23_D2_TX, April 2025)', 'datasheet', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf', 'US (TX) regional edition of the datasheet, the one the official site links. Electrical and mechanical figures are module figures; certificates and the product-warranty term are region-dependent per its own footnotes.')
on conflict (id) do nothing;

-- JKM505N-54HL4M-BDV ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JKM505N-54HL4M-BDV',
  'JinkoSolar Tiger Neo JKM505N-54HL4M-BDV (505 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 54 half-cell pairs, HOT 3.0 technology. Specifications from the JinkoSolar 2025 datasheet.',
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 505, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.71, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 40.55, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.68, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 34.17, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.78, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 1961, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 27.0, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline TOPCon, half-cell, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 108, "unit": "cells (54×2)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +70"}'::jsonb,
    'product_warranty_years', '{"value": 15, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (Pmax)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "Dual glass, 2.0 mm anti-reflection coated front + 2.0 mm heat-strengthened back"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
    'datasheet_url', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
    'manufacturer_doc_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_source_note', 'JinkoSolar datasheet JKM495-520N-54HL4M-BDV-F1-EN, © 2025, linked from the official Tiger Neo page',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'module_efficiency_pct', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'max_system_voltage_v', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'voc_v', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'isc_a', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'vmp_v', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'imp_a', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'length_mm', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'width_mm', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'thickness_mm', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'weight_kg', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'cell_technology', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'number_of_cells', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'operating_temperature_range_c', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'product_warranty_years', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'performance_warranty_years', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'performance_warranty_end_pct', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JinkoSolar datasheet JKM495-520N-54HL4M-BDV-F1-EN, © 2025, linked from the official Tiger Neo page) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet is hosted on JinkoSolar''s content network and linked from its official Tiger Neo page; the file name in the URL reads F2 while the document itself is labelled F1-EN. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'jinkosolar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JKM520N-54HL4M-BDV ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JKM520N-54HL4M-BDV',
  'JinkoSolar Tiger Neo JKM520N-54HL4M-BDV (520 W bifacial)',
  'N-type TOPCon bifacial dual-glass module, 54 half-cell pairs, HOT 3.0 technology. Specifications from the JinkoSolar 2025 datasheet.',
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 520, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.38, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 41.06, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 15.83, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 34.83, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 14.93, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 1961, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 27.0, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono-crystalline TOPCon, half-cell, bifacial dual glass"}'::jsonb,
    'number_of_cells', '{"value": 108, "unit": "cells (54×2)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +70"}'::jsonb,
    'product_warranty_years', '{"value": 15, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5 (Pmax)"}'::jsonb,
      'max_series_fuse_a', '{"value": 35, "unit": "A"}'::jsonb,
      'glass', '{"value": "Dual glass, 2.0 mm anti-reflection coated front + 2.0 mm heat-strengthened back"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
    'datasheet_url', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
    'manufacturer_doc_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_url', 'https://www.jinkosolar.com/en/site/tigerneo',
    'manufacturer_source_note', 'JinkoSolar datasheet JKM495-520N-54HL4M-BDV-F1-EN, © 2025, linked from the official Tiger Neo page',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'module_efficiency_pct', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'max_system_voltage_v', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'voc_v', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'isc_a', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'vmp_v', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'imp_a', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'length_mm', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'width_mm', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'thickness_mm', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'weight_kg', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'cell_technology', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'number_of_cells', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'operating_temperature_range_c', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'product_warranty_years', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'performance_warranty_years', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf',
      'performance_warranty_end_pct', 'https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JinkoSolar datasheet JKM495-520N-54HL4M-BDV-F1-EN, © 2025, linked from the official Tiger Neo page) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet is hosted on JinkoSolar''s content network and linked from its official Tiger Neo page; the file name in the URL reads F2 while the document itself is labelled F1-EN. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'jinkosolar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- TSM-445NEG9R.28 ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'TSM-445NEG9R.28',
  'Trina Solar Vertex S+ TSM-445NEG9R.28 (445 W dual glass)',
  'N-type i-TOPCon dual-glass module for residential and C&I rooftops. Specifications from the Trina Solar 2024 (version C) datasheet.',
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 445, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.3, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 52.6, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 10.71, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 44.3, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 10.05, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 1762, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 21.0, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type i-TOPCon monocrystalline, dual glass"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.24, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.04, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 43, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 / +5"}'::jsonb,
      'max_series_fuse_a', '{"value": 25, "unit": "A"}'::jsonb,
      'glass', '{"value": "Dual glass, 1.6 mm AR-coated heat-strengthened front + 1.6 mm heat-strengthened back"}'::jsonb,
      'frame', '{"value": "30 mm anodized aluminium alloy, black"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'snow_load_pa', '{"value": 5400, "unit": "Pa (test load)"}'::jsonb,
      'wind_load_pa', '{"value": 4000, "unit": "Pa (test load)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    'datasheet_url', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_source_note', 'Trina Solar datasheet Vertex S+ TSM-NEG9R.28, version TSM_EN_2024_C',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'module_efficiency_pct', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'max_system_voltage_v', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'voc_v', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'isc_a', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'vmp_v', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'imp_a', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'length_mm', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'width_mm', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'thickness_mm', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'weight_kg', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'cell_technology', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'number_of_cells', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'operating_temperature_range_c', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'product_warranty_years', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'performance_warranty_years', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'performance_warranty_end_pct', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Trina Solar datasheet Vertex S+ TSM-NEG9R.28, version TSM_EN_2024_C) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet states the product warranty as ''up to 25 years'' (25-year product workmanship warranty); the plain 25 is stored and the wording kept here. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'trina-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- TSM-460NEG9R.28 ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'TSM-460NEG9R.28',
  'Trina Solar Vertex S+ TSM-460NEG9R.28 (460 W dual glass)',
  'N-type i-TOPCon dual-glass module for residential and C&I rooftops. Specifications from the Trina Solar 2024 (version C) datasheet.',
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 460, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.0, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 53.8, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 10.81, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 45.4, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 10.14, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 1762, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 21.0, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type i-TOPCon monocrystalline, dual glass"}'::jsonb,
    'number_of_cells', '{"value": 144, "unit": "cells"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.24, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.04, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 43, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 / +5"}'::jsonb,
      'max_series_fuse_a', '{"value": 25, "unit": "A"}'::jsonb,
      'glass', '{"value": "Dual glass, 1.6 mm AR-coated heat-strengthened front + 1.6 mm heat-strengthened back"}'::jsonb,
      'frame', '{"value": "30 mm anodized aluminium alloy, black"}'::jsonb,
      'junction_box', '{"value": "IP68"}'::jsonb,
      'snow_load_pa', '{"value": 5400, "unit": "Pa (test load)"}'::jsonb,
      'wind_load_pa', '{"value": 4000, "unit": "Pa (test load)"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    'datasheet_url', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
    'manufacturer_doc_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_url', 'https://www.trinasolar.com/en-glb/',
    'manufacturer_source_note', 'Trina Solar datasheet Vertex S+ TSM-NEG9R.28, version TSM_EN_2024_C',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'module_efficiency_pct', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'max_system_voltage_v', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'voc_v', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'isc_a', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'vmp_v', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'imp_a', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'length_mm', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'width_mm', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'thickness_mm', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'weight_kg', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'cell_technology', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'number_of_cells', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'operating_temperature_range_c', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'product_warranty_years', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'performance_warranty_years', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf',
      'performance_warranty_end_pct', 'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Trina Solar datasheet Vertex S+ TSM-NEG9R.28, version TSM_EN_2024_C) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet states the product warranty as ''up to 25 years'' (25-year product workmanship warranty); the plain 25 is stored and the wording kept here. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'trina-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JAM54D40-450/LB ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JAM54D40-450/LB',
  'JA Solar DeepBlue 4.0 Pro JAM54D40-450/LB (450 W bifacial)',
  'N-type double-glass bifacial module, 108 half-cells, Bycium+ cell technology. Specifications from the JA Solar Global-EN-20241105A datasheet.',
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 450, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.5, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 39.3, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 14.48, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 32.82, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 13.71, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 1762, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 22, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono (Bycium+), MBB half-cell, bifacial double glass"}'::jsonb,
    'number_of_cells', '{"value": 108, "unit": "cells (6×18)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'glass', '{"value": "Double glass, 1.6 mm front + 1.6 mm back"}'::jsonb,
      'junction_box', '{"value": "IP68, three diodes"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'safety_class', '{"value": "Class II"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
    'datasheet_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
    'manufacturer_doc_url', 'https://www.jasolar.eu/en/products/jam54d40-lb-25y',
    'manufacturer_url', 'https://www.jasolar.eu/en/products/jam54d40-lb-25y',
    'manufacturer_source_note', 'JA Solar datasheet JAM54D40 LB, version Global-EN-20241105A, from JA Solar''s official European site',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'module_efficiency_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'max_system_voltage_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'voc_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'isc_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'vmp_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'imp_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'length_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'width_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'thickness_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'weight_kg', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'cell_technology', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'number_of_cells', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'operating_temperature_range_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'product_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'performance_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'performance_warranty_end_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JA Solar datasheet JAM54D40 LB, version Global-EN-20241105A, from JA Solar''s official European site) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The PDF has no text layer; both pages were rendered to images and the tables read from the render. jasolar.com answered HTTP 403/406 to automated requests, so the document was taken from jasolar.eu, JA Solar''s own European site. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'ja-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- JAM54D40-460/LB ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'JAM54D40-460/LB',
  'JA Solar DeepBlue 4.0 Pro JAM54D40-460/LB (460 W bifacial)',
  'N-type double-glass bifacial module, 108 half-cells, Bycium+ cell technology. Specifications from the JA Solar Global-EN-20241105A datasheet.',
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 460, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 23.0, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1500, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 39.7, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 14.64, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 33.17, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 13.87, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 1762, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 30, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 22, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type mono (Bycium+), MBB half-cell, bifacial double glass"}'::jsonb,
    'number_of_cells', '{"value": 108, "unit": "cells (6×18)"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value": 87.4, "unit": "%"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.045, "unit": "%/°C"}'::jsonb,
      'noct_c', '{"value": 45, "unit": "°C ±2"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_pct', '{"value": "0 ~ +3"}'::jsonb,
      'bifaciality_pct', '{"value": 80, "unit": "% ±5"}'::jsonb,
      'max_series_fuse_a', '{"value": 30, "unit": "A"}'::jsonb,
      'glass', '{"value": "Double glass, 1.6 mm front + 1.6 mm back"}'::jsonb,
      'junction_box', '{"value": "IP68, three diodes"}'::jsonb,
      'front_load_pa', '{"value": 5400, "unit": "Pa"}'::jsonb,
      'rear_load_pa', '{"value": 2400, "unit": "Pa"}'::jsonb,
      'safety_class', '{"value": "Class II"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
    'datasheet_url', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
    'manufacturer_doc_url', 'https://www.jasolar.eu/en/products/jam54d40-lb-25y',
    'manufacturer_url', 'https://www.jasolar.eu/en/products/jam54d40-lb-25y',
    'manufacturer_source_note', 'JA Solar datasheet JAM54D40 LB, version Global-EN-20241105A, from JA Solar''s official European site',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'module_efficiency_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'max_system_voltage_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'voc_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'isc_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'vmp_v', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'imp_a', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'length_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'width_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'thickness_mm', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'weight_kg', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'cell_technology', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'number_of_cells', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'operating_temperature_range_c', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'product_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'performance_warranty_years', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf',
      'performance_warranty_end_pct', 'https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (JA Solar datasheet JAM54D40 LB, version Global-EN-20241105A, from JA Solar''s official European site) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The PDF has no text layer; both pages were rendered to images and the tables read from the render. jasolar.com answered HTTP 403/406 to automated requests, so the document was taken from jasolar.eu, JA Solar''s own European site. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'ja-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- CS6.1-54TM-450H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.1-54TM-450H',
  'Canadian Solar TOPHiKu6 CS6.1-54TM-450H (450 W all-black)',
  'N-type TOPCon all-black module, 108 half-cells. Specifications from the Canadian Solar April 2025 datasheet (US regional edition).',
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 450, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.0, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1000, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 38.9, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 14.55, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 33.0, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 13.66, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 1800, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 35, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 23, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, half-cell, all-black"}'::jsonb,
    'number_of_cells', '{"value": 108, "unit": "cells [2 × (9 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value":null,"status":"unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.05, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 42, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'max_series_fuse_a', '{"value": 25, "unit": "A"}'::jsonb,
      'glass', '{"value": "3.2 mm tempered front glass with anti-reflective coating"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'snow_load_pa', '{"value": 8100, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'product_warranty_note', '{"value": "25-year limited product warranty stated with the footnote: available only for products installed and operating on rooftops in certain regions"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/tophiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/tophiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPHiKu6 All-Black CS6.1-54TM-H, V1.4C25_F23_D2_TX (April 2025, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPHiKu6 All-Black CS6.1-54TM-H, V1.4C25_F23_D2_TX (April 2025, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed. The product-warranty footnote is stored verbatim in specs.additional. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

-- CS6.1-54TM-465H ------------------------------------------------------------
insert into solar_products (
  category, manufacturer_id, provider_id, model, name, description,
  price, currency, specs, source, is_demo, is_archived, is_outdated
)
select
  'solar_panel', m.id, null,
  'CS6.1-54TM-465H',
  'Canadian Solar TOPHiKu6 CS6.1-54TM-465H (465 W all-black)',
  'N-type TOPCon all-black module, 108 half-cells. Specifications from the Canadian Solar April 2025 datasheet (US regional edition).',
  '{"value":null,"status":"unavailable"}'::jsonb,
  'KWD',
  jsonb_build_object(
    'rated_power_w', '{"value": 465, "unit": "W"}'::jsonb,
    'module_efficiency_pct', '{"value": 22.8, "unit": "%"}'::jsonb,
    'max_system_voltage_v', '{"value": 1000, "unit": "V"}'::jsonb,
    'voc_v', '{"value": 39.5, "unit": "V"}'::jsonb,
    'isc_a', '{"value": 14.77, "unit": "A"}'::jsonb,
    'vmp_v', '{"value": 33.6, "unit": "V"}'::jsonb,
    'imp_a', '{"value": 13.85, "unit": "A"}'::jsonb,
    'length_mm', '{"value": 1800, "unit": "mm"}'::jsonb,
    'width_mm', '{"value": 1134, "unit": "mm"}'::jsonb,
    'thickness_mm', '{"value": 35, "unit": "mm"}'::jsonb,
    'weight_kg', '{"value": 23, "unit": "kg"}'::jsonb,
    'cell_technology', '{"value": "N-type TOPCon, half-cell, all-black"}'::jsonb,
    'number_of_cells', '{"value": 108, "unit": "cells [2 × (9 × 6)]"}'::jsonb,
    'temperature_coefficient_pmax_pct_per_c', '{"value": -0.29, "unit": "%/°C"}'::jsonb,
    'operating_temperature_range_c', '{"value": "-40 to +85"}'::jsonb,
    'product_warranty_years', '{"value": 25, "unit": "years"}'::jsonb,
    'performance_warranty_years', '{"value": 30, "unit": "years"}'::jsonb,
    'performance_warranty_end_pct', '{"value":null,"status":"unavailable"}'::jsonb,
    'expected_lifetime_years', '{"value":null,"status":"unavailable"}'::jsonb,
    'additional', jsonb_build_object(
      'temperature_coefficient_voc_pct_per_c', '{"value": -0.25, "unit": "%/°C"}'::jsonb,
      'temperature_coefficient_isc_pct_per_c', '{"value": 0.05, "unit": "%/°C"}'::jsonb,
      'nmot_c', '{"value": 42, "unit": "°C ±3"}'::jsonb,
      'first_year_degradation_pct', '{"value": 1, "unit": "% (max)"}'::jsonb,
      'annual_degradation_year_2_30_pct', '{"value": 0.4, "unit": "%/year"}'::jsonb,
      'power_tolerance_w', '{"value": "0 ~ +10"}'::jsonb,
      'max_series_fuse_a', '{"value": 25, "unit": "A"}'::jsonb,
      'glass', '{"value": "3.2 mm tempered front glass with anti-reflective coating"}'::jsonb,
      'frame', '{"value": "Anodized aluminium alloy"}'::jsonb,
      'junction_box', '{"value": "IP68, 3 bypass diodes"}'::jsonb,
      'snow_load_pa', '{"value": 8100, "unit": "Pa (max)"}'::jsonb,
      'wind_load_pa', '{"value": 6000, "unit": "Pa (max)"}'::jsonb,
      'protection_class', '{"value": "Class II"}'::jsonb,
      'product_warranty_note', '{"value": "25-year limited product warranty stated with the footnote: available only for products installed and operating on rooftops in certain regions"}'::jsonb
    )
  ),
  jsonb_build_object(
    'data_source', 'Manufacturer datasheet',
    'source_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
    'datasheet_url', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
    'manufacturer_doc_url', 'https://www.canadiansolar.com/na/tophiku6/',
    'manufacturer_url', 'https://www.canadiansolar.com/na/tophiku6/',
    'manufacturer_source_note', 'Canadian Solar datasheet TOPHiKu6 All-Black CS6.1-54TM-H, V1.4C25_F23_D2_TX (April 2025, US regional edition)',
    'field_sources', jsonb_build_object(
      'rated_power_w', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'module_efficiency_pct', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'max_system_voltage_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'voc_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'isc_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'vmp_v', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'imp_a', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'length_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'width_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'thickness_mm', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'weight_kg', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'cell_technology', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'number_of_cells', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'temperature_coefficient_pmax_pct_per_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'operating_temperature_range_c', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'product_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf',
      'performance_warranty_years', 'https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf'
    ),
    'date_added', '2026-09-22',
    'date_last_updated', '2026-09-22',
    'verification_status', 'unverified',
    'verification_note', 'Exact model and all technical specifications read from the official manufacturer datasheet (Canadian Solar datasheet TOPHiKu6 All-Black CS6.1-54TM-H, V1.4C25_F23_D2_TX (April 2025, US regional edition)) on 2026-09-22. No Kuwait retailer listing, price or availability was found for this model; price is unavailable, not estimated. The datasheet prints the 1 % first-year and 0.4 %/year degradation limits (stored in specs.additional) but no end-of-warranty percentage, so performance_warranty_end_pct is left unavailable rather than computed. The product-warranty footnote is stored verbatim in specs.additional. Not reviewed by a Solink admin.'
  ),
  false, false, false
from manufacturers m
where m.slug = 'canadian-solar'
on conflict (manufacturer_id, model) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, currency = excluded.currency,
  specs = excluded.specs, source = excluded.source, provider_id = excluded.provider_id,
  is_demo = false, is_archived = false, is_outdated = false;

commit;

-- Rollback (manual): delete from solar_products where model in ('JKM505N-54HL4M-BDV','JKM520N-54HL4M-BDV','TSM-445NEG9R.28','TSM-460NEG9R.28','JAM54D40-450/LB','JAM54D40-460/LB','CS6.1-54TM-450H','CS6.1-54TM-465H');
