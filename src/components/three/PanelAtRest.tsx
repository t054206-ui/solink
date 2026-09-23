"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useOnScreen } from "@/lib/hooks/useOnScreen";
import { useIntroOnScreen } from "@/components/intro/introStore";
import { StaticPanel } from "./PanelStudio";

/** Same lazy load as the landing hero: three.js never lands in the initial bundle. */
const PanelScene = dynamic(() => import("./PanelScene"), {
  ssr: false,
  loading: () => <StaticPanel />,
});

const noop = () => {};

/**
 * The landing page's module, inside the app.
 *
 * The same scene PanelStudio runs, with the take-apart sequence declined
 * (`autoplay={false}`), so it simply sways until someone grabs it. No tilt or
 * azimuth readout: on a page about someone's own system, an angle next to the
 * module would read as their roof's angle, and it is not. Desktop drags,
 * phones watch (a canvas with touch-action: none cannot be scrolled past), and
 * prefers-reduced-motion gets the still drawing. Stops drawing off screen.
 */
export function PanelAtRest({ className = "" }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const small = useMediaQuery("(max-width: 767px)");
  const stage = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(stage);
  const introOn = useIntroOnScreen();
  const [touched, setTouched] = useState(false);
  const onInteract = useCallback(() => setTouched(true), []);

  return (
    <div ref={stage} className={`relative aspect-square w-full ${className}`}>
      {reduced ? (
        <StaticPanel />
      ) : (
        <PanelScene
          onTick={noop}
          onStep={noop}
          autoSpin={!touched}
          onInteract={onInteract}
          draggable={!small}
          economy={small}
          paused={!onScreen || introOn}
          autoplay={false}
        />
      )}
    </div>
  );
}
