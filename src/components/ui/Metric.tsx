import type { ReactNode } from "react";
import { DataBadge } from "./DataBadge";
import { InfoTip } from "@/components/help/InfoTip";
import type { Classified } from "@/lib/classification";
import { cn } from "@/lib/utils";

/** Units that mark a figure as energy, which takes the amber ink. Capacity (kWp) stays navy. */
const ENERGY_UNIT = /^(k|M)?Wh(\/day)?$/;

/**
 * A metric with provenance. If the value is unavailable, shows the reason
 * instead of a number — never a fabricated figure.
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
        <div className="text-[13px] leading-snug text-fg-na">
          <span className="font-medium">Not enough data.</span> {data.reason}
        </div>
      )}
      {(data.source || footnote) && <div className="text-[11.5px] text-fg-info truncate">{footnote ?? data.source}</div>}
    </div>
  );
}
