"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface BarDatum { label: string; value: number | null; color?: string }

/** Thin rounded bars, baseline-anchored, 2px surface gaps, per-bar hover tooltip, single axis. */
export function BarChart({ data, height = 200, formatY = (v) => v.toLocaleString("en-US", { maximumFractionDigits: 1 }), className, ariaLabel, color = "var(--series-1)" }: {
  data: BarDatum[]; height?: number; formatY?: (v: number) => string; className?: string; ariaLabel?: string; color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, PAD = { l: 44, r: 12, t: 12, b: 28 };
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  const yMax = vals.length ? Math.max(...vals) * 1.1 : 1;
  const n = data.length;
  const bw = (W - PAD.l - PAD.r) / Math.max(n, 1);
  const y = (v: number) => H - PAD.b - (v / (yMax || 1)) * (H - PAD.t - PAD.b);
  const ticks = [0, 0.5, 1].map((f) => f * yMax);
  if (n === 0) return <div className={cn("grid place-items-center text-[13px] text-fg-muted", className)} style={{ height }}>No data to plot.</div>;
  return (
    <div className={cn("relative w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label={ariaLabel ?? "bar chart"} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => <g key={t}><line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" /><text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill="var(--fg-muted)" className="tabular">{formatY(t)}</text></g>)}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="var(--axis)" />
        {data.map((d, i) => {
          const x0 = PAD.l + i * bw + bw * 0.18, w = bw * 0.64;
          const top = d.value === null ? y(0) : y(d.value);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={PAD.l + i * bw} y={PAD.t} width={bw} height={H - PAD.t - PAD.b} fill="transparent" />
              {d.value !== null && <path d={`M${x0} ${y(0)} V${top + 4} Q${x0} ${top} ${x0 + 4} ${top} H${x0 + w - 4} Q${x0 + w} ${top} ${x0 + w} ${top + 4} V${y(0)} Z`} fill={d.color ?? color} opacity={hover === null || hover === i ? 1 : 0.55} />}
              {d.value === null && <text x={x0 + w / 2} y={y(0) - 6} textAnchor="middle" fontSize="10" fill="var(--fg-muted)">n/a</text>}
              {(n <= 12 || i % Math.ceil(n / 12) === 0) && <text x={x0 + w / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--fg-muted)">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-1 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-[12px] shadow-card" style={{ left: `${((PAD.l + hover * bw + bw / 2) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-110%" : "10%"})` }}>
          <div className="font-medium text-fg">{data[hover].label}</div>
          <div className="tabular text-fg-secondary">{data[hover].value === null ? "Unavailable" : formatY(data[hover].value as number)}</div>
        </div>
      )}
    </div>
  );
}
