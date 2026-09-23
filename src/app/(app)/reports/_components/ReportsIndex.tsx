"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, FilePlus2, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Badge } from "@/components/ui/Badge";
import { Field, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import { Placeholder } from "@/components/ui/Placeholder";
import type { DataMode } from "@/lib/data/mode";
import type { Incident, MaintenanceCase, MonthlyReport, ProductionRecord, SolarSystem } from "@/lib/types";
import type { SolarAssumptions } from "@/lib/solar/calculations";
import { formatDate } from "@/lib/utils";
import { fmtKwh, fmtPct, monthLabel } from "../../_ops/production";
import { isLocalId, mergeRecords, upsertRecord, useLocalIncidents, useLocalMaintenance, useLocalReports } from "../../_ops/localRecords";
import { buildMonthlyReport } from "./buildReport";
import { saveReport } from "../actions";
import { PageHero } from "@/components/layout/PageHero";
import { ReportDeskVisual } from "@/components/three/PageVisuals";

export function ReportsIndex({ heading, demoNotice, mode, serverReports, systems, production, cases, incidents, assumptions, months }: {
  heading: { eyebrow: string; title: string; description: string };
  demoNotice: React.ReactNode;
  mode: DataMode; serverReports: MonthlyReport[]; systems: SolarSystem[]; production: ProductionRecord[]; cases: MaintenanceCase[]; incidents: Incident[];
  assumptions: SolarAssumptions; months: string[];
}) {
  const [localReports, setLocalReports] = useLocalReports();
  const [localCases] = useLocalMaintenance();
  const [localIncidents] = useLocalIncidents();
  const reports = useMemo(() => (mode === "demo" ? mergeRecords(serverReports, localReports) : serverReports).sort((a, b) => b.month.localeCompare(a.month)), [mode, serverReports, localReports]);
  const systemId = systems[0]?.id;
  const [month, setMonth] = useState(months[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const systemName = (id: string) => systems.find((s) => s.id === id)?.name ?? "System";

  async function generate() {
    if (!systemId || !month) return;
    setBusy(true); setError(null);
    const allCases = mode === "demo" ? mergeRecords(cases, localCases) : cases;
    const allIncidents = mode === "demo" ? mergeRecords(incidents, localIncidents) : incidents;
    const report = buildMonthlyReport({ id: `rep-local-${systemId}-${month}`, systemId, month, production, cases: allCases, incidents: allIncidents, assumptions });
    const res = await saveReport({ system_id: systemId, month, energy: report.energy, financial: report.financial, maintenance: report.maintenance, environmental: report.environmental, ai: report.ai });
    if (res.ok) { setBusy(false); return; }
    if (res.reason !== "demo") { setError(res.message); setBusy(false); return; }
    setLocalReports((prev) => upsertRecord(prev, report));
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <PageHero
        label="Monthly reports"
        {...heading}
        layout="reverse"
        focus="30% 50%"
        visual={<ReportDeskVisual systemName={systems[0]?.name ?? "Your system"} panelCount={systems[0]?.panel_count ?? null} reportCount={reports.length} monthCount={months.length} />}
      />
      {demoNotice}
      <Card>
        <CardHeader title="Generate a report" subtitle="Energy and maintenance sections are computed from the records available. Financial and environmental figures stay unavailable until a tariff and an emission factor are provided; the AI section needs the Claude API key." />
        <CardBody>
          {months.length === 0 ? (
            <p className="text-[13px] text-fg-muted">No complete month of production records is available. <Placeholder k="SOLAR_MONITORING_HARDWARE_API" /></p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Month" className="sm:w-64">
                <Select value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select>
              </Field>
              <Button type="button" onClick={generate} disabled={busy || !month}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FilePlus2 className="size-4" aria-hidden />} Generate report for month</Button>
            </div>
          )}
          {error && <p role="alert" className="mt-2 text-[13px] text-critical-fg">{error}</p>}
          <p className="mt-3 text-[12px] text-fg-muted">Inputs not provided: <Placeholder k="ELECTRICITY_TARIFF" /> <Placeholder k="GRID_CO2_EMISSION_FACTOR" /> <Placeholder k="CLAUDE_API_KEY" /></p>
        </CardBody>
      </Card>

      {reports.length === 0 ? (
        <EmptyState title="No reports yet">Generate the first one above.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => {
            const counts = r.maintenance.incidents + r.maintenance.cleanings + r.maintenance.repairs + r.maintenance.replacements;
            return (
              <li key={r.id}>
                {/* A report as a document: a sheet with a folded corner, the month as its title. */}
                <Link href={`/reports/${r.id}`} className="lift group relative block h-full border border-border bg-elevated p-5 shadow-[var(--shadow)] [clip-path:polygon(0_0,calc(100%-22px)_0,100%_22px,100%_100%,0_100%)] hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                  <span aria-hidden="true" className="absolute end-0 top-0 size-[22px] border-b border-s border-border bg-inset" />
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <div className="micro">Monthly report</div>
                      <div className="display mt-1 text-[20px] text-[color:var(--brand-strong)]">{monthLabel(r.month)}</div>
                      <div className="text-[12px] text-[color:var(--data)]">{systemName(r.system_id)}</div>
                    </div>
                    <ChevronRight className="mt-5 size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="figure text-2xl font-medium text-[color:var(--sun-ink)]">{r.energy.total_kwh === null ? <span className="text-base font-medium text-fg-muted">Unavailable</span> : fmtKwh(r.energy.total_kwh)}</div>
                    <DataBadge cls={r.energy.cls} compact />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px] text-fg-secondary">
                    {r.energy.trend_pct === null ? <span className="text-fg-muted">Trend: no previous month</span> : (
                      <span className="inline-flex items-center gap-1">{r.energy.trend_pct < 0 ? <TrendingDown className="size-3.5 text-serious-fg" aria-hidden /> : <TrendingUp className="size-3.5 text-good-fg" aria-hidden />}{fmtPct(r.energy.trend_pct)} vs previous month</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={r.maintenance.incidents ? "warn" : "neutral"}>{r.maintenance.incidents} incident{r.maintenance.incidents === 1 ? "" : "s"}</Badge>
                    <Badge tone="neutral">{r.maintenance.cleanings} cleaning{r.maintenance.cleanings === 1 ? "" : "s"}</Badge>
                    {r.maintenance.repairs > 0 && <Badge tone="neutral">{r.maintenance.repairs} repair{r.maintenance.repairs === 1 ? "" : "s"}</Badge>}
                    {r.maintenance.replacements > 0 && <Badge tone="neutral">{r.maintenance.replacements} replacement{r.maintenance.replacements === 1 ? "" : "s"}</Badge>}
                    {counts === 0 && <span className="text-[12px] text-fg-muted">No maintenance activity</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] text-fg-muted">
                    Generated {formatDate(r.generated_at)}{r.is_demo && <DataBadge cls="demo" compact />}{isLocalId(r.id) && <Badge tone="neutral">This device</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
