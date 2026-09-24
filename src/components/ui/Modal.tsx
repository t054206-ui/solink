"use client";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; className?: string }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    // Focus lands inside the dialog on open (its first focusable control, or the panel itself), and Tab never escapes it while open.
    const focusables = () => (panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : []);
    (focusables()[0] ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey ? active === first || !panel.contains(active) : active === last || !panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className={cn("relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] border border-border bg-elevated shadow-card outline-none", className)}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h3 id={titleId} className="text-[15px] font-semibold text-fg-heading">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-inset hover:text-fg"><X className="size-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
