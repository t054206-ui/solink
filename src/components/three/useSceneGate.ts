"use client";

import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useOnScreen } from "@/lib/hooks/useOnScreen";
import { useIntroOnScreen } from "@/components/intro/introStore";

/**
 * The rules every Solink scene follows, in one place: stop drawing off screen
 * or while the opening film is up, one still frame under reduced motion,
 * fewer pixels on phones, pointer parallax only where there is a pointer.
 * `ref` is the caller's own ref on the element that holds the canvas; it is
 * passed in rather than returned so that the flags below are plain values.
 */
export function useSceneGate(ref: React.RefObject<HTMLElement | null>) {
  const reduced = usePrefersReducedMotion();
  const small = useMediaQuery("(max-width: 767px)");
  const coarse = useMediaQuery("(pointer: coarse)");
  const onScreen = useOnScreen(ref);
  const introOn = useIntroOnScreen();
  return { paused: !onScreen || introOn, still: reduced, economy: small, parallax: !coarse };
}
