import Link from "next/link";
import { Check, Circle, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";

export type JourneyState = "done" | "current" | "todo" | "unavailable";
export interface JourneyStep { id: string; label: string; href: string; state: JourneyState; hint?: string }

/** Horizontal (desktop) / stacked (mobile) progress strip along the Solink journey. */
export function JourneyProgress({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Your solar journey">
      {steps.map((s, i) => (
        <li key={s.id}>
          <Link href={s.href} aria-current={s.state === "current" ? "step" : undefined}
            className={cn("flex h-full items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-[13px] transition-colors hover:bg-inset",
              s.state === "done" ? "border-good/40 bg-good-soft/50" : s.state === "current" ? "border-brand bg-brand-soft/60" : s.state === "unavailable" ? "border-dashed border-border-strong bg-inset" : "border-border bg-elevated")}>
            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
              s.state === "done" ? "bg-good text-white" : s.state === "current" ? "bg-brand text-brand-fg" : s.state === "unavailable" ? "bg-elevated text-fg-muted border border-border" : "bg-inset text-fg-muted border border-border")}>
              {s.state === "done" ? <Check className="size-3" aria-hidden /> : s.state === "unavailable" ? <PlugZap className="size-3" aria-hidden /> : s.state === "current" ? i + 1 : <Circle className="size-2.5" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-fg leading-tight">{s.label}</span>
              {s.hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-fg-muted">{s.hint}</span>}
              <span className="sr-only">{s.state === "done" ? "completed" : s.state === "current" ? "current step" : s.state === "unavailable" ? "not connected" : "not started"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
