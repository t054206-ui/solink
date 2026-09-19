import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Prominent, impossible-to-miss demo label. */
export function DemoBanner({ text = "DEMO DATA — NOT REAL", className, detail }: { text?: string; className?: string; detail?: string }) {
  return (
    <div role="note" className={cn("demo-stripe flex items-start gap-2 rounded-[var(--radius)] border border-[var(--cls-demo)]/55 bg-[var(--cls-demo-soft)] px-3 py-2 text-[13px] text-[var(--critical-fg)]", className)}>
      <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
      <div><span className="font-semibold tracking-wide">{text}</span>{detail && <span className="text-fg-secondary">: {detail}</span>}</div>
    </div>
  );
}
