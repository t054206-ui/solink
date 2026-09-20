"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SolinkMark } from "@/components/brand/Logo";
import { PANEL_LAYERS } from "@/components/three/panelLayers";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useT } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import type { AngleRef } from "@/components/three/PanelScene";
import { dropCurtain, finishIntro, isReplay, markShown } from "./introStore";

const PanelScene = dynamic(() => import("@/components/three/PanelScene"), { ssr: false });

/** Long enough for the wipe to clear the viewport, short enough to feel like a cut. */
const EXIT_MS = 720;
/** The module closes in 1.3 s; the tagline gets a beat on the closed object before the cut. */
const CLOSE_MS = 1900;
/** Time given to the destination route to render behind the curtain before the wipe reveals it. */
const SETTLE_MS = 340;

type Phase = "opening" | "parts" | "closing" | "leaving";

/**
 * The opening.
 *
 * The same module, the same five parts and the same sequence as the hero, shown
 * full bleed on ink with the captions given room to be read. The scene's own
 * clock drives it; this component writes the caption, counts the parts off in
 * the tick row, and waits to be told the panel has closed again.
 *
 * Nothing has to be clicked. When the module has closed, the overlay wipes
 * upward and the site is already behind it. For a first-time visitor without
 * an account, "the site" is the sign-up page: the route is pushed while the
 * curtain is still up, so the wipe reveals the form and not the landing page
 * for a frame. A replay, or a visitor who is signed in, or a visitor already on
 * a sign-in page, is simply returned to where they were.
 *
 * Escape or the skip control cuts it short for anyone who did not mean to
 * watch it again; skipping follows the same hand-off.
 */
export function IntroSequence() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const small = useMediaQuery("(max-width: 767px)");
  const [step, setStep] = useState(-1);
  const [phase, setPhase] = useState<Phase>("opening");
  const played = useRef(false);
  const closing = useRef(false);

  useEffect(() => {
    markShown();
  }, []);

  const leave = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;

    let target: string | null = null;
    const onAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
    if (!isReplay() && !onAuthPage) {
      const supabase = createClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) target = pathname === "/" ? "/signup" : `/signup?next=${encodeURIComponent(pathname)}`;
      }
    }
    if (target) {
      router.push(target);
      await new Promise((r) => window.setTimeout(r, SETTLE_MS));
    }
    // The curtain goes first: the wipe has to reveal the page, not more ink.
    dropCurtain();
    setPhase("leaving");
    window.setTimeout(finishIntro, EXIT_MS);
  }, [pathname, router]);

  // The scene reports -1 both before the first part and after the last one.
  // Only the second of those means the module is closing.
  const onStep = useCallback(
    (i: number) => {
      setStep(i);
      if (i >= 0) {
        played.current = true;
        setPhase("parts");
        return;
      }
      if (played.current) {
        setPhase("closing");
        window.setTimeout(() => void leave(), CLOSE_MS);
      }
    },
    [leave],
  );

  // The opening has no readouts, so the angle the scene reports goes nowhere.
  const onTick = useCallback((): void => undefined, []) as (a: AngleRef) => void;
  const onInteract = useCallback(() => {}, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leave]);

  const layer = step >= 0 ? PANEL_LAYERS[step] : null;
  const lit = phase === "closing" || phase === "leaving" ? PANEL_LAYERS.length : step + 1;

  return (
    <div
      className={phase === "leaving" ? "intro-root is-leaving" : "intro-root"}
      role="dialog"
      aria-modal="true"
      aria-label={t("intro.label")}
    >
      <div className="intro-head">
        <span className="intro-brand">
          <SolinkMark className="size-5" />
          Solink
        </span>
        <span className="micro intro-eyebrow hidden sm:inline">{t("intro.eyebrow")}</span>
        <button type="button" onClick={() => void leave()} className="intro-skip micro press">
          {t("intro.skip")}
        </button>
      </div>

      <div className="intro-stage">
        <PanelScene
          onTick={onTick}
          onStep={onStep}
          autoSpin={false}
          onInteract={onInteract}
          draggable={false}
          economy={small}
          stage="dark"
          tourKey={1}
        />
      </div>

      <div className="intro-copy">
        <div className="intro-ticks" aria-hidden="true">
          {PANEL_LAYERS.map((l, i) => (
            <span key={l.id} className={i < lit ? "on" : undefined} />
          ))}
        </div>
        <div className="intro-caption" aria-live="polite">
          {layer ? (
            <div key={layer.id} className="rise">
              <span className="micro intro-name">{t(layer.nameKey)}</span>
              <p className="intro-line">{t(layer.descKey)}</p>
            </div>
          ) : phase === "opening" ? (
            <p key="open" className="intro-line is-title rise" style={{ animationDelay: "500ms" }}>
              {t("intro.open")}
            </p>
          ) : (
            <p key="close" className="intro-line is-title rise">
              {t("hero.title")}
            </p>
          )}
        </div>
        <p className="intro-note">{t("panel.note")}</p>
      </div>
    </div>
  );
}
