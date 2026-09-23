import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The landing page's room, carried into the app: the bone page colour, one
 * hairline, and the plotted grid fading out from where the object sits.
 * Nothing else. No gradient fill, no glass, no glow; depth comes from white
 * surfaces set on bone, as it does on the landing page.
 *
 * `focus` is where the grid is densest, as a CSS position ("70% 40%").
 */
export function Stage({ children, className, focus = "50% 35%", label }: { children: ReactNode; className?: string; focus?: string; label?: string }) {
  return (
    <section aria-label={label} className={cn("relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg", className)}>
      <div
        aria-hidden="true"
        className="grid-rule pointer-events-none absolute inset-0 -z-10"
        style={{ maskImage: `radial-gradient(70% 60% at ${focus}, #000, transparent)`, WebkitMaskImage: `radial-gradient(70% 60% at ${focus}, #000, transparent)` }}
      />
      {children}
    </section>
  );
}
