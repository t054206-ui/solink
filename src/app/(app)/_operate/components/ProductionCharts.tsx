"use client";
import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { UnavailableState } from "@/components/ui/States";
import type { DataClass } from "@/lib/classification";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import { cn } from "@/lib/utils";
import type { BucketPoint, DayPoint } from "../production";

type Range = "day" | "week" | "month" | "year";
const RANGES: { id: Range; label: string; hint: string }[] = [
  { id: "day", label: "Day", hint: "Daily kWh, last 14 days" },
  { id: "week", label: "Week", hint: "Weekly totals, last 12 weeks" },
  { id: "month", label: "Month", hint: "Monthly totals, last 12 months" },
  { id: "year", label: "Year", hint: "Calendar-year totals" },
];

export interface ProductionChartData {
  cls: DataClass;
  source: string | null;
  days14: DayPoint[];
  weeks12: BucketPoint[];
  months12: BucketPoint[];
  years: BucketPoint[];
}

/**
 * Production explorer with a day/week/month/year selector. Receives only
 * serialisable arrays computed on the server. Demo series are banner-labelled.
 */
export function ProductionCharts({ data, className }: { data: ProductionChartData; className?: string }) {
  const [range, setRange] = useState<Range>("day");
  const current = RANGES.find((r) => r.id === range)!;
  const empty = data.days14.length === 0;

  const dayPoints = useMemo(() => data.days14.map((p) => ({ x: p.date, y: p.kwh })), [data.days14]);

  if (empty) {
    return (
      <div className={cn("space-y-3", className)}>
        <UnavailableState title="Live monitoring is not connected yet">No production records exist for this system. Charts appear here once monitoring hardware or an import method provides data.</UnavailableState>
        <PlaceholderNote k="SOLAR_MONITORING_HARDWARE_API" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {data.cls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} detail="A synthetic series used only to exercise the charts." />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Chart range" className="inline-flex rounded-[10px] border border-border bg-inset p-0.5">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" aria-selected={range === r.id} onClick={() => setRange(r.id)}
              className={cn("rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors", range === r.id ? "bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg-secondary")}>
              {r.label}
            </button>
          ))}
        </div>
        <DataBadge cls={data.cls} source={data.source ?? undefined} />
      </div>
      <p className="text-[12.5px] text-fg-muted">{current.hint} · kWh</p>
      <div role="tabpanel">
        {range === "day" && <LineChart series={[{ name: "Daily production", points: dayPoints }]} formatX={(x) => shortDate(String(x))} yLabel="kWh" ariaLabel="Daily production, last 14 days" />}
        {range === "week" && <BarChart data={data.weeks12} ariaLabel="Weekly production totals, last 12 weeks" />}
        {range === "month" && <BarChart data={data.months12} ariaLabel="Monthly production totals, last 12 months" />}
        {range === "year" && <BarChart data={data.years} ariaLabel="Yearly production totals" />}
      </div>
      {range === "year" && <p className="text-[12px] text-fg-muted">Partial years are summed from the records available; they are not full-year figures.</p>}
      {range === "week" && <p className="text-[12px] text-fg-muted">Weeks are trailing 7-day blocks ending today; a block with fewer than 7 records is shown as n/a.</p>}
    </div>
  );
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
