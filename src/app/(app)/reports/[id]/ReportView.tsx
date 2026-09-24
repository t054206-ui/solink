import Link from "next/link";
import { ArrowLeft, Leaf, Sparkles, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Metric } from "@/components/ui/Metric";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { EmptyState, UnavailableState } from "@/components/ui/States";
import { InfoTip } from "@/components/help/InfoTip";
import { BarChart } from "@/components/charts/BarChart";
import { type Classified, type DataClass, unavailable } from "@/lib/classification";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import type { Incident, MaintenanceCase, MonthlyReport } from "@/lib/types";
import { formatDate, formatMoney, specText } from "@/lib/utils";
import { AiExplainButton } from "../../_ops/AiExplainButton";
import { MAINT_KIND, MAINT_STATUS } from "../../_ops/meta";
import { fmtKwh, fmtPct, monthLabel, previousMonth } from "../../_ops/production";
import { PrintReportButton } from "./PrintReportButton";

export interface ReportViewProps {
  report: MonthlyReport;
  systemName: string;
  /** Daily kWh for the report month, recomputed from the production records. */
  breakdown: { day: string; kwh: number }[];
  breakdownCls: DataClass;
  /** Maintenance cases and incidents that fall in the report month. */
  cases: MaintenanceCase[];
  incidents: Incident[];
  /** True for a report generated on this device because Supabase is not connected. */
  isLocal?: boolean;
}

