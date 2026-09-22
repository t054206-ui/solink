# Solink — Data model (summary)

See `supabase/migrations/0001_solink_core.sql` for the authoritative DDL.

```
auth.users ─1:1─ user_profiles (role, provider_company_id)
auth.users ─1:1─ solar_profiles (home, roof, consumption, budget, location)
auth.users ─1:N─ solar_designs ─N:1─ solar_products (panel) / product_versions
auth.users ─1:N─ solar_systems ─1:1─ solar_passports (frozen snapshots)
                 solar_systems ─1:N─ system_panels, inverters, batteries
                 solar_systems ─1:N─ production_records, panel_production_records
                 solar_systems ─1:N─ maintenance_cases ─1:N─ cleaning_records / repair_records
                 solar_systems ─1:N─ replacement_records, incidents, ai_alerts, reports
auth.users ─1:N─ orders, appointments, notifications, ai_conversations, ai_analyses, recommendations
manufacturers ─1:N─ solar_products ─1:N─ product_versions, product_documents
manufacturers ─1:N─ manufacturer_versions (immutable copies; current_version_id) · manufacturers ─1:N─ manufacturer_sources (one row per claim)
user_profiles.manufacturer_id ─N:1─ manufacturers (which company a manufacturer account acts for)
data_sources ─1:N─ product_imports ─1:N─ product_import_rows
provider_companies ─1:N─ provider_prices; ←── maintenance_cases.provider_id, appointments.provider_id, solar_systems.installer_id
weather_records / environmental_records (by lat,lng)  ·  area_aggregates (anonymised)  ·  platform_settings (admin placeholders)
```

## Key invariants
- **Versioning**: any change to `solar_products.specs` or `price` inserts a `product_versions` row (trigger). Any meaningful change to a `manufacturers` row inserts a `manufacturer_versions` row (trigger, 0008). Systems and passports reference a version id and store a JSON snapshot, so historical records never change.
- **Passport snapshots (0008)**: on insert, `solar_passports.panel_snapshot` is enriched by trigger with `manufacturer_id`, `manufacturer_version_id`, `manufacturer_snapshot` {name, legal_name, slug, headquarters_country, website, verification_status} and `snapshot_at`. A second trigger refuses any later change to `panel_snapshot`, `inverter_snapshot` or `battery_snapshot`.
- **Manufacturer companies (0008)**: `manufacturers` holds the company record (legal_name, slug, logo/cover, description, headquarters_country/city, website, manufacturer_type, market_regions, kuwait_available / gcc_available as tri-state with null = not yet verified, verification_source/url/date/note, is_archived). `manufacturer_type` and `market_regions` are Solink's classification, not a presence claim. Archive, never delete: products, orders and passports reference the row.
- **Honest missing data**: SpecValue fields can be `unavailable`, `not_applicable`, or `pending_verification`. No defaults are inserted.
- **Verification**: `source.verification_status` is `unverified` by default; validation flags demote `verified` → `pending_verification`; the UI only lets an admin set `verified` with a note. The enum has five states since 0008: unverified, pending_verification, verified, needs_changes, rejected. A manufacturer account cannot change its company's verification, availability, classification or archive state: a trigger (`guard_manufacturer_admin_fields`) refuses it for any non-admin session.
- **RLS**: users read/write only their rows; providers see cases/appointments/systems assigned to their company; admins (`user_profiles.role='admin'`) read everything. Production writes are service-role only.
- **Demo flags**: `is_demo` on manufacturers (the three demo companies stay out of the real directory), provider_companies, solar_products, solar_systems, solar_passports, maintenance_cases, incidents, reports.
- **Storage**: private buckets `roof-photos`, `panel-images`, `incident-images`, `maintenance-images`, `product-documents`, `reports`; user buckets are keyed by `<user_id>/…` and policies restrict to the owner.
