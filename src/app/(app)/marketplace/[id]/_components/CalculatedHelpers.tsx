import { Metric } from "@/components/ui/Metric";
import type { Product } from "@/lib/types";
import { areaPerKwpM2, panelsPerKwp, powerDensityWm2 } from "../../_components/product-helpers";

/** Transparent derived figures — shown only when the required source inputs exist. */
export function CalculatedHelpers({ product }: { product: Product }) {
  const metrics = [
    { label: "Power density", data: powerDensityWm2(product.specs), unit: "W/m²", digits: 0 },
    { label: "Panels per 1 kWp", data: panelsPerKwp(product.specs), unit: "panels", digits: 2 },
    { label: "Roof area per 1 kWp", data: areaPerKwpM2(product.specs), unit: "m²", digits: 2 },
  ].filter((m) => m.data.value !== null);

  if (metrics.length === 0) {
    return <p className="text-[13px] text-fg-muted">Derived figures (power density, panels per kWp, area per kWp) need rated power and module dimensions, which this record does not provide.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <Metric key={m.label} label={m.label} term={m.label === "Power density" ? "efficiency" : "kwp"} data={m.data} unit={m.unit}
            format={(v) => v.toLocaleString("en-US", { maximumFractionDigits: m.digits })} footnote={m.data.notes?.[0]} />
        ))}
      </div>
      <p className="text-[12px] text-fg-muted">Calculated by Solink from the manufacturer figures above. Module area only — real layouts need spacing and access paths. {product.is_demo && "Inputs are demo values, so these results are illustrative only."}</p>
    </div>
  );
}
