import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { ReadinessRing } from "@/components/illustrations/Illustrations";
import { thresholdsFact } from "@/lib/content/platformFacts";
import { InfoTip } from "@/components/help/InfoTip";
import type { PlatformSettings } from "@/lib/data/settings";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import { formatNumber } from "@/lib/solar/calculations";
import type { ProductionRecord } from "@/lib/types";
import { SIGNAL_WINDOW_DAYS, deriveStatus, sevenVsThirty } from "../production";
import { StatusPill } from "./StatusPill";

/**
 * Deterministic "Signals" panel: 7-day mean vs previous 30-day mean.
 * Pure arithmetic; no thresholds are applied unless an admin defined them.
 */
export function SignalsCard({ records, settings, className }: { records: ProductionRecord[]; settings: PlatformSettings; className?: string }) {
  const signal = sevenVsThirty(records);
  const derived = deriveStatus(signal, settings, records);
  const dev = signal.deviation;
  const th = thresholdsFact(settings);
  const building = dev.value === null;
  const days = new Set(records.map((r) => r.period_start.slice(0, 10))).size;
  return (
    <Card className={className}>
      <CardHeader title={<>Signals <InfoTip term="energy_production" /></>} subtitle="Your last 7 days against the 30 before. Plain arithmetic, not an AI interpretation." action={building ? undefined : <StatusPill status={derived.status} />} />
      <CardBody className="space-y-3">
        {derived.cls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} />}
        {building ? (
          // Until enough days are on file the card shows how far along it is,
          // counting only real records; no mean or deviation is drawn.
          <>
            <ReadinessRing value={Math.min(days, SIGNAL_WINDOW_DAYS)} total={SIGNAL_WINDOW_DAYS} label="days of records" />
            <p className="text-[13px] leading-relaxed text-fg-secondary">Signals start once {SIGNAL_WINDOW_DAYS} days of daily records are on file: 7 recent days to compare with the 30 before them.</p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="7-day mean" value={`${formatNumber(signal.last7Mean ?? 0, 1)} kWh`} />
              <Stat label="Prev. 30-day mean" value={`${formatNumber(signal.prev30Mean ?? 0, 1)} kWh`} />
              <Stat label="Deviation" value={`${dev.value! >= 0 ? "+" : ""}${(dev.value! * 100).toFixed(1)}%`} tone={dev.value! < 0 ? "down" : "up"} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
              <DataBadge cls={dev.cls} compact />
              <span>{dev.notes?.[0]}</span>
            </div>
            <p className="text-[13.5px] font-medium text-fg">{derived.headline}</p>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-fg-secondary">{derived.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          </>
        )}
        {th && <p className="text-[12.5px] text-fg-muted"><span className="font-medium text-fg-secondary">Thresholds:</span> {th.text}.</p>}
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
