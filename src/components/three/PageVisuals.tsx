"use client";

import dynamic from "next/dynamic";
import { useRef, type ReactNode } from "react";
import { useSceneGate } from "./useSceneGate";
import type { BenchPanel } from "./BenchScene";
import type { Health } from "./LiveArrayScene";

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
    <Frame label="Illustration: close up on a dusty solar panel with a cleaned swath, a brush and water beads." caption={caption} aspect="aspect-[4/3] md:aspect-[5/4]">
      {(g) => <CareScene paused={g.paused} still={g.still} economy={g.economy} />}
    </Frame>
  );
}
