"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";

const format = (v: number, decimals: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * A real figure that may count up, but never reads as anything but itself.
 *
 * Count (the landing page's) renders 0 until it is scrolled into view, which
 * is fine for the landing's fixed stats and wrong for someone's own reading:
 * "0.0 kWh" is a claim. This one renders the real value on the server and on
 * first paint, so without JavaScript, before hydration, or under reduced
 * motion the correct number is what shows.
 *
 * The count-up is a transition only, and only for a figure that starts off
 * screen: when it scrolls in, it runs from 70% of the value to the value
 * (never from zero). A figure already on screen at load is left alone, so the
 * page never shows the real number, drops it, and counts back. Unavailable
 * values do not come here at all; callers show their unavailable state.
 */
export function RevealCount({ to, decimals = 0, className = "" }: { to: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let controls: { stop: () => void } | null = null;
    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        // The first report is where the figure sits at load. On screen: leave it.
        if (first) {
          first = false;
          if (entry.isIntersecting) io.disconnect();
          return;
        }
        if (!entry.isIntersecting) return;
        io.disconnect();
        controls = animate(to * 0.7, to, {
          duration: 0.9,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: (v) => { el.textContent = format(v, decimals); },
          onComplete: () => { el.textContent = format(to, decimals); },
        });
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      controls?.stop();
      el.textContent = format(to, decimals);
    };
  }, [to, decimals]);

  return (
    <span ref={ref} className={`figure tabular-nums ${className}`}>
      {format(to, decimals)}
    </span>
  );
}
