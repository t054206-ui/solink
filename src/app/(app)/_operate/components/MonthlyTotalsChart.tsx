"use client";
import { BarChart } from "@/components/charts/BarChart";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import type { DataClass } from "@/lib/classification";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import type { BucketPoint } from "../production";

/** Monthly kWh totals as bars. Demo series are banner-labelled. */
export function MonthlyTotalsChart({ data, cls, source, caption, height = 200 }: { data: BucketPoint[]; cls: DataClass; source?: string | null; caption?: string; height?: number }) {
  if (data.length === 0) return <div className="grid place-items-center text-[13px] text-fg-muted" style={{ height }}>No monthly data.</div>;
  return (
    <div className="space-y-3">
      {cls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} />}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-fg-muted">
        <span>{caption ?? `Monthly totals, last ${data.length} months · kWh`}</span>
        <DataBadge cls={cls} source={source ?? undefined} />
      </div>
      <BarChart height={height} data={data} ariaLabel={caption ?? "Monthly production totals"} />
      <p className="text-[12px] text-fg-muted">The current month is a month-to-date total.</p>
    </div>
  );
}
