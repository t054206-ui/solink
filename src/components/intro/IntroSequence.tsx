"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SolinkMark } from "@/components/brand/Logo";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { PANEL_LAYERS, type PanelLayerId } from "@/components/three/panelLayers";
import { INTRO_POSE, INTRO_TIMING, schedule } from "@/components/three/tourTiming";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useT } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import type { DictKey } from "@/lib/i18n/dictionary";
import { dropCurtain, finishIntro, isReplay, markShown } from "./introStore";

const PanelScene = dynamic(() => import("@/components/three/PanelScene"), { ssr: false });

/**
 * The story's clock, in seconds from the scene's first frame. After the
 * owner's reference video of 2026-09-21.
 *
 *   sun      0 – 3.0     "It starts with sunlight." The module arrives, flat.
 *   inside   3.0 – 14.3  five layers lift off, 2.4 s apart, a tag on each
 *   energy   14.3 – 17.5 the module closes. "From sunlight to energy."
 *   home     17.5 – 20.8 "From energy to your home." A house, current flowing in.
 *   eco      20.8 – 25.0 "One platform connecting the solar ecosystem."
 *   begin    25.0 – 28.5 "Buying solar is only the beginning." Then the wipe.
 *
 * The scene runs the same schedule from INTRO_TIMING, so captions and
 * geometry cannot drift; this component only reads the shared numbers.
 */
const S = schedule(INTRO_TIMING);
const ENERGY_AT = S.closeAt;
const HOME_AT = ENERGY_AT + 3.2;
const ECO_AT = HOME_AT + 3.3;
const BEGIN_AT = ECO_AT + 4.2;
const LEAVE_AT = BEGIN_AT + 3.5;
/** Long enough for the wipe to clear the viewport, short enough to feel like a cut. */
const EXIT_MS = 720;
/** Time given to the destination route to render behind the curtain before the wipe reveals it. */
const SETTLE_MS = 340;

const CAMERA: [number, number, number] = [0.25, 1.05, 3.7];

type Beat = "sun" | "inside" | "energy" | "home" | "eco" | "begin" | "leaving";

function beatAt(t: number): Beat {
  if (t < S.openAt) return "sun";
  if (t < ENERGY_AT) return "inside";
  if (t < HOME_AT) return "energy";
  if (t < ECO_AT) return "home";
  if (t < BEGIN_AT) return "eco";
  return "begin";
}

/** The opening's own one-liners for the parts, shorter than the hero's. */
const PART_LINE: Record<PanelLayerId, DictKey> = {
  glass: "intro.glassD",
  cells: "intro.cellsD",
  backsheet: "intro.backsheetD",
  frame: "intro.frameD",
  junction: "intro.junctionD",
};

const STEPS: DictKey[] = ["intro.p1", "intro.p2", "intro.p3", "intro.p4", "intro.p5"];

