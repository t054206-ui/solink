"use server";
import { isRole, type Role } from "@/lib/roles";
/**
 * Admin server actions (Supabase mode). Every action re-checks admin access —
 * never trust the client. In demo mode the UI writes to the local browser store
 * instead and does not call these.
 *
 * Rules enforced here:
 *  - Verified status requires an explicit "verified against source" note.
 *  - Validation flags are computed by the DB trigger and never auto-corrected.
 *  - Platform settings cannot be saved without a source.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "./_lib/auth";
import type { AnySpec, NormalizedImportRow } from "./_components/admin-helpers";
import type { ProductCategory, VerificationStatus } from "@/lib/types";

export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };

type AdminClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;
type AdminGate = { c: AdminClient; userId: string } | { error: string };

async function admin(): Promise<AdminGate> {
  const access = await getAdminAccess();
  if (access.mode === "demo") return { error: "Demo mode: Supabase is not connected, so nothing can be saved on the server. Changes stay in this browser." };
  if (!access.authorized) return { error: access.reason ?? "Not authorized." };
  const c = await createClient();
  if (!c) return { error: "Supabase client unavailable." };
  return { c, userId: access.userId! };
}

/* ---------------- products ---------------- */
export interface ProductInput {
  id?: string | null;
  category: ProductCategory;
  manufacturer_name: string;
  model: string;
  name: string;
  description: string | null;
  price: AnySpec;
  installation_cost: AnySpec;
  annual_maintenance_cost: AnySpec;
  cleaning_cost: AnySpec;
  expected_annual_production_kwh: AnySpec;
  images: string[];
  specs: Record<string, AnySpec>;
  source: { data_source: string; source_url: string | null; datasheet_url: string | null; manufacturer_doc_url: string | null };
  verification_status: VerificationStatus;
  verification_note: string | null;
  is_outdated: boolean;
  is_archived: boolean;
  is_demo: boolean;
  provider_id?: string | null;
}

async function resolveManufacturerId(c: NonNullable<Awaited<ReturnType<typeof createClient>>>, name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data } = await c.from("manufacturers").select("id").eq("name", trimmed).maybeSingle();
  if (data?.id) return data.id as string;
  const { data: created, error } = await c.from("manufacturers").insert({ name: trimmed, verification_status: "unverified" }).select("id").single();
  if (error) throw new Error(`Manufacturer: ${error.message}`);
  return created.id as string;
}

export async function saveProductAction(input: ProductInput): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  if (!input.model.trim() || !input.name.trim()) return { ok: false, error: "Model and name are required." };
  if (input.verification_status === "verified" && !input.verification_note?.trim()) return { ok: false, error: "Setting Verified requires a “verified against source” note." };
  try {
    const manufacturer_id = await resolveManufacturerId(a.c, input.manufacturer_name);
    const now = new Date().toISOString();
    let existingSource: Record<string, unknown> = {};
    if (input.id) {
      const { data } = await a.c.from("solar_products").select("source").eq("id", input.id).maybeSingle();
      existingSource = (data?.source as Record<string, unknown>) ?? {};
    }
    const wasVerified = existingSource.verification_status === "verified";
    const source: Record<string, unknown> = {
      ...existingSource,
      data_source: input.source.data_source.trim() || "Manual admin entry",
      source_url: input.source.source_url, datasheet_url: input.source.datasheet_url, manufacturer_doc_url: input.source.manufacturer_doc_url,
      date_added: (existingSource.date_added as string) ?? now,
      date_last_updated: now,
      verification_status: input.verification_status,
    };
    if (input.verification_status === "verified" && !wasVerified) {
      source.verified_by = a.userId; source.verified_at = now; source.verification_note = input.verification_note?.trim();
    } else if (input.verification_status !== "verified") {
      source.verified_by = null; source.verified_at = null;
    }
    const row = {
      category: input.category, manufacturer_id, provider_id: input.provider_id ?? null,
      model: input.model.trim(), name: input.name.trim(), description: input.description,
      price: input.price, currency: "KWD", installation_cost: input.installation_cost, annual_maintenance_cost: input.annual_maintenance_cost,
      cleaning_cost: input.cleaning_cost, expected_annual_production_kwh: input.expected_annual_production_kwh,
      images: input.images, specs: input.specs, source,
      is_demo: input.is_demo, is_archived: input.is_archived, is_outdated: input.is_outdated,
    };
    let id = input.id ?? null;
    if (id) {
      const { error } = await a.c.from("solar_products").update(row).eq("id", id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data, error } = await a.c.from("solar_products").insert({ ...row, created_by: a.userId }).select("id").single();
      if (error) return { ok: false, error: error.code === "23505" ? "A product with this manufacturer and model already exists." : error.message };
      id = data.id as string;
    }
    revalidatePath("/admin/products"); revalidatePath("/admin/verification"); revalidatePath("/marketplace");
    return { ok: true, id, message: "Saved. A new product version was snapshotted by the database if specs or price changed." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error." };
  }
}