export function ReportView({ report, systemName, breakdown, breakdownCls, cases, incidents, isLocal = false }: ReportViewProps) {
  const m = report.maintenance;
  const activity = m.incidents + m.cleanings + m.repairs + m.replacements;

  const energy: Classified = report.energy.total_kwh === null
    ? unavailable(`No production records were available for ${monthLabel(report.month)}. ${PLACEHOLDERS.SOLAR_MONITORING_HARDWARE_API}`)
    : { value: report.energy.total_kwh, cls: report.energy.cls, source: report.energy.cls === "demo" ? "Simulated series" : "Daily production records" };

  const trend: Classified = report.energy.trend_pct === null
    ? unavailable(`${monthLabel(previousMonth(report.month))} does not have enough daily records to compare against.`)
    : { value: report.energy.trend_pct, cls: report.energy.cls === "demo" ? "demo" : "calculated", source: "Solink calculator", notes: [`Versus ${monthLabel(previousMonth(report.month))}`] };

  const savings: Classified = report.financial.estimated_savings === null
    ? unavailable(PLACEHOLDERS.ELECTRICITY_TARIFF)
    : { value: report.financial.estimated_savings, cls: report.financial.cls, source: "Solink calculator", notes: report.financial.notes };

  const maintenanceCost: Classified = report.financial.maintenance_costs === null
    ? unavailable(activity === 0 ? "No maintenance work was recorded in this month." : PLACEHOLDERS.MAINTENANCE_PRICE)
    : { value: report.financial.maintenance_costs, cls: "source", source: "Recorded maintenance costs" };

  const co2: Classified = report.environmental.co2_kg === null
    ? unavailable(PLACEHOLDERS.GRID_CO2_EMISSION_FACTOR)
    : { value: report.environmental.co2_kg, cls: report.environmental.cls, source: "Solink calculator", notes: report.environmental.notes };

  const hasAi = report.ai.cls === "ai" && (report.ai.observations.length > 0 || report.ai.issues.length > 0 || report.ai.recommendations.length > 0);
  const currency = report.financial.currency || "KWD";

  return (
    <div id="report-print-root" className="space-y-6">
      <style>{`@media print {
        aside, nav, button.fixed, .print\\:hidden { display: none !important; }
        main { padding: 0 !important; }
        #report-print-root { font-size: 12px; }
        #report-print-root a { text-decoration: none; color: inherit; }
        #report-print-root .print-break { break-inside: avoid; }
      }`}</style>

      <PageHeader
        eyebrow="Operate · Monthly report"
        title={monthLabel(report.month)}
        description={<>{systemName} · generated {formatDate(report.generated_at, { year: "numeric", month: "short", day: "numeric" })}</>}
        actions={
          <>
            <Link href="/reports" className="print:hidden inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-fg-secondary hover:bg-inset hover:text-fg">
              <ArrowLeft className="size-4" aria-hidden /> All reports
            </Link>
            <PrintReportButton />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {report.is_demo && <DataBadge cls="demo" />}
        {isLocal && <Badge tone="neutral">Stored on this device</Badge>}
      </div>

      {report.is_demo && <DemoBanner detail="This report describes a demo system built on a simulated production series. None of it is a real measurement." />}

      {/* ---------------- Energy ---------------- */}
      <Card className="print-break">
        <CardHeader title={<>Energy <InfoTip term="energy_production" /></>} subtitle={`What the system produced in ${monthLabel(report.month)}, from the daily records Solink holds.`} />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Total produced" term="energy_production" data={energy} format={(v) => fmtKwh(v, 1)} energy />
            <Metric
              label={<span className="inline-flex items-center gap-1.5">Change vs previous month {report.energy.trend_pct !== null && (report.energy.trend_pct < 0 ? <TrendingDown className="size-3.5 text-serious-fg" aria-hidden /> : <TrendingUp className="size-3.5 text-good-fg" aria-hidden />)}</span>}
              data={trend}
              format={(v) => fmtPct(v)}
            />
          </div>

          {breakdown.length === 0 ? (
            <UnavailableState title="No daily breakdown available">The daily records behind this month are no longer in the loaded range, so the chart cannot be drawn.</UnavailableState>
          ) : (
            <div className="space-y-2">
              {breakdownCls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} />}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-fg-muted">
                <span>Daily production · kWh</span>
                <DataBadge cls={breakdownCls} compact />
              </div>
              <BarChart data={breakdown.map((d) => ({ label: d.day.slice(8), value: d.kwh }))} ariaLabel={`Daily production for ${monthLabel(report.month)}`} height={180} />
              <p className="text-[11.5px] text-fg-muted">One bar per day of the month, labelled by day number. {breakdown.length} day{breakdown.length === 1 ? "" : "s"} recorded.</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ---------------- Financial ---------------- */}
      <Card className="print-break">
        <CardHeader title="Financial" subtitle="What the month's production may have been worth, and what maintenance cost." />
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Estimated savings" term="estimated_savings" data={savings} format={(v) => formatMoney(v, currency, 2)} />
            <Metric label="Maintenance costs" term="maintenance_costs" data={maintenanceCost} format={(v) => formatMoney(v, currency, 2)} />
          </div>
          {report.financial.notes.length > 0 && (
            <ul className="space-y-0.5 text-[11.5px] leading-snug text-fg-muted">
              {report.financial.notes.map((n, i) => <li key={i} className="break-words">· {n}</li>)}
            </ul>
          )}
          {report.financial.estimated_savings === null && (
            <p className="text-[13px] leading-relaxed text-fg-secondary">
              Savings cannot be calculated without a price per kWh: <Placeholder k="ELECTRICITY_TARIFF" />. Solink will not multiply your production by a guessed tariff.
            </p>
          )}
        </CardBody>
      </Card>

      {/* ---------------- Maintenance ---------------- */}
      <Card className="print-break">
        <CardHeader title="Maintenance" subtitle="Incidents, cleaning, repairs and replacements recorded in this month." />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Count label="Incidents" value={m.incidents} tone={m.incidents ? "warn" : "neutral"} />
            <Count label="Cleanings" value={m.cleanings} />
            <Count label="Repairs" value={m.repairs} />
            <Count label="Replacements" value={m.replacements} />
          </div>

          {activity === 0 && cases.length === 0 && incidents.length === 0 ? (
            <EmptyState title="No maintenance activity this month" className="py-6">Nothing was recorded against this system in {monthLabel(report.month)}.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {incidents.map((i) => (
                <li key={i.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
                    <Badge tone={i.status === "open" ? "critical" : i.status === "investigating" ? "warn" : "neutral"}>Incident · {i.status}</Badge>
                    {i.panel_index != null && <span>Panel #{i.panel_index}</span>}
                    {i.is_demo && <DataBadge cls="demo" compact />}
                    <span className="ml-auto tabular">{formatDate(i.occurred_at)}</span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] text-fg">{i.reported_problem}</p>
                  <p className="text-[12.5px] text-fg-secondary">Cost: {specText(i.cost)}</p>
                </li>
              ))}
              {cases.map((c) => (
                <li key={c.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
                    <Badge tone={MAINT_STATUS[c.status].tone}>{MAINT_KIND[c.kind].label} · {MAINT_STATUS[c.status].label}</Badge>
                    {c.is_demo && <DataBadge cls="demo" compact />}
                    <span className="ml-auto tabular">{formatDate(c.appointment_at ?? c.updated_at)}</span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] text-fg">{c.work_performed ?? c.detected_issue}</p>
                  <p className="text-[12.5px] text-fg-secondary">Cost: {specText(c.cost)}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11.5px] text-fg-muted">Counts come from the records themselves. A cost appears only where a provider or technician entered one: <Placeholder k="MAINTENANCE_PRICE" /></p>
        </CardBody>
      </Card>

      {/* ---------------- Environmental ---------------- */}
      <Card className="print-break">
        <CardHeader title={<><Leaf className="size-4 text-good-fg" aria-hidden /> Environmental</>} subtitle="CO₂ avoided by producing this energy instead of drawing it from the grid." />
        <CardBody className="space-y-3">
          <Metric label="CO₂ avoided" term="co2_reduction" data={co2} format={(v) => `${Math.round(v).toLocaleString("en-US")} kg`} className="sm:max-w-sm" />
          {report.environmental.co2_kg === null && <PlaceholderNote k="GRID_CO2_EMISSION_FACTOR" />}
          {report.environmental.notes.length > 0 && report.environmental.co2_kg !== null && (
            <ul className="space-y-0.5 text-[11.5px] text-fg-muted">{report.environmental.notes.map((n, i) => <li key={i}>· {n}</li>)}</ul>
          )}
        </CardBody>
      </Card>

      {/* ---------------- AI ---------------- */}
      <Card className="print-break">
        <CardHeader
          title={<><Sparkles className="size-4 text-[var(--cls-ai)]" aria-hidden /> AI observations</>}
          subtitle="An interpretation of this month's records. It is generated only when you ask for it, and it is never treated as measurement."
          action={hasAi ? <DataBadge cls="ai" compact /> : <DataBadge cls="unavailable" compact />}
        />
        <CardBody className="space-y-4">
          {hasAi ? (
            <div className="space-y-3">
              <AiList title="Observations" items={report.ai.observations} />
              <AiList title="Issues" items={report.ai.issues} />
              <AiList title="Recommendations" items={report.ai.recommendations} />
              <p className="text-[11.5px] text-fg-muted">Generated by the AI Solar Agent from the records above. It can be wrong and should be checked.</p>
            </div>
          ) : (
            <UnavailableState title="AI observations unavailable">
              No AI interpretation is stored for this report. Ask for one below. The AI reads this month&apos;s figures, including the ones that are missing, and says so rather than inventing them.
            </UnavailableState>
          )}
          <AiExplainButton
            className="print:hidden"
            subject="report"
            systemId={report.system_id}
            label={hasAi ? "Ask the AI again" : "Generate AI observations"}
            payload={{
              month: report.month,
              system: systemName,
              energy_kwh: report.energy.total_kwh,
              energy_class: report.energy.cls,
              trend_vs_previous_month_pct: report.energy.trend_pct,
              daily_breakdown: breakdown,
              maintenance: m,
              estimated_savings: report.financial.estimated_savings,
              maintenance_costs: report.financial.maintenance_costs,
              co2_kg: report.environmental.co2_kg,
              missing_inputs: [
                report.financial.estimated_savings === null ? PLACEHOLDERS.ELECTRICITY_TARIFF : null,
                report.environmental.co2_kg === null ? PLACEHOLDERS.GRID_CO2_EMISSION_FACTOR : null,
              ].filter(Boolean),
            }}
          />
        </CardBody>
      </Card>

      {/* ---------------- Print / export ---------------- */}
      <Card className="print:hidden">
        <CardHeader title="Printing and PDF" subtitle="What this button actually does." />
        <CardBody className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <PrintReportButton label="Print this report" />
            <span className="text-[13px] text-fg-secondary">Opens your browser&apos;s print dialog, where you can choose &ldquo;Save as PDF&rdquo;.</span>
          </div>
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            Solink does not generate a PDF on the server, and does not store one. A server-side PDF (with a stable file name, archived per month and attachable to an email) is a future step; it needs a rendering service and <Placeholder k="EMAIL_NOTIFICATION_PROVIDER" /> before a report can be delivered anywhere.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Count({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warn" }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
      <div className="flex items-center gap-1.5 text-[12px] text-fg-muted"><Wrench className="size-3.5" aria-hidden />{label}</div>
      <div className={`tabular mt-1 text-xl font-semibold ${tone === "warn" && value > 0 ? "text-warn-fg" : "text-fg"}`}>{value}</div>
    </div>
  );
}

function AiList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-fg-heading">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-fg-secondary">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}
