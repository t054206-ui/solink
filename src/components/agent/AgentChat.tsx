"use client";
import { AiResting } from "@/components/ui/AiResting";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DataBadge } from "@/components/ui/DataBadge";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string; contextUsed?: string[]; error?: boolean }

const SUGGESTIONS = [
  "Why was my production low this week?",
  "Do my panels need cleaning?",
  "What maintenance did I have?",
  "Explain my latest report.",
  "What does temperature coefficient mean for my system?",
];

/** Layer 3 help: the central AI Solar Agent. Retrieves the user's real data server-side before answering. */
export function AgentChat({ compact = false, systemId }: { compact?: boolean; systemId?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim(); if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/ai/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), systemId }) });
      const json = await res.json();
      if (!json.ok) {
        if (json.reason === "not_configured") setUnavailable(json.message);
        setMessages((m) => [...m, { role: "assistant", content: json.message ?? "The AI assistant isn't available right now.", error: true }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: json.answer, contextUsed: json.contextUsed }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "The AI Solar Agent could not be reached. Please try again.", error: true }]);
    } finally { setBusy(false); }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", compact ? "" : "rounded-[var(--radius-lg)] border border-border bg-elevated shadow-sm")}>
      <div className={cn("flex-1 overflow-y-auto px-4 py-4 space-y-4", !compact && "min-h-[420px] max-h-[65dvh]")}>
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-[var(--brand-strong)]"><Bot className="size-6"  aria-hidden /></div>
            <h3 className="mt-3 text-[15px] font-semibold">Ask about <em>your</em> solar system</h3>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-fg-secondary">The agent reads your profile, system, production, maintenance and reports before answering. It never invents data. If something is missing, it says so.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-inset px-3 py-1.5 text-[12.5px] text-fg-secondary hover:border-border-strong hover:text-fg">{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[var(--brand-strong)]"><Bot className="size-4"  aria-hidden /></div>}
            <div className={cn("max-w-[85%] rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap", m.role === "user" ? "bg-navy text-white dark:bg-white/10" : m.error ? "border border-warn/50 bg-warn-soft text-fg" : "bg-inset text-fg")}>
              {m.content}
              {m.role === "assistant" && !m.error && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-[11px] text-fg-muted">
                  <DataBadge cls="ai" compact />{m.contextUsed?.length ? <span>Based on: {m.contextUsed.join(" · ")}</span> : null}
                </div>
              )}
            </div>
            {m.role === "user" && <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-inset text-fg-muted"><User className="size-4"  aria-hidden /></div>}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-[13px] text-fg-muted"><Loader2 className="size-4 animate-spin"  aria-hidden /> Reading your data and thinking…</div>}
        <div ref={endRef} />
      </div>
      {unavailable && (
        <div className="mx-4 mb-2"><AiResting title="Ask Solink isn't available right now">Your system, maintenance and reports are all on their own pages meanwhile.</AiResting></div>
      )}
      <form className="flex items-end gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Ask the AI Solar Agent…" aria-label="Your question"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-[10px] border border-border-strong bg-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-brand text-brand-fg disabled:opacity-50"><Send className="size-4"  aria-hidden /></button>
      </form>
    </div>
  );
}
