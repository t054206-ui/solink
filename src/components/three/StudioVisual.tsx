"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useSceneGate } from "./useSceneGate";

const RoofScene = dynamic(() => import("./RoofScene"), { ssr: false, loading: () => null });

/** The approved rooftop, seen from the front-right corner instead of the Home Overview's front-left. */
const VIEW = { camera: [9.6, 6.4, 12.8] as [number, number, number], target: [-0.7, -0.5, 0.1] as [number, number, number] };

/**
 * The Solar Designer's hero: an illustrative rooftop with an array on it,
 * so the page opens on what a finished design looks like. Captioned as an
 * illustration; the person's own layout is the 3D card beside the drawing.
 */
export function StudioVisual({ className = "" }: { className?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const gate = useSceneGate(holder);
  return (
    <figure className={`relative ${className}`}>
      <div ref={holder} className="relative aspect-[16/9] w-full md:aspect-[16/10]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="sun-glow absolute start-[6%] top-[0%] aspect-square w-[34%] rounded-full" />
        </div>
        <div
          className="rise absolute inset-0"
          style={{ animationDelay: "200ms", maskImage: "linear-gradient(to bottom, #000 76%, transparent 98%)", WebkitMaskImage: "linear-gradient(to bottom, #000 76%, transparent 98%)" }}
          role="img"
          aria-label="Illustration: a flat roof with two rows of solar panels, a water tank, a stair bulkhead, AC units and planting."
        >
          <RoofScene view={VIEW} paused={gate.paused} still={gate.still} economy={gate.economy} parallax={gate.parallax} />
        </div>
      </div>
      <figcaption className="mt-1 text-center text-[11px] leading-snug text-fg-muted md:text-end">
        An illustrative rooftop. Your own layout appears in 3D under the drawing.
      </figcaption>
    </figure>
  );
}
