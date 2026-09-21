"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the cinematic intro is on screen.
 *
 * Kept outside React and read through useSyncExternalStore, for the same
 * reason as useMediaQuery: this project treats setting state inside an effect
 * as an error, and "has this browser seen the intro" is exactly the kind of
 * thing a component would otherwise reach for an effect to discover.
 *
 * Two things carry the state, and they have to agree:
 *
 *  - a storage key, when INTRO_FREQUENCY asks for one, so the sequence plays
 *    once per browser or tab rather than in front of someone who has watched it;
 *  - `data-intro="pending"` on the root element, set by public/bootstrap.js
 *    before first paint. That attribute drives the curtain in globals.css, so
 *    a first-time visitor never sees the landing page flash behind the intro.
 *
 * The curtain comes down at the start of the exit animation, not at the end of
 * it, because the overlay wipes upward to reveal the page and a curtain still
 * standing behind it would be all there was to reveal.
 */

/**
 * How often the opening plays. The owner's call, 2026-09-21: "every time".
 *
 *   "always"  every full page load (client-side navigation never replays it)
 *   "session" once per tab
 *   "once"    once per browser, until the key's suffix is bumped
 *
 * public/bootstrap.js carries the same word and must be changed with it: it
 * raises the curtain before React runs, from the same rule.
 */
export type IntroFrequency = "always" | "session" | "once";
export const INTRO_FREQUENCY: IntroFrequency = "always";

// Bump the suffix when the opening changes enough that people who saw the
// old one should see the new one once. bootstrap.js reads the same key.
const KEY = "solink:intro-seen-v2";

/** True once this page load's opening has finished, whatever the frequency. */
let done = false;

function seen(): boolean {
  try {
    if (INTRO_FREQUENCY === "always") return false;
    const store = INTRO_FREQUENCY === "session" ? sessionStorage : localStorage;
    return store.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function remember(): void {
  try {
    if (INTRO_FREQUENCY === "always") return;
    const store = INTRO_FREQUENCY === "session" ? sessionStorage : localStorage;
    store.setItem(KEY, "1");
  } catch {
    // A browser with site data blocked simply gets the opening again next time.
  }
}
const EVENT = "solink:intro";
const ATTR = "data-intro";

/** Set by the replay button, which overrides "this browser has seen it". */
let forced = false;

/** True once the opening has mounted in this page load. The hero reads it to
    decline its own copy of the sequence rather than play it a second time. */
let shownThisLoad = false;

const calm = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  // Someone who has asked for less motion is not shown an eleven second
  // animation, and is not shown the button that would start one either.
  if (calm()) return false;
  if (forced) return true;
  if (done) return false;
  return !seen();
}

export function getServerSnapshot(): boolean {
  return false;
}

/**
 * Is the opening on screen right now?
 *
 * The host asks so it knows whether to mount it. The hero asks so it can stop
 * drawing: its canvas sits directly behind the overlay, and two WebGL contexts
 * rendering at sixty frames a second, one of them invisible, is a phone
 * getting warm for nothing.
 */
export function useIntroOnScreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The opening is on screen. Called by the sequence when it mounts. */
export function markShown(): void {
  shownThisLoad = true;
}

export function introShownThisLoad(): boolean {
  return shownThisLoad;
}

/** Is the current showing a replay someone asked for, rather than the first one? */
export function isReplay(): boolean {
  return forced;
}

/** Take the curtain down so the exit wipe reveals the page, not more ink. */
export function dropCurtain(): void {
  document.documentElement.removeAttribute(ATTR);
}

/** The sequence is over: remember it, and let the host unmount the overlay. */
export function finishIntro(): void {
  forced = false;
  done = true;
  remember();
  dropCurtain();
  window.dispatchEvent(new Event(EVENT));
}

export function replayIntro(): void {
  if (calm()) return;
  forced = true;
  document.documentElement.setAttribute(ATTR, "pending");
  window.dispatchEvent(new Event(EVENT));
}
