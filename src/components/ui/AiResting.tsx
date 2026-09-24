import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * What an AI feature shows when it cannot run (owner, 2026-09-24): a calm
 * product state, never a configuration instruction or an env-var name, and
 * never invented AI output. `children` says what still works meanwhile.
 */
export function AiResting({ title = "The AI assistant isn't available right now", children, className }: { title?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-inset p-4", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--cls-ai-soft)] text-[var(--cls-ai)]"><Sparkles className="size-4" aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-fg-heading">{title}</p>
        {children && <div className="mt-0.5 text-[13px] leading-relaxed text-fg-secondary">{children}</div>}
      </div>
    </div>
  );
}
