import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Dense panel: 12px padding, 3px radius, one hairline. No coloured borders,
 * no glass, no drop shadow beyond a 1px seat.
 */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-border bg-elevated shadow-sm", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-border px-3 py-2.5", className)}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight text-fg">{title}</h3>
        {subtitle && <p className="mt-1 text-[12px] leading-snug text-fg-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-3", className)}>{children}</div>;
}
