"use client";
import { Info } from "lucide-react";
import { useId, useState, useRef, useEffect } from "react";
import { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * Layer 2 help: a small information icon next to a technical term.
 *
 * Three ways in, so it works for a parent on a laptop and one on a phone:
 * hover shows the note while the pointer is on the icon or the note; tapping
 * pins it open until the next tap outside or Escape; keyboard focus shows it
 * and Enter or Space pins it. The note itself stays under the pointer's path
 * so moving onto it to read does not close it.
 */
export function InfoTip({ term, className, label }: { term: keyof typeof GLOSSARY | string; className?: string; label?: string }) {
  const entry = GLOSSARY[term];
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const open = pinned || hover || focus;
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setPinned(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setPinned(false); setFocus(false); } };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [pinned]);
  if (!entry) return null;
  return (
    <span
      ref={ref}
      className={cn("relative inline-flex align-middle", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button type="button" aria-label={`What does ${label ?? entry.term} mean?`} aria-expanded={open} aria-describedby={open ? id : undefined}
        onClick={() => setPinned((o) => !o)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
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
