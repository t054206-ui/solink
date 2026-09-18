"use client";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Series { name: string; points: { x: string | number; y: number | null }[]; color?: string }

/**
 * Responsive SVG line/area chart following Solink dataviz rules: single y-axis,
 * thin 2px lines, recessive hairline grid, legend for ≥2 series, crosshair
 * tooltip on hover, direct label at the last point.
 */
export function LineChart({ series, height = 220, yLabel, formatY = (v) => v.toLocaleString("en-US", { maximumFractionDigits: 1 }), formatX = (x) => String(x), className, area = true, ariaLabel }: {
  series: Series[]; height?: number; yLabel?: string; formatY?: (v: number) => string; formatX?: (x: string | number) => string; className?: string; area?: boolean; ariaLabel?: string;
}) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, PAD = { l: 44, r: 16, t: 12, b: 28 };
  const n = Math.max(...series.map((s) => s.points.length), 0);
  const all = series.flatMap((s) => s.points.map((p) => p.y).filter((v): v is number => v !== null));
  const yMax = all.length ? Math.max(...all) * 1.08 : 1;
  const yMin = 0;
  const x = (i: number) => PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => H - PAD.b - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * (yMax - yMin)), [yMax, yMin]);
  const colors = series.map((s, i) => s.color ?? `var(--series-${(i % 8) + 1})`);

  const paths = series.map((s) => {
    let d = ""; let a = "";
    s.points.forEach((p, i) => {
      if (p.y === null) return;
      const px = x(i), py = y(p.y);
      d += d ? ` L${px} ${py}` : `M${px} ${py}`;
    });
    if (d && area) {
      const first = s.points.findIndex((p) => p.y !== null); const last = s.points.length - 1 - [...s.points].reverse().findIndex((p) => p.y !== null);
      a = `${d} L${x(last)} ${y(0)} L${x(first)} ${y(0)} Z`;
    }
    return { d, a };
  });

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = ref.current?.getBoundingClientRect(); if (!rect || n === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const xTickIdx = n <= 6 ? [...Array(n).keys()] : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];

  if (n === 0) return <div className={cn("grid place-items-center text-[13px] text-fg-muted", className)} style={{ height }}>No data to plot.</div>;

  return (
    <div className={cn("w-full", className)}>
      {series.length >= 2 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-fg-secondary">
          {series.map((s, i) => <span key={s.name} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded" style={{ background: colors[i] }} />{s.name}</span>)}
        </div>
      )}
      <div className="relative">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label={ariaLabel ?? `${series.map((s) => s.name).join(", ")} chart`}
          onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchMove={(e) => { const t = e.touches[0]; if (t) onMove({ clientX: t.clientX } as React.MouseEvent<SVGSVGElement>); }}>
          <defs>{series.map((_, i) => <linearGradient key={i} id={`${id}-g${i}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={colors[i]} stopOpacity="0.22" /><stop offset="1" stopColor={colors[i]} stopOpacity="0" /></linearGradient>)}</defs>
          {ticks.map((t) => <g key={t}><line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" /><text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill="var(--fg-muted)" className="tabular">{formatY(t)}</text></g>)}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="var(--axis)" strokeWidth="1" />
          {xTickIdx.map((i) => <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10.5" fill="var(--fg-muted)">{formatX(series[0].points[i]?.x ?? "")}</text>)}
          {paths.map((p, i) => <g key={i}>{p.a && <path d={p.a} fill={`url(#${id}-g${i})`} />}<path d={p.d} fill="none" stroke={colors[i]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></g>)}
          {hover !== null && <g><line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--fg-muted)" strokeDasharray="3 3" strokeWidth="1" />
            {series.map((s, i) => { const v = s.points[hover]?.y; return v === null || v === undefined ? null : <circle key={i} cx={x(hover)} cy={y(v)} r="4" fill={colors[i]} stroke="var(--bg-elevated)" strokeWidth="2" />; })}</g>}
          {yLabel && <text x={PAD.l} y={PAD.t - 2} fontSize="10" fill="var(--fg-muted)">{yLabel}</text>}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-2 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-[12px] shadow-card" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-105%" : "8px"})` }}>
            <div className="font-medium text-fg">{formatX(series[0].points[hover]?.x ?? "")}</div>
            {series.map((s, i) => <div key={i} className="flex items-center gap-1.5 text-fg-secondary"><span className="inline-block size-2 rounded-full" style={{ background: colors[i] }} />{s.name}: <span className="tabular text-fg">{s.points[hover]?.y === null ? "—" : formatY(s.points[hover]?.y as number)}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}
