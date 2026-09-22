import type { Role } from "@/lib/roles";
/**
 * Admin-only reads that are not part of the shared repositories
 * (user_profiles, product_documents, data_sources, product_imports,
 * platform_settings raw rows). Supabase mode only; demo mode returns empty
 * results and the pages show honest "unavailable" states.
 */
import { createClient } from "@/lib/supabase/server";
import { getDataMode, type DataMode } from "@/lib/data/mode";
import { listProducts } from "@/lib/data/repositories";
import type { Product } from "@/lib/types";

export interface AdminResult<T> { data: T; mode: DataMode; error: string | null }

export interface UserProfileRow { user_id: string; full_name: string | null; role: Role; provider_company_id: string | null; manufacturer_id: string | null; created_at: string }
export interface ProductDocumentRow { id: string; product_id: string; kind: string; title: string | null; storage_path: string | null; url: string | null; created_at: string }
export interface DataSourceRow { id: string; name: string; kind: string; url: string | null; notes: string | null; created_at: string }
export interface ProductImportRow { id: string; method: string; file_path: string | null; status: string; summary: Record<string, unknown>; created_at: string; applied_at: string | null }
export interface SettingRow { key: string; value: unknown; description: string | null; source: string | null; updated_at: string | null }

async function query<T>(table: string, select: string, order?: { column: string; ascending?: boolean }): Promise<AdminResult<T[]>> {
  const mode = getDataMode();
  if (mode === "demo") return { data: [], mode, error: null };
  const c = await createClient();
  if (!c) return { data: [], mode, error: "Supabase client unavailable." };
  let q = c.from(table).select(select);
  if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
  const { data, error } = await q;
  if (error) return { data: [], mode, error: error.message };
  return { data: (data ?? []) as unknown as T[], mode, error: null };
}

export const listUserProfiles = () => query<UserProfileRow>("user_profiles", "user_id, full_name, role, provider_company_id, manufacturer_id, created_at", { column: "created_at", ascending: false });
export const listProductDocuments = () => query<ProductDocumentRow>("product_documents", "id, product_id, kind, title, storage_path, url, created_at", { column: "created_at", ascending: false });
export const listDataSources = () => query<DataSourceRow>("data_sources", "id, name, kind, url, notes, created_at", { column: "created_at", ascending: false });
export const listProductImports = () => query<ProductImportRow>("product_imports", "id, method, file_path, status, summary, created_at, applied_at", { column: "created_at", ascending: false });

/** Every platform_settings row (including keys not modelled in PlatformSettings, e.g. payment_provider). */
export const listSettingRows = () => query<SettingRow>("platform_settings", "key, value, description, source, updated_at", { column: "key" });

/** All products including archived (admin view). */
export async function listAllProducts(): Promise<{ data: Product[]; mode: DataMode; error: string | null }> {
  try {
    const r = await listProducts({ includeArchived: true });
    return { data: r.data, mode: r.mode, error: null };
  } catch (e) {
    return { data: [], mode: getDataMode(), error: e instanceof Error ? e.message : "Could not load products." };
  }
}

/** Safe wrapper for repository calls: never throws, reports the error for an ErrorState. */
export async function safe<T>(fn: () => Promise<{ data: T; mode: DataMode }>, empty: T): Promise<AdminResult<T>> {
  try {
    const r = await fn();
    return { data: r.data, mode: r.mode, error: null };
  } catch (e) {
    return { data: empty, mode: getDataMode(), error: e instanceof Error ? e.message : "Unexpected error." };
  }
}
