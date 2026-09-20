"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SolinkMark } from "@/components/brand/Logo";
import { PANEL_LAYERS } from "@/components/three/panelLayers";
import { INTRO_TIMING, schedule } from "@/components/three/tourTiming";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useT } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import type { DictKey } from "@/lib/i18n/dictionary";
import { dropCurtain, finishIntro, isReplay, markShown } from "./introStore";

const PanelScene = dynamic(() => import("@/components/three/PanelScene"), { ssr: false });

/**
 * The story's clock, in seconds from the scene's first frame.
 *
 *   sun      0.0 – 2.0   the sun rises, its light reaches the roof
 *   panel    2.0 – 3.5   the module arrives and catches it
 *   inside   3.5 – 8.15  five parts, one line each, 0.85 s apart
 *   home     8.15 – 10.6 the module closes and settles above a house
 *   journey  10.6 – 12.3 the ten steps light up; then the wipe
 *
 * The scene runs the same schedule from INTRO_TIMING, so the captions and
 * the geometry cannot drift; this component only reads the shared numbers.
 */
const S = schedule(INTRO_TIMING);
const JOURNEY_AT = S.endAt + 1.35;
const LEAVE_AT = JOURNEY_AT + 1.7;
/** Long enough for the wipe to clear the viewport, short enough to feel like a cut. */
const EXIT_MS = 720;
/** Time given to the destination route to render behind the curtain before the wipe reveals it. */
const SETTLE_MS = 340;

type Beat = "sun" | "panel" | "inside" | "home" | "journey" | "leaving";

function beatAt(t: number): Beat {
  if (t < S.enterAt) return "sun";
  if (t < S.openAt) return "panel";
  if (t < S.closeAt) return "inside";
  if (t < JOURNEY_AT) return "home";
  return "journey";
}

const JOURNEY_KEYS = Array.from({ length: 10 }, (_, i) => `journey.${i + 1}` as DictKey);

/**
 * The opening.
 *
 * From sunlight to your home: the sun comes up over the stage, the module
 * arrives and catches the light, comes apart into its five parts with one
 * line each, closes, settles above a house with the current flowing down into
 * it, and the site's ten steps light up. Then the overlay wipes upward and
 * the site is behind it. Twelve seconds, nothing to click.
 *
 * For a first-time visitor without an account, "the site" is the sign-up
 * page: the route is pushed while the curtain is still up, so the wipe
 * reveals the form. A replay, a signed-in visitor, or a visitor already on a
 * sign-in page is returned to where they were. Escape and Skip cut it short
 * through the same exit.
 *
 * The scene owns the module; this component owns the story clock, started on
 * the scene's first frame so the two agree, and writes the caption, the sun,
 * the house, the rail and the ten steps around it.
 */
