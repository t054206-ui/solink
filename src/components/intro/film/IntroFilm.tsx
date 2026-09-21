"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/provider";
import { dropCurtain, finishIntro, markShown } from "../introStore";
import { mountFilm } from "./film";
import "./film.css";

/** three.js r128, the UMD build the artifact was written against. Vendored, not fetched from a CDN. */
const THREE_SRC = "/vendor/three-r128.min.js";
/** The artifact's own fonts: Archivo with its width axis, which the site's copy of Archivo does not carry. */
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap";
/** The root's opacity transition, in film.css. */
const FADE_MS = 800;

declare global {
  interface Window {
    THREE?: unknown;
  }
}

interface FilmApi {
  dispose: () => void;
  setLanguage: (l: "en" | "ar") => void;
}

function loadThree(): Promise<unknown> {
  if (window.THREE) return Promise.resolve(window.THREE);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = THREE_SRC;
    s.async = true;
    s.onload = () => resolve(window.THREE);
    s.onerror = () => reject(new Error("three.js r128 did not load"));
    document.head.appendChild(s);
  });
}

/**
 * The opening: the owner's artifact "Solink intro", mounted as it was written.
 *
 * The markup below is the artifact's, minus its demo host section. The
 * script (film.ts) and stylesheet (film.css) are the artifact's, scoped to
 * this root. React renders the shell once and then keeps its hands off: the
 * film writes captions, tags, rail buttons and journey pills into it itself.
 *
 * What the site adds is only the frame around the film: three.js r128 loaded
 * from /vendor, the language button kept in step with the site's locale, and
 * the fade when the film ends, which leaves the visitor on the page they
 * opened (the owner's instruction of 2026-09-21: the homepage).
 */
export function IntroFilm() {
  const { locale, setLocale } = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  // The film calls back long after mount; this ref holds the latest values.
  const latest = useRef({ setLocale, locale });
  useEffect(() => {
    latest.current = { setLocale, locale };
  });

  useEffect(() => {
    markShown();
    const el = root.current;
    if (!el) return;
    let api: FilmApi | null = null;
    let cancelled = false;
    let closing = false;

    // The film ends and the site is simply there behind it (owner,
    // 2026-09-21: "transition to the homepage"). No route change.
    const leave = () => {
      if (closing) return;
      closing = true;
      if (cancelled) return;
      dropCurtain();
      setLeaving(true);
      window.setTimeout(finishIntro, FADE_MS);
    };

    loadThree()
      .catch(() => undefined)
      .then((THREE) => {
        if (cancelled) return;
        api = mountFilm(el, {
          THREE,
          lang: latest.current.locale,
          onLanguage: (l: "en" | "ar") => latest.current.setLocale(l),
          onComplete: leave,
        }) as unknown as FilmApi;
      });

    return () => {
      cancelled = true;
      api?.dispose();
    };
  }, []);

  return (
    <>
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
      <div ref={root} id="solink-film" className={leaving ? "is-leaving" : undefined}>
        <div className="film-bg" aria-hidden="true" />

        {/* ===== 1 · the stage ===== */}
        <canvas id="stage" aria-label="Cinematic 3D solar panel" />
        <div className="sunwash" aria-hidden="true" />
        <div className="progress" id="progress" aria-hidden="true" />

        {/* ===== 2 · the intro overlay ===== */}
        <section id="intro" aria-label="From sunlight to your home">
          <div className="bar">
            <span className="wordmark">
              <i />
              Solink
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ghost js-lang" type="button">
                العربية
              </button>
              <button className="ghost" id="skip" type="button" data-en="Skip intro" data-ar="تخطي المقدمة">
                Skip intro
              </button>
            </div>
          </div>

          <div />

          <div className="cine">
            <div className="caption" id="caption" aria-live="polite">
              <h2 id="capTitle" />
              <p id="capLine" />
            </div>
            <div className="journey" id="journey" />
          </div>

          <div className="dock">
            <div className="rail" id="rail" aria-label="Panel layers" />
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }} data-en="Drag to look around" data-ar="اسحب للنظر حولك">
              Drag to look around
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
