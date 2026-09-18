"use client";
import { Info } from "lucide-react";
import { useId, useState, useRef, useEffect } from "react";
import { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * Layer 2 help: a small information icon next to a technical term.
 * Click/tap (or focus + Enter) shows a homeowner-friendly explanation.
 */
export function InfoTip({ term, className, label }: { term: keyof typeof GLOSSARY | string; className?: string; label?: string }) {
  const entry = GLOSSARY[term];
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  if (!entry) return null;
  return (
    <span ref={ref} className={cn("relative inline-flex align-middle", className)}>
      <button type="button" aria-label={`What does ${label ?? entry.term} mean?`} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="grid size-4 place-items-center rounded-full text-fg-muted hover:text-data focus-visible:text-data">
        <Info className="size-3.5" aria-hidden />
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute left-1/2 top-full z-40 mt-2 w-64 -translate-x-1/2 rounded-[10px] border border-border bg-elevated p-3 text-left shadow-card">
          <span className="block text-[13px] font-semibold text-fg">{entry.term}</span>
          <span className="mt-1 block text-[12.5px] leading-relaxed text-fg-secondary">{entry.short}</span>
        </span>
      )}
    </span>
  );
}
