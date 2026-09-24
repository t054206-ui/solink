import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { InfoTip } from "@/components/help/InfoTip";
import { DEMO_PRODUCT_BANNER } from "@/lib/demo/data";
import type { Product } from "@/lib/types";
import { formatDate, specText } from "@/lib/utils";
import { CATEGORY_SINGULAR, keySpecs, realPrice } from "./product-helpers";
import { AddToBasketButton } from "./AddToBasketButton";
import { CompareToggle } from "./CompareToggle";
import { PriceCell } from "./PriceCell";
import { VerificationBadge } from "./VerificationBadge";
import { ManufacturerLink } from "./ManufacturerLink";

/**
 * Marketplace product card. Every value is labeled; missing values stay missing.
 *
 * Read in this order: the product itself (the manufacturer's own render,
 * large), what it is, its two headline figures, its price and where it is
 * sold, then the actions. Everything else on the card is still there, set
 * smaller.
 */
export function ProductCard({ product: p }: { product: Product }) {
  const specs = keySpecs(p);
  const headline = specs.slice(0, 2);
  const rest = specs.slice(2);
  const href = `/marketplace/${p.id}`;
  return (
    <Card className="lift group flex h-full flex-col overflow-hidden hover:border-border-strong">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden bg-inset">
        <div className="grid-rule pointer-events-none absolute inset-0 opacity-30" />
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt="" className="relative size-full object-contain p-5 transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]" />
        ) : (
          <div className="relative grid size-full place-items-center text-[12px] text-fg-muted"><span className="inline-flex items-center gap-1.5"><ImageOff className="size-3.5" aria-hidden /> No image provided</span></div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="brand">{CATEGORY_SINGULAR[p.category]}</Badge>
          {p.is_outdated && <Badge tone="warn">Outdated</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 border-t border-border p-4">
        {p.is_demo && <DemoBanner text={DEMO_PRODUCT_BANNER} className="py-1.5 text-[12px]" />}
        <div className="min-w-0">
          <div className="micro truncate" style={{ color: "var(--data)" }}><ManufacturerLink product={p} />{p.series ? <> · {p.series}</> : null}</div>
          <h3 className="mt-1 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-fg-heading"><Link href={href} className="hover:underline underline-offset-2">{p.name}</Link></h3>
          <div className="mt-0.5 font-mono text-[12px] text-fg-muted">{p.model}</div>
        </div>
        {headline.length > 0 && (
          <dl className="grid grid-cols-2 gap-2">
            {headline.map((s, i) => (
              <div key={s.label} className="rounded-[var(--radius)] border border-border bg-inset px-2.5 py-2">
                <dt className="micro flex items-center gap-1">{s.label}{s.term && <InfoTip term={s.term} />}</dt>
                {/* The first headline figure is the energy one (rated power / capacity): amber. The second is technical: navy. */}
                <dd className="figure mt-0.5 text-[18px] font-medium" style={{ color: i === 0 ? "var(--sun-ink)" : "var(--brand-strong)" }}>{specText(s.spec)}</dd>
              </div>
            ))}
          </dl>
        )}
        {rest.length > 0 && (
          <dl className="grid gap-1 text-[12.5px]">
            {rest.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-3">
                <dt className="flex items-center gap-1 text-fg-muted">{s.label}{s.term && <InfoTip term={s.term} />}</dt>
                <dd className="tabular text-right text-fg-secondary">{specText(s.spec)}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <VerificationBadge status={p.source.verification_status} />
          <DataBadge cls={p.is_demo ? "demo" : "source"} compact source={p.source.data_source} />
        </div>
        <div className="mt-auto flex flex-col gap-3 border-t border-border/70 pt-3">
          <div className="flex items-baseline justify-between gap-2 text-[13px]"><span className="micro">Price</span><span className="text-right"><PriceCell product={p} compact /></span></div>
          {(p.source.kuwait_supplier || p.source.kuwait_availability) && (
            <p className="text-[12px] leading-snug text-fg-muted">
              {p.source.kuwait_supplier ? <>Kuwait supplier: <span className="font-medium text-[color:var(--data)]">{p.source.kuwait_supplier}</span></> : null}
              {p.source.kuwait_availability === "listed_by_retailer" ? <>{p.source.kuwait_supplier ? " · " : ""}Listed by retailer, not independently verified</> : null}
              {p.source.kuwait_availability === "unavailable" ? <>{p.source.kuwait_supplier ? " · " : ""}Not available in Kuwait per the source</> : null}
              {p.source.kuwait_price_observed_at ? <> · price observed {formatDate(p.source.kuwait_price_observed_at)}</> : null}
            </p>
          )}
          <AddToBasketButton productId={p.id} price={realPrice(p, "price")} currency={p.currency} className="w-full" />
          <div className="flex items-center justify-between gap-2">
            <CompareToggle id={p.id} />
            <Link href={href} className="inline-flex h-8 items-center gap-1 rounded-[10px] px-2.5 text-[13px] font-medium text-fg-secondary hover:bg-inset hover:text-fg">Details <ArrowRight className="size-3.5" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
