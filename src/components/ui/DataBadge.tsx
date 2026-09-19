import { DATA_CLASS_LABEL, DATA_CLASS_DESCRIPTION, type DataClass } from "@/lib/classification";
import { cn } from "@/lib/utils";

/**
 * Data-classification label. Use next to every metric so users always know
 * whether they are looking at source data, a calculation, an estimate, an AI
 * interpretation, or demo data.
 */
export function DataBadge({ cls, className, compact = false, source }: { cls: DataClass; className?: string; compact?: boolean; source?: string }) {
  const style: React.CSSProperties = { color: `var(--cls-${cls})`, background: `var(--cls-${cls}-soft)` };
  const label = compact ? SHORT[cls] : DATA_CLASS_LABEL[cls];
  return (
    <span
      title={`${DATA_CLASS_LABEL[cls]}${source ? `: ${source}` : ""}. ${DATA_CLASS_DESCRIPTION[cls]}`}
      style={style}
      className={cn("inline-flex items-center gap-1 rounded-[2px] px-1 py-px text-[10px] font-semibold uppercase tracking-[0.05em] leading-[15px] whitespace-nowrap", cls === "demo" && "demo-stripe ring-1 ring-[var(--cls-demo)]/40", className)}
    >
      <span aria-hidden className="inline-block size-1.5 rounded-full" style={{ background: "currentColor" }} />
      {label}{source && !compact ? <span className="font-normal normal-case tracking-normal opacity-80">· {source}</span> : null}
    </span>
  );
}

const SHORT: Record<DataClass, string> = { source: "Source", calculated: "Calculated", estimated: "Estimate", ai: "AI", demo: "DEMO", user: "You", unavailable: "N/A" };
