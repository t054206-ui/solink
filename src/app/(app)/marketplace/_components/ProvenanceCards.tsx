import { ExternalLink, FileText, Tag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import type { PriceAvailability, ProductPrice, ProductSourceDocument, ProductSourceType } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { VerificationBadge } from "./VerificationBadge";
import { humanizeKey } from "./product-helpers";

/**
 * The two provenance tables migration 0011 added, shown where a person can
 * check them: every document a product's facts came from, and every supplier
 * price on record. Both lists are read straight from the database; an empty
 * list is shown as empty, never filled from the product's own `source` JSON,
 * so the reader sees exactly what has been recorded.
 */

export const SOURCE_TYPE_LABEL: Record<ProductSourceType, string> = {
  official_manufacturer_datasheet: "Official manufacturer datasheet",
  official_manufacturer_product_page: "Official manufacturer product page",
  official_manufacturer_website: "Official manufacturer website",
  retailer_listing: "Retailer listing",
  other_verified_source: "Other verified source",
};

export const AVAILABILITY_LABEL: Record<PriceAvailability, string> = {
  listed_by_retailer: "Listed by retailer",
  in_stock: "In stock",
  on_request: "On request",
  unavailable: "Not available from this supplier",
};

function HostLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-fg-muted">No link recorded</span>;
  let host = href;
  try { host = new URL(href).hostname; } catch { /* keep raw */ }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-data underline underline-offset-2 hover:opacity-80" aria-label={`${label} (opens in a new tab)`}>
      {host} <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

export function SourceDocumentsCard({ docs, className }: { docs: ProductSourceDocument[]; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader
        title={<><FileText className="size-4 text-[var(--brand-strong)]" aria-hidden /> Documents on record</>}
        subtitle={docs.length === 0 ? "Nothing has been recorded for this product." : `${docs.length} ${docs.length === 1 ? "document" : "documents"}, newest retrieval first. Each row names the fields it supports.`}
      />
      <CardBody>
        {docs.length === 0 ? (
          <p className="text-[13px] text-fg-muted">No document is on record, so this product&apos;s specifications cannot be traced to a source yet.</p>
        ) : (
          <ol className="divide-y divide-border/70 text-[13px]">
            {docs.map((d) => (
              <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={d.source_type.startsWith("official") ? "data" : "neutral"}>{SOURCE_TYPE_LABEL[d.source_type]}</Badge>
                  {d.document_version && <span className="font-mono text-[11.5px] text-fg-muted">{d.document_version}</span>}
                </div>
                <div className="mt-1 font-medium text-fg">{d.document_name}</div>
                <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-[12.5px] text-fg-secondary sm:grid-cols-[auto_1fr]">
                  <dt className="text-fg-muted">Link</dt><dd><HostLink href={d.source_url} label={d.document_name} /></dd>
                  {d.source_date && <><dt className="text-fg-muted">Document date</dt><dd>{formatDate(d.source_date)}</dd></>}
                  <dt className="text-fg-muted">Retrieved</dt><dd>{formatDate(d.retrieved_at)}</dd>
                  <dt className="text-fg-muted">Supports</dt>
                  <dd>{d.fields.length === 0 ? "The record as a whole" : <span title={d.fields.map(humanizeKey).join(", ")}>{d.fields.length} {d.fields.length === 1 ? "field" : "fields"}: {d.fields.slice(0, 4).map(humanizeKey).join(", ")}{d.fields.length > 4 ? ` and ${d.fields.length - 4} more` : ""}</span>}</dd>
                </dl>
                {d.notes && <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">{d.notes}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

export function PricesCard({ prices, className }: { prices: ProductPrice[]; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader
        title={<><Tag className="size-4 text-[var(--brand-strong)]" aria-hidden /> Prices on record</>}
        subtitle={prices.length === 0 ? "No supplier price has been recorded. Solink never estimates one." : `${prices.length} ${prices.length === 1 ? "observation" : "observations"}, newest first. Commercial data, kept apart from the datasheet.`}
      />
      <CardBody>
        {prices.length === 0 ? (
          <p className="text-[13px] text-fg-muted">No Kuwait supplier listing was found for this model when it was imported. A price appears here only when a supplier or an administrator records one.</p>
        ) : (
          <ul className="divide-y divide-border/70 text-[13px]">
            {prices.map((pr) => (
              <li key={pr.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-fg">{pr.supplier_name}</span>
                  <span className="tabular text-[14px] font-semibold text-fg">{formatMoney(pr.price_kwd, pr.currency, 3)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-fg-secondary">
                  {pr.is_demo ? <DataBadge cls="demo" compact /> : <DataBadge cls="source" compact source={pr.supplier_name} />}
                  <VerificationBadge status={pr.verification_status} />
                  {pr.availability && <Badge tone="neutral">{AVAILABILITY_LABEL[pr.availability]}</Badge>}
                  <span>observed {formatDate(pr.observed_at)}</span>
                  <HostLink href={pr.source_url} label={`${pr.supplier_name} listing`} />
                </div>
                {pr.notes && <p className="text-[12px] leading-relaxed text-fg-muted">{pr.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
