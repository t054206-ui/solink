import type { ReactNode } from "react";
import { SolarPanel, Cpu, RadioTower, House, Sun, type LucideIcon } from "lucide-react";
import { SolinkMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/*
 * Solink's product illustrations (owner, 2026-09-24): thin navy line drawings
 * with amber only for the sun or energy. They explain a concept; none of them
 * draws a value. Where a figure appears it is passed in from real data by the
 * caller, and nothing here makes one up.
 *
 * Colours come from the design tokens, so light and dark both work:
 * --brand (line), --sun (energy accent), --border-strong (waiting / frame).
 */

const LINE = "var(--brand)";
const SUN = "var(--sun)";
const FAINT = "var(--border-strong)";

/* ---------------- Energy flow ---------------- */

export type FlowGlyph = "sun" | "panel" | "inverter" | "monitor" | "solink" | "home";
export interface FlowStep { glyph: FlowGlyph; label: string; detail?: ReactNode; ready: boolean }

const GLYPH: Record<Exclude<FlowGlyph, "solink">, LucideIcon> = { sun: Sun, panel: SolarPanel, inverter: Cpu, monitor: RadioTower, home: House };

/**
 * A chain of the parts energy and data pass through, e.g.
 * Panels → Inverter → Monitoring → Solink. A step that exists is drawn solid;
 * one that is still to come is drawn as a quiet outline. Stacks on phones.
 */
export function EnergyFlow({ steps, className, label }: { steps: FlowStep[]; className?: string; label: string }) {
  const items: ReactNode[] = [];
  steps.forEach((s, i) => {
    if (i > 0) {
      const joined = steps[i - 1].ready && s.ready;
      items.push(
        <li key={`c${i}`} aria-hidden className={cn("ms-[21px] h-4 border-s sm:ms-0 sm:mt-[21px] sm:h-0 sm:flex-1 sm:border-s-0 sm:border-t", !joined && "border-dashed")} style={{ borderColor: joined ? LINE : FAINT }} />,
      );
    }
    const Icon = s.glyph === "solink" ? null : GLYPH[s.glyph];
    items.push(
      <li key={s.label} className="flex items-center gap-3 sm:w-28 sm:shrink-0 sm:flex-col sm:gap-2 sm:text-center">
        <span
          className={cn("grid size-11 shrink-0 place-items-center rounded-full border bg-elevated", s.ready ? "border-[var(--brand)]" : "border-dashed border-border-strong")}
          style={{ color: s.ready ? (s.glyph === "sun" ? SUN : LINE) : "var(--fg-muted)" }}
        >
          {Icon ? <Icon className="size-5" strokeWidth={1.5} aria-hidden /> : <SolinkMark className="size-5" />}
        </span>
        <span className="min-w-0">
          <span className={cn("block text-[13px] font-medium", s.ready ? "text-fg-heading" : "text-fg-secondary")}>{s.label}</span>
          {s.detail && <span className="block text-[12px] leading-snug text-fg-muted">{s.detail}</span>}
        </span>
      </li>,
    );
  });
  return <ol aria-label={label} className={cn("flex flex-col sm:flex-row sm:items-start", className)}>{items}</ol>;
}

/* ---------------- Chart frame ---------------- */

/**
 * The axes and grid a production chart will draw on: day marks along the
 * bottom, four quiet grid lines, and no line. The caption says what will fill it.
 */
export function ChartFrame({ days = 30, caption, className, unit = "kWh" }: { days?: number; caption: ReactNode; className?: string; unit?: string }) {
  const W = 600, H = 180, L = 36, B = 24;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const marks = [days, Math.round(days * 0.66), Math.round(days * 0.33), 0];
  return (
    <figure className={cn("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Chart area for daily production">
        {ticks.map((t) => (
          <line key={t} x1={L} x2={W} y1={8 + (H - B - 8) * t} y2={8 + (H - B - 8) * t} stroke="var(--grid)" strokeWidth="1" />
        ))}
        <line x1={L} x2={L} y1={8} y2={H - B} stroke={FAINT} strokeWidth="1" />
        <line x1={L} x2={W} y1={H - B} y2={H - B} stroke={FAINT} strokeWidth="1" />
        {marks.map((d, i) => {
          const x = L + ((W - L) * i) / (marks.length - 1);
          return <text key={d} x={x} y={H - 6} textAnchor={i === 0 ? "start" : i === marks.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--fg-muted)" fontFamily="var(--font-mono-jet), monospace">{d === 0 ? "today" : `−${d}d`}</text>;
        })}
        <text x={4} y={14} fontSize="10" fill="var(--fg-muted)" fontFamily="var(--font-mono-jet), monospace">{unit}</text>
      </svg>
      <figcaption className="pointer-events-none absolute inset-x-0 top-[38%] mx-auto max-w-xs -translate-y-1/2 text-center text-[12.5px] leading-snug text-fg-secondary">{caption}</figcaption>
    </figure>
  );
}

/* ---------------- Roof and sun ---------------- */

/** A flat Kuwaiti roof with a panel grid outlined on it and the sun's arc above. */
export function RoofSun({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 200" className={cn("h-auto w-full", className)} role="img" aria-label="A roof under the sun's path">
      <path d="M40 150 Q160 -10 280 150" fill="none" stroke={SUN} strokeWidth="1.25" strokeDasharray="4 5" opacity="0.8" />
      <circle cx="210" cy="52" r="13" fill="none" stroke={SUN} strokeWidth="1.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1={210 + Math.cos(r) * 18} y1={52 + Math.sin(r) * 18} x2={210 + Math.cos(r) * 23} y2={52 + Math.sin(r) * 23} stroke={SUN} strokeWidth="1.25" strokeLinecap="round" />;
      })}
      <path d="M60 150 L160 118 L260 150 L160 182 Z" fill="none" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M60 150 L60 160 L160 192 L260 160 L260 150" fill="none" stroke={LINE} strokeWidth="1.25" strokeLinejoin="round" opacity="0.7" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${104 + i * 16} ${146 - i * 5} l40 13 l-12 4 l-40 -13 Z`} fill="none" stroke={LINE} strokeWidth="1" strokeLinejoin="round" opacity="0.85" />
      ))}
    </svg>
  );
}