/** Explicit verification change. Verified REQUIRES a note; never called automatically. */
export async function setVerificationAction(input: { productId: string; status: VerificationStatus; note: string | null }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  if (input.status === "verified" && !input.note?.trim()) return { ok: false, error: "A “verified against source” note is required." };
  const { data, error: readErr } = await a.c.from("solar_products").select("source").eq("id", input.productId).maybeSingle();
  if (readErr || !data) return { ok: false, error: readErr?.message ?? "Product not found." };
  const now = new Date().toISOString();
  const source = { ...(data.source as Record<string, unknown>), verification_status: input.status, date_last_updated: now,
    ...(input.status === "verified" ? { verified_by: a.userId, verified_at: now, verification_note: input.note!.trim() } : { verified_by: null, verified_at: null, verification_note: input.note?.trim() || null }) };
  const { error } = await a.c.from("solar_products").update({ source }).eq("id", input.productId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products"); revalidatePath("/admin/verification");
  return { ok: true, message: input.status === "verified" ? "Marked as verified. If validation flags exist the database demotes it to pending for review." : "Status updated." };
}

export async function setProductFlagsAction(input: { productId: string; is_outdated?: boolean; is_archived?: boolean }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const patch: Record<string, boolean> = {};
  if (typeof input.is_outdated === "boolean") patch.is_outdated = input.is_outdated;
  if (typeof input.is_archived === "boolean") patch.is_archived = input.is_archived;
  const { error } = await a.c.from("solar_products").update(patch).eq("id", input.productId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}

/* ---------------- users ---------------- */
export async function setUserRoleAction(input: { userId: string; role: Role }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  if (!isRole(input.role)) return { ok: false, error: "Unknown role." };
  if (input.userId === a.userId && input.role !== "admin") return { ok: false, error: "You cannot remove your own admin role." };
  const { error } = await a.c.from("user_profiles").update({ role: input.role }).eq("user_id", input.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

/* ---------------- platform settings ---------------- */
export async function upsertSettingAction(input: { key: string; value: unknown; source: string }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  if (!input.source.trim()) return { ok: false, error: "A source is required before a value can be saved." };
  if (input.value === null || input.value === undefined || input.value === "") return { ok: false, error: "A value is required." };
  const { error } = await a.c.from("platform_settings").upsert({ key: input.key, value: input.value, source: input.source.trim(), updated_by: a.userId, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings"); revalidatePath("/calculator"); revalidatePath("/analysis");
  return { ok: true };
}

export async function clearSettingAction(input: { key: string }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.c.from("platform_settings").update({ value: null, source: null, updated_by: a.userId, updated_at: new Date().toISOString() }).eq("key", input.key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

/* ---------------- CSV import ---------------- */
export type ImportApplyResult =
  | { ok: true; importId: string; inserted: number; flagged: number; duplicates: number; rejected: number }
  | { ok: false; error: string };

export async function applyCsvImportAction(input: { fileName: string; headers: string[]; mapping: Record<string, string>; rows: NormalizedImportRow[] }): Promise<ImportApplyResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const dataSourceName = `CSV import ${input.fileName}`;
  try {
    const { data: ds, error: dsErr } = await a.c.from("data_sources").insert({ name: dataSourceName, kind: "csv", notes: `Columns: ${input.headers.join(", ")}` }).select("id").single();
    if (dsErr) return { ok: false, error: dsErr.message };
    const { data: imp, error: impErr } = await a.c.from("product_imports").insert({ method: "csv", data_source_id: ds.id, file_path: input.fileName, status: "validating", summary: { mapping: input.mapping, total: input.rows.length }, created_by: a.userId }).select("id").single();
    if (impErr) return { ok: false, error: impErr.message };
    let inserted = 0, flagged = 0, duplicates = 0, rejected = 0;
    const now = new Date().toISOString();
    for (const r of input.rows) {
      let status = r.status;
      let productId: string | null = null;
      if (status === "rejected") rejected++;
      else if (status === "duplicate") duplicates++;
      else {
        const manufacturer_id = await resolveManufacturerId(a.c, r.manufacturer);
        const { data: p, error } = await a.c.from("solar_products").insert({
          category: "solar_panel", manufacturer_id, model: r.model, name: r.name, price: r.price, currency: "KWD", specs: r.specs,
          source: { data_source: dataSourceName, source_url: r.source.source_url, datasheet_url: r.source.datasheet_url, manufacturer_doc_url: r.source.manufacturer_doc_url, date_added: now, date_last_updated: now, verification_status: "unverified" },
          is_demo: false, created_by: a.userId,
        }).select("id").single();
        if (error) {
          if (error.code === "23505") { status = "duplicate"; duplicates++; r.flags.push("duplicate: a product with this manufacturer + model already exists in the database"); }
          else { status = "rejected"; rejected++; r.flags.push(`database: ${error.message}`); }
        } else {
          productId = p.id as string; inserted++;
          if (r.flags.length) flagged++;
          status = r.flags.length ? "flagged" : "ok";
        }
      }
      await a.c.from("product_import_rows").insert({ import_id: imp.id, row_number: r.rowNumber, raw: r.raw, normalized: { manufacturer: r.manufacturer, model: r.model, name: r.name, specs: r.specs, price: r.price, source: r.source }, flags: r.flags, status: productId ? "applied" : status, product_id: productId });
    }
    await a.c.from("product_imports").update({ status: "applied", applied_at: new Date().toISOString(), summary: { mapping: input.mapping, total: input.rows.length, inserted, flagged, duplicates, rejected } }).eq("id", imp.id);
    revalidatePath("/admin/products"); revalidatePath("/admin/verification"); revalidatePath("/admin/products/import"); revalidatePath("/admin/data-sources");
    return { ok: true, importId: imp.id as string, inserted, flagged, duplicates, rejected };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error." };
  }
}
