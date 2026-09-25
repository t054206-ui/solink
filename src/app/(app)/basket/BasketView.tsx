"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ImageOff, Loader2, ShoppingCart, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { BASKET_STORE_KEY, EMPTY_BASKET, basketCount, reconcileAfterRevalidation, removeLine, setLineQty, type BasketStore } from "@/lib/basket";
import type { DataMode } from "@/lib/data/mode";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { CATEGORY_SINGULAR, realPrice } from "../marketplace/_components/product-helpers";
import { ManufacturerLink } from "../marketplace/_components/ManufacturerLink";
import { createOrderFromBasketAction, revalidateBasketAction, type RevalidatedLine } from "./actions";
import { CheckoutGateModal } from "./_components/CheckoutGateModal";

type Phase = "idle" | "checking" | "review" | "submitting" | "done";

/**
 * The basket itself: works identically for guests and signed-in people, all
 * the way up to Checkout. `catalog` is the current product list, fetched
 * server-side on each visit to this page — a line whose product id is not in
 * it has left the catalog since it was added and is shown, not hidden, with
 * a way to remove it. Checkout re-validates once more at the moment it is
 * clicked, since a guest may have browsed hours ago.
 */
export function BasketView({ catalog, isAuthenticated, mode }: { catalog: Product[]; isAuthenticated: boolean; mode: DataMode }) {
  const [basket, setBasket, loaded] = useLocalStore<BasketStore>(BASKET_STORE_KEY, EMPTY_BASKET);
  const [gateOpen, setGateOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flagged, setFlagged] = useState<RevalidatedLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const rows = basket.lines.map((l) => ({ line: l, product: byId.get(l.product_id) ?? null }));
  const knownRows = rows.filter((r): r is { line: (typeof rows)[number]["line"]; product: Product } => r.product !== null);
  const goneCount = rows.length - knownRows.length;
  const count = basketCount(basket);

  const subtotal = (() => {
    const priced = knownRows.filter((r) => realPrice(r.product, "price") !== null);
    if (priced.length === 0) return null;
    return {
      value: priced.reduce((sum, r) => sum + (realPrice(r.product, "price") as number) * r.line.qty, 0),
      currency: priced[0].product.currency,
      allPriced: priced.length === knownRows.length,
    };
  })();

  async function startCheckout() {
    setError(null);
    if (!isAuthenticated) { setGateOpen(true); return; }
    setPhase("checking");
    const res = await revalidateBasketAction(basket.lines.map((l) => ({ product_id: l.product_id, price_at_add: l.price_at_add })));
    if (!res.ok) { setError(res.error); setPhase("idle"); return; }
    const changed = res.items.filter((i) => !i.available || i.price_changed);
    if (changed.length > 0) { setFlagged(changed); setPhase("review"); return; }
    await submit(basket);
  }

  async function continuePastReview() {
    const drop = flagged.filter((f) => !f.available).map((f) => f.product_id);
    const prices = new Map(flagged.filter((f) => f.available).map((f) => [f.product_id, f.price]));
    const next = reconcileAfterRevalidation(basket, drop, prices);
    setBasket(next);
    setFlagged([]);
    if (next.lines.length === 0) { setPhase("idle"); setError("Every changed item was removed; the basket is now empty."); return; }
    await submit(next);
  }

  async function submit(store: BasketStore) {
    setPhase("submitting");
    const res = await createOrderFromBasketAction(store.lines.map((l) => ({ product_id: l.product_id, qty: l.qty })));
    if (!res.ok) { setError(res.error); setPhase("idle"); return; }
    setBasket(EMPTY_BASKET);
    setOrderId(res.id);
    setPhase("done");
  }

  if (!loaded) return <div className="skeleton h-64 rounded-[var(--radius-lg)]" aria-hidden />;

  if (phase === "done") {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-[var(--brand-strong)]"><ShoppingCart className="size-6" aria-hidden /></span>
          <h2 className="text-[17px] font-semibold text-fg-heading">Request sent</h2>
          <p className="max-w-sm text-[13.5px] leading-relaxed text-fg-secondary">Solink does not process payment online. This created a request, reference <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-[12px]">{orderId}</code>. A provider or Solink follows up from here.</p>
          <div className="flex gap-2"><Button href="/marketplace" variant="outline">Back to marketplace</Button><Button href="/dashboard">Go to dashboard</Button></div>
        </CardBody>
      </Card>
    );
  }

  if (basket.lines.length === 0) {
    return (
      <EmptyState title="Your basket is empty">
        Browse the <Link href="/marketplace" className="underline underline-offset-2">marketplace</Link> and add products. Nothing here needs an account until you check out.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      {mode === "demo" && <DemoBanner className="lg:col-span-2" text="LOCAL DEMO MODE" detail="The basket is saved in this browser only; checkout needs a connected Supabase project." />}
      <Card>
        <CardHeader title="Basket" subtitle={`${count} item${count === 1 ? "" : "s"}`} />
        <CardBody className="divide-y divide-border/70 p-0">
          {goneCount > 0 && (
            <p className="flex items-start gap-2 px-5 py-3 text-[12.5px] leading-relaxed text-fg-muted">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[color:var(--cls-demo)]" aria-hidden />
              {goneCount} item{goneCount === 1 ? "" : "s"} no longer in the catalog {goneCount === 1 ? "was" : "were"} left out below. Remove {goneCount === 1 ? "it" : "them"} to clear this note.
            </p>
          )}
          {knownRows.map(({ line, product: p }) => {
            const price = realPrice(p, "price");
            return (
              <div key={line.product_id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-inset">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="size-full object-contain p-1.5" />
                  ) : <ImageOff className="size-4 text-fg-muted" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] text-fg-muted">{CATEGORY_SINGULAR[p.category]} · <ManufacturerLink product={p} /></div>
                  <Link href={`/marketplace/${p.id}`} className="block truncate text-[13.5px] font-medium text-fg hover:underline underline-offset-2">{p.name}</Link>
                  <div className="mt-0.5 text-[12.5px]">
                    {price !== null ? <span className="tabular font-medium text-fg">{formatMoney(price, p.currency, Number.isInteger(price) ? 0 : 3)}</span> : <span className="text-fg-muted">Price unavailable</span>}
                    {p.is_demo && <DataBadge cls="demo" compact className="ms-1.5" />}
                  </div>
                </div>
                <div role="group" aria-label={`Quantity: ${p.name}`} className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-[var(--radius)] border border-border-strong bg-elevated px-0.5">
                  <button type="button" onClick={() => setBasket((s) => setLineQty(s, line.product_id, line.qty - 1))} aria-label="Decrease quantity" className="grid size-6 place-items-center rounded text-fg-secondary hover:bg-inset hover:text-fg">−</button>
                  <span className="tabular w-6 text-center text-[12.5px] font-medium text-fg" aria-live="polite">{line.qty}</span>
                  <button type="button" onClick={() => setBasket((s) => setLineQty(s, line.product_id, line.qty + 1))} aria-label="Increase quantity" className="grid size-6 place-items-center rounded text-fg-secondary hover:bg-inset hover:text-fg">+</button>
                </div>
                <button type="button" onClick={() => setBasket((s) => removeLine(s, line.product_id))} aria-label={`Remove ${p.name}`} className="grid size-8 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-inset hover:text-fg"><Trash2 className="size-4" aria-hidden /></button>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Summary" />
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[13.5px]">
              <span className="text-fg-muted">Subtotal</span>
              {subtotal && subtotal.allPriced ? <span className="tabular font-semibold text-fg">{formatMoney(subtotal.value, subtotal.currency, 0)}</span> : <span className="text-fg-muted">Not fully priced</span>}
            </div>
            {subtotal && !subtotal.allPriced && <p className="text-[12px] leading-relaxed text-fg-muted">One or more items have no listed price. This still sends as a request; a provider follows up on the rest.</p>}
            {error && <p className="rounded-[10px] border border-border-strong bg-inset px-3 py-2 text-[12.5px] text-[var(--critical-fg)]">{error}</p>}

            {phase === "review" ? (
              <div className="flex flex-col gap-2 rounded-[10px] border border-border-strong bg-inset p-3">
                <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg"><TriangleAlert className="size-4 shrink-0 text-[color:var(--cls-demo)]" aria-hidden /> Some items changed since you added them</p>
                <ul className="space-y-1 text-[12px] leading-relaxed text-fg-secondary">
                  {flagged.map((f) => <li key={f.product_id}>{f.name ?? "An item"}: {f.reason}</li>)}
                </ul>
                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" onClick={continuePastReview}>Continue with the rest</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setFlagged([]); setPhase("idle"); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button type="button" className="w-full" disabled={phase === "checking" || phase === "submitting"} onClick={startCheckout}>
                {phase === "checking" || phase === "submitting" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
                {phase === "checking" ? "Checking…" : phase === "submitting" ? "Sending…" : "Checkout"}
              </Button>
            )}
            <p className="text-[11.5px] leading-relaxed text-fg-muted">Solink does not process payment online. Checkout sends this as a request to the provider or manufacturer.</p>
          </CardBody>
        </Card>
      </div>

      <CheckoutGateModal open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}
