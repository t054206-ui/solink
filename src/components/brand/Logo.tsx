import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Solink mark: a sun disc over two horizon lines.
 * Uses solid fills rather than a gradient, so several marks can render on one
 * page without colliding on a shared <defs> id (which leaves the disc unpainted).
 */
export function SolinkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#0b1f3a" />
      <circle cx="16" cy="13.5" r="6.5" fill="#f5a524" />
      <circle cx="14" cy="11.5" r="2.6" fill="#ffd166" />
      <path d="M6 23.5h20" stroke="#ffffff" strokeOpacity=".9" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9.5 27h13" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight text-fg", className)} aria-label="Solink home">
      <SolinkMark />
      {!compact && <span className="text-[17px]">Solink</span>}
    </Link>
  );
}
