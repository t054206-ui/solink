/**
 * Data access layer. Every function resolves against Supabase when configured
 * (RLS-scoped to the signed-in user) and against the labeled demo dataset otherwise.
 * Callers receive `mode` so the UI can render the DEMO banner.
 *
 * Adding a real integration = implement the Supabase branch; UI stays unchanged.
 */
import { createClient } from "@/lib/supabase/server";
import { getDataMode, type DataMode } from "./mode";
import * as demo from "@/lib/demo/data";
import type {
  Product, ProviderCompany, SolarSystem, SolarPassport, ProductionRecord, MaintenanceCase, Incident,
  AiAlert, MonthlyReport, SolarProfile, Appointment, Notification, Manufacturer,
} from "@/lib/types";

export interface Result<T> { data: T; mode: DataMode }

async function supa() {
  const c = await createClient();
  return c;
}

/* ---------------- products ---------------- */
export async function listProducts(opts: { category?: Product["category"]; includeArchived?: boolean } = {}): Promise<Result<Product[]>> {
  const mode = getDataMode();
  if (mode === "demo") {
    let data = demo.DEMO_PRODUCTS;
    if (opts.category) data = data.filter((p) => p.category === opts.category);
    return { data, mode };
  }
  const c = (await supa())!;
  let q = c.from("solar_products").select("*, manufacturers(name)").order("created_at", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  if (!opts.includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return { data: (data ?? []).map(rowToProduct), mode };
}

export async function getProduct(id: string): Promise<Result<Product | null>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_PRODUCTS.find((p) => p.id === id) ?? null, mode };
  const c = (await supa())!;
  const { data, error } = await c.from("solar_products").select("*, manufacturers(name)").eq("id", id).maybeSingle();
  if (error) throw error;
  return { data: data ? rowToProduct(data) : null, mode };
}

export async function listManufacturers(): Promise<Result<Manufacturer[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_MANUFACTURERS, mode };
  const c = (await supa())!;
  const { data, error } = await c.from("manufacturers").select("*").order("name");
  if (error) throw error;
  return { data: (data ?? []) as Manufacturer[], mode };
}

export async function listProviders(): Promise<Result<ProviderCompany[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_PROVIDERS, mode };
  const c = (await supa())!;
  const { data, error } = await c.from("provider_companies").select("*").order("name");
  if (error) throw error;
  return { data: (data ?? []) as ProviderCompany[], mode };
}

/* ---------------- user-scoped ---------------- */
export async function getProfile(): Promise<Result<SolarProfile | null>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_PROFILE, mode };
  const c = (await supa())!;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { data: null, mode };
  const { data, error } = await c.from("solar_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return { data: (data as SolarProfile | null) ?? null, mode };
}

export async function listSystems(): Promise<Result<SolarSystem[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: [demo.DEMO_SYSTEM], mode };
  const c = (await supa())!;
  const { data, error } = await c.from("solar_systems").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return { data: (data ?? []) as SolarSystem[], mode };
}

export async function getSystem(id: string): Promise<Result<SolarSystem | null>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_SYSTEM.id === id ? demo.DEMO_SYSTEM : null, mode };
  const c = (await supa())!;
  const { data, error } = await c.from("solar_systems").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return { data: (data as SolarSystem | null) ?? null, mode };
}

export async function getPassport(systemId: string): Promise<Result<SolarPassport | null>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_PASSPORT.system_id === systemId ? demo.DEMO_PASSPORT : null, mode };
  const c = (await supa())!;
  const { data, error } = await c.from("solar_passports").select("*").eq("system_id", systemId).maybeSingle();
  if (error) throw error;
  return { data: (data as SolarPassport | null) ?? null, mode };
}

export async function listProduction(systemId: string, days = 400): Promise<Result<ProductionRecord[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: systemId === demo.DEMO_SYSTEM.id ? demo.demoDailyProduction(days, demo.DEMO_SYSTEM.capacity_kwp ?? 8) : [], mode };
  const c = (await supa())!;
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data, error } = await c.from("production_records").select("*").eq("system_id", systemId).eq("granularity", "day").gte("period_start", since.toISOString()).order("period_start");
  if (error) throw error;
  return { data: (data ?? []) as ProductionRecord[], mode };
}

