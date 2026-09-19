import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, eyebrow, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-fg-muted">{eyebrow}</div>}
        <h1 className="text-[19px] font-semibold tracking-[-0.012em] text-fg sm:text-[22px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[13px] leading-[1.55] text-fg-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
