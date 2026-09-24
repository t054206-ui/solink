import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Metric, hasValue } from "@/components/ui/Metric";
import type { Classified, DataClass } from "@/lib/classification";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import { AiExplainButton } from "../../_ops/AiExplainButton";

export interface PredictiveSignals {
  /** 7-day mean vs previous 30-day mean, as a fraction (productionDeviation). */
  trend: Classified;
  trendWindow: { last7Days: number; previous30Days: number };
  repeatedIncidents: { value: number; cls: DataClass };
  systemAgeYears: Classified;
  warrantyYearsRemaining: Classified;
  productionCls: DataClass;
}

/**
 * Feature 19/34 — Predictive maintenance. Only deterministic signals from the
 * data Solink actually has. No failure prediction is made; the strongest
 * statement allowed is that an inspection may be recommended.
 */
export function PredictiveCard({ signals, systemId, thresholds = null }: { signals: PredictiveSignals; systemId?: string; thresholds?: string | null }) {
  const trend = signals.trend.value;
  const declining = trend !== null && trend < 0;
  const anySignal = declining || signals.repeatedIncidents.value >= 2;
  return (
    <Card>
      <CardHeader title="Predictive maintenance signals" subtitle="Deterministic indicators from the available data. They are inputs to a decision, not a diagnosis." />
      <CardBody className="space-y-3">
        {signals.productionCls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} detail="The production trend below is computed from a simulated series." />}
        <div className="grid gap-3 sm:grid-cols-2">
          {hasValue(signals.trend) && <Metric label="Production trend" term="production_trend" data={signals.trend} format={(v) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`}
            footnote={signals.trend.value === null ? undefined : `Last 7 days (${signals.trendWindow.last7Days} records) vs the 30 days before (${signals.trendWindow.previous30Days} records)`} />}
          <Metric label="Incidents, last 12 months" term="repeated_incidents" data={{ value: signals.repeatedIncidents.value, cls: signals.repeatedIncidents.cls, source: "Incident records" }} format={(v) => String(v)} />
          {hasValue(signals.systemAgeYears) && <Metric label="System age" term="system_age" data={signals.systemAgeYears} unit="years" format={(v) => v.toFixed(1)} />}
          {hasValue(signals.warrantyYearsRemaining) && <Metric label="Product warranty remaining" term="product_warranty" data={signals.warrantyYearsRemaining} unit="years" format={(v) => v.toFixed(1)} footnote={signals.warrantyYearsRemaining.value !== null && signals.warrantyYearsRemaining.value < 0 ? "Product warranty period has ended (calculated)." : undefined} />}
        </div>
        {!hasValue(signals.systemAgeYears) && <p className="text-[12.5px] text-fg-muted">System age and warranty remaining appear once your installation date is in your Solar Passport.</p>}
        <div className="rounded-[10px] border border-border bg-inset p-3 text-[13px] leading-relaxed text-fg-secondary">
          {anySignal ? (
            <>
              <span className="font-semibold text-fg">Inspection may be recommended based on the available performance data.</span>{" "}
              {declining && <>Recent production is below the previous 30-day average. </>}
              {signals.repeatedIncidents.value >= 2 && <>Several incidents were recorded in the last year. </>}
              {thresholds && <>Solink&apos;s alert thresholds: {thresholds}.</>}
            </>
          ) : (
            <>No signal from your records. Solink reports only what it can compute from them, so this is not a guarantee of health.{thresholds && <> Alert thresholds: {thresholds}.</>}</>
          )}
        </div>
        <AiExplainButton subject="maintenance" systemId={systemId} payload={{
          production_trend_7d_vs_30d: signals.trend.value, production_trend_cls: signals.trend.cls, incidents_last_12_months: signals.repeatedIncidents.value,
          system_age_years: signals.systemAgeYears.value, product_warranty_years_remaining: signals.warrantyYearsRemaining.value,
          note: "Thresholds and degradation rate are not defined; do not claim a failure prediction.",
        }} />
      </CardBody>
    </Card>
  );
}
