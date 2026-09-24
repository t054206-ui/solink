import { Inbox, CircleDashed, AlertCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function Shell({ icon: Icon, title, children, tone = "neutral", className, illustration }: { icon: LucideIcon; title: string; children?: ReactNode; tone?: "neutral" | "critical"; className?: string; illustration?: ReactNode }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center rounded-[var(--radius-lg)] border border-border bg-inset px-5 py-8", className)}>
      {illustration ?? (
        <div className={cn("mb-3 grid size-11 place-items-center rounded-[var(--radius)]", tone === "critical" ? "bg-critical-soft text-critical-fg" : "bg-elevated text-[var(--brand)] border border-border")}>
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <h4 className="text-[15px] font-semibold text-fg-heading">{title}</h4>
      {children && <div className="mt-1.5 max-w-md text-[13px] text-fg-secondary leading-relaxed">{children}</div>}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", children, className, illustration }: { title?: string; children?: ReactNode; className?: string; illustration?: ReactNode }) {
  return <Shell icon={Inbox} title={title} className={className} illustration={illustration}>{children}</Shell>;
}

/**
 * Something that will appear once its source exists. On homeowner screens it
 * is a calm product state (owner, 2026-09-24): no "not connected" look, no
 * warning tone, no configuration text. Pass an illustration where one helps.
 */
export function UnavailableState({ title = "Coming up here", children, className, illustration }: { title?: string; children?: ReactNode; className?: string; illustration?: ReactNode }) {
  return <Shell icon={CircleDashed} title={title} className={className} illustration={illustration}>{children}</Shell>;
}

export function ErrorState({ title = "Something went wrong", children, className }: { title?: string; children?: ReactNode; className?: string }) {
  return <Shell icon={AlertCircle} title={title} tone="critical" className={className}>{children}</Shell>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}
