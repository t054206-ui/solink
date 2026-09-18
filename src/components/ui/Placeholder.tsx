import { PLACEHOLDERS, PLACEHOLDER_NOTES, type PlaceholderKey } from "@/lib/config/placeholders";
import { cn } from "@/lib/utils";

/**
 * Renders an unmistakable placeholder for a value/provider/data source that has
 * not been supplied. Never replace with an invented value.
 */
export function Placeholder({ k, className, inline = true }: { k: PlaceholderKey; className?: string; inline?: boolean }) {
  return (
    <span
      title={PLACEHOLDER_NOTES[k]}
      className={cn("font-mono text-[11.5px] rounded-md border border-dashed border-[var(--cls-estimated)] text-[var(--cls-estimated)] bg-[var(--cls-estimated-soft)] px-1.5 py-0.5 leading-4", inline ? "inline-flex align-middle" : "flex", className)}
    >
      {PLACEHOLDERS[k]}
    </span>
  );
}

export function PlaceholderNote({ k, className }: { k: PlaceholderKey; className?: string }) {
  return (
    <div className={cn("rounded-[10px] border border-dashed border-[var(--cls-estimated)]/60 bg-[var(--cls-estimated-soft)]/60 p-3 text-[13px]", className)}>
      <div className="font-mono text-[11.5px] text-[var(--cls-estimated)]">{PLACEHOLDERS[k]}</div>
      <p className="mt-1 text-fg-secondary">{PLACEHOLDER_NOTES[k]}</p>
    </div>
  );
}
