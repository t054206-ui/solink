"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useOnScreen } from "@/lib/hooks/useOnScreen";
import { useT } from "@/lib/i18n/provider";
import { PANEL_LAYERS } from "./panelLayers";
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
 * The still version. Shown under prefers-reduced-motion and while the scene
 * loads, so the hero never collapses to an empty box.
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

/**
 * The hero object.
 *
 * It arrives, settles, opens into its five parts one at a time with a sentence
 * for each, closes again, and then sways until someone grabs it. The sequence
 * is the scene's, driven by its own clock; this component only receives the
 * index of the part being explained and writes the caption, which is five React
 * renders in ten seconds rather than sixty a second.
 *
 * Phones run the same sequence but cannot drag it: reading a drag needs
 * touch-action: none on the canvas, and a hero-sized element that eats vertical
 * swipes is a page nobody can scroll. prefers-reduced-motion gets the still
 * panel and the same five sentences as a plain list, so the explanation is
 * never something you have to watch an animation to receive.
 */
export function PanelStudio({ labels }: {
  /**
   * Measurements to hang off the object, positioned against the stage. They
   * are shown only while the module is closed and at rest: during the
   * sequence the parts are 800 mm apart and the group is 18% smaller, so a
   * label pointing at "the cells" would point at air. Desktop only, like the
   * drag; phones get the readouts and captions.
   */
  labels?: React.ReactNode;
}) {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const small = useMediaQuery("(max-width: 767px)");
  const tiltRef = useRef<HTMLSpanElement>(null);
  const azRef = useRef<HTMLSpanElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(stage);
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState(-1);
  const [played, setPlayed] = useState(false);
  // True from the moment a tour starts until the scene reports the closed
  // state (-1) after at least one caption. A drag cancels the tour, and the
  // scene may not report that if it happens before the first caption, so
  // `touched` is the second way out.
  const [touring, setTouring] = useState(true);
  const [run, setRun] = useState(1);

  const onTick = useCallback((a: AngleRef) => {
    // Written straight to the DOM. A readout that re-rendered React sixty times
    // a second would make the rest of the page stutter for no benefit.
    if (tiltRef.current) tiltRef.current.textContent = `${Math.round(a.tilt)}°`;
    if (azRef.current) azRef.current.textContent = `${compass(a.azimuth)} ${Math.round(Math.abs(a.azimuth))}°`;
  }, []);

  const onStep = useCallback((i: number) => {
    setStep(i);
    if (i >= 0) setPlayed(true);
    else setTouring(false);
  }, []);

  const onInteract = useCallback(() => setTouched(true), []);

  // Replaying hands control back to the sequence, so the sway that follows it
  // starts from the same place it would have on first load.
  const replay = useCallback(() => {
    setTouched(false);
    setTouring(true);
    setRun((n) => n + 1);
  }, []);

  const layer = step >= 0 ? PANEL_LAYERS[step] : null;
  const atRest = touched || !touring;

  if (reduced) {
    return (
      <div className="relative">
        <div className="relative mx-auto aspect-square w-full max-w-[290px] sm:max-w-[520px]">
          <StaticPanel />
          {labels && <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">{labels}</div>}
        </div>
        <dl className="mx-auto mt-5 max-w-sm">
          {PANEL_LAYERS.map((l) => (
            <div key={l.id} className="flex gap-3 border-t border-border py-2">
              <dt className="micro w-[86px] shrink-0 pt-0.5 text-[color:var(--sun-ink)]">{t(l.nameKey)}</dt>
              <dd className="text-[13px] leading-snug text-fg-muted">{t(l.descKey)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-center text-[11px] leading-snug text-fg-muted">{t("panel.note")}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={stage} className="relative mx-auto aspect-square w-full max-w-[290px] sm:max-w-[520px]">
        <PanelScene
          onTick={onTick}
          onStep={onStep}
          autoSpin={!touched}
          onInteract={onInteract}
          draggable={!small}
          economy={small}
          paused={!onScreen}
          tourKey={run}
        />
        {labels && atRest && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">{labels}</div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-6">
        <Readout label={t("hero.tilt")} valueRef={tiltRef} initial="22°" />
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <Readout label={t("hero.azimuth")} valueRef={azRef} initial="SE 28°" />
      </div>

      {/* One slot with a reserved height. The caption changes five times in ten
          seconds and the page underneath it does not move once. */}
      <div className="mt-3 min-h-[76px]" aria-live="polite">
        {layer ? (
          <div key={layer.id} className="rise text-center">
            <span className="micro text-[color:var(--sun-ink)]">{t(layer.nameKey)}</span>
            <p className="mx-auto mt-1 max-w-[34ch] text-[14px] leading-snug text-fg-secondary">
              {t(layer.descKey)}
            </p>
          </div>
        ) : played ? (
          <div className="text-center">
            <button
              type="button"
              onClick={replay}
              className="press micro rounded-full border border-border-strong px-3 py-1.5 text-fg hover:bg-inset"
            >
              {t("panel.replay")}
            </button>
          </div>
        ) : !small ? (
          <p className="micro rise text-center" style={{ animationDelay: "1.2s" }}>
            {t("hero.drag")}
          </p>
        ) : null}
      </div>

      <p className="text-center text-[11px] leading-snug text-fg-muted">{t("panel.note")}</p>
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
