/**
 * Guest-friendly basket. Pure types and store helpers only — no React, no
 * server code — so both client components and the header can share one
 * definition of what a basket line looks like.
 *
 * The basket lives entirely in the browser (`useLocalStore`, versioned key)
 * until the person clicks Checkout and is signed in. There is no persistent
 * server-side basket in this app to merge into: `orders` are written once, at
 * that final moment, never before. That means a guest's basket already
 * survives login and signup by construction — it is the same browser
 * storage before and after — so there is nothing to lose and nothing to
 * merge. `anon_id` exists only to key/reconcile this one basket if local
 * storage is cleared; it is never sent anywhere and is not analytics (Solink
 * runs none, see /privacy).
 */

export interface BasketLine {
  product_id: string;
  qty: number;
  /** The price shown when this line was added, so checkout can say what changed rather than silently charging something else. Null when the product had no real price at add time. */
  price_at_add: number | null;
  currency: string;
}

export interface BasketStore {
  anon_id: string;
  lines: BasketLine[];
}

export const BASKET_STORE_KEY = "basket:v1";
export const BASKET_MAX_QTY = 20;

/** Stable literal — useLocalStore caches the first value it sees per key, so this must never carry randomness (see the hook's own fallback caching). */
export const EMPTY_BASKET: BasketStore = { anon_id: "", lines: [] };

function newAnonId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* fall through to the manual id below */
  }
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Assigns anon_id lazily, only from a mutating call — never during render, so server and first client render still agree. */
function withAnonId(store: BasketStore): BasketStore {
  return store.anon_id ? store : { ...store, anon_id: newAnonId() };
}

export function basketCount(store: BasketStore): number {
  return store.lines.reduce((n, l) => n + l.qty, 0);
}

export function lineQty(store: BasketStore, productId: string): number {
  return store.lines.find((l) => l.product_id === productId)?.qty ?? 0;
}

export function addLine(store: BasketStore, productId: string, priceAtAdd: number | null, currency: string, qty = 1): BasketStore {
  const s = withAnonId(store);
  const existing = s.lines.find((l) => l.product_id === productId);
  if (existing) {
    return { ...s, lines: s.lines.map((l) => (l.product_id === productId ? { ...l, qty: Math.min(BASKET_MAX_QTY, l.qty + qty) } : l)) };
  }
  return { ...s, lines: [...s.lines, { product_id: productId, qty: Math.min(BASKET_MAX_QTY, Math.max(1, qty)), price_at_add: priceAtAdd, currency }] };
}

export function setLineQty(store: BasketStore, productId: string, qty: number): BasketStore {
  const s = withAnonId(store);
  if (qty <= 0) return { ...s, lines: s.lines.filter((l) => l.product_id !== productId) };
  return { ...s, lines: s.lines.map((l) => (l.product_id === productId ? { ...l, qty: Math.min(BASKET_MAX_QTY, qty) } : l)) };
}

export function removeLine(store: BasketStore, productId: string): BasketStore {
  return { ...withAnonId(store), lines: store.lines.filter((l) => l.product_id !== productId) };
}

/** Drops the given product ids and refreshes price_at_add for the rest to `prices` — used after a checkout-time revalidation the person chose to continue past. */
export function reconcileAfterRevalidation(store: BasketStore, drop: string[], prices: Map<string, number | null>): BasketStore {
  const dropSet = new Set(drop);
  return {
    ...store,
    lines: store.lines
      .filter((l) => !dropSet.has(l.product_id))
      .map((l) => (prices.has(l.product_id) ? { ...l, price_at_add: prices.get(l.product_id) ?? null } : l)),
  };
}
