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
import { CATEGORY_SINGULAR, keySpecs } from "./product-helpers";
import { CompareToggle } from "./CompareToggle";
import { PriceCell } from "./PriceCell";
import { VerificationBadge } from "./VerificationBadge";

/** Marketplace product card. Every value is labeled; missing values stay missing. */
export function ProductCard({ product: p }: { product: Product }) {
  const specs = keySpecs(p);
  const href = `/marketplace/${p.id}`;
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[16/9] bg-inset">
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={`${p.manufacturer_name} ${p.model}`} className="size-full object-contain p-4" />
        ) : (
          <div className="grid size-full place-items-center text-[12px] text-fg-muted"><span className="inline-flex items-center gap-1.5"><ImageOff className="size-3.5" aria-hidden /> No image provided</span></div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="brand">{CATEGORY_SINGULAR[p.category]}</Badge>
          {p.is_outdated && <Badge tone="warn">Outdated</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {p.is_demo && <DemoBanner text={DEMO_PRODUCT_BANNER} className="py-1.5 text-[12px]" />}
        <div className="min-w-0">
          <div className="text-[12px] text-fg-muted">{p.manufacturer_name} · <span className="font-mono">{p.model}</span></div>
          <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-fg"><Link href={href} className="hover:underline underline-offset-2">{p.name}</Link></h3>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <VerificationBadge status={p.source.verification_status} />
          <DataBadge cls={p.is_demo ? "demo" : "source"} compact source={p.source.data_source} />
        </div>
        {specs.length > 0 && (
          <dl className="grid gap-1.5 text-[13px]">
            {specs.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5 last:border-0 last:pb-0">
                <dt className="flex items-center gap-1 text-fg-muted">{s.label}{s.term && <InfoTip term={s.term} />}</dt>
                <dd className="tabular text-right font-medium text-fg">{specText(s.spec)}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto flex flex-col gap-3 pt-1">
          <div className="text-[13px]"><span className="mr-1.5 text-fg-muted">Price</span><PriceCell product={p} compact /></div>
          {(p.source.kuwait_supplier || p.source.kuwait_availability) && (
            <p className="text-[12px] leading-snug text-fg-muted">
              {p.source.kuwait_supplier ? <>Kuwait supplier: <span className="text-fg-secondary">{p.source.kuwait_supplier}</span></> : null}
              {p.source.kuwait_availability === "listed_by_retailer" ? <>{p.source.kuwait_supplier ? " · " : ""}Listed by retailer, not independently verified</> : null}
              {p.source.kuwait_availability === "unavailable" ? <>{p.source.kuwait_supplier ? " · " : ""}Not available in Kuwait per the source</> : null}
              {p.source.kuwait_price_observed_at ? <> · price observed {formatDate(p.source.kuwait_price_observed_at)}</> : null}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <CompareToggle id={p.id} />
            <Link href={href} className="inline-flex h-8 items-center gap-1 rounded-[10px] px-2.5 text-[13px] font-medium text-fg-secondary hover:bg-inset hover:text-fg">Details <ArrowRight className="size-3.5" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
