"use server";
import { friendlyDbError } from "@/lib/api/errors";
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
  if (error) throw new Error(friendlyDbError(error, "The manufacturer could not be created."));
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
      if (error) return { ok: false, error: friendlyDbError(error) };
    } else {
      const { data, error } = await a.c.from("solar_products").insert({ ...row, created_by: a.userId }).select("id").single();
      if (error) return { ok: false, error: error.code === "23505" ? "A product with this manufacturer and model already exists." : friendlyDbError(error) };
      id = data.id as string;
    }
    revalidatePath("/admin/products"); revalidatePath("/admin/verification"); revalidatePath("/marketplace");
    return { ok: true, id, message: "Saved. A new product version was snapshotted by the database if specs or price changed." };
  } catch {
    return { ok: false, error: "Something went wrong on our side. Please try again." };
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
  if (error) return { ok: false, error: friendlyDbError(error) };
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
  if (error) return { ok: false, error: friendlyDbError(error) };
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
  if (error) return { ok: false, error: friendlyDbError(error) };
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
  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/admin/settings"); revalidatePath("/calculator"); revalidatePath("/analysis");
  return { ok: true };
}

export async function clearSettingAction(input: { key: string }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.c.from("platform_settings").update({ value: null, source: null, updated_by: a.userId, updated_at: new Date().toISOString() }).eq("key", input.key);
  if (error) return { ok: false, error: friendlyDbError(error) };
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
    if (dsErr) return { ok: false, error: friendlyDbError(dsErr) };
    const { data: imp, error: impErr } = await a.c.from("product_imports").insert({ method: "csv", data_source_id: ds.id, file_path: input.fileName, status: "validating", summary: { mapping: input.mapping, total: input.rows.length }, created_by: a.userId }).select("id").single();
    if (impErr) return { ok: false, error: friendlyDbError(impErr) };
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
  } catch {
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

/* ---------------- manufacturers (companies) ---------------- */
export interface ManufacturerInput {
  id?: string | null;
  name: string;
  legal_name: string | null;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  manufacturer_type: string | null;
  headquarters_country: string | null;
  headquarters_city: string | null;
  website: string | null;
  market_regions: string[];
}

const httpUrl = (v: string | null | undefined): string | null => {
  const t = v?.trim() ?? "";
  return t === "" ? null : t;
};
function badUrl(v: string | null, label: string): string | null {
  return v && !/^https?:\/\//i.test(v) ? `${label} must start with https:// (or http://).` : null;
}

/**
 * Create or edit a manufacturer company. Profile fields only: verification,
 * availability and archive state have their own actions below, so that an
 * edit of the description can never quietly change the company's standing.
 * The database records a new manufacturer_versions row on every change.
 */
export async function saveManufacturerAction(input: ManufacturerInput): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Company name is required." };
  const website = httpUrl(input.website), logo = httpUrl(input.logo_url), cover = httpUrl(input.cover_image_url);
  const urlErr = badUrl(website, "Website") ?? badUrl(logo, "Logo URL") ?? badUrl(cover, "Cover image URL");
  if (urlErr) return { ok: false, error: urlErr };
  const row = {
    name, legal_name: input.legal_name?.trim() || null,
    logo_url: logo, cover_image_url: cover, description: input.description?.trim() || null,
    manufacturer_type: input.manufacturer_type?.trim() || null,
    headquarters_country: input.headquarters_country?.trim() || null, headquarters_city: input.headquarters_city?.trim() || null,
    website, market_regions: Array.from(new Set(input.market_regions.map((r) => r.trim()).filter(Boolean))),
  };
  const slug = input.slug?.trim() ? input.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : null;
  try {
    if (input.id) {
      const { error } = await a.c.from("manufacturers").update({ ...row, ...(slug ? { slug } : {}) }).eq("id", input.id);
      if (error) return { ok: false, error: error.code === "23505" ? "Another manufacturer already uses that name or slug." : friendlyDbError(error) };
      revalidateManufacturers(input.id);
      return { ok: true, id: input.id, message: "Company record saved. A new version was recorded; Solar Passports keep the version they were issued with." };
    }
    const { data, error } = await a.c.from("manufacturers").insert({ ...row, ...(slug ? { slug } : {}), verification_status: "unverified", is_demo: false }).select("id").single();
    if (error) return { ok: false, error: error.code === "23505" ? "A manufacturer with this name or slug already exists. Open it instead of adding a duplicate." : friendlyDbError(error) };
    revalidateManufacturers(data.id as string);
    return { ok: true, id: data.id as string, message: "Manufacturer created as Unverified. Record a source and verify it from its page." };
  } catch {
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

/**
 * Verification and availability are one decision surface. Verified requires a
 * source and a note; availability is never set without a note saying what was
 * checked, because "available in Kuwait" is a claim Solink is making.
 */
export async function setManufacturerVerificationAction(input: {
  id: string; status: VerificationStatus; note: string | null;
  source: string | null; source_url: string | null;
  kuwait_available: boolean | null; gcc_available: boolean | null; availability_note: string | null;
}): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const note = input.note?.trim() || null;
  const source = input.source?.trim() || null, sourceUrl = httpUrl(input.source_url);
  if (input.status === "verified" && (!note || note.length < 10)) return { ok: false, error: "Verified requires a note (at least 10 characters) saying what was checked." };
  if (input.status === "verified" && !source) return { ok: false, error: "Verified requires the source it was checked against." };
  if ((input.status === "needs_changes" || input.status === "rejected") && !note) return { ok: false, error: `${input.status === "rejected" ? "Rejected" : "Needs changes"} requires a note the manufacturer can act on.` };
  const urlErr = badUrl(sourceUrl, "Source URL");
  if (urlErr) return { ok: false, error: urlErr };
  if ((input.kuwait_available !== null || input.gcc_available !== null) && !input.availability_note?.trim()) return { ok: false, error: "Setting Kuwait or GCC availability requires a note naming the source checked." };
  const { data: before } = await a.c.from("manufacturers").select("verification_status").eq("id", input.id).maybeSingle();
  if (!before) return { ok: false, error: "Manufacturer not found." };
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    verification_status: input.status, verification_note: note,
    verification_source: source, verification_source_url: sourceUrl,
    kuwait_available: input.kuwait_available, gcc_available: input.gcc_available, availability_note: input.availability_note?.trim() || null,
  };
  if (input.status === "verified") { patch.verified_by = a.userId; patch.verification_date = now.slice(0, 10); }
  else { patch.verified_by = null; patch.verification_date = null; }
  const { error } = await a.c.from("manufacturers").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (input.status === "verified" && source) {
    // The check itself becomes a source row, so the profile's Sources list shows what verification rested on.
    await a.c.from("manufacturer_sources").insert({ manufacturer_id: input.id, field: "company", source_name: source, source_url: sourceUrl, source_type: "other_verified_source", date_checked: now.slice(0, 10), verification_status: "verified", notes: `Verification note: ${note}`, created_by: a.userId });
  }
  revalidateManufacturers(input.id);
  return { ok: true, message: input.status === "verified" ? "Marked Verified with the source and note recorded." : "Status and availability updated." };
}

