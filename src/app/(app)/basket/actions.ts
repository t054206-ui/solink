"use server";
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/api/errors";
import { getDataMode } from "@/lib/data/mode";
import { getProduct } from "@/lib/data/repositories";
import { createClient } from "@/lib/supabase/server";
import type { BasketLine } from "@/lib/basket";
import { realPrice } from "../marketplace/_components/product-helpers";
import type { OrderItem } from "../purchase/purchaseTypes";

type ActionFail = { ok: false; reason: "demo" | "unauthenticated" | "error" | "empty"; error: string };
type Client = NonNullable<Awaited<ReturnType<typeof createClient>>>;
type Ctx = { fail: ActionFail; c?: never; user?: never } | { fail?: never; c: Client; user: User };

/**
 * Same guard the Purchase wizard uses (duplicated on purpose rather than
 * imported, to keep "use server" module boundaries simple): never returns a
 * usable client without a real signed-in user. No order is ever written
 * without passing through this.
 */
async function userClient(): Promise<Ctx> {
  if (getDataMode() === "demo") return { fail: { ok: false, reason: "demo", error: "Demo mode: Supabase is not connected, so nothing can be purchased yet." } };
  const c = await createClient();
  if (!c) return { fail: { ok: false, reason: "demo", error: "Demo mode: Supabase is not connected, so nothing can be purchased yet." } };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { fail: { ok: false, reason: "unauthenticated", error: "Sign in to continue." } };
  return { c, user };
}

export interface RevalidatedLine {
  product_id: string;
  /** false = the product is gone (not found or archived); dropped from checkout, the rest continues. */
  available: boolean;
  name: string | null;
  manufacturer: string | null;
  price: number | null;
  currency: string;
  /** True when the current price differs from what the basket recorded at add-time (including null → a price, or a price → null). */
  price_changed: boolean;
  reason: string | null;
}

/**
 * The server-side truth for a basket at the moment Checkout is clicked.
 * Read-only, so it runs for a signed-in person before anything is written —
 * a guest never reaches this, the login gate intercepts first.
 */
export async function revalidateBasketAction(lines: Pick<BasketLine, "product_id" | "price_at_add">[]): Promise<{ ok: true; items: RevalidatedLine[] } | { ok: false; error: string }> {
  if (getDataMode() === "demo") return { ok: false, error: "Demo mode: Supabase is not connected." };
  const ids = Array.from(new Set(lines.map((l) => l.product_id).filter((id) => /^[0-9a-f-]{36}$/i.test(id))));
  const fetched = await Promise.all(ids.map((id) => getProduct(id).then((r) => r.data).catch(() => null)));
  const byId = new Map(ids.map((id, i) => [id, fetched[i]]));
  const items: RevalidatedLine[] = lines.map((l) => {
    const p = byId.get(l.product_id);
    if (!p || p.is_archived) {
      return { product_id: l.product_id, available: false, name: p?.name ?? null, manufacturer: p?.manufacturer_name ?? null, price: null, currency: "KWD", price_changed: false, reason: p ? "No longer available." : "This product could not be found." };
    }
    const price = realPrice(p, "price");
    const changed = price !== l.price_at_add;
    return {
      product_id: l.product_id, available: true, name: p.name, manufacturer: p.manufacturer_name, price, currency: p.currency, price_changed: changed,
      reason: changed ? (l.price_at_add === null ? `Now priced at ${price?.toFixed(3)} ${p.currency}.` : price === null ? "The price is no longer listed." : `Price changed from ${l.price_at_add.toFixed(3)} to ${price.toFixed(3)} ${p.currency}.`) : null,
    };
  });
  return { ok: true, items };
}

/**
 * Writes the order. Requires a signed-in user (userClient enforces it — this
 * is the only place a basket ever becomes a database row). Re-validates
 * again server-side regardless of what the client claims: an item gone from
 * the catalog is dropped and reported back, never silently included.
 */
export async function createOrderFromBasketAction(lines: Pick<BasketLine, "product_id" | "qty">[]): Promise<{ ok: true; id: string; dropped: string[] } | ActionFail> {
  const r = await userClient();
  if (r.fail) return r.fail;
  const ids = Array.from(new Set(lines.map((l) => l.product_id).filter((id) => /^[0-9a-f-]{36}$/i.test(id))));
  if (ids.length === 0) return { ok: false, reason: "empty", error: "The basket is empty." };
  const fetched = await Promise.all(ids.map((id) => getProduct(id).then((res) => res.data).catch(() => null)));
  const byId = new Map(ids.map((id, i) => [id, fetched[i]]));
  const items: OrderItem[] = [];
  const dropped: string[] = [];
  for (const l of lines) {
    const p = byId.get(l.product_id);
    if (!p || p.is_archived) { dropped.push(l.product_id); continue; }
    items.push({ product_id: p.id, name: p.name, category: p.category as OrderItem["category"], qty: l.qty, unit_price: realPrice(p, "price"), currency: p.currency, is_demo: p.is_demo });
  }
  if (items.length === 0) return { ok: false, reason: "empty", error: "Every item in the basket is no longer available, so nothing could be ordered." };
  const missingPrice = items.filter((i) => i.unit_price === null);
  const totals = missingPrice.length === 0
    ? { value: items.reduce((sum, i) => sum + (i.unit_price as number) * i.qty, 0), currency: items[0].currency }
    : { value: null as number | null, currency: items[0].currency, reason: `Prices not provided for: ${missingPrice.map((m) => m.name).join(", ")}.` };
  const { data, error } = await r.c.from("orders").insert({
    user_id: r.user.id, status: "requested", items, totals, payment_provider: null, notes: null,
  }).select("id").single();
  if (error) return { ok: false, reason: "error", error: friendlyDbError(error) };
  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  if (productIds.length) await r.c.from("product_events").insert(productIds.map((product_id) => ({ product_id, kind: "purchase_request", user_id: r.user.id })));
  revalidatePath("/dashboard");
  return { ok: true, id: data.id as string, dropped };
}
