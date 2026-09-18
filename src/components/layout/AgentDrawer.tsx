"use client";
import { X, Bot, Maximize2 } from "lucide-react";
import Link from "next/link";
import { AgentChat } from "@/components/agent/AgentChat";

/** Slide-over AI Solar Agent available on every app page (Layer 3 help). */
export function AgentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="AI Solar Agent">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-elevated shadow-card">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 font-semibold"><Bot className="size-5 text-[var(--brand-strong)]" /> AI Solar Agent</div>
          <div className="flex items-center gap-1">
            <Link href="/agent" onClick={onClose} aria-label="Open full page" className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-inset hover:text-fg"><Maximize2 className="size-4" /></Link>
            <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-inset hover:text-fg"><X className="size-4" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1"><AgentChat compact /></div>
      </div>
    </div>
  );
}
