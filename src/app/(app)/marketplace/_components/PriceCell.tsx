import { DataBadge } from "@/components/ui/DataBadge";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { realPrice } from "./product-helpers";

type CostField = "price" | "installation_cost" | "annual_maintenance_cost" | "cleaning_cost";

/**
 * Honest price rendering. A real, positive, non-demo amount is shown with a
 * source badge. Anything else says who prices it — never a zero or an
 * invented figure.
 */
export function PriceCell({ product, field = "price", compact = false }: { product: Product; field?: CostField; compact?: boolean }) {
  const real = realPrice(product, field);
  if (real !== null) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="tabular font-semibold text-fg">{formatMoney(real, product.currency, Number.isInteger(real) ? 0 : 3)}</span>
        <DataBadge cls="source" compact={compact} source={compact ? undefined : product.source.data_source} />
      </span>
    );
  }
  const spec = product[field];
  // No real price: say who prices it (owner, 2026-09-24). Never N/A, never a token, never a zero.
  const ask = field === "price" ? "Price on request from supplier" : field === "installation_cost" ? "Quoted by your installer" : "Quoted by your provider";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[13px] text-fg-muted">
      {product.is_demo && spec.value !== null ? (
        <>
          <span>No real price</span>
          <DataBadge cls="demo" compact />
        </>
      ) : (
        <span>{ask}</span>
      )}
    </span>
  );
}
