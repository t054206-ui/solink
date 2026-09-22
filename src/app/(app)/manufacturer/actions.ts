"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getManufacturerAccess } from "./_lib/access";
import type { ActionResult, ProductInput } from "@/app/(app)/admin/actions";

/**
 * Manufacturer server actions. Every action re-reads who the manufacturer is
 * and writes through the user's own Supabase client, so row-level security
 * ("products manufacturer own", "manufacturers self update", "documents
 * manufacturer own") is the last word even if this code were bypassed.
 *
 * Rules enforced here, on top of RLS:
 *  - manufacturer_id is always the caller's own company, whatever the form sent;
 *  - a manufacturer never sets Verified: a new product is pending, an edited
 *    verified product goes back to pending; verified_by/at are cleared;
 *  - demo mode saves nothing on the server (the forms store locally).
 */
type Gate = { c: NonNullable<Awaited<ReturnType<typeof createClient>>>; userId: string; manufacturerId: string; manufacturerName: string } | { error: string };

async function gate(): Promise<Gate> {
  const a = await getManufacturerAccess();
  if (a.mode === "demo") return { error: "Demo mode: Supabase is not connected, so nothing can be saved on the server. Changes stay in this browser." };
  if (!a.authorized || !a.manufacturer) return { error: a.reason ?? "Not authorized." };
  const c = await createClient();
  if (!c) return { error: "Supabase client unavailable." };
  return { c, userId: a.userId!, manufacturerId: a.manufacturer.id, manufacturerName: a.manufacturer.name };
}

