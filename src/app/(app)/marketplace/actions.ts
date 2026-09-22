"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";
import type { ManufacturerRequestKind, ProductEventKind } from "@/lib/types";

export type MarketplaceActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };

const KINDS: ManufacturerRequestKind[] = ["product_inquiry", "availability", "business", "purchase", "distributor", "partnership"];
const EVENTS: ProductEventKind[] = ["view", "compare", "design_use", "purchase_request"];

/**
 * A signed-in person writes to a manufacturer. What the manufacturer will see
 * is the message, a display name and a governorate: never the address, email
 * or phone (RLS "mfr requests create" also insists requester_id = auth.uid()).
 */
export async function createManufacturerRequestAction(input: { manufacturerId: string; productId: string | null; kind: ManufacturerRequestKind; message: string }): Promise<MarketplaceActionResult> {
  if (getDataMode() === "demo") return { ok: false, error: "Demo mode: Supabase is not connected, so a request cannot be sent." };
  const c = await createClient();
  if (!c) return { ok: false, error: "Supabase client unavailable." };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to send a request." };
  const message = input.message.trim();
  if (message.length < 10) return { ok: false, error: "Write at least a sentence so the manufacturer can answer." };
  if (message.length > 2000) return { ok: false, error: "Keep the message under 2000 characters." };
  if (!KINDS.includes(input.kind)) return { ok: false, error: "Unknown request kind." };
  const [{ data: prof }, { data: solar }] = await Promise.all([
    c.from("user_profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    c.from("solar_profiles").select("governorate").eq("user_id", user.id).maybeSingle(),
  ]);
  const metaName = typeof user.user_metadata?.full_name === "string" ? (user.user_metadata.full_name as string) : null;
  const { data, error } = await c.from("manufacturer_requests").insert({
    manufacturer_id: input.manufacturerId, product_id: input.productId, requester_id: user.id, kind: input.kind, message,
    requester_display_name: (prof?.full_name as string | null) ?? metaName ?? "Solink user",
    requester_governorate: (solar?.governorate as string | null) ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/manufacturer/requests"); revalidatePath("/dashboard");
  return { ok: true, id: data.id as string, message: "Sent. The manufacturer sees your name and governorate, not your contact details; its answer will appear here." };
}

/**
 * Records that a signed-in person opened, compared or requested a product.
 * Counts only; no page or session is stored. Guests record nothing (RLS
 * requires a user), and demo mode records nothing.
 */
export async function recordProductEventAction(input: { productIds: string[]; kind: ProductEventKind }): Promise<void> {
  if (getDataMode() === "demo" || !EVENTS.includes(input.kind)) return;
  const ids = Array.from(new Set(input.productIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))).slice(0, 10);
  if (ids.length === 0) return;
  const c = await createClient();
  if (!c) return;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return;
  await c.from("product_events").insert(ids.map((product_id) => ({ product_id, kind: input.kind, user_id: user.id })));
}
