"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Media queries read through useSyncExternalStore so nothing is set in an
 * effect (react-hooks/set-state-in-effect is an error in this project) and the
 * server render is deterministic. The server always sees `false`, so callers
 * must treat false as "not yet known" where that matters.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
