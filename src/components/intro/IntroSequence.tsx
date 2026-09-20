"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { PANEL_LAYERS } from "@/components/three/panelLayers";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useT } from "@/lib/i18n/provider";
import type { AngleRef } from "@/components/three/PanelScene";
import { dropCurtain, finishIntro } from "./introStore";

const PanelScene = dynamic(() => import("@/components/three/PanelScene"), { ssr: false });

/** Long enough for the wipe to clear the viewport, short enough to feel like a cut. */
const EXIT_MS = 720;

/**
 * The opening.
 *
 * The same module, the same five parts and the same sequence as the hero, shown
 * full bleed on ink with the captions given room to be read. It is the scene's
 * own clock that drives it, so this component only writes the caption and waits
 * to be told the panel has closed again.
 *
 * Nothing has to be clicked. The sequence ends, the overlay wipes upward, and
 * the site is already behind it. Escape or the skip control cuts it short for
 * anyone who has seen it before and did not mean to see it again.
 */
export function IntroSequence() {
  const t = useT();
  const small = useMediaQuery("(max-width: 767px)");
  const [step, setStep] = useState(-1);
  const [leaving, setLeaving] = useState(false);
  const played = useRef(false);
  const closing = useRef(false);

  const leave = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    // The curtain goes first: the wipe has to reveal the page, not more ink.
    dropCurtain();
    setLeaving(true);
    window.setTimeout(finishIntro, EXIT_MS);
  }, []);

  // The scene reports -1 both before the first part and after the last one.
  // Only the second of those means the sequence is over.
  const onStep = useCallback(
    (i: number) => {
      setStep(i);
      if (i >= 0) {
        played.current = true;
        return;
      }
      if (played.current) leave();
    },
    [leave],
  );

  const onTick = useCallback((_a: AngleRef) => {}, []);
  const onInteract = useCallback(() => {}, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leave]);

  const layer = step >= 0 ? PANEL_LAYERS[step] : null;

  return (
    <div
      className={leaving ? "intro-root is-leaving" : "intro-root"}
      role="dialog"
      aria-modal="true"
      aria-label={t("intro.label")}
    >
      <button type="button" onClick={leave} className="intro-skip micro">
        {t("intro.skip")}
      </button>

      <div className="intro-stage">
        <PanelScene
          onTick={onTick}
          onStep={onStep}
          autoSpin={false}
          onInteract={onInteract}
          draggable={false}
          economy={small}
          tourKey={1}
        />
      </div>

      <div className="intro-copy">
        <div className="intro-ticks" aria-hidden="true">
          {PANEL_LAYERS.map((l, i) => (
            <span key={l.id} className={i <= step ? "on" : undefined} />
          ))}
        </div>
        <div className="intro-caption" aria-live="polite">
          {layer ? (
            <div key={layer.id} className="rise">
              <span className="micro intro-name">{t(layer.nameKey)}</span>
              <p className="intro-line">{t(layer.descKey)}</p>
            </div>
          ) : null}
        </div>
        <p className="intro-note">{t("panel.note")}</p>
      </div>
    </div>
  );
}
