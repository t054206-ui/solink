"use client";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

export function Tabs({ tabs, initial, className }: { tabs: { id: string; label: ReactNode; content: ReactNode }[]; initial?: string; className?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => setActive(t.id)}
            className={cn("relative -mb-px whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors", active === t.id ? "text-fg" : "text-fg-muted hover:text-fg-secondary")}>
            {t.label}
            {active === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  );
}
