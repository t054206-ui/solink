import { SolarPanel } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The system's real array: one outlined module per panel on record, with the
 * facts that are on record beside it (count, model, rated power, capacity).
 * It never shows per-panel numbers or states, because none are measured; the
 * note says what per-panel readings need (owner, 2026-09-24: no made-up
 * figures, no "unknown" marks on real accounts).
 */
export function PanelGrid({ count, className, panelLabel, ratedW, capacityKwp }: { count: number; className?: string; panelLabel?: string | null; ratedW?: number | null; capacityKwp?: number | null }) {
  const cols = count <= 12 ? 4 : count <= 24 ? 6 : count <= 40 ? 8 : 10;
  const facts: [string, string][] = [
    ["Panels", String(count)],
    ...(panelLabel ? [["Model", panelLabel] as [string, string]] : []),
    ...(ratedW ? [["Rated power", `${ratedW} W each`] as [string, string]] : []),
    ...(capacityKwp ? [["Array", `${capacityKwp.toLocaleString("en-US", { maximumFractionDigits: 2 })} kWp`] as [string, string]] : []),
  ];
  return (
    <div className={cn("grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]", className)}>
      <div role="img" aria-label={`Your array of ${count} panels`}
        className="grid gap-1.5 rounded-[var(--radius-lg)] border border-border bg-inset p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} title={`Panel ${i + 1}`} className="relative aspect-[3/5] rounded-[4px] border border-[var(--brand)]/70 bg-elevated">
            <div aria-hidden className="absolute inset-[3px] grid grid-cols-3 grid-rows-5 gap-px opacity-40">
              {Array.from({ length: 15 }, (_, j) => <span key={j} className="rounded-[1px] bg-[var(--brand)]/25" />)}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <dl className="grid gap-1.5 text-[13px]">
          {facts.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-fg-muted">{k}</dt><dd className="min-w-0 text-end font-medium text-[color:var(--brand-strong)]">{v}</dd></div>)}
        </dl>
        <p className="flex items-start gap-2 rounded-[var(--radius)] border border-border bg-elevated p-3 text-[12.5px] leading-snug text-fg-secondary">
          <SolarPanel className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" strokeWidth={1.5} aria-hidden />
          <span>Per-panel readings come from optimizers or micro-inverters. With a string inverter, Solink reads the array as a whole.</span>
        </p>
      </div>
    </div>
  );
}
