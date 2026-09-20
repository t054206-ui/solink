"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";

/**
 * A figure that counts up once, the first time it is scrolled into view.
 *
 * It writes to the DOM node rather than to state, so a row of eight of these
 * does not schedule eight React renders per frame. Under reduced motion it
 * renders the final value immediately.
 */
export function Count({
  to,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1.1,
  className = "",
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const reduced = usePrefersReducedMotion();

  const format = (v: number) =>
    `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced || !inView) {
      if (reduced) el.textContent = format(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
    // format is derived from the same props the animation reads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, to, duration, decimals, suffix, prefix]);

  return (
    <span ref={ref} className={`figure tabular-nums ${className}`}>
      {format(reduced ? to : 0)}
    </span>
  );
}
