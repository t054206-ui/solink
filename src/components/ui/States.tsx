import { Inbox, PlugZap, AlertCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function Shell({ icon: Icon, title, children, tone = "neutral", className }: { icon: LucideIcon; title: string; children?: ReactNode; tone?: "neutral" | "warn" | "critical"; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset px-5 py-8", className)}>
      <div className={cn("mb-3 grid size-11 place-items-center rounded-[var(--radius)]", tone === "warn" ? "bg-warn-soft text-warn-fg" : tone === "critical" ? "bg-critical-soft text-critical-fg" : "bg-elevated text-fg-muted border border-border")}>
        <Icon className="size-5" aria-hidden />
      </div>
      <h4 className="text-[15px] font-semibold text-fg">{title}</h4>
      {children && <div className="mt-1.5 max-w-md text-[13px] text-fg-secondary leading-relaxed">{children}</div>}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", children, className }: { title?: string; children?: ReactNode; className?: string }) {
  return <Shell icon={Inbox} title={title} className={className}>{children}</Shell>;
}

/** Integration / data source not connected. Always name the placeholder. */
export function UnavailableState({ title = "Data unavailable", children, className }: { title?: string; children?: ReactNode; className?: string }) {
  return <Shell icon={PlugZap} title={title} tone="warn" className={className}>{children}</Shell>;
}

export function ErrorState({ title = "Something went wrong", children, className }: { title?: string; children?: ReactNode; className?: string }) {
  return <Shell icon={AlertCircle} title={title} tone="critical" className={className}>{children}</Shell>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}
