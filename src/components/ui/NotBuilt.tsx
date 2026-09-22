import { cn } from "@/lib/utils";

/**
 * The marker for a feature the owner wants in the structure that has no page
 * yet. Same dashed mono style as <Placeholder>, which marks an undecided
 * value: a reader learns one visual language for "Solink is not pretending".
 * `why` goes in the title so the reason is one hover away.
 */
export function NotBuilt({ why, className, label = "NOT BUILT YET" }: { why?: string; className?: string; label?: string }) {
  return (
    <span
      title={why}
      className={cn("inline-flex align-middle rounded-[2px] border border-dashed border-[var(--cls-estimated)] bg-[var(--cls-estimated-soft)] px-1 py-px font-mono text-[10px] leading-[14px] tracking-tight text-[var(--cls-estimated)]", className)}
    >
      [{label}]
    </span>
  );
}

/** A whole-card version for pages that exist only to say what they will hold. */
export function NotBuiltNote({ title, children, className }: { title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius)] border border-dashed border-[var(--cls-estimated)]/60 bg-[var(--cls-estimated-soft)]/60 p-3 text-[13px]", className)}>
      <div className="font-mono text-[11.5px] text-[var(--cls-estimated)]">[NOT BUILT YET: {title}]</div>
      {children && <div className="mt-1 text-fg-secondary">{children}</div>}
    </div>
  );
}
