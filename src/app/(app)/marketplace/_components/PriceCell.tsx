import { DataBadge } from "@/components/ui/DataBadge";
import { Placeholder } from "@/components/ui/Placeholder";
import type { PlaceholderKey } from "@/lib/config/placeholders";
import type { Product } from "@/lib/types";
import { formatMoney, specText } from "@/lib/utils";
import { realPrice } from "./product-helpers";

type CostField = "price" | "installation_cost" | "annual_maintenance_cost" | "cleaning_cost";
const PLACEHOLDER_FOR: Record<CostField, PlaceholderKey | null> = {
  price: null, installation_cost: "INSTALLATION_PRICE", annual_maintenance_cost: "MAINTENANCE_PRICE", cleaning_cost: "MAINTENANCE_PRICE",
};

/**
 * Honest price rendering. A real, positive, non-demo amount is shown with a
 * source badge. Anything else is shown as unavailable with the matching
 * placeholder — never a zero or an invented figure.
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
  const status = spec.value === null ? specText(spec) : null;
  const ph = PLACEHOLDER_FOR[field];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[13px] text-fg-muted">
      {product.is_demo && spec.value !== null ? (
        <>
          <span>No real price</span>
          <DataBadge cls="demo" compact />
        </>
      ) : (
        <>
          <span>{status ?? "Unavailable"}</span>
          <DataBadge cls="unavailable" compact />
        </>
      )}
      {ph ? <Placeholder k={ph} /> : field === "price" && !compact ? <span className="text-[12px]">Prices come only from providers or verified sources.</span> : null}
    </span>
  );
}
