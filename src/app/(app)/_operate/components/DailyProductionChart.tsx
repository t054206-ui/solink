"use client";
import { LineChart } from "@/components/charts/LineChart";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { ChartFrame } from "@/components/illustrations/Illustrations";
import type { DataClass } from "@/lib/classification";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import type { DayPoint } from "../production";

/** Daily kWh line for a serialisable list of points. Demo series are banner-labelled. */
export function DailyProductionChart({ points, cls, source, caption, height = 220 }: { points: DayPoint[]; cls: DataClass; source?: string | null; caption?: string; height?: number }) {
  if (points.length === 0) {
    return (
      <ChartFrame caption="Daily production draws here once your inverter reports to Solink." />
    );
  }
  return (
    <div className="space-y-3">
      {cls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} />}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-fg-muted">
        <span>{caption ?? `Daily production, last ${points.length} days · kWh`}</span>
        <DataBadge cls={cls} source={source ?? undefined} />
      </div>
      <LineChart height={height} series={[{ name: "Daily production", points: points.map((p) => ({ x: p.date, y: p.kwh })) }]} yLabel="kWh" formatX={(x) => fmt(String(x))} ariaLabel={caption ?? "Daily production"} />
    </div>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
