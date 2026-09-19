import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listIncidents, listMaintenance, listProduction, listReports, listSystems } from "@/lib/data/repositories";
import { dailyBreakdown, monthLabel, recordsForMonth, seriesClass, toMonth } from "../../_ops/production";
import { caseMonth } from "../_components/buildReport";
import { LocalReportView } from "./LocalReportView";
import { ReportView } from "./ReportView";

/** Ids created by the demo-mode generator carry this marker (see _ops/localRecords). */
const isLocalReportId = (id: string) => id.includes("-local-");

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: reports }, { data: systems }] = await Promise.all([listReports(), listSystems()]);
  const report = reports.find((r) => r.id === id) ?? null;
  if (!report && !isLocalReportId(id)) notFound();

  const systemId = report?.system_id ?? systems[0]?.id ?? null;
  const system = systems.find((s) => s.id === systemId) ?? null;
  const systemName = system?.name ?? "System";

  const [{ data: production }, { data: cases }, { data: incidents }] = await Promise.all([
    systemId ? listProduction(systemId, 400) : Promise.resolve({ data: [], mode: "demo" as const }),
    listMaintenance(systemId ?? undefined),
    listIncidents(systemId ?? undefined),
  ]);

  if (!report) {
    // A report generated on this device while Supabase is not connected.
    return <LocalReportView id={id} systemName={systemName} production={production} cases={cases} incidents={incidents} />;
  }

  const monthRecords = recordsForMonth(production, report.month);
  const breakdown = monthRecords.length > 0 ? dailyBreakdown(production, report.month) : report.energy.breakdown;

  return (
    <ReportView
      report={report}
      systemName={systemName}
      breakdown={breakdown}
      breakdownCls={monthRecords.length > 0 ? seriesClass(monthRecords) : report.energy.cls}
      cases={cases.filter((c) => c.system_id === report.system_id && caseMonth(c) === report.month)}
      incidents={incidents.filter((i) => i.system_id === report.system_id && toMonth(i.occurred_at) === report.month)}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: reports } = await listReports();
  const report = reports.find((r) => r.id === id) ?? null;
  return {
    title: report ? `${monthLabel(report.month)} report: Solink` : "Monthly report: Solink",
    description: "Energy, financial, maintenance and environmental detail for one month, with every missing input named.",
  };
}
