import type { PlatformSettings } from "@/lib/data/settings";
import type { TariffCategory } from "@/lib/types";
import { co2Fact, tariffFact, thresholdsFact } from "@/lib/content/platformFacts";
import { cn } from "@/lib/utils";

/**
 * The configured rates Solink applies to this system's production: the
 * tariff, the grid emission factor and the alert thresholds, each with its
 * source. Only rates that exist are listed; the card is omitted when none do.
 */
export function RatesInUse({ settings, category, className, only }: { settings: PlatformSettings; category?: TariffCategory | null; className?: string; only?: ("tariff" | "co2" | "thresholds")[] }) {
  const want = (k: "tariff" | "co2" | "thresholds") => !only || only.includes(k);
  const rows = [
    want("tariff") ? { label: "Electricity rate", fact: tariffFact(settings, category), use: "Turns production into savings." } : null,
    want("co2") ? { label: "Grid emission factor", fact: co2Fact(settings), use: "Turns production into CO₂ avoided." } : null,
    want("thresholds") ? { label: "Alert thresholds", fact: thresholdsFact(settings), use: "When a drop is worth a look." } : null,
  ].filter((r): r is { label: string; fact: { text: string; source: string }; use: string } => Boolean(r?.fact));
  if (!rows.length) return null;
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {rows.map((r) => (
        <div key={r.label} className="min-w-0 rounded-[var(--radius)] border border-border bg-inset p-3">
          <dt className="micro">{r.label}</dt>
          <dd className="mt-1 text-[14px] font-medium text-[color:var(--brand-strong)]">{r.fact.text}</dd>
          <dd className="mt-0.5 text-[12px] text-fg-muted">{r.use}</dd>
          <dd className="mt-1 truncate text-[11.5px] text-fg-info" title={r.fact.source}>{r.fact.source}</dd>
        </div>
      ))}
    </dl>
  );
}