/**
 * Archive, never delete: products, orders and Solar Passports reference the
 * row. An archived company leaves the marketplace filter and directory; its
 * page stays reachable and says it is archived.
 */
export async function archiveManufacturerAction(input: { id: string; archived: boolean }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.c.from("manufacturers").update({ is_archived: input.archived }).eq("id", input.id);
  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidateManufacturers(input.id);
  return { ok: true, message: input.archived ? "Archived. Products and passports that reference this company are unchanged." : "Restored as an active manufacturer." };
}

export async function addManufacturerSourceAction(input: { manufacturer_id: string; field: string; source_name: string; source_url: string | null; source_type: string; date_checked: string | null; notes: string | null }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const name = input.source_name.trim();
  if (!name) return { ok: false, error: "Source name is required." };
  const url = httpUrl(input.source_url);
  const urlErr = badUrl(url, "Source URL");
  if (urlErr) return { ok: false, error: urlErr };
  const { data, error } = await a.c.from("manufacturer_sources").insert({
    manufacturer_id: input.manufacturer_id, field: input.field === "company" ? null : input.field, source_name: name, source_url: url,
    source_type: input.source_type, date_checked: input.date_checked || null, verification_status: "unverified", notes: input.notes?.trim() || null, created_by: a.userId,
  }).select("id").single();
  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidateManufacturers(input.manufacturer_id);
  return { ok: true, id: data.id as string, message: "Source recorded as Unverified." };
}

/** Link (or unlink) a user account to a manufacturer company. The account's role must be manufacturer for the portal to open. */
export async function setUserManufacturerAction(input: { userId: string; manufacturerId: string | null }): Promise<ActionResult> {
  const a = await admin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.c.from("user_profiles").update({ manufacturer_id: input.manufacturerId }).eq("user_id", input.userId);
  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/admin/users");
  return { ok: true };
}

function revalidateManufacturers(id: string) {
  revalidatePath("/admin/manufacturers"); revalidatePath(`/admin/manufacturers/${id}`); revalidatePath("/marketplace"); revalidatePath("/marketplace/manufacturers"); revalidatePath("/compare"); revalidatePath("/recommend");
}
