import { cn } from "@/lib/utils";

/**
 * Panel-array visual. Every cell is in the "unknown" state because no
 * panel-level data source is connected. It never shows per-panel numbers.
 */
export function PanelGrid({ count, className }: { count: number; className?: string }) {
  const cols = count <= 12 ? 4 : count <= 24 ? 6 : count <= 40 ? 8 : 10;
  return (
    <div className={className}>
      <div role="img" aria-label={`${count} panels, all in unknown state because panel-level monitoring is not connected`}
        className="grid gap-1.5 rounded-[var(--radius-lg)] border border-border bg-inset p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} title={`Panel ${i + 1}: unknown`}
            className={cn("aspect-[3/5] rounded-[4px] border border-dashed border-border-strong bg-[repeating-linear-gradient(135deg,transparent_0_4px,var(--border)_4px_8px)]")}>
            <span className="sr-only">Panel {i + 1}: unknown</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-fg-muted">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-[2px] border border-dashed border-border-strong" aria-hidden /> Unknown (no data source)</span>
        <span className="inline-flex items-center gap-1.5 opacity-60"><span className="inline-block size-3 rounded-[2px] bg-good" aria-hidden /> Normal: not available yet</span>
        <span className="inline-flex items-center gap-1.5 opacity-60"><span className="inline-block size-3 rounded-[2px] bg-warn" aria-hidden /> Underperforming: not available yet</span>
        <span className="inline-flex items-center gap-1.5 opacity-60"><span className="inline-block size-3 rounded-[2px] bg-critical" aria-hidden /> Fault: not available yet</span>
      </div>
    </div>
  );
}
