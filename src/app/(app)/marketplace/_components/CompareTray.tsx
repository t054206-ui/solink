"use client";
import Link from "next/link";
import { ArrowRight, GitCompare, X } from "lucide-react";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { COMPARE_MAX, COMPARE_STORE_KEY } from "./product-helpers";

/** Sticky bottom bar showing how many products are selected for comparison. */
export function CompareTray() {
  const [ids, setIds, loaded] = useLocalStore<string[]>(COMPARE_STORE_KEY, []);
  if (!loaded || ids.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 lg:pl-[calc(16rem+1.5rem)]" role="status" aria-live="polite">
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-elevated px-4 py-3 shadow-card">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[var(--brand-strong)]"><GitCompare className="size-4" aria-hidden /></span>
          <div className="min-w-0 text-[13px]">
            <div className="font-medium text-fg">{ids.length} of {COMPARE_MAX} selected for comparison</div>
            <div className="hidden text-fg-muted sm:block">Selections are stored in this browser only.</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => setIds([])} className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-inset hover:text-fg" aria-label="Clear comparison">
            <X className="size-4" aria-hidden />
          </button>
          <Link href="/compare" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13px] font-medium text-brand-fg hover:bg-brand-strong">
            Compare <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