/**
 * The opening.
 *
 * The module lies nearly flat, low and to the right, and its layers lift
 * straight up one at a time with a tag hung off each on a leader line. Then
 * it closes, and the story widens: sunlight to energy, energy to the home,
 * the ecosystem of vendors and consumers with Solink between them, and the
 * five things a person does next. About twenty-nine seconds, nothing to click.
 *
 * For a first-time visitor without an account, "the site" behind the wipe is
 * the sign-up page: the route is pushed while the curtain is still up. A
 * replay, a signed-in visitor, or a visitor already on a sign-in page is
 * returned to where they were. Escape and Skip cut it short the same way.
 *
 * The scene owns the module and reports the part being explained and where
 * each part is on screen; this component owns the story clock, started on the
 * scene's first frame, and writes everything around the module.
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
  const tags = useRef<(HTMLSpanElement | null)[]>([]);
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

  const onStep = useCallback((i: number) => setStep(i), []);

  // The scene's first frame starts the story clock; the angle it reports is
  // not needed here.
  const onTick = useCallback(() => {
    if (!started.current) {
      started.current = true;
      last.current = performance.now();
    }
  }, []);

  // Tags follow their parts. Written straight to the DOM, sixty times a
  // second, the way the hero's readouts are.
  const onProject = useCallback((pts: Float32Array) => {
    for (let i = 0; i < PANEL_LAYERS.length; i++) {
      const el = tags.current[i];
      if (el) el.style.transform = `translate(${pts[i * 2].toFixed(1)}px, ${pts[i * 2 + 1].toFixed(1)}px) translateY(-50%)`;
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
        const tt = elapsed.current;
        if (bar.current) bar.current.style.width = `${Math.min(100, (tt / LEAVE_AT) * 100)}%`;
        const b = beatAt(tt);
        setBeat((prev) => (prev === b || prev === "leaving" ? prev : b));
        if (tt >= LEAVE_AT) {
          void leave();
          return;
        }
      }
      last.current = now;
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

  const inside = beat === "inside";
  const layer = inside && step >= 0 ? PANEL_LAYERS[step] : null;
  const late = beat === "eco" || beat === "begin" || beat === "leaving";
  const beamOn = beat === "sun" || inside || beat === "energy";

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
        <span className="flex items-center gap-2">
          <LocaleToggle />
          <button type="button" onClick={() => void leave()} className="intro-skip micro press">
            {t("intro.skip")}
          </button>
        </span>
      </div>

      <div className={late ? "intro-stage is-late" : "intro-stage"}>
        <div aria-hidden="true" className="intro-sun on" />
        <svg aria-hidden="true" className={beamOn ? "intro-beam on" : "intro-beam"} viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="intro-beam-g" x1="1" y1="0" x2="0.55" y2="0.7">
              <stop offset="0" stopColor="#f0a02a" stopOpacity="0.22" />
              <stop offset="1" stopColor="#f0a02a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="86,9 93,13 70,78 46,78" fill="url(#intro-beam-g)" />
        </svg>

        <div className="intro-canvas">
          <PanelScene
            onTick={onTick}
            onStep={onStep}
            onProject={onProject}
            autoSpin={false}
            onInteract={onInteract}
            draggable={false}
            economy={small}
            initialTilt={INTRO_POSE.tiltFrom}
            pose={INTRO_POSE}
            cameraPosition={CAMERA}
            timing={INTRO_TIMING}
            tourKey={1}
          />
          {PANEL_LAYERS.map((l, i) => (
            <span
              key={l.id}
              ref={(el) => {
                tags.current[i] = el;
              }}
              aria-hidden="true"
              className={inside && step >= i ? "intro-tag micro on" : "intro-tag micro"}
            >
              {t(l.nameKey)}
            </span>
          ))}
        </div>

        <svg aria-hidden="true" className={beat === "home" ? "intro-house on" : "intro-house"} viewBox="0 0 200 130">
          <path className="flow" d="M100 2 V44" />
          <path className="wall" d="M40 74 V124 H160 V74 Z" />
          <path className="line" d="M24 78 L100 30 L176 78" />
          <path className="line" d="M90 124 V96 H110 V124" />
          <path className="line" d="M124 88 h20 v18 h-20 z" />
        </svg>

        <span aria-hidden="true" className={late ? "intro-eco on" : "intro-eco"} style={{ insetInlineStart: "18%", top: "38%", transitionDelay: "0ms" }}>{t("intro.vendors")}</span>
        <span aria-hidden="true" className={late ? "intro-eco is-solink on" : "intro-eco is-solink"} style={{ insetInlineStart: "44%", top: "56%", transitionDelay: "160ms" }}>{t("intro.solink")}</span>
        <span aria-hidden="true" className={late ? "intro-eco on" : "intro-eco"} style={{ insetInlineEnd: "16%", top: "34%", transitionDelay: "320ms" }}>{t("intro.consumers")}</span>
      </div>

      <div className="intro-copy">
        <div className="intro-caption" aria-live="polite">
          {layer ? (
            <div key={layer.id} className="rise">
              <h2 className="intro-title is-part">{t(layer.nameKey)}</h2>
              <p className="intro-sub">{t(PART_LINE[layer.id])}</p>
            </div>
          ) : beat === "sun" || inside ? (
            <h2 key="sun" className="intro-title rise" style={{ animationDelay: "500ms" }}>{t("intro.open")}</h2>
          ) : beat === "energy" ? (
            <h2 key="energy" className="intro-title rise">{t("intro.energy")}</h2>
          ) : beat === "home" ? (
            <h2 key="home" className="intro-title rise">{t("intro.home")}</h2>
          ) : beat === "eco" ? (
            <div key="eco" className="rise">
              <h2 className="intro-title">{t("intro.eco")}</h2>
              <p className="intro-sub">{t("intro.ecoSub")}</p>
            </div>
          ) : (
            <div key="begin" className="rise">
              <h2 className="intro-title">{t("intro.begin")}</h2>
              <p className="intro-sub">{t("intro.beginSub")}</p>
            </div>
          )}
        </div>
        <div className="intro-journey" aria-hidden={!late}>
          {STEPS.map((k, i) => (
            <span key={k} className={late ? "intro-step on" : "intro-step"} style={{ transitionDelay: late ? `${i * 110}ms` : "0ms" }}>
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
