"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useT } from "@/lib/i18n/provider";
import type { AngleRef } from "./PanelScene";

/** three.js is ~150KB gzipped, so it never lands in the initial bundle. */
const PanelScene = dynamic(() => import("./PanelScene"), {
  ssr: false,
  loading: () => <StaticPanel />,
});

/** Compass label for a solar azimuth where 0° is due south. */
function compass(az: number): string {
  const a = ((az % 360) + 360) % 360;
  const names = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
  return names[Math.round(a / 45) % 8];
}

/**
 * The still version. Shown on phones, under prefers-reduced-motion, and while
 * the scene loads, so the hero never collapses to an empty box.
 */
function StaticPanel() {
  return (
    <svg viewBox="0 0 240 300" className="h-full w-full" role="img" aria-label="A solar panel seen at an angle">
      <g transform="translate(120 150) rotate(-14) skewX(-8) translate(-120 -150)">
        <rect x="46" y="40" width="148" height="220" rx="3" fill="#b9bec6" />
        <rect x="52" y="46" width="136" height="208" rx="2" fill="#0b1a2e" />
        {Array.from({ length: 6 }).map((_, c) =>
          Array.from({ length: 9 }).map((_, r) => (
            <rect
              key={`${c}-${r}`}
              x={55 + c * 22.2}
              y={49 + r * 22.8}
              width="19.6"
              height="20.2"
              fill="#13294a"
            />
          )),
        )}
        {Array.from({ length: 6 }).map((_, c) => (
          <line
            key={`b${c}`}
            x1={64.8 + c * 22.2}
            y1="49"
            x2={64.8 + c * 22.2}
            y2="253"
            stroke="#becde1"
            strokeOpacity="0.5"
            strokeWidth="1"
          />
        ))}
      </g>
      <ellipse cx="120" cy="272" rx="72" ry="9" fill="#0e1116" opacity="0.1" />
    </svg>
  );
}

export function PanelStudio() {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const small = useMediaQuery("(max-width: 767px)");
  const tiltRef = useRef<HTMLSpanElement>(null);
  const azRef = useRef<HTMLSpanElement>(null);
  const [touched, setTouched] = useState(false);

  const onTick = useCallback((a: AngleRef) => {
    // Written straight to the DOM. A readout that re-rendered React sixty times
    // a second would make the rest of the page stutter for no benefit.
    if (tiltRef.current) tiltRef.current.textContent = `${Math.round(a.tilt)}°`;
    if (azRef.current) azRef.current.textContent = `${compass(a.azimuth)} ${Math.round(Math.abs(a.azimuth))}°`;
  }, []);

  const onInteract = useCallback(() => setTouched(true), []);

  const interactive = !reduced && !small;

  return (
    <div className="relative">
      <div className="relative mx-auto aspect-square w-full max-w-[290px] sm:max-w-[520px]">
        {interactive ? (
          <PanelScene onTick={onTick} autoSpin={!touched} onInteract={onInteract} />
        ) : (
          <StaticPanel />
        )}
      </div>

      {interactive ? (
        <div className="mt-2 flex items-center justify-center gap-6">
          <Readout label={t("hero.tilt")} valueRef={tiltRef} initial="22°" />
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <Readout label={t("hero.azimuth")} valueRef={azRef} initial="SE 28°" />
        </div>
      ) : null}

      {interactive && !touched ? (
        <p className="micro rise mt-3 text-center" style={{ animationDelay: "1.2s" }}>
          {t("hero.drag")}
        </p>
      ) : null}
    </div>
  );
}

function Readout({
  label,
  valueRef,
  initial,
}: {
  label: string;
  valueRef: React.RefObject<HTMLSpanElement | null>;
  initial: string;
}) {
  return (
    <div className="text-center">
      <span
        ref={valueRef}
        className="figure block text-[19px] font-medium tabular-nums text-fg"
        aria-live="off"
      >
        {initial}
      </span>
      <span className="micro mt-0.5 block">{label}</span>
    </div>
  );
}
