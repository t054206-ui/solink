import type { ReactNode } from "react";
import { DataBadge } from "./DataBadge";
import { InfoTip } from "@/components/help/InfoTip";
import type { Classified } from "@/lib/classification";
import { cn } from "@/lib/utils";

/**
 * A metric with provenance. If the value is unavailable, shows the reason
 * instead of a number — never a fabricated figure.
 */
export function Metric({ label, term, data, format, unit, className, size = "md", footnote }: {
  label: ReactNode; term?: string; data: Classified; format?: (v: number) => string; unit?: string; className?: string; size?: "md" | "lg"; footnote?: ReactNode;
}) {
  const has = data.value !== null && data.value !== undefined;
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-border bg-elevated p-3 shadow-sm flex flex-col gap-1.5 min-w-0", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[12px] font-medium text-fg-secondary truncate">{label}{term && <InfoTip term={term} />}</div>
        <DataBadge cls={data.cls} compact />
      </div>
      {has ? (
        <div className={cn("tabular font-mono font-medium leading-none tracking-[-0.02em] text-fg", size === "lg" ? "text-[28px]" : "text-[22px]")}>
          {format ? format(data.value as number) : (data.value as number).toLocaleString("en-US", { maximumFractionDigits: 1 })}
          {unit && <span className="ml-1 text-sm font-medium text-fg-muted">{unit}</span>}
        </div>
      ) : (
        <div className="text-[13px] leading-snug text-fg-muted">
          <span className="font-medium text-fg-secondary">Not enough data.</span> {data.reason}
        </div>
      )}
      {(data.source || footnote) && <div className="text-[11.5px] text-fg-muted truncate">{footnote ?? data.source}</div>}
    </div>
  );
}
