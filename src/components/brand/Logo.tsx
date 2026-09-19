import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The Solink mark.
 *
 * A photovoltaic cell, squared off like a module. Inside it, that same square
 * turned forty-five degrees crosses the original to make the eight-point star
 * of Gulf screenwork. Two busbars run through the star, so the ornament and
 * the panel are the same drawing. This is the seed of every lattice in the
 * interface (see Lattice.tsx and the .lattice utility in globals.css).
 *
 * Solid fills only, and no gradient ids: several marks render on one page and
 * a shared <defs> id would leave the star unpainted on all but the first.
 */
export function SolinkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      {/* the cell */}
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="3" fill="var(--indigo)" />
      {/* the eight-point star: a square, and the square turned 45° */}
      <rect x="8" y="8" width="16" height="16" fill="var(--brand)" />
      <path d="M16 4.2 27.8 16 16 27.8 4.2 16Z" fill="var(--brand)" />
      {/* busbars */}
      <path d="M10.7 1v30M21.3 1v30" stroke="var(--indigo)" strokeWidth="1.15" />
      {/* the sun at the centre of the star */}
      <circle cx="16" cy="16" r="3.1" fill="var(--indigo)" />
      <circle cx="16" cy="16" r="1.5" fill="var(--brand)" />
    </svg>
  );
}

export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 text-fg", className)} aria-label="Solink home">
      <SolinkMark className="size-7" />
      {!compact && (
        <span className="text-[19px] font-semibold tracking-[-0.03em] leading-none">
          Solink
        </span>
      )}
    </Link>
  );
}
