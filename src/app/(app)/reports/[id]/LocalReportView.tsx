"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/States";
import type { Incident, MaintenanceCase, ProductionRecord } from "@/lib/types";
import { useLocalReports } from "../../_ops/localRecords";
import { dailyBreakdown, recordsForMonth, seriesClass, toMonth } from "../../_ops/production";
import { caseMonth } from "../_components/buildReport";
import { ReportView } from "./ReportView";

/**
 * A report generated while Supabase is not connected lives in this browser
 * only (see localRecords). The server cannot resolve it, so the lookup happens
 * here, on the device that holds it.
 */
export function LocalReportView({ id, systemName, production, cases, incidents }: {
  id: string;
  systemName: string;
  production: ProductionRecord[];
  cases: MaintenanceCase[];
  incidents: Incident[];
}) {
  const [reports, , loaded] = useLocalReports();
  const report = reports.find((r) => r.id === id) ?? null;

  if (!loaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <PageHeader
          eyebrow="Operate · Monthly report"
          title="Report not on this device"
          description="This report was generated while Solink was running without a database, so it exists only in the browser that created it."
          actions={<Link href="/reports" className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-fg-secondary hover:bg-inset hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> All reports</Link>}
        />
        <EmptyState title="Nothing stored under this reference">
          <p>Locally generated reports are not shared between devices or browsers. You can generate the month again from the reports page.</p>
          <div className="mt-4"><Button href="/reports" size="sm">Back to reports</Button></div>
        </EmptyState>
      </div>
    );
  }

  const monthRecords = recordsForMonth(production, report.month);
  return (
    <ReportView
      report={report}
      systemName={systemName}
      breakdown={dailyBreakdown(production, report.month)}
      breakdownCls={seriesClass(monthRecords)}
      cases={cases.filter((c) => c.system_id === report.system_id && caseMonth(c) === report.month)}
      incidents={incidents.filter((i) => i.system_id === report.system_id && toMonth(i.occurred_at) === report.month)}
      isLocal
    />
  );
}
