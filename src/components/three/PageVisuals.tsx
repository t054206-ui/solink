"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, type ReactNode } from "react";
import { useSceneGate } from "./useSceneGate";
import type { BenchPanel } from "./BenchScene";
import type { Health } from "./LiveArrayScene";
import { SolinkMark } from "@/components/brand/Logo";

/**
 * Thin wrappers for the per-page scenes. Each lazy-loads its own scene
 * (three.js never lands in a page's first bundle), applies the shared
 * gate (paused off screen, still under reduced motion, economy on phones),
 * and carries a caption that says what is real and what is illustration.
 */

const ShowroomScene = dynamic(() => import("./ShowroomScene"), { ssr: false, loading: () => null });
const BenchScene = dynamic(() => import("./BenchScene"), { ssr: false, loading: () => null });
const RevealScene = dynamic(() => import("./RevealScene"), { ssr: false, loading: () => null });
const LiveArrayScene = dynamic(() => import("./LiveArrayScene"), { ssr: false, loading: () => null });
const CareScene = dynamic(() => import("./CareScene"), { ssr: false, loading: () => null });
const ProfileScene = dynamic(() => import("./ProfileScene"), { ssr: false, loading: () => null });
const ReportDeskScene = dynamic(() => import("./ReportDeskScene"), { ssr: false, loading: () => null });

function Frame({ label, caption, aspect, children, fade = true, overlay }: {
  label: string; caption?: ReactNode; aspect: string; children: (gate: ReturnType<typeof useSceneGate>) => ReactNode; fade?: boolean; overlay?: ReactNode;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const gate = useSceneGate(holder);
  return (
    <figure className="relative">
      <div ref={holder} className={`relative w-full ${aspect}`}>
        <div
          className="rise absolute inset-0"
          role="img"
          aria-label={label}
          style={{ animationDelay: "180ms", ...(fade ? { maskImage: "radial-gradient(90% 90% at 50% 50%, #000 72%, transparent 100%)", WebkitMaskImage: "radial-gradient(90% 90% at 50% 50%, #000 72%, transparent 100%)" } : {}) }}
        >
          {children(gate)}
        </div>
        {overlay}
      </div>
      {caption && <figcaption className="mt-1 text-center text-[11px] leading-snug text-fg-muted md:text-end">{caption}</figcaption>}
    </figure>
  );
}

export function ShowroomVisual({ caption, overlay }: { caption: ReactNode; overlay?: ReactNode }) {
  return (
    <Frame label="Illustration: a solar module standing on a turntable plinth in studio light." caption={caption} aspect="aspect-[4/3] md:aspect-[5/4]" overlay={overlay}>
      {(g) => <ShowroomScene paused={g.paused} still={g.still} economy={g.economy} parallax={g.parallax} />}
    </Frame>
  );
}

export function BenchVisual({ panels, caption, overlay }: { panels: BenchPanel[]; caption: ReactNode; overlay?: ReactNode }) {
  return (
    <Frame label={`The ${panels.length} selected panel${panels.length === 1 ? "" : "s"} standing side by side, each at the size its record states.`} caption={caption} aspect="aspect-[16/9] md:aspect-[21/9]" overlay={overlay}>
      {(g) => <BenchScene panels={panels} paused={g.paused} still={g.still} economy={g.economy} parallax={g.parallax} />}
    </Frame>
  );
}

export function RevealVisual({ w, h, caption, overlay }: { w: number | null; h: number | null; caption: ReactNode; overlay?: ReactNode }) {
  return (
    <Frame label="The top match, presented on a display plinth under a spotlight." caption={caption} aspect="aspect-[4/3]" overlay={overlay}>
      {(g) => <RevealScene w={w} h={h} paused={g.paused} still={g.still} economy={g.economy} parallax={g.parallax} />}
    </Frame>
  );
}

export function LiveArrayVisual({ count, producing, health, caption }: { count: number; producing: boolean; health: Health; caption: ReactNode }) {
  return (
    <Frame label={`Your array of ${count} panels from above, with its string cable and inverter.`} caption={caption} aspect="aspect-[16/10] md:aspect-[16/11]">
      {(g) => <LiveArrayScene count={count} producing={producing} health={health} paused={g.paused} still={g.still} economy={g.economy} parallax={g.parallax} />}
    </Frame>
  );
}

export function CareVisual({ caption }: { caption: ReactNode }) {
  return (
    <Frame
      label="Illustration: close up on a dusty solar panel with a cleaned swath, a brush, water beads and a maintenance case."
      caption={caption}
      aspect="aspect-[4/3] md:aspect-[5/4]"
      overlay={
        <ol aria-hidden="true" className="pointer-events-none absolute bottom-3 start-3 flex items-center gap-1.5 rounded-full border border-border bg-elevated/90 px-3 py-1.5 shadow-[var(--shadow-sm)]">
          {["Clean", "Inspect", "Maintain"].map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-fg-muted">→</span>}
              <span className="micro" style={{ color: i === 0 ? "var(--sun-ink)" : i === 1 ? "var(--brand)" : "var(--good-fg)" }}>{s}</span>
            </li>
          ))}
        </ol>
      }
    >
      {(g) => <CareScene paused={g.paused} still={g.still} economy={g.economy} />}
    </Frame>
  );
}

