import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Consistent "Ask Solink about this" affordance linking to the full-page agent. */
export function AskSolink({ topic, className }: { topic?: string; className?: string }) {
  return (
    <Link href="/agent" className={cn("group flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-brand-soft/60 px-4 py-3 text-[13.5px] text-fg hover:border-border-strong", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-elevated text-[var(--brand-strong)] shadow-sm"><Bot className="size-4" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Ask Solink about this</span>
        <span className="block truncate text-[12.5px] text-fg-secondary">{topic ?? "The AI Solar Agent reads your real records before answering and says when data is missing."}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
