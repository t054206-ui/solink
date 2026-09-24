"use client";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataBadge } from "@/components/ui/DataBadge";
import { AiResting } from "@/components/ui/AiResting";

type Subject = "report" | "alert" | "maintenance" | "performance";
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "answer"; text: string }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string };

/**
 * "Ask the AI to interpret" — POSTs the given payload to /api/ai/explain.
 * When the Claude API key is not configured the route answers not_configured
 * and the matching placeholder is shown instead of any invented text.
 */
export function AiExplainButton({ subject, payload, systemId, label = "Ask the AI to interpret", className }: {
  subject: Subject; payload: unknown; systemId?: string; label?: string; className?: string;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function run() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/ai/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subject, payload, systemId }) });
      const json = (await res.json().catch(() => null)) as { ok: boolean; answer?: string; reason?: string; message?: string } | null;
      if (!json) { setState({ kind: "error", message: "The AI service returned an unreadable response." }); return; }
      if (json.ok && typeof json.answer === "string") { setState({ kind: "answer", text: json.answer }); return; }
      if (json.reason === "not_configured") { setState({ kind: "not_configured", message: json.message ?? "" }); return; }
      setState({ kind: "error", message: json.message ?? "The AI service could not answer." });
    } catch {
      setState({ kind: "error", message: "Network error while contacting the AI service." });
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" size="sm" onClick={run} disabled={state.kind === "loading"}>
        {state.kind === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        {state.kind === "loading" ? "Asking…" : label}
      </Button>
      {state.kind === "not_configured" && <AiResting className="mt-3">Everything on this page is worked out without it.</AiResting>}
      {state.kind === "error" && <p role="alert" className="mt-3 text-[13px] text-critical-fg">{state.message}</p>}
      {state.kind === "answer" && (
        <div className="mt-3 rounded-[10px] border border-[var(--cls-ai)]/40 bg-[var(--cls-ai-soft)]/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-fg">AI interpretation</span>
            <DataBadge cls="ai" compact />
          </div>
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-fg-secondary">{state.text}</p>
          <p className="mt-2 text-[11.5px] text-fg-muted">Generated from the data available to the AI Solar Agent. It can be wrong and should be checked.</p>
        </div>
      )}
    </div>
  );
}
