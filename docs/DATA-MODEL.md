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
data_sources ─1:N─ product_imports ─1:N─ product_import_rows
provider_companies ─1:N─ provider_prices; ←── maintenance_cases.provider_id, appointments.provider_id, solar_systems.installer_id
weather_records / environmental_records (by lat,lng)  ·  area_aggregates (anonymised)  ·  platform_settings (admin placeholders)
```

## Key invariants
- **Versioning**: any change to `solar_products.specs` or `price` inserts a `product_versions` row (trigger). Systems and passports reference a version id and store a JSON snapshot, so historical records never change.
- **Honest missing data**: SpecValue fields can be `unavailable`, `not_applicable`, or `pending_verification`. No defaults are inserted.
- **Verification**: `source.verification_status` is `unverified` by default; validation flags demote `verified` → `pending_verification`; the UI only lets an admin set `verified` with a note.
- **RLS**: users read/write only their rows; providers see cases/appointments/systems assigned to their company; admins (`user_profiles.role='admin'`) read everything. Production writes are service-role only.
- **Demo flags**: `is_demo` on manufacturers, provider_companies, solar_products, solar_systems, solar_passports, maintenance_cases, incidents, reports.
- **Storage**: private buckets `roof-photos`, `panel-images`, `incident-images`, `maintenance-images`, `product-documents`, `reports`; user buckets are keyed by `<user_id>/…` and policies restrict to the owner.
