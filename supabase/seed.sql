-- ============================================================================
-- Solink demo seed — DEMO DATA — NOT REAL
-- Optional. Inserts the same labeled demo catalog used by the app's demo mode
-- so a connected Supabase project can be exercised before real data exists.
-- Real product data must come from [PLACEHOLDER: REAL SOLAR PANEL DATA SOURCE].
-- ============================================================================
insert into manufacturers (id, name, is_demo, verification_status) values
  ('a0000000-0000-4000-8000-00000000000a', 'Demo Manufacturer A', true, 'unverified'),
  ('a0000000-0000-4000-8000-00000000000b', 'Demo Manufacturer B', true, 'unverified'),
  ('a0000000-0000-4000-8000-00000000000c', 'Demo Manufacturer C', true, 'unverified')
on conflict do nothing;

insert into provider_companies (id, name, kind, is_demo, service_area) values
  ('c0000000-0000-4000-8000-000000000001', 'Demo Installer Co. (NOT REAL)', '{solar_company,installer}', true, 'Kuwait (demo)'),
  ('c0000000-0000-4000-8000-000000000002', 'Demo Maintenance Co. (NOT REAL)', '{maintenance}', true, 'Kuwait (demo)'),
  ('c0000000-0000-4000-8000-000000000003', 'Demo Cleaning Co. (NOT REAL)', '{cleaning}', true, 'Kuwait (demo)')
on conflict do nothing;

insert into solar_products (category, manufacturer_id, model, name, description, is_demo, specs, source) values
 ('solar_panel', 'a0000000-0000-4000-8000-00000000000a', 'DEMO-MONO-400', 'Demo Mono Panel 400 (NOT REAL)', 'Illustrative record.', true,
  '{"rated_power_w":{"value":400,"unit":"W"},"module_efficiency_pct":{"value":20.5,"unit":"%"},"length_mm":{"value":1722,"unit":"mm"},"width_mm":{"value":1134,"unit":"mm"},"voc_v":{"value":37.2,"unit":"V"},"vmp_v":{"value":31.1,"unit":"V"},"isc_a":{"value":13.6,"unit":"A"},"imp_a":{"value":12.9,"unit":"A"},"product_warranty_years":{"value":12,"unit":"years"},"performance_warranty_years":{"value":25,"unit":"years"}}',
  '{"data_source":"Demo dataset (not a real source)","date_added":"2026-09-01","date_last_updated":"2026-09-01","verification_status":"unverified"}'),
 ('solar_panel', 'a0000000-0000-4000-8000-00000000000b', 'DEMO-BIFACIAL-450', 'Demo Bifacial Panel 450 (NOT REAL)', 'Illustrative record.', true,
  '{"rated_power_w":{"value":450,"unit":"W"},"module_efficiency_pct":{"value":21.3,"unit":"%"},"length_mm":{"value":1903,"unit":"mm"},"width_mm":{"value":1134,"unit":"mm"},"weight_kg":{"value":null,"status":"unavailable"}}',
  '{"data_source":"Demo dataset (not a real source)","date_added":"2026-09-01","date_last_updated":"2026-09-01","verification_status":"pending_verification"}'),
 ('solar_panel', 'a0000000-0000-4000-8000-00000000000c', 'DEMO-COMPACT-350', 'Demo Compact Panel 350 (NOT REAL)', 'Illustrative record.', true,
  '{"rated_power_w":{"value":350,"unit":"W"},"module_efficiency_pct":{"value":19.1,"unit":"%"},"length_mm":{"value":1690,"unit":"mm"},"width_mm":{"value":1046,"unit":"mm"}}',
  '{"data_source":"Demo dataset (not a real source)","date_added":"2026-09-01","date_last_updated":"2026-09-01","verification_status":"unverified"}')
on conflict do nothing;
