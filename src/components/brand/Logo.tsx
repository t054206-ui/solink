import Link from "next/link";
import { cn } from "@/lib/utils";

/** Solink wordmark: a sun-disc + link motif. */
export function SolinkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <defs><linearGradient id="slk-sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd166" /><stop offset="1" stopColor="#f5a524" /></linearGradient></defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--navy)" />
      <circle cx="16" cy="13.5" r="6.5" fill="url(#slk-sun)" />
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
