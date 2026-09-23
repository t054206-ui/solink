"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useOnScreen } from "@/lib/hooks/useOnScreen";
import { useIntroOnScreen } from "@/components/intro/introStore";

/** three.js stays out of the initial bundle, as on the landing page. */
const RoofScene = dynamic(() => import("./RoofScene"), { ssr: false, loading: () => null });

/**
 * The rooftop, set in the landing page's room.
 *
 * Behind the canvas: the sun, as a soft warm light and its path drawn as a
 * hairline arc, which is the Placement Guide's subject in one line. The
 * canvas is transparent, so the bone page and the grid carry straight through
 * it, and its lower edge fades into the page so the house has no floor to sit
 * on and no hard crop. Amber here is the sun itself, which is the one thing
 * that has earned it.
 *
 * Reduced motion: one rendered frame and a still sun. Phones: fewer pixels,
 * no parallax. Off screen, or while the opening film is up: not drawing.
 */
export function RoofVisual({ className = "", caption }: { className?: string; caption: string }) {
  const reduced = usePrefersReducedMotion();
  const small = useMediaQuery("(max-width: 767px)");
  const coarse = useMediaQuery("(pointer: coarse)");
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const introOn = useIntroOnScreen();

  return (
    <figure className={`relative ${className}`}>
      <div ref={ref} className="relative aspect-[16/11] w-full sm:aspect-[16/10] md:aspect-[5/4]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="sun-glow absolute end-[10%] top-[3%] aspect-square w-[40%] rounded-full" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 80" preserveAspectRatio="none">
            <path d="M 18 60 C 30 12, 72 -2, 106 26" fill="none" stroke="var(--sun)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute start-[46%] top-[10%] size-3 rounded-full border border-[color:var(--sun)] bg-bg" />
        </div>
        <div
          className="rise absolute inset-0"
          style={{
            animationDelay: "200ms",
            maskImage: "linear-gradient(to bottom, #000 72%, transparent 98%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 72%, transparent 98%)",
          }}
          role="img"
          aria-label="Illustration: a flat roof with two rows of solar panels, a water tank, a stair bulkhead and AC units, in late sun."
        >
          <RoofScene paused={!onScreen || introOn} still={reduced} economy={small} parallax={!coarse} />
        </div>
      </div>
      <figcaption className="mt-1 text-center text-[11px] leading-snug text-fg-muted lg:text-end">{caption}</figcaption>
    </figure>
  );
}
