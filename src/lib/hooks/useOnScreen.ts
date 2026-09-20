"use client";
import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * Whether an element is in or near the viewport.
 *
 * Read through useSyncExternalStore for the same reason as useMediaQuery:
 * nothing is set in an effect, which this project treats as an error
 * (react-hooks/set-state-in-effect), and the server render is deterministic.
 * The observer writes to a ref the hook owns and then tells React to re-read.
 *
 * Off-screen defaults to true, so an element that is never observed — no
 * IntersectionObserver, no ref — behaves as visible rather than as hidden.
 */
export function useOnScreen(ref: React.RefObject<Element | null>, rootMargin = "160px"): boolean {
  const seen = useRef(true);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const el = ref.current;
      if (!el || typeof IntersectionObserver === "undefined") return () => {};
      const io = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          seen.current = entry.isIntersecting;
          onChange();
        },
        { rootMargin },
      );
      io.observe(el);
      return () => io.disconnect();
    },
    [ref, rootMargin],
  );

  return useSyncExternalStore(
    subscribe,
    () => seen.current,
    () => true,
  );
}
