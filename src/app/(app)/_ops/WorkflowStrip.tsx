import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_STAGES } from "./meta";

/**
 * The maintenance workflow (Feature 21):
 * Problem Detected → Customer Notified → Provider Selected → Booking → Technician → Inspection → Repair → Resolution → Record Updated.
 * `current` is the index of the stage the case is at; earlier stages are done.
 */
export function WorkflowStrip({ current, className }: { current: number; className?: string }) {
  return (
    <ol className={cn("flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x", className)} aria-label="Maintenance workflow">
      {WORKFLOW_STAGES.map((stage, i) => {
        const done = i < current, active = i === current;
        return (
          <li key={stage} className="flex min-w-[112px] flex-1 snap-start flex-col items-center gap-1.5 text-center" aria-current={active ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-px flex-1", i === 0 ? "bg-transparent" : done || active ? "bg-brand" : "bg-border")} />
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                done ? "border-brand bg-brand text-brand-fg" : active ? "border-brand bg-elevated text-[var(--brand-strong)] ring-2 ring-[var(--ring)]" : "border-border bg-inset text-fg-muted")}>
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn("h-px flex-1", i === WORKFLOW_STAGES.length - 1 ? "bg-transparent" : done ? "bg-brand" : "bg-border")} />
            </div>
            <span className={cn("text-[11px] leading-tight", active ? "font-semibold text-fg" : done ? "text-fg-secondary" : "text-fg-muted")}>{stage}</span>
          </li>
        );
      })}
    </ol>
  );
}