/* ---------------- Performance timeline ---------------- */

export interface Milestone { day: number; label: string; detail: string }

/**
 * Installation → the first signals → a full year → the long run, with a marker
 * at the number of days actually recorded. The only figure it draws is that
 * real count.
 */
export function PerformanceTimeline({ daysRecorded, milestones, className }: { daysRecorded: number; milestones: Milestone[]; className?: string }) {
  const last = milestones[milestones.length - 1].day;
  // A log-like scale so the first weeks are not squashed next to 25 years.
  const pos = (d: number) => (d <= 0 ? 0 : Math.min(1, Math.log10(1 + d) / Math.log10(1 + last)));
  const here = pos(daysRecorded);
  return (
    <div className={cn("w-full", className)}>
      <div className="relative mx-2 h-10" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-strong" />
        <div className="absolute start-0 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--sun)]" style={{ width: `${here * 100}%` }} />
        {milestones.map((m) => (
          <span key={m.label} className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-elevated rtl:translate-x-1/2", daysRecorded >= m.day ? "border-[var(--sun)]" : "border-[var(--brand)]")} style={{ insetInlineStart: `${pos(m.day) * 100}%` }} />
        ))}
      </div>
      <ol className="mt-2 grid gap-3 sm:grid-cols-4">
        {milestones.map((m) => (
          <li key={m.label} className="min-w-0">
            <span className="micro block" style={{ color: daysRecorded >= m.day ? "var(--sun-ink)" : undefined }}>{m.day === 0 ? "Day 0" : m.day < 365 ? `Day ${m.day}` : `Year ${Math.round(m.day / 365)}`}</span>
            <span className="mt-0.5 block text-[13px] font-medium text-fg-heading">{m.label}</span>
            <span className="block text-[12px] leading-snug text-fg-muted">{m.detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- Manufacturer warranty curve ---------------- */

/**
 * The manufacturer's guaranteed minimum output over the years, drawn from the
 * datasheet points the caller passes. Labelled as a warranty, never as the
 * system's measured output.
 */
export function WarrantyCurve({ points, className }: { points: { year: number; pct: number }[]; className?: string }) {
  if (points.length < 2) return null;
  const W = 600, H = 170, L = 40, R = 12, T = 12, B = 26;
  const maxY = Math.max(...points.map((p) => p.year));
  const lo = Math.min(80, Math.floor(Math.min(...points.map((p) => p.pct)) / 5) * 5);
  const x = (y: number) => L + ((W - L - R) * y) / maxY;
  const y = (p: number) => T + ((H - T - B) * (100 - p)) / (100 - lo);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-auto w-full", className)} role="img" aria-label="Manufacturer's guaranteed minimum output by year">
      {[100, (100 + lo) / 2, lo].map((p) => (
        <g key={p}>
          <line x1={L} x2={W - R} y1={y(p)} y2={y(p)} stroke="var(--grid)" />
          <text x={L - 6} y={y(p) + 3} textAnchor="end" fontSize="10" fill="var(--fg-muted)" fontFamily="var(--font-mono-jet), monospace">{Math.round(p)}%</text>
        </g>
      ))}
      {[0, Math.round(maxY / 2), maxY].map((yr) => (
        <text key={yr} x={x(yr)} y={H - 8} textAnchor={yr === 0 ? "start" : yr === maxY ? "end" : "middle"} fontSize="10" fill="var(--fg-muted)" fontFamily="var(--font-mono-jet), monospace">{yr === 0 ? "install" : `year ${yr}`}</text>
      ))}
      <path d={d} fill="none" stroke={LINE} strokeWidth="1.75" strokeDasharray="6 4" strokeLinejoin="round" />
      {points.map((p) => <circle key={p.year} cx={x(p.year)} cy={y(p.pct)} r="2.5" fill="var(--bg-elevated)" stroke={LINE} strokeWidth="1.25" />)}
    </svg>
  );
}

/* ---------------- Maintenance ---------------- */

/** A panel with a cleaning sweep and a check: upkeep, not a fault. */
export function MaintenanceArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={cn("h-auto w-full", className)} role="img" aria-label="A solar panel being cleaned">
      <path d="M30 92 L110 70 L170 92 L90 114 Z" fill="none" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      {[1, 2, 3].map((i) => <path key={i} d={`M${30 + i * 20} ${92 - i * 5.5} L${90 + i * 20} ${114 - i * 5.5}`} stroke={LINE} strokeWidth="0.9" opacity="0.6" />)}
      <path d="M60 94 L140 72" stroke={LINE} strokeWidth="0.9" opacity="0.6" />
      <path d="M78 54 Q110 34 150 50" fill="none" stroke={SUN} strokeWidth="1.25" strokeDasharray="3 4" strokeLinecap="round" />
      <path d="M140 20 l18 18 M146 14 l18 18" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="136" y="30" width="30" height="8" rx="2" transform="rotate(45 151 34)" fill="none" stroke={LINE} strokeWidth="1.5" />
      <circle cx="44" cy="40" r="11" fill="none" stroke="var(--good)" strokeWidth="1.5" />
      <path d="M39 40 l4 4 l7 -8" fill="none" stroke="var(--good)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- Readiness ring ---------------- */

/** Progress towards a threshold, e.g. 0 of 37 days of records. Draws only the real count. */
export function ReadinessRing({ value, total, label, className }: { value: number; total: number; label: string; className?: string }) {
  const r = 26, c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, total > 0 ? value / total : 0));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg viewBox="0 0 64 64" className="size-16 shrink-0" role="img" aria-label={`${value} of ${total} ${label}`}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--grid)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={SUN} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 32 32)" />
        <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--brand-strong)" fontFamily="var(--font-mono-jet), monospace">{value}</text>
      </svg>
      <div className="min-w-0 text-[12.5px] leading-snug">
        <span className="block font-medium text-fg-heading">{value} of {total} {label}</span>
      </div>
    </div>
  );
}