export function IntroSequence() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const small = useMediaQuery("(max-width: 767px)");
  const [step, setStep] = useState(-1);
  const [beat, setBeat] = useState<Beat>("sun");
  const started = useRef(false);
  const elapsed = useRef(0);
  const last = useRef(0);
  const bar = useRef<HTMLDivElement>(null);
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
    setBeat("leaving");
    window.setTimeout(finishIntro, EXIT_MS);
  }, [pathname, router]);

  // The scene reports the part being explained; the rail and the caption follow.
  const onStep = useCallback((i: number) => setStep(i), []);

  // The scene's first frame starts the story clock. The angle it reports is
  // not needed here; the call is the signal.
  const onTick = useCallback(() => {
    if (!started.current) {
      started.current = true;
      last.current = performance.now();
    }
  }, []);
  const onInteract = useCallback(() => {}, []);

  // The story clock: accumulated frame deltas, capped like the scene's, so a
  // backgrounded tab does not hand back one enormous step on return.
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      if (started.current && !closing.current) {
        elapsed.current += Math.min((now - last.current) / 1000, 0.05);
        last.current = now;
        const tt = elapsed.current;
        if (bar.current) bar.current.style.width = `${Math.min(100, (tt / LEAVE_AT) * 100)}%`;
        const b = beatAt(tt);
        setBeat((prev) => (prev === b || prev === "leaving" ? prev : b));
        if (tt >= LEAVE_AT) {
          void leave();
          return;
        }
      } else if (started.current) {
        last.current = now;
      } else {
        last.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [leave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leave]);

  const layer = beat === "inside" && step >= 0 ? PANEL_LAYERS[step] : null;
  const homeward = beat === "home" || beat === "journey" || beat === "leaving";
  const lit = beat === "journey" || beat === "leaving";

  return (
    <div
      className={beat === "leaving" ? "intro-root is-leaving" : "intro-root"}
      role="dialog"
      aria-modal="true"
      aria-label={t("intro.label")}
    >
      <div ref={bar} className="intro-progress" aria-hidden="true" />

      <div className="intro-head">
        <span className="intro-brand">
          <SolinkMark className="size-5" />
          Solink
        </span>
        <span className="micro hidden sm:inline">{t("intro.eyebrow")}</span>
        <button type="button" onClick={() => void leave()} className="intro-skip micro press">
          {t("intro.skip")}
        </button>
      </div>

      <div className={homeward ? "intro-stage is-home" : "intro-stage"}>
        <div aria-hidden="true" className={beat === "sun" || beat === "panel" || beat === "inside" ? "intro-sun on" : "intro-sun on"} />
        <svg aria-hidden="true" className={homeward ? "intro-beam" : "intro-beam on"} viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="intro-beam-g" x1="1" y1="0" x2="0.5" y2="0.6">
              <stop offset="0" stopColor="#f0a02a" stopOpacity="0.22" />
              <stop offset="1" stopColor="#f0a02a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="86,8 92,12 62,66 38,66" fill="url(#intro-beam-g)" />
        </svg>

        <div className="intro-canvas">
          <PanelScene
            onTick={onTick}
            onStep={onStep}
            autoSpin={false}
            onInteract={onInteract}
            draggable={false}
            economy={small}
            timing={INTRO_TIMING}
            tourKey={1}
          />
        </div>

        <svg aria-hidden="true" className={homeward ? "intro-house on" : "intro-house"} viewBox="0 0 200 130">
          <path className="flow" d="M100 2 V44" />
          <path className="wall" d="M40 74 V124 H160 V74 Z" />
          <path className="line" d="M24 78 L100 30 L176 78" />
          <path className="line" d="M90 124 V96 H110 V124" />
          <path className="line" d="M124 88 h20 v18 h-20 z" />
        </svg>
      </div>

      <div className="intro-copy">
        <div className="intro-caption" aria-live="polite">
          {layer ? (
            <div key={layer.id} className="rise">
              <span className="micro intro-name">{t(layer.nameKey)}</span>
              <p className="intro-line">{t(layer.descKey)}</p>
            </div>
          ) : beat === "sun" ? (
            <p key="sun" className="intro-line is-title rise" style={{ animationDelay: "400ms" }}>{t("intro.open")}</p>
          ) : beat === "panel" || beat === "inside" ? (
            <p key="panel" className="intro-line is-title rise">{t("intro.panel")}</p>
          ) : beat === "home" ? (
            <p key="home" className="intro-line is-title rise">{t("hero.title")}</p>
          ) : (
            <p key="journey" className="intro-line is-title rise">{t("auth.asideSub")}</p>
          )}
        </div>
        <div className="intro-journey" aria-hidden={!lit}>
          {JOURNEY_KEYS.map((k, i) => (
            <span key={k} className={lit ? "intro-step on" : "intro-step"} style={{ transitionDelay: lit ? `${i * 90}ms` : "0ms" }}>
              {t(k)}
            </span>
          ))}
        </div>
      </div>

      <div className="intro-dock">
        <div className="intro-rail micro" aria-label={t("intro.layers")}>
          {PANEL_LAYERS.map((l, i) => (
            <span key={l.id} className={layer && i === step ? "on" : undefined}>
              <span className="name">{t(l.nameKey)}</span>
            </span>
          ))}
        </div>
        <p className="intro-note">{t("panel.note")}</p>
      </div>
    </div>
  );
}
