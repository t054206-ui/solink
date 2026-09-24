import type { ReactNode } from "react";
import { DataBadge } from "./DataBadge";
import { InfoTip } from "@/components/help/InfoTip";
import type { Classified } from "@/lib/classification";
import { cn } from "@/lib/utils";
import { productText } from "@/lib/config/placeholders";

/** Units that mark a figure as energy, which takes the amber ink. Capacity (kWp) stays navy. */
const ENERGY_UNIT = /^(k|M)?Wh(\/day)?$/;

/**
 * A metric with provenance. Never a fabricated figure: when there is no
 * value, homeowner pages hide the metric (see `hasValue`) and show a useful
 * section instead; if one is rendered anyway, it shows the reason.
 *
 * The figure is navy; an energy figure (by its unit, or `energy`) is amber.
 */
export function Metric({ label, term, data, format, unit, className, size = "md", footnote, energy }: {
  label: ReactNode; term?: string; data: Classified; format?: (v: number) => string; unit?: string; className?: string; size?: "md" | "lg"; footnote?: ReactNode; energy?: boolean;
}) {
  const has = data.value !== null && data.value !== undefined;
  const isEnergy = energy ?? ENERGY_UNIT.test(unit ?? "");
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-border bg-elevated p-3 shadow-sm flex flex-col gap-1.5 min-w-0", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[12px] font-medium text-fg-secondary truncate">{label}{term && <InfoTip term={term} />}</div>
        <DataBadge cls={data.cls} compact />
      </div>
      {has ? (
        <div className={cn("tabular font-mono font-medium leading-none tracking-[-0.02em]", isEnergy ? "text-[color:var(--sun-ink)]" : "text-[color:var(--brand-strong)]", size === "lg" ? "text-[28px]" : "text-[22px]")}>
          {format ? format(data.value as number) : (data.value as number).toLocaleString("en-US", { maximumFractionDigits: 1 })}
          {unit && <span className="ml-1 text-sm font-medium text-fg-muted">{unit}</span>}
        </div>
      ) : (
        // Pages hide a metric that has no value (owner, 2026-09-24); this is the
        // fallback if one is still rendered: the reason, in product words.
        <div className="text-[13px] leading-snug text-fg-na">{productText(data.reason ?? "")}</div>
      )}
      {(data.source || footnote) && <div className="text-[11.5px] text-fg-info truncate">{footnote ?? productText(data.source ?? "")}</div>}
    </div>
  );
}

/** True when a classified value can be shown. Homeowner pages render a Metric only then. */
export function hasValue(c: Classified): boolean {
  return c.value !== null && c.value !== undefined;
}
