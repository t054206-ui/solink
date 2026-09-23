import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The Solink mark: a module, drawn the way a module is actually built.
 *
 * A rectangle in portrait, divided into cells, with two busbars running its
 * height and one cell lit in sun amber. It is a plan view of the thing the
 * product is about, at the scale of a favicon. Solid fills only, no gradient
 * ids, so several marks can render on one page without collision.
 */
export function SolinkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6 shrink-0", className)} aria-hidden>
      <rect x="3.5" y="1.5" width="17" height="21" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {/* the lit cell */}
      <rect x="4.3" y="2.3" width="5.1" height="6.1" fill="var(--sun)" />
      {/* cell divisions */}
      <path d="M9.4 1.5v21M14.6 1.5v21M3.5 8.5h17M3.5 15.5h17" stroke="currentColor" strokeWidth="1" opacity=".55" />
    </svg>
  );
}

/**
 * The same mark as `SolinkMark`, as a standalone SVG string, for places that
 * cannot render React: the 3D scenes print it onto plinths, benches, the
 * inverter and the report title block through a canvas texture. Identical
 * geometry to the component above; only the two colours are passed in, since
 * a texture cannot read CSS variables.
 */
export function solinkMarkSvg(ink = "#1a3a63", sun = "#f0a02a"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3.5" y="1.5" width="17" height="21" rx="1" fill="none" stroke="${ink}" stroke-width="1.6"/><rect x="4.3" y="2.3" width="5.1" height="6.1" fill="${sun}"/><path d="M9.4 1.5v21M14.6 1.5v21M3.5 8.5h17M3.5 15.5h17" stroke="${ink}" stroke-width="1" opacity=".55"/></svg>`;
}

export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-fg", className)} aria-label="Solink home">
      <SolinkMark />
      {!compact && <span className="text-[15px] font-semibold tracking-[-0.01em] leading-none">Solink</span>}
    </Link>
  );
}
