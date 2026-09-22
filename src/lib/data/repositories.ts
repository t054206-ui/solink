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
import type { SiteAnalysisRow } from "@/lib/solar/siteAnalysis";
import type {
  Product, ProviderCompany, SolarSystem, SolarPassport, ProductionRecord, MaintenanceCase, Incident,
  AiAlert, MonthlyReport, SolarProfile, Appointment, Notification, Manufacturer, ManufacturerSource, ManufacturerVersion, ProductDocument,
} from "@/lib/types";

export interface Result<T> { data: T; mode: DataMode }

async function supa() {
  const c = await createClient();
  return c;
}

/* ---------------- products ---------------- */
/** The manufacturer columns a product row carries along (one join, no second query). */
const PRODUCT_SELECT = "*, manufacturers(name, slug, is_archived)";

export async function listProducts(opts: { category?: Product["category"]; includeArchived?: boolean; manufacturerId?: string } = {}): Promise<Result<Product[]>> {
  const mode = getDataMode();
  if (mode === "demo") {
    let data = demo.DEMO_PRODUCTS.map(withDemoManufacturer);
    if (opts.category) data = data.filter((p) => p.category === opts.category);
    if (opts.manufacturerId) data = data.filter((p) => p.manufacturer_id === opts.manufacturerId);
    return { data, mode };
  }
  const c = (await supa())!;
  // The catalogue people browse is the real one. Demo rows live in the same
  // table (seeded for demo mode) and stay out of every Supabase-mode listing;
  // getProduct still resolves one by id, so an old reference renders, labelled.
  let q = c.from("solar_products").select(PRODUCT_SELECT).eq("is_demo", false).order("created_at", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.manufacturerId) q = q.eq("manufacturer_id", opts.manufacturerId);
  if (!opts.includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return { data: (data ?? []).map(rowToProduct), mode };
}

export async function getProduct(id: string): Promise<Result<Product | null>> {
  const mode = getDataMode();
  if (mode === "demo") { const p = demo.DEMO_PRODUCTS.find((x) => x.id === id); return { data: p ? withDemoManufacturer(p) : null, mode }; }
  const c = (await supa())!;
  const { data, error } = await c.from("solar_products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return { data: data ? rowToProduct(data) : null, mode };
}

/* ---------------- manufacturers ---------------- */
/** Characters PostgREST's `or=` filter grammar would misread; a search term never needs them. */
function safeIlike(q: string): string {
  return q.replace(/[,()"\\%]/g, " ").trim();
}

/**
 * Manufacturer companies. Archived rows are left out unless asked for; the
 * search runs in the database (name, legal name, HQ country, type) so it is
 * the same query the API route and the admin page share. `product_count` is
 * the number of products the marketplace would list for the company.
 */
export async function listManufacturers(opts: { includeArchived?: boolean; q?: string; includeDemo?: boolean } = {}): Promise<Result<Manufacturer[]>> {
  const mode = getDataMode();
  const needle = opts.q ? safeIlike(opts.q).toLowerCase() : "";
  if (mode === "demo") {
    let data = demo.DEMO_MANUFACTURERS;
    if (needle) data = data.filter((m) => [m.name, m.legal_name, m.headquarters_country, m.manufacturer_type].some((v) => v?.toLowerCase().includes(needle)));
    const counts = new Map<string, number>();
    for (const p of demo.DEMO_PRODUCTS) if (p.manufacturer_id && !p.is_archived) counts.set(p.manufacturer_id, (counts.get(p.manufacturer_id) ?? 0) + 1);
    return { data: data.map((m) => ({ ...m, product_count: counts.get(m.id) ?? 0 })), mode };
  }
  const c = (await supa())!;
  let q = c.from("manufacturers").select("*").order("name");
  if (!opts.includeArchived) q = q.eq("is_archived", false);
  // Demo manufacturers exist in the table for demo mode; the real directory leaves them out.
  if (!opts.includeDemo) q = q.eq("is_demo", false);
  if (needle) q = q.or(`name.ilike.%${needle}%,legal_name.ilike.%${needle}%,headquarters_country.ilike.%${needle}%,manufacturer_type.ilike.%${needle}%`);
  const [{ data, error }, counts] = await Promise.all([q, c.from("solar_products").select("manufacturer_id").eq("is_demo", false).eq("is_archived", false)]);
  if (error) throw error;
  if (counts.error) throw counts.error;
  const by = new Map<string, number>();
  for (const r of counts.data ?? []) if (r.manufacturer_id) by.set(r.manufacturer_id as string, (by.get(r.manufacturer_id as string) ?? 0) + 1);
  return { data: (data ?? []).map((m) => ({ ...(m as Manufacturer), product_count: by.get((m as Manufacturer).id) ?? 0 })), mode };
}

/** One manufacturer by id or slug, archived included (history must stay reachable). */
export async function getManufacturer(idOrSlug: string): Promise<Result<Manufacturer | null>> {
  const mode = getDataMode();
  if (mode === "demo") {
    const m = demo.DEMO_MANUFACTURERS.find((x) => x.id === idOrSlug || x.slug === idOrSlug) ?? null;
    return { data: m ? { ...m, product_count: demo.DEMO_PRODUCTS.filter((p) => p.manufacturer_id === m.id && !p.is_archived).length } : null, mode };
  }
  const c = (await supa())!;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const { data, error } = await c.from("manufacturers").select("*").eq(isUuid ? "id" : "slug", idOrSlug).maybeSingle();
  if (error) throw error;
  if (!data) return { data: null, mode };
  const { count } = await c.from("solar_products").select("id", { count: "exact", head: true }).eq("manufacturer_id", data.id).eq("is_demo", false).eq("is_archived", false);
  return { data: { ...(data as Manufacturer), product_count: count ?? 0 }, mode };
}

export async function listManufacturerSources(manufacturerId: string): Promise<Result<ManufacturerSource[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: demo.DEMO_MANUFACTURER_SOURCES.filter((s) => s.manufacturer_id === manufacturerId), mode };
  const c = (await supa())!;
  const { data, error } = await c.from("manufacturer_sources").select("*").eq("manufacturer_id", manufacturerId).order("created_at", { ascending: false });
  if (error) throw error;
  return { data: (data ?? []) as ManufacturerSource[], mode };
}

export async function listManufacturerVersions(manufacturerId: string): Promise<Result<ManufacturerVersion[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: [], mode };
  const c = (await supa())!;
  const { data, error } = await c.from("manufacturer_versions").select("*").eq("manufacturer_id", manufacturerId).order("version", { ascending: false });
  if (error) throw error;
  return { data: (data ?? []) as ManufacturerVersion[], mode };
}

/** Documents attached to the given products. Read is open under RLS; demo mode has none server-side. */
export async function listProductDocuments(productIds: string[]): Promise<Result<ProductDocument[]>> {
  const mode = getDataMode();
  if (mode === "demo" || productIds.length === 0) return { data: [], mode };
  const c = (await supa())!;
  const { data, error } = await c.from("product_documents").select("id, product_id, kind, title, storage_path, url, created_at").in("product_id", productIds).order("created_at", { ascending: false });
  if (error) throw error;
  return { data: (data ?? []) as ProductDocument[], mode };
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

/**
 * Monitoring source that marks an external reference system: an operating
 * plant from a published dataset, imported for its historical production.
 * Those rows are real measurements (cls 'source', is_demo false) but they are
 * not the signed-in user's installation, so personal screens leave them out.
 */
export const REFERENCE_MONITORING_SOURCE = "kaggle:solar-power-generation";

export async function listSystems(
  opts: { includeReference?: boolean } = {},
): Promise<Result<SolarSystem[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: [demo.DEMO_SYSTEM], mode };
  const c = (await supa())!;
  const { data, error } = await c.from("solar_systems").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as SolarSystem[];
  // Filtered here rather than in the query on purpose. In SQL
  // `monitoring_source <> '…'` evaluates to NULL for the NULL that every
  // system without connected hardware carries, so a PostgREST `not.eq` would
  // silently drop exactly the personal systems this has to keep.
  return {
    data: opts.includeReference ? rows : rows.filter((s) => s.monitoring_source !== REFERENCE_MONITORING_SOURCE),
    mode,
  };
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

/**
 * The signed-in user's most recent site analyses, newest first.
 *
 * RLS does the scoping: `ai_analyses owner` restricts every row to
 * `user_id = auth.uid()`, so this cannot return someone else's run and the
 * query does not filter by user itself. Runs that failed are included — the
 * caller decides what to show, and a failed run is still a run that happened.
 */
export async function listSiteAnalyses(limit = 5): Promise<Result<SiteAnalysisRow[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: [], mode };
  const c = (await supa())!;
  const { data, error } = await c
    .from("ai_analyses")
    .select("id, kind, input_summary, output, model, created_at")
    .eq("kind", "site_analysis")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { data: (data ?? []) as SiteAnalysisRow[], mode };
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
    manufacturer_slug: r.manufacturers?.slug ?? null, manufacturer_archived: Boolean(r.manufacturers?.is_archived),
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

/** Demo products carry their manufacturer's slug so profile links work in demo mode too. */
function withDemoManufacturer(p: Product): Product {
  const m = demo.DEMO_MANUFACTURERS.find((x) => x.id === p.manufacturer_id);
  return m ? { ...p, manufacturer_slug: m.slug, manufacturer_archived: m.is_archived } : p;
}
