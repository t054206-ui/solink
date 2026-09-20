import { AlertTriangle, ExternalLink } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

/**
 * The references behind one product record, in the user's reach rather than
 * buried in the database.
 *
 * The rule this component exists to enforce: a source is shown against the
 * thing it actually supports. A manufacturer datasheet backs the electrical
 * specifications; it says nothing about what a shop in Kuwait stocks or
 * charges, so the price and availability rows carry the supplier's link
 * instead. Where nothing was found the row reads "Source unavailable" rather
 * than falling back to a company homepage, which would imply evidence that
 * does not exist.
 *
 * Presentational only, so both the server-rendered product page and the
 * client-side recommendation cards can use it.
 */

export interface ReferenceRow {
  label: string;
  /** Plain text shown when there is no link, or beside one. */
  detail: string;
  href?: string | null;
  /** Short call to action, e.g. "View datasheet". */
  linkLabel?: string;
}

const UNAVAILABLE = "Source unavailable";

/** True when the specifications came from a manufacturer datasheet rather than a reseller. */
export function specsAreManufacturerConfirmed(p: Product): boolean {
  return Boolean(p.source.datasheet_url);
}

/** Builds the rows for a product. Anything missing becomes an honest "Source unavailable". */
export function buildReferences(p: Product): ReferenceRow[] {
  const s = p.source;
  const rows: ReferenceRow[] = [];

  rows.push({
    label: "Manufacturer",
    detail: p.manufacturer_name,
    href: s.manufacturer_url ?? s.manufacturer_doc_url ?? null,
    linkLabel: "View manufacturer",
  });

  rows.push({
    label: "Technical datasheet",
    detail: s.manufacturer_source_note ?? (s.datasheet_url ? p.model : UNAVAILABLE),
    href: s.datasheet_url ?? null,
    linkLabel: "View datasheet",
  });

  if (s.kuwait_supplier || s.kuwait_supplier_url) {
    rows.push({
      label: "Kuwait supplier",
      detail: s.kuwait_supplier ?? UNAVAILABLE,
      href: s.kuwait_supplier_url ?? null,
      linkLabel: "View Kuwait listing",
    });
  }

  const price = s.kuwait_price_kwd;
  rows.push({
    label: "Price source",
    detail:
      typeof price === "number"
        ? `${s.kuwait_supplier ?? "Supplier"} — ${price.toFixed(3)} KWD${s.kuwait_price_observed_at ? `, observed ${formatDate(s.kuwait_price_observed_at)}` : ""}`
        : UNAVAILABLE,
    href: typeof price === "number" ? s.kuwait_supplier_url ?? null : null,
    linkLabel: "View price source",
  });

  rows.push({
    label: "Specifications",
    detail: specsAreManufacturerConfirmed(p)
      ? "Manufacturer-confirmed (official datasheet)"
      : "Retailer-stated, not confirmed against a manufacturer datasheet",
  });

  rows.push({
    label: "Kuwait availability",
    detail:
      s.kuwait_availability === "listed_by_retailer"
        ? s.kuwait_availability_note ?? "Listed by retailer, not independently verified"
        : UNAVAILABLE,
  });

  return rows;
}

function ReferenceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-data underline underline-offset-2 hover:opacity-80"
      aria-label={`${label} (opens in a new tab)`}
    >
      {label}
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

/**
 * The reference list. `compact` drops the surrounding padding for use inside a
 * disclosure on a recommendation card.
 */
export function SourceReferences({ product, className, compact = false }: { product: Product; className?: string; compact?: boolean }) {
  const rows = buildReferences(product);
  const conflict = product.source.source_conflict_note;

  return (
    <div className={cn("text-[13px]", className)}>
      <dl className={cn("divide-y divide-border/70", compact && "text-[12.5px]")}>
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-fg-muted sm:w-40">{r.label}</dt>
            <dd className="min-w-0 break-words text-fg sm:text-right">
              <span className={cn(r.detail === UNAVAILABLE && "text-fg-muted")}>{r.detail}</span>
              {r.href && r.linkLabel ? (
                <>
                  {" "}
                  <span aria-hidden="true" className="text-fg-muted">
                    ·
                  </span>{" "}
                  <ReferenceLink href={r.href} label={r.linkLabel} />
                </>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {conflict ? (
        <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-border-strong bg-inset p-2.5 text-[12.5px] leading-relaxed text-fg-secondary">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--cls-demo)]" aria-hidden="true" />
          <span>{conflict}</span>
        </p>
      ) : null}
    </div>
  );
}