/** One of the profile's own values, annotated over the house. `value` is null when the profile does not have it. */
export interface ProfileNote { label: string; value: string | null; tone: "data" | "sun" | "brand"; className: string }

export function ProfileVisual({ notes, caption }: { notes: ProfileNote[]; caption: ReactNode }) {
  const toneColor = { data: "var(--data)", sun: "var(--sun-ink)", brand: "var(--brand-strong)" } as const;
  return (
    <Frame
      label="Illustration: a two-storey Kuwaiti villa on its plot, with a courtyard palm, a gated boundary wall, and a solar-ready area on the roof."
      caption={caption}
      aspect="aspect-[4/3] md:aspect-[5/4]"
      overlay={
        <>
          {/* The product's own plate: the real Solink mark, as a technical annotation, not an advert. */}
          <div aria-hidden="true" className="pointer-events-none absolute end-3 top-3 flex items-center gap-2 rounded-[var(--radius)] border border-border bg-elevated/90 px-2.5 py-1.5 shadow-[var(--shadow-sm)]">
            <SolinkMark className="size-5 text-[var(--brand-strong)]" />
            <span className="leading-tight">
              <span className="micro block">Solink</span>
              <span className="block text-[11.5px] font-semibold text-fg">Solar profile</span>
            </span>
          </div>
          {notes.map((n) => (
            <div key={n.label} className={`pointer-events-none absolute rounded-[var(--radius)] border border-border bg-elevated/90 px-2.5 py-1.5 shadow-[var(--shadow-sm)] ${n.className}`}>
              <span className="micro block">{n.label}</span>
              {n.value !== null
                ? <span className="figure block text-[13.5px] font-medium" style={{ color: toneColor[n.tone] }}>{n.value}</span>
                : <span className="block text-[12.5px] text-fg-muted">Not set</span>}
            </div>
          ))}
        </>
      }
    >
      {(g) => <ProfileScene paused={g.paused} still={g.still} economy={g.economy} parallax={g.parallax} />}
    </Frame>
  );
}

/** Reports: the record on the desk. Its sheet is drawn from these four values only. */
export function ReportDeskVisual({ systemName, panelCount, reportCount, monthCount }: { systemName: string; panelCount: number | null; reportCount: number; monthCount: number }) {
  const data = useMemo(() => ({ systemName, panelCount, reportCount, monthCount }), [systemName, panelCount, reportCount, monthCount]);
  return (
    <Frame
      label={`The system record for ${systemName} as a printed sheet on a desk: a plan of ${panelCount ?? "an unrecorded number of"} panels and a title block listing ${reportCount} reports over ${monthCount} complete months.`}
      caption="Your record, drawn from what Solink holds: the array as recorded, and the reports and months on this page."
      aspect="aspect-[4/3] md:aspect-[5/4]"
    >
      {(g) => <ReportDeskScene data={data} paused={g.paused} still={g.still} economy={g.economy} parallax={g.parallax} />}
    </Frame>
  );
}
