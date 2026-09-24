import { Check, CircleHelp, TriangleAlert, X } from "lucide-react";
import type { MonitorStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One visual language for health on the Monitor pages. Never colour alone:
 * every state has an icon and a word as well.
 *
 * It only ever displays a state the page already has. The system status
 * comes from `deriveStatus` (via `healthOf`); the demo layout's example
 * states come from `DemoPanelLayout`; the real array's panels are "unknown"
 * because no per-panel source exists.
 */
export type Health = "good" | "attention" | "problem" | "unknown";

/** The existing system statuses, grouped: Normal is good; Monitor and Inspection recommended ask for attention; Maintenance recommended is a problem; Insufficient data is unknown. */
export function healthOf(status: MonitorStatus): Health {
  switch (status) {
    case "normal": return "good";
    case "monitor":
    case "inspection_recommended": return "attention";
    case "maintenance_recommended": return "problem";
    default: return "unknown";
  }
}

export const HEALTH_STYLE: Record<Health, { icon: typeof Check; fg: string; ring: string; soft: string; word: string }> = {
  good: { icon: Check, fg: "text-good-fg", ring: "border-good", soft: "bg-good-soft", word: "Good" },
  attention: { icon: TriangleAlert, fg: "text-warn-fg", ring: "border-warn", soft: "bg-warn-soft", word: "Attention" },
  problem: { icon: X, fg: "text-critical-fg", ring: "border-critical", soft: "bg-critical-soft", word: "Problem" },
  unknown: { icon: CircleHelp, fg: "text-fg-muted", ring: "border-border-strong border-dashed", soft: "bg-inset", word: "Unknown" },
};

/** A small mark: icon in a tinted ring, optionally with its word. */
export function HealthMark({ health, label, size = "md", className }: { health: Health; label?: string; size?: "sm" | "md"; className?: string }) {
  const s = HEALTH_STYLE[health];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("grid shrink-0 place-items-center rounded-full border", s.ring, s.soft, s.fg, size === "sm" ? "size-4" : "size-6")} aria-hidden="true">
        <Icon className={size === "sm" ? "size-2.5" : "size-3.5"} strokeWidth={2.6} />
      </span>
      {label !== undefined && <span className={cn("text-[12.5px] font-medium", s.fg)}>{label}</span>}
    </span>
  );
}
