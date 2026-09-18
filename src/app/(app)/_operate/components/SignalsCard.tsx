import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Placeholder } from "@/components/ui/Placeholder";
import { InfoTip } from "@/components/help/InfoTip";
import type { PlatformSettings } from "@/lib/data/settings";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import { formatNumber } from "@/lib/solar/calculations";
import type { ProductionRecord } from "@/lib/types";
import { deriveStatus, sevenVsThirty } from "../production";
import { StatusPill } from "./StatusPill";

/**
 * Deterministic "Signals" panel: 7-day mean vs previous 30-day mean.
 * Pure arithmetic; no thresholds are applied unless an admin defined them.
 */
export function SignalsCard({ records, settings, className }: { records: ProductionRecord[]; settings: PlatformSettings; className?: string }) {
  const signal = sevenVsThirty(records);
  const derived = deriveStatus(signal, settings, records);
  const dev = signal.deviation;
  return (
    <Card className={className}>
      <CardHeader title={<>Signals <InfoTip term="energy_production" /></>} subtitle="Deterministic comparison of recent output with the preceding month. Not an AI interpretation." action={<StatusPill status={derived.status} />} />
      <CardBody className="space-y-3">
        {derived.cls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} />}
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="7-day mean" value={signal.last7Mean === null ? "—" : `${formatNumber(signal.last7Mean, 1)} kWh`} />
          <Stat label="Prev. 30-day mean" value={signal.prev30Mean === null ? "—" : `${formatNumber(signal.prev30Mean, 1)} kWh`} />
          <Stat label="Deviation" value={dev.value === null ? "—" : `${dev.value >= 0 ? "+" : ""}${(dev.value * 100).toFixed(1)}%`} tone={dev.value === null ? undefined : dev.value < 0 ? "down" : "up"} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
          <DataBadge cls={dev.value === null ? "unavailable" : dev.cls} compact />
          <span>{dev.notes?.[0] ?? dev.reason}</span>
        </div>
        <p className="text-[13.5px] font-medium text-fg">{derived.headline}</p>
        <ul className="list-disc space-y-1 pl-5 text-[13px] text-fg-secondary">{derived.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        {!derived.thresholdsDefined && (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg-muted">Thresholds: <Placeholder k="PRODUCTION_ALERT_THRESHOLDS" /></div>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-fg-muted">{label}</div>
      <div className={`tabular mt-1 text-lg font-semibold ${tone === "down" ? "text-serious-fg" : tone === "up" ? "text-good-fg" : "text-fg"}`}>{value}</div>
    </div>
  );
}