export async function listMaintenance(systemId?: string): Promise<Result<MaintenanceCase[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_MAINTENANCE.filter((m) => !systemId || m.system_id === systemId), mode };
  const c = (await supa())!;
  let q = c.from("maintenance_cases").select("*").order("created_at", { ascending: false });
  if (systemId) q = q.eq("system_id", systemId);
  const { data, error } = await q;
  if (error) throw error;
  return { data: (data ?? []) as MaintenanceCase[], mode };
}

export async function getMaintenanceCase(id: string): Promise<Result<MaintenanceCase | null>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_MAINTENANCE.find((m) => m.id === id) ?? null, mode };
  const c = (await supa())!;
  const { data, error } = await c.from("maintenance_cases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return { data: (data as MaintenanceCase | null) ?? null, mode };
}

export async function listIncidents(systemId?: string): Promise<Result<Incident[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_INCIDENTS.filter((i) => !systemId || i.system_id === systemId), mode };
  const c = (await supa())!;
  let q = c.from("incidents").select("*").order("occurred_at", { ascending: false });
  if (systemId) q = q.eq("system_id", systemId);
  const { data, error } = await q;
  if (error) throw error;
  return { data: (data ?? []) as Incident[], mode };
}

export async function listAlerts(systemId?: string): Promise<Result<AiAlert[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_ALERTS.filter((a) => !systemId || a.system_id === systemId), mode };
  const c = (await supa())!;
  let q = c.from("ai_alerts").select("*").order("created_at", { ascending: false });
  if (systemId) q = q.eq("system_id", systemId);
  const { data, error } = await q;
  if (error) throw error;
  return { data: (data ?? []) as AiAlert[], mode };
}

export async function listReports(systemId?: string): Promise<Result<MonthlyReport[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_REPORTS.filter((r) => !systemId || r.system_id === systemId), mode };
  const c = (await supa())!;
  let q = c.from("reports").select("*").order("month", { ascending: false });
  if (systemId) q = q.eq("system_id", systemId);
  const { data, error } = await q;
  if (error) throw error;
  return { data: (data ?? []) as MonthlyReport[], mode };
}

export async function listAppointments(): Promise<Result<Appointment[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_APPOINTMENTS, mode };
  const c = (await supa())!;
  const { data, error } = await c.from("appointments").select("*").order("scheduled_at");
  if (error) throw error;
  return { data: (data ?? []) as Appointment[], mode };
}

export async function listNotifications(): Promise<Result<Notification[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_NOTIFICATIONS, mode };
  const c = (await supa())!;
  const { data, error } = await c.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return { data: (data ?? []) as Notification[], mode };
}

/* ---------------- mapping ---------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProduct(r: any): Product {
  return {
    id: r.id, category: r.category, manufacturer_id: r.manufacturer_id, manufacturer_name: r.manufacturers?.name ?? r.manufacturer_name ?? "Unknown manufacturer",
    model: r.model, name: r.name, description: r.description,
    price: r.price ?? { value: null, status: "unavailable" }, currency: r.currency ?? "KWD",
    installation_cost: r.installation_cost ?? { value: null, status: "unavailable" },
    annual_maintenance_cost: r.annual_maintenance_cost ?? { value: null, status: "unavailable" },
    cleaning_cost: r.cleaning_cost ?? { value: null, status: "unavailable" },
    expected_annual_production_kwh: r.expected_annual_production_kwh ?? { value: null, status: "unavailable" },
    images: r.images ?? [], specs: r.specs ?? {}, source: r.source ?? { data_source: "unknown", date_added: r.created_at, date_last_updated: r.updated_at, verification_status: "unverified" },
    is_demo: Boolean(r.is_demo), is_archived: Boolean(r.is_archived), is_outdated: Boolean(r.is_outdated),
    current_version_id: r.current_version_id ?? null, provider_id: r.provider_id ?? null,
  };
}
