"use client";
import { useState } from "react";
import { Sparkles, Loader2, CloudSun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { ErrorState } from "@/components/ui/States";
import { AiResting } from "@/components/ui/AiResting";
import type { MonitorAssessment } from "@/app/api/ai/monitor/route";
import type { MonitorStatus } from "@/lib/types";
import { StatusPill } from "@/app/(app)/_operate/components/StatusPill";
import { WEATHER_SOURCE } from "@/app/(app)/_operate/weather";

type State =
  | { kind: "idle" }
  | { kind: "loading"; step: string }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string }
  | { kind: "done"; assessment: MonitorAssessment; weatherUsed: "yes" | "no_location" | "unavailable" };

const CLEANING_LABEL: Record<MonitorAssessment["cleaning"]["recommendation"], string> = {
  not_indicated: "Cleaning is not indicated by the available data",
  may_be_recommended: "Cleaning may be recommended",
  insufficient_data: "Additional data is required",
};

/**
 * AI Energy Monitoring panel. On demand only: fetches the latest weather
 * (WeatherAPI.com, if the profile has coordinates) then asks /api/ai/monitor
 * to interpret the system's real records. Every output is an AI interpretation.
 */
export function AiMonitorPanel({ systemId, location, available = true }: { systemId: string; location: { lat: number; lng: number } | null; available?: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function run() {
    setState({ kind: "loading", step: location ? "Fetching latest weather…" : "Preparing your data…" });
    let weather: unknown = undefined;
    let weatherUsed: "yes" | "no_location" | "unavailable" = location ? "unavailable" : "no_location";
    if (location) {
      try {
        const w = await fetch(`/api/weather?lat=${location.lat}&lng=${location.lng}&days=1`);
        const wj = await w.json();
        if (wj.ok) { weather = { source: WEATHER_SOURCE, current: wj.data.current }; weatherUsed = "yes"; }
      } catch { /* weather stays unavailable; the assessment still runs */ }
    }
    setState({ kind: "loading", step: "Asking the AI Solar Agent to assess your system…" });
    try {
      const res = await fetch("/api/ai/monitor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, weather }) });
      const json = await res.json();
      if (!json.ok) {
        if (json.reason === "not_configured") setState({ kind: "not_configured", message: json.message });
        else setState({ kind: "error", message: json.message ?? "The assessment failed." });
        return;
      }
      setState({ kind: "done", assessment: json.assessment as MonitorAssessment, weatherUsed });
    } catch {
      setState({ kind: "error", message: "The AI service could not be reached." });
    }
  }

  const busy = state.kind === "loading";
  return (
    <Card>
      <CardHeader
        title={<><Sparkles className="size-4 text-[var(--cls-ai)]" aria-hidden /> AI Energy Monitoring</>}
        subtitle="Interprets your production history, maintenance records and the latest weather. It reports what the data shows and what is missing. It does not guess."
        action={available ? <Button size="sm" onClick={run} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />} {state.kind === "done" ? "Run again" : "Run AI assessment"}</Button> : undefined}
      />
      <CardBody className="space-y-4">
        {!available && <AiResting>Signals and charts on this page keep working without it.</AiResting>}
        {available && state.kind === "idle" && (
          <p className="text-[13px] text-fg-muted">
            Nothing runs until you press the button. {location ? `Latest weather from ${WEATHER_SOURCE} will be included if available.` : "Add a location in your Solar Profile to include weather in the assessment."}
          </p>
        )}
        {state.kind === "loading" && <div className="flex items-center gap-2 text-[13px] text-fg-secondary"><Loader2 className="size-4 animate-spin" aria-hidden /> {state.step}</div>}
        {state.kind === "not_configured" && <AiResting>Signals and charts on this page keep working without it.</AiResting>}
        {state.kind === "error" && <ErrorState title="Assessment failed">{state.message}</ErrorState>}
        {state.kind === "done" && <Assessment a={state.assessment} weatherUsed={state.weatherUsed} />}
      </CardBody>
    </Card>
  );
}

function Assessment({ a, weatherUsed }: { a: MonitorAssessment; weatherUsed: "yes" | "no_location" | "unavailable" }) {
  const status = (["normal", "monitor", "inspection_recommended", "maintenance_recommended", "insufficient_data"] as MonitorStatus[]).includes(a.status) ? a.status : "insufficient_data";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        <DataBadge cls="ai" source="AI Solar Agent" />
        <span className="inline-flex items-center gap-1 text-[12px] text-fg-muted"><CloudSun className="size-3.5" aria-hidden />
          {weatherUsed === "yes" ? `Weather included (${WEATHER_SOURCE})` : weatherUsed === "no_location" ? "Weather not included: no location" : "Weather not included: unavailable"}
        </span>
      </div>
      <p className="text-[15px] font-semibold leading-snug text-fg">{a.headline}</p>
      <Section title="Reasoning" items={a.reasoning} />
      <Section title="Evidence used" items={a.evidence} />
      <Section title="Missing data" items={a.missing_data} empty="The agent did not list missing data." />
      <div className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">Cleaning</div>
        <div className="mt-1 text-[14px] font-medium text-fg">{CLEANING_LABEL[a.cleaning?.recommendation] ?? CLEANING_LABEL.insufficient_data}</div>
        {a.cleaning?.rationale && <p className="mt-1 text-[13px] text-fg-secondary">{a.cleaning.rationale}</p>}
      </div>
      <p className="text-[12px] text-fg-muted">AI interpretation of the data available to it. It can be wrong. Alert thresholds are not defined, so the agent is instructed to prefer cautious statuses.</p>
    </div>
  );
}

function Section({ title, items, empty }: { title: string; items: string[] | undefined; empty?: string }) {
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">{title}</div>
      {items && items.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-fg-secondary">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
      ) : <p className="mt-1 text-[13px] text-fg-muted">{empty ?? "—"}</p>}
    </div>
  );
}
