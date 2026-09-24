"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useSceneGate } from "./useSceneGate";
import type { Atmosphere } from "./SiteScene";

const SiteScene = dynamic(() => import("./SiteScene"), { ssr: false, loading: () => null });

/**
 * Solar Potential's visual: the site scene in the landing page's room, with
 * the sun travelling its afternoon path above it as a hairline arc and a
 * point of light. Under reduced motion the sun holds still.
 *
 * The caption says what the picture is and is not. When an analysis is on
 * the page, it also says that the haze, light and dust follow that
 * analysis's levels and are not measured here.
 */
export function SiteVisual({ atmosphere, className = "" }: { atmosphere: Atmosphere | null; className?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const gate = useSceneGate(holder);
  const path = "M 8 62 C 26 8, 70 -4, 98 30";
  return (
    <figure className={`relative ${className}`}>
      <div ref={holder} className="relative aspect-[16/11] w-full md:aspect-[5/4]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="sun-glow absolute end-[16%] top-[0%] aspect-square w-[38%] rounded-full" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 80" preserveAspectRatio="none">
            <path d={path} fill="none" stroke="var(--sun)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          </svg>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 80" preserveAspectRatio="none">
            {gate.still ? (
              <circle cx="62" cy="10" r="1.6" fill="var(--sun)" />
            ) : (
              <circle r="1.6" fill="var(--sun)">
                <animateMotion dur="48s" repeatCount="indefinite" keyPoints="0.2;0.8;0.2" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" path={path} />
              </circle>
            )}
          </svg>
        </div>
        <div
          className="rise absolute inset-0"
          style={{ animationDelay: "200ms", maskImage: "linear-gradient(to bottom, #000 74%, transparent 98%)", WebkitMaskImage: "linear-gradient(to bottom, #000 74%, transparent 98%)" }}
          role="img"
          aria-label="Illustration: a flat roof with its parapets, water tank, stair bulkhead, AC units and planting, and a dashed outline where panels could go, in afternoon sun."
        >
          <SiteScene atmosphere={atmosphere} paused={gate.paused} still={gate.still} economy={gate.economy} parallax={gate.parallax} />
        </div>
      </div>
      <figcaption className="mt-1 text-center text-[11px] leading-snug text-fg-muted md:text-end">
        An illustrative site, not your roof. The dashed outline is a panel-ready area, drawn for illustration.
        {atmosphere ? " Haze, light and airborne dust follow the levels in your analysis below; they are not measurements." : ""}
      </figcaption>
    </figure>
  );
}
