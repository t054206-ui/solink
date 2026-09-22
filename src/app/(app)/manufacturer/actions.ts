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

export async function updateCompanyAction(input: { name: string; country: string | null; website: string | null }): Promise<ActionResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Company name is required." };
  const { error } = await g.c.from("manufacturers").update({ name, country: input.country?.trim() || null, website: input.website?.trim() || null }).eq("id", g.manufacturerId);
  if (error) return { ok: false, error: error.code === "23505" ? "Another manufacturer already uses that name." : error.message };
  revalidatePath("/manufacturer/company"); revalidatePath("/marketplace");
  return { ok: true, message: "Company profile saved. Verification status is unchanged; only Solink's administrators change it." };
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