export async function saveOwnProductAction(input: ProductInput): Promise<ActionResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  if (!input.model.trim() || !input.name.trim()) return { ok: false, error: "Model and name are required." };
  try {
    const now = new Date().toISOString();
    let existing: { source?: Record<string, unknown>; manufacturer_id?: string | null } = {};
    if (input.id) {
      const { data } = await g.c.from("solar_products").select("source, manufacturer_id").eq("id", input.id).maybeSingle();
      if (!data) return { ok: false, error: "Product not found, or it does not belong to your company." };
      if (data.manufacturer_id !== g.manufacturerId) return { ok: false, error: "That product belongs to another manufacturer." };
      existing = data as typeof existing;
    }
    const prior = existing.source ?? {};
    const wasVerified = prior.verification_status === "verified";
    const status = !input.id || wasVerified ? "pending_verification" : ((prior.verification_status as string | undefined) ?? "pending_verification");
    const source: Record<string, unknown> = {
      ...prior,
      data_source: input.source.data_source.trim() || `Manufacturer entry (${g.manufacturerName})`,
      source_url: input.source.source_url, datasheet_url: input.source.datasheet_url, manufacturer_doc_url: input.source.manufacturer_doc_url,
      date_added: (prior.date_added as string) ?? now,
      date_last_updated: now,
      verification_status: status,
      verified_by: null, verified_at: null,
      ...(wasVerified ? { verification_note: `Edited by the manufacturer on ${now.slice(0, 10)}; previous verification withdrawn pending review.` } : {}),
    };
    const row = {
      category: input.category, manufacturer_id: g.manufacturerId, provider_id: null,
      model: input.model.trim(), name: input.name.trim(), description: input.description,
      price: input.price, currency: "KWD", installation_cost: input.installation_cost, annual_maintenance_cost: input.annual_maintenance_cost,
      cleaning_cost: input.cleaning_cost, expected_annual_production_kwh: input.expected_annual_production_kwh,
      images: input.images, specs: input.specs, source,
      is_demo: false, is_archived: input.is_archived, is_outdated: input.is_outdated,
    };
    let id = input.id ?? null;
    if (id) {
      const { error } = await g.c.from("solar_products").update(row).eq("id", id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data, error } = await g.c.from("solar_products").insert({ ...row, created_by: g.userId }).select("id").single();
      if (error) return { ok: false, error: error.code === "23505" ? "You already have a product with this model number." : error.message };
      id = data.id as string;
    }
    revalidatePath("/manufacturer/products"); revalidatePath("/admin/verification"); revalidatePath("/marketplace");
    return { ok: true, id, message: wasVerified ? "Saved. Because the product was verified, it is now pending verification again." : "Saved and submitted for verification." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export interface CompanyProfileInput {
  name: string; legal_name: string | null; description: string | null;
  headquarters_country: string | null; headquarters_city: string | null;
  website: string | null; logo_url: string | null; cover_image_url: string | null;
}

/**
 * The manufacturer's own profile fields, and only those. Verification,
 * availability, type, market classification and archive state are not in the
 * input and are never written here; the database trigger from 0008 would
 * refuse them from this account anyway.
 */
export async function updateCompanyAction(input: CompanyProfileInput): Promise<ActionResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Company name is required." };
  const url = (v: string | null) => { const t = v?.trim() ?? ""; return t === "" ? null : t; };
  for (const [label, v] of [["Website", url(input.website)], ["Logo URL", url(input.logo_url)], ["Cover image URL", url(input.cover_image_url)]] as const) {
    if (v && !/^https?:\/\//i.test(v)) return { ok: false, error: `${label} must start with https://.` };
  }
  const { error } = await g.c.from("manufacturers").update({
    name, legal_name: input.legal_name?.trim() || null, description: input.description?.trim() || null,
    headquarters_country: input.headquarters_country?.trim() || null, headquarters_city: input.headquarters_city?.trim() || null,
    website: url(input.website), logo_url: url(input.logo_url), cover_image_url: url(input.cover_image_url),
  }).eq("id", g.manufacturerId);
  if (error) return { ok: false, error: error.code === "23505" ? "Another manufacturer already uses that name." : error.message };
  revalidatePath("/manufacturer/company"); revalidatePath("/marketplace"); revalidatePath("/marketplace/manufacturers"); revalidatePath("/admin/manufacturers");
  return { ok: true, message: "Company profile saved. Verification and availability are unchanged; only Solink's administrators change them." };
}

export async function addDatasheetLinkAction(input: { productId: string; title: string; url: string }): Promise<ActionResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  const url = input.url.trim();
  if (!/^https?:\/\//.test(url)) return { ok: false, error: "Enter the full https:// address of the datasheet." };
  const { data: p } = await g.c.from("solar_products").select("id, manufacturer_id").eq("id", input.productId).maybeSingle();
  if (!p || p.manufacturer_id !== g.manufacturerId) return { ok: false, error: "That product does not belong to your company." };
  const { data, error } = await g.c.from("product_documents").insert({ product_id: input.productId, kind: "datasheet", title: input.title.trim() || "Datasheet", url, uploaded_by: g.userId }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/manufacturer/datasheets");
  return { ok: true, id: data.id as string, message: "Datasheet linked. Earlier documents are kept; nothing is deleted." };
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_UPLOAD = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

/**
 * Upload a datasheet, document or product image into Solink's own storage,
 * under <product_id>/… of a product this manufacturer owns. The storage
 * policy "product docs manufacturer write" (0008 §8) enforces the same
 * ownership at the bucket; a product_documents row records the file. Nothing
 * is ever deleted here: a replaced datasheet is a newer row.
 */
export async function uploadProductDocumentAction(form: FormData): Promise<ActionResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  const productId = String(form.get("productId") ?? "");
  const kind = String(form.get("kind") ?? "datasheet");
  const title = String(form.get("title") ?? "").trim();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "The file is larger than 15 MB." };
  if (!ALLOWED_UPLOAD.has(file.type)) return { ok: false, error: "Only PDF, PNG, JPEG or WebP files can be uploaded." };
  if (!["datasheet", "manual", "warranty", "certificate", "image", "other"].includes(kind)) return { ok: false, error: "Unknown document kind." };
  const { data: p } = await g.c.from("solar_products").select("id, manufacturer_id").eq("id", productId).maybeSingle();
  if (!p || p.manufacturer_id !== g.manufacturerId) return { ok: false, error: "That product does not belong to your company." };
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 100) || "file";
  const path = `${productId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await g.c.storage.from("product-documents").upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: `Upload refused: ${upErr.message}` };
  const { data, error } = await g.c.from("product_documents").insert({ product_id: productId, kind, title: title || file.name, storage_path: path, uploaded_by: g.userId }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/manufacturer/datasheets"); revalidatePath("/admin/datasheets"); revalidatePath("/marketplace/manufacturers");
  return { ok: true, id: data.id as string, message: "Uploaded and recorded. Earlier documents are kept; nothing is deleted." };
}
