import { ExternalLink, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataBadge } from "@/components/ui/DataBadge";
import type { ProductPrice } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

/**
 * Where to actually buy the thing.
 *
 * Solink is a catalogue, not a shop: it never takes a payment and never
 * pretends to be the seller. What it can do is hand over the supplier listing
 * it has on record, so this component renders links and nothing else.
 *
 * Every link comes from `solar_product_prices.source_url`, a URL an
 * administrator or the supplier recorded alongside an observed price. No URL
 * is constructed, guessed, or swapped for a manufacturer's home page: a
 * product with no recorded listing says so, which is the honest answer and the
 * one that tells the catalogue's owners what is missing.
 *
 * Demo rows are filtered out. A demo price is there to exercise the interface,
 * and sending someone to buy against one would be the worst kind of fiction.
 *
 * Several suppliers are listed as equals, in the order the database returns
 * them (most recently observed first). Nothing here ranks them or calls one
 * the best price: the records do not support that claim.
 */

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Listing({ price }: { price: ProductPrice }) {
  return (
    <li className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-fg">{price.supplier_name}</span>
        <span className="tabular text-[14px] font-semibold text-fg">{formatMoney(price.price_kwd, price.currency, 3)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-secondary">
        <span>Price observed {formatDate(price.observed_at)}</span>
        <a
          href={price.source_url as string}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-data underline underline-offset-2 hover:opacity-80"
          aria-label={`Visit ${price.supplier_name} to buy this product (opens in a new tab)`}
        >
          Visit {hostOf(price.source_url as string)} <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </li>
  );
}

export function SupplierPurchase({ prices, className }: { prices: ProductPrice[]; className?: string }) {
  // Only real listings that carry a link can send anyone anywhere.
  const listings = prices.filter((p) => !p.is_demo && typeof p.source_url === "string" && p.source_url.length > 0);

  if (listings.length === 0) {
    return (
      <div className={className}>
        <div className="rounded-[10px] border border-dashed border-border-strong bg-inset p-3">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-fg">
            <Store className="size-4 text-fg-muted" aria-hidden="true" /> Purchase link unavailable
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
            No supplier listing with a link is on record for this model, so Solink has nowhere honest to send you.
            Solink does not sell panels, and it will not invent a shop link. The manufacturer and its documents are
            listed on this page if you want to approach a distributor yourself.
          </p>
        </div>
      </div>
    );
  }

  const single = listings.length === 1 ? listings[0] : null;

  return (
    <div className={className}>
      {single ? (
        <>
          <Button href={single.source_url as string} target="_blank" rel="noopener noreferrer" className="w-full">
            Purchase from supplier <ExternalLink className="size-4" aria-hidden="true" />
          </Button>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-fg-secondary">
            <span className="font-medium text-fg">{single.supplier_name}</span>
            <span className="tabular">{formatMoney(single.price_kwd, single.currency, 3)}</span>
            <DataBadge cls="source" compact source={single.supplier_name} />
            <span>observed {formatDate(single.observed_at)}</span>
          </p>
        </>
      ) : (
        <>
          <div className="micro">Available from</div>
          <ul className="mt-1 divide-y divide-border/70 text-[13px]">
            {listings.map((p) => (
              <Listing key={p.id} price={p} />
            ))}
          </ul>
        </>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">
        You will be redirected to the supplier&apos;s website to complete your purchase. Solink does not sell panels or
        process payments, and the price above is what the listing showed when it was recorded, not an offer from
        Solink.
      </p>
    </div>
  );
}
