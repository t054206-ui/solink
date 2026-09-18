"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { InfoTip } from "@/components/help/InfoTip";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { ErrorState, UnavailableState } from "@/components/ui/States";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { SolarProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIORITIES: { id: string; label: string }[] = [
  { id: "lowest_upfront_cost", label: "Lowest upfront cost" },
  { id: "maximum_production", label: "Maximum production" },
  { id: "smallest_roof_area", label: "Smallest roof area" },
  { id: "hot_climate_performance", label: "Hot-climate performance" },
  { id: "longest_warranty", label: "Longest warranty" },
  { id: "verified_data_only", label: "Verified data only" },
];

interface FormState { budget: string; roofAreaM2: string; monthlyKwh: string; desiredKwp: string; priorities: string[]; notes: string }
const EMPTY: FormState = { budget: "", roofAreaM2: "", monthlyKwh: "", desiredKwp: "", priorities: [], notes: "" };

type Result =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; answer: string; contextUsed: string[] }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string };

const toNum = (s: string) => { const n = Number(s); return s.trim() !== "" && Number.isFinite(n) ? n : null; };

/** AI recommendation request form. Inputs are user-provided; the answer is AI interpretation of real catalog data only. */
export function RecommendForm() {
  const [form, setForm] = useLocalStore<FormState>("recommend:form", EMPTY);
  const [profile, , profileLoaded] = useLocalStore<Partial<SolarProfile> | null>("profile", null);
  const [result, setResult] = useState<Result>({ status: "idle" });
  const [prefilled, setPrefilled] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  // Prefill empty fields from the saved Solar Profile (labeled as user-provided).
  useEffect(() => {
    if (!profileLoaded || !profile) return;
    setForm((prev) => {
      const next = { ...prev };
      const filled: string[] = [];
      if (!prev.budget && typeof profile.budget === "number") { next.budget = String(profile.budget); filled.push("budget"); }
      const area = profile.available_roof_area_m2 ?? profile.roof_area_m2;
      if (!prev.roofAreaM2 && typeof area === "number") { next.roofAreaM2 = String(area); filled.push("roof area"); }
      if (!prev.monthlyKwh && typeof profile.monthly_consumption_kwh === "number") { next.monthlyKwh = String(profile.monthly_consumption_kwh); filled.push("monthly consumption"); }
      if (filled.length) setPrefilled(filled);
      return filled.length ? next : prev;
    });
  }, [profile, profileLoaded, setForm]);

  const togglePriority = (id: string) => setForm((prev) => ({ ...prev, priorities: prev.priorities.includes(id) ? prev.priorities.filter((p) => p !== id) : [...prev.priorities, id] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult({ status: "loading" });
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          budget: toNum(form.budget), roofAreaM2: toNum(form.roofAreaM2), monthlyKwh: toNum(form.monthlyKwh), desiredKwp: toNum(form.desiredKwp),
          priorities: form.priorities, notes: form.notes.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null) as { ok?: boolean; answer?: string; contextUsed?: string[]; reason?: string; message?: string; error?: string } | null;
      if (body?.ok && typeof body.answer === "string") setResult({ status: "ok", answer: body.answer, contextUsed: body.contextUsed ?? [] });
      else if (body?.reason === "not_configured") setResult({ status: "not_configured", message: body.message ?? "AI recommendations are not connected yet." });
      else setResult({ status: "error", message: body?.message ?? body?.error ?? `The AI service returned an error (HTTP ${res.status}).` });
    } catch {
      setResult({ status: "error", message: "Could not reach the AI service. Check your connection and try again." });
    }
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const loading = result.status === "loading";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Your situation" subtitle="All fields are optional. Everything you enter is labeled as user-provided and is not verified by Solink." action={<DataBadge cls="user" compact />} />
        <CardBody>
          {prefilled.length > 0 && <p className="mb-3 text-[12.5px] text-fg-muted">Prefilled from your Solar Profile: {prefilled.join(", ")}. Edit anything that changed.</p>}
          <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Budget (KWD)" help="Total you are willing to spend on the system.">
                <Input type="number" inputMode="decimal" min={0} step="1" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} placeholder="e.g. 3000" />
              </Field>
              <Field label="Available roof area (m²)" help="Usable space for panels, after tanks, AC units and walkways.">
                <Input type="number" inputMode="decimal" min={0} step="1" value={form.roofAreaM2} onChange={(e) => setForm((p) => ({ ...p, roofAreaM2: e.target.value }))} placeholder="e.g. 90" />
              </Field>
              <Field label={<span className="inline-flex items-center gap-1">Monthly consumption (kWh)<InfoTip term="kwh" /></span>} help="From your electricity bill.">
                <Input type="number" inputMode="decimal" min={0} step="1" value={form.monthlyKwh} onChange={(e) => setForm((p) => ({ ...p, monthlyKwh: e.target.value }))} placeholder="e.g. 2400" />
              </Field>
              <Field label={<span className="inline-flex items-center gap-1">Desired system size (kWp)<InfoTip term="kwp" /></span>} help="Leave empty if you are not sure.">
                <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.desiredKwp} onChange={(e) => setForm((p) => ({ ...p, desiredKwp: e.target.value }))} placeholder="e.g. 8" />
              </Field>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-fg-secondary">What matters most to you?</legend>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => {
                  const on = form.priorities.includes(p.id);
                  return (
                    <button key={p.id} type="button" role="checkbox" aria-checked={on} onClick={() => togglePriority(p.id)}
                      className={cn("inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors",
                        on ? "border-transparent bg-brand text-brand-fg" : "border-border bg-elevated text-fg-secondary hover:bg-inset hover:text-fg")}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[12px] text-fg-muted">Pick as many as apply. The AI uses these to frame trade-offs, not to pick a winner.</p>
            </fieldset>

            <Field label="Anything else the AI should know?" help="Shading, flat vs. tilted roof, plans for a battery, timeline…">
              <Textarea maxLength={1000} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                {loading ? "Asking the AI…" : "Get a recommendation"}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => { setForm(EMPTY); setPrefilled([]); setResult({ status: "idle" }); }}>Reset</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div ref={resultRef} aria-live="polite">
        {result.status === "loading" && (
          <Card><CardBody className="flex items-center gap-3 pt-5 text-[13.5px] text-fg-secondary"><Loader2 className="size-4 animate-spin text-[var(--cls-ai)]" aria-hidden /> Comparing the panels in the catalog against your inputs…</CardBody></Card>
        )}
        {result.status === "not_configured" && (
          <UnavailableState title="AI recommendations are not connected">
            <p>{result.message}</p>
            <PlaceholderNote k="CLAUDE_API_KEY" className="mt-3 text-left" />
            <p className="mt-3">Once connected, the AI compares <strong>only the products actually in the catalog</strong> and their recorded specifications. It will not invent prices, production figures or products that are not there. Until then, use the <Link href="/compare" className="underline underline-offset-2">comparison table</Link>.</p>
          </UnavailableState>
        )}
        {result.status === "error" && <ErrorState title="The AI could not answer">{result.message}</ErrorState>}
        {result.status === "ok" && (
          <Card>
            <CardHeader title={<><Sparkles className="size-4 text-[var(--cls-ai)]" aria-hidden /> AI recommendation</>} subtitle="An interpretation of the catalog data, not a verified fact. Check specifications against the datasheets before buying." action={<DataBadge cls="ai" />} />
            <CardBody className="space-y-4">
              <div className="space-y-3 text-[14px] leading-relaxed text-fg">
                {result.answer.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-wrap">{para}</p>)}
              </div>
              <div className="rounded-[10px] border border-border bg-inset p-3 text-[12.5px] text-fg-secondary">
                <div className="font-medium text-fg">Based on:</div>
                {result.contextUsed.length ? (
                  <ul className="mt-1 flex flex-wrap gap-1.5">{result.contextUsed.map((c) => <li key={c} className="rounded-full border border-border bg-elevated px-2 py-0.5">{c}</li>)}</ul>
                ) : <p className="mt-1 text-fg-muted">No context was reported by the service.</p>}
                <p className="mt-2 text-fg-muted">Prices and costs referenced above are placeholders unless a provider has entered them. Demo products are not real.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button href="/compare" variant="outline" size="sm">Open the comparison table</Button>
                <Button href="/marketplace?category=solar_panel" variant="ghost" size="sm">Browse panels</Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
