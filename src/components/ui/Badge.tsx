import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "good" | "warn" | "serious" | "critical" | "data";
const tones: Record<Tone, string> = {
  neutral: "bg-inset text-fg-secondary border-border",
  brand: "bg-brand-soft text-[var(--brand-strong)] border-transparent",
  good: "bg-good-soft text-good-fg border-transparent",
  warn: "bg-warn-soft text-warn-fg border-transparent",
  serious: "bg-serious-soft text-serious-fg border-transparent",
  critical: "bg-critical-soft text-critical-fg border-transparent",
  data: "bg-data-soft text-data border-transparent",
};

export function Badge({ tone = "neutral", className, children, icon, title }: { tone?: Tone; className?: string; children: ReactNode; icon?: ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap", tones[tone], className)}>
      {icon}{children}
    </span>
  );
}
