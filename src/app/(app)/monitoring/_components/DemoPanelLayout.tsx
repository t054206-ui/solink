import Link from "next/link";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { DataBadge } from "@/components/ui/DataBadge";
import { cn } from "@/lib/utils";

/**
 * An illustration of what panel-by-panel monitoring will look like once
 * hardware is connected — not a reading of this system. `/monitoring/panels`
 * is the honest page: every panel there is drawn "unknown" because Solink
 * has no per-panel data source, and it says plainly that inventing numbers
 * "would make a faulty panel look healthy, or a healthy one look faulty."
 * This card exists only to show the shape of the feature; it never sits near
 * that page's real grid, and every number on it carries a demo label.
 *
 * The array's own facts stay real: `count` and `panelLabel` come from the
 * signed-in system. Only the per-panel production and performance figures
 * are illustrative, generated deterministically from the panel index so the
 * card renders the same way twice rather than reshuffling on every visit.
 */

interface DemoCell {
  index: number;
  productionKwh: number;
  performancePct: number;
  status: "good" | "warn" | "critical";
}

function demoCells(count: number, ratedW: number): DemoCell[] {
  // A deterministic day-shape: most panels near full output, one soiled, one shaded —
  // enough to show what the three states would look like, never randomised.
  const baselineKwh = (ratedW / 1000) * 5.2; // illustrative full-sun hours, not a platform assumption
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const isFault = count >= 6 && n === Math.ceil(count * 0.7);
    const isWarn = count >= 3 && n === Math.ceil(count * 0.3) && !isFault;
    const wobble = 1 - (((n * 37) % 11) / 100); // small, stable per-panel variation
    const factor = isFault ? 0.22 : isWarn ? 0.68 : 0.9 + wobble * 0.1;
    const performancePct = Math.round(factor * 100);
    return {
      index: n,
      productionKwh: Math.round(baselineKwh * factor * 10) / 10,
      performancePct,
      status: isFault ? "critical" : isWarn ? "warn" : "good",
    };
  });
}

const STATUS_BG: Record<DemoCell["status"], string> = {
  good: "bg-good/70 border-good",
  warn: "bg-warn/70 border-warn",
  critical: "bg-critical/70 border-critical",
};
const STATUS_LABEL: Record<DemoCell["status"], string> = { good: "Normal", warn: "Underperforming", critical: "Fault" };

export function DemoPanelLayout({ count, panelLabel, ratedW }: { count: number; panelLabel: string | null; ratedW: number | null }) {
  const cells = demoCells(count, ratedW ?? 500);
  const cols = count <= 12 ? 4 : count <= 24 ? 6 : count <= 40 ? 8 : 10;
  const avgKwh = cells.reduce((s, c) => s + c.productionKwh, 0) / cells.length;
  const avgPct = Math.round(cells.reduce((s, c) => s + c.performancePct, 0) / cells.length);

  return (
    <div>
      <DemoBanner
        text="DEMO LAYOUT — NOT YOUR PANELS"
        detail="An illustration of what per-panel monitoring will show once hardware is connected. These production and performance figures are made up to show the shape of the feature, not read from your system."
      />
      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div>
          <div role="img" aria-label={`Illustrative layout of ${count} panels with example production and performance figures, not real readings`}
            className="grid gap-1.5 rounded-[var(--radius-lg)] border border-border bg-inset p-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {cells.map((c) => (
              <div
                key={c.index}
                title={`Panel ${c.index}: ${c.productionKwh} kWh today, ${c.performancePct}% of expected (${STATUS_LABEL[c.status]}) — demo figure, not real`}
                className={cn("aspect-[3/5] rounded-[4px] border", STATUS_BG[c.status])}
              >
                <span className="sr-only">Panel {c.index}: {c.productionKwh} kWh, {c.performancePct}% of expected, {STATUS_LABEL[c.status]}. Demo figure, not real.</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-fg-muted">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-[2px] border border-good bg-good/70" aria-hidden /> Normal (example)</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-[2px] border border-warn bg-warn/70" aria-hidden /> Underperforming (example)</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-[2px] border border-critical bg-critical/70" aria-hidden /> Fault (example)</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-[10px] border border-border bg-inset p-3">
            <div className="text-[11.5px] text-fg-muted">Array</div>
            <div className="mt-0.5 text-[13.5px] font-medium text-fg">{count} panels{panelLabel ? <> · {panelLabel}</> : null}</div>
            <DataBadge cls="source" compact className="mt-1.5" />
          </div>
          <div className="rounded-[10px] border border-border bg-inset p-3">
            <div className="text-[11.5px] text-fg-muted">Example avg. production</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular text-fg">{avgKwh.toFixed(1)} kWh/panel</div>
            <DataBadge cls="demo" compact className="mt-1.5" />
          </div>
          <div className="rounded-[10px] border border-border bg-inset p-3">
            <div className="text-[11.5px] text-fg-muted">Example avg. performance</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular text-fg">{avgPct}% of expected</div>
            <DataBadge cls="demo" compact className="mt-1.5" />
          </div>
          <Link href="/monitoring/panels" className="text-[12.5px] text-fg-secondary underline underline-offset-2 hover:text-fg">
            See what your array honestly shows today →
          </Link>
        </div>
      </div>
    </div>
  );
}
