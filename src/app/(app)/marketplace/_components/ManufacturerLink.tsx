import Link from "next/link";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The manufacturer's name on a product, as a link to the company profile when
 * the product is linked to a company row (manufacturer_id → slug). A product
 * without one shows the name as plain text: nothing to link to.
 */
export function ManufacturerLink({ product: p, className }: { product: Product; className?: string }) {
  if (!p.manufacturer_slug) return <span className={className}>{p.manufacturer_name}</span>;
  return (
    <Link href={`/marketplace/manufacturers/${encodeURIComponent(p.manufacturer_slug)}`} className={cn("text-fg-secondary underline-offset-2 hover:text-fg hover:underline", className)} title={`${p.manufacturer_name}: manufacturer profile`}>
      {p.manufacturer_name}{p.manufacturer_archived ? <span className="ml-1 text-[11px] text-fg-muted">(archived)</span> : null}
    </Link>
  );
}
