"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useSceneGate } from "./useSceneGate";
import type { Orientation } from "./OrientationScene";

const OrientationScene = dynamic(() => import("./OrientationScene"), { ssr: false, loading: () => null });

/**
 * The Placement Guide's visual: the orientation scene with the
 * recommendation's own figures parked in its corners, the way the landing
 * hangs measurements off its object. The figures are passed in already
 * formatted by the page (`compassLabel`, `azimuthDeg`, `formatTilt`), so the
 * picture and the text can never disagree.
 */
export function OrientationVisual({ orientation, facing, tilt, className = "" }: {
  orientation: Orientation | null;
  /** e.g. "South · 180°", from the recommendation; null before one exists. */
  facing: string | null;
  /** e.g. "20–25°", from formatTilt; null before one exists. */
  tilt: string | null;
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const gate = useSceneGate(holder);
  return (
    <figure className={`relative ${className}`}>
      <div ref={holder} className="relative aspect-[16/11] w-full md:aspect-[5/4]">
        <div
          className="rise absolute inset-0"
          style={{ animationDelay: "200ms", maskImage: "radial-gradient(85% 85% at 50% 48%, #000 70%, transparent 100%)", WebkitMaskImage: "radial-gradient(85% 85% at 50% 48%, #000 70%, transparent 100%)" }}
          role="img"
          aria-label={
            orientation && facing && tilt
              ? `Illustration: a panel on a roof facing ${facing}, tilted within ${tilt}, over a compass, with the sun's path for this latitude.`
              : "Illustration: a panel on a roof over a compass. No direction is shown until a location is resolved."
          }
        >
          <OrientationScene orientation={orientation} paused={gate.paused} still={gate.still} economy={gate.economy} parallax={gate.parallax} />
        </div>
        {facing && tilt && (
          <>
            <Readout className="start-2 top-2 sm:start-4 sm:top-4" label="Facing" value={facing} />
            <Readout className="end-2 top-2 text-end sm:end-4 sm:top-4" label="Tilt" value={tilt} />
          </>
        )}
      </div>
      <figcaption className="mt-1 text-center text-[11px] leading-snug text-fg-muted md:text-end">
        {orientation
          ? "An illustration of the recommendation below: the panel faces its direction, the wedge is its tilt range, and the arc is the equinox sun path for this latitude."
          : gate.still
            ? "Use your location or an address and the recommended direction and tilt are drawn here."
            : "The panel turns at an illustrative angle until a location is resolved. Use your location or an address and it faces your recommended direction, at your recommended tilt."}
      </figcaption>
    </figure>
  );
}

function Readout({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute rounded-[var(--radius)] border border-border bg-elevated/90 px-2.5 py-1.5 shadow-[var(--shadow-sm)] ${className}`}>
      <span className="micro block">{label}</span>
      <span className="figure block text-[15px] font-medium text-fg">{value}</span>
    </div>
  );
}
