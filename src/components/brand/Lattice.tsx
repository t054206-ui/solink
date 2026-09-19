import { cn } from "@/lib/utils";

/**
 * The Solink lattice.
 *
 * Built from photovoltaic cell geometry, not from decoration: a square cell,
 * the same square turned forty-five degrees, and the busbars that cross both.
 * Where the two squares overlap you get the eight-point star used in Gulf
 * screenwork. Tiled, it reads as a mashrabiya; up close it is a solar module.
 *
 * `variant`:
 *   "screen"  full tile, for backgrounds and hero panels
 *   "rule"    a single band, for section breaks
 */
export function Lattice({
  className,
  size = 72,
  variant = "screen",
}: {
  className?: string;
  size?: number;
  variant?: "screen" | "rule";
}) {
  if (variant === "rule") {
    return (
      <div className={cn("relative h-px w-full", className)} aria-hidden>
        <div className="rule-brass absolute inset-0" />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={cn("lattice pointer-events-none absolute inset-0", className)}
      style={{ backgroundSize: `${size}px ${size}px` }}
    />
  );
}

/**
 * A single star, drawn large. Used where the motif should be read as a mark
 * rather than as texture: empty states, section openers, the passport.
 */
export function LatticeStar({ className, tone = "brass" }: { className?: string; tone?: "brass" | "brand" }) {
  const stroke = tone === "brand" ? "var(--brand)" : "var(--brass)";
  return (
    <svg viewBox="0 0 72 72" className={cn("size-16", className)} aria-hidden>
      <rect x="0.5" y="0.5" width="71" height="71" stroke={stroke} strokeWidth="1" fill="none" opacity="0.55" />
      <rect x="14" y="14" width="44" height="44" stroke={stroke} strokeWidth="1.25" fill="none" />
      <path d="M36 7 65 36 36 65 7 36Z" stroke={stroke} strokeWidth="1.25" fill="none" />
      <path d="M24 0.5v71M48 0.5v71" stroke={stroke} strokeWidth="1" opacity="0.45" />
    </svg>
  );
}
