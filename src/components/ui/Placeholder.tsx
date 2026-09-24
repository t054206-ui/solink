"use client";
import { PLACEHOLDERS, PLACEHOLDER_NOTES, PLACEHOLDER_PRODUCT, type PlaceholderKey } from "@/lib/config/placeholders";
import { cn } from "@/lib/utils";
import { useAuditMode } from "./AuditMode";

/**
 * A value, provider or data source that has not been supplied. Never replace
 * it with an invented value.
 *
 * In audit mode (admin, provider, manufacturer) it is the unmistakable dashed
 * token. On homeowner screens it is the product phrase from
 * PLACEHOLDER_PRODUCT, or nothing when that phrase is null: homeowners are
 * never shown tokens or configuration instructions (owner, 2026-09-24).
 */
export function Placeholder({ k, className, inline = true }: { k: PlaceholderKey; className?: string; inline?: boolean }) {
  const audit = useAuditMode();
  if (!audit) {
    const phrase = PLACEHOLDER_PRODUCT[k];
    return phrase ? <span className={className}>{phrase}</span> : null;
  }
  return (
    <span
      title={PLACEHOLDER_NOTES[k]}
      className={cn("font-mono text-[11px] rounded-[2px] border border-dashed border-[var(--cls-estimated)] text-[var(--cls-estimated)] bg-[var(--cls-estimated-soft)] px-1 py-px leading-[16px] tracking-tight", inline ? "inline-flex align-middle" : "flex", className)}
    >
      {PLACEHOLDERS[k]}
    </span>
  );
}

/** The whole-card explanation. Audit mode only; homeowner screens say this in their own design. */
export function PlaceholderNote({ k, className }: { k: PlaceholderKey; className?: string }) {
  const audit = useAuditMode();
  if (!audit) return null;
  return (
    <div className={cn("rounded-[var(--radius)] border border-dashed border-[var(--cls-estimated)]/60 bg-[var(--cls-estimated-soft)]/60 p-3 text-[13px]", className)}>
      <div className="font-mono text-[11.5px] text-[var(--cls-estimated)]">{PLACEHOLDERS[k]}</div>
      <p className="mt-1 text-fg-secondary">{PLACEHOLDER_NOTES[k]}</p>
    </div>
  );
}
