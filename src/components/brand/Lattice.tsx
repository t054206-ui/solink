import { cn } from "@/lib/utils";

/**
 * The only texture in the system: a plotted measurement grid, at the same 24px
 * rhythm as the layout. Used sparingly behind headers. It is not decoration for
 * its own sake; it signals that this is an instrument surface.
 */
export function Lattice({ className, size = 24 }: { className?: string; size?: number; variant?: "screen" | "rule" }) {
  return (
    <div
      aria-hidden
      className={cn("grid-rule pointer-events-none absolute inset-0", className)}
      style={{ backgroundSize: `${size}px ${size}px` }}
    />
  );
}

/** A small plotted square, for empty states. */
export function LatticeStar({ className }: { className?: string; tone?: "brass" | "brand" }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-12", className)} aria-hidden>
      <rect x="0.5" y="0.5" width="47" height="47" fill="none" stroke="var(--border-strong)" />
      <path d="M16 0v48M32 0v48M0 16h48M0 32h48" stroke="var(--border)" />
      <rect x="16" y="16" width="16" height="16" fill="var(--brand)" opacity=".85" />
    </svg>
  );
}
