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
import { EmptyState, ErrorState, UnavailableState } from "@/components/ui/States";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { Product, SolarProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getSpecNum } from "../../marketplace/_components/product-helpers";
import { logRecommendationRun } from "../actions";
import { MatchCard } from "./MatchCard";
import { matchPanels, PRIORITY_IDS, PRIORITY_LABEL, type MatchResult } from "./match";

const PRIORITIES: { id: string; label: string }[] = PRIORITY_IDS.map((id) => ({ id, label: PRIORITY_LABEL[id] }));

interface FormState { budget: string; roofAreaM2: string; monthlyKwh: string; desiredKwp: string; priorities: string[]; notes: string }
const EMPTY: FormState = { budget: "", roofAreaM2: "", monthlyKwh: "", desiredKwp: "", priorities: [], notes: "" };

type Result =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; answer: string; contextUsed: string[] }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string };

const toNum = (s: string) => { const n = Number(s); return s.trim() !== "" && Number.isFinite(n) ? n : null; };

/** Whether this run reached the `recommendations` table, and why not when it did not. */
type LoggedState = null | { ok: true } | { ok: false; reason: "demo" | "unauthenticated" | "invalid" | "error"; message: string };

/**
 * Requirements in, ranked panels out.
 *
 * Two answers, kept apart. The ranked list is deterministic: it filters and
 * orders the catalogue rows the server loaded from the database, and every
 * line under "why this matches" is arithmetic on a recorded value. The AI
 * paragraph underneath is an interpretation of the same records and is labelled
 * as such. The ranking never waits for the AI, and the AI never changes it.
 */
export function RecommendForm({ panels, mode }: { panels: Product[]; mode: DataMode }) {
  const [form, setForm] = useLocalStore<FormState>("recommend:form", EMPTY);
  const [profile, , profileLoaded] = useLocalStore<Partial<SolarProfile> | null>("profile", null);
  const [result, setResult] = useState<Result>({ status: "idle" });
  const [ranked, setRanked] = useState<MatchResult | null>(null);
  const [logged, setLogged] = useState<LoggedState>(null);
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

    // The deterministic pass first: it needs no network and no AI, so the
    // ranked list is on screen before the model has been asked anything.
    const req = {
      budget: toNum(form.budget), roofAreaM2: toNum(form.roofAreaM2), monthlyKwh: toNum(form.monthlyKwh),
      desiredKwp: toNum(form.desiredKwp), priorities: form.priorities,
    };
    const matchResult = matchPanels(panels, req);
    setRanked(matchResult);
    setLogged(null);
    setResult({ status: "loading" });

    let aiStatus: "ok" | "not_configured" | "error" = "error";
    let aiModel: string | null = null;
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          budget: req.budget, roofAreaM2: req.roofAreaM2, monthlyKwh: req.monthlyKwh, desiredKwp: req.desiredKwp,
          priorities: form.priorities, notes: form.notes.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null) as { ok?: boolean; answer?: string; contextUsed?: string[]; model?: string; reason?: string; message?: string; error?: string } | null;
      if (body?.ok && typeof body.answer === "string") {
        setResult({ status: "ok", answer: body.answer, contextUsed: body.contextUsed ?? [] });
        aiStatus = "ok";
        aiModel = typeof body.model === "string" ? body.model : null;
      } else if (body?.reason === "not_configured") {
        setResult({ status: "not_configured", message: body.message ?? "AI recommendations are not connected yet." });
        aiStatus = "not_configured";
      } else {
        setResult({ status: "error", message: body?.message ?? body?.error ?? `The AI service returned an error (HTTP ${res.status}).` });
      }
    } catch {
      setResult({ status: "error", message: "Could not reach the AI service. Check your connection and try again." });
    }

    // The run is recorded whatever the AI did. A failed or unconfigured model
    // is a fact about the run, not a reason to lose it.
    //
    // The outcome is kept and shown. A run that was not recorded must not look
    // like one that was, and a logging failure must not take the results off
    // the screen either, so this neither throws nor stays silent.
    try {
      const logged = await logRecommendationRun({
        inputs: req,
        candidates: matchResult.matches.slice(0, 50).map((m, i) => ({
          product_id: m.product.id,
          manufacturer: m.product.manufacturer_name,
          model: m.product.model,
          rank: i + 1,
          rated_power_w: getSpecNum(m.product.specs, "rated_power_w"),
          estimated_cost_kwd: m.estimatedCostKwd,
        })),
        excluded_count: matchResult.excluded.length,
        ranked_by: matchResult.rankedBy,
        status: matchResult.status,
        catalogue_size: panels.length,
        model: aiModel,
        ai_status: aiStatus,
      });
      setLogged(logged.ok ? { ok: true } : { ok: false, reason: logged.reason, message: logged.message });
    } catch {
      setLogged({ ok: false, reason: "error", message: "The run could not be recorded: the server action did not respond." });
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
              <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => { setForm(EMPTY); setPrefilled([]); setResult({ status: "idle" }); setRanked(null); setLogged(null); }}>Reset</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* The live region is this one line, not the results themselves. A
          polite region wrapped around every card would have a screen reader
          read the whole list out on each run. */}
      <p className="sr-only" aria-live="polite">
        {ranked
          ? ranked.status === "ok"
            ? `${ranked.matches.length} panels match your requirements.`
            : "No panels match your requirements."
          : ""}
      </p>

      <div ref={resultRef} className="space-y-5">
        {ranked ? (
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Panels that fit your requirements"
                subtitle={
                  ranked.status === "empty_catalogue"
                    ? "There are no panels in the catalogue yet."
                    : ranked.status === "no_matches"
                      ? "Nothing in the catalogue satisfies every constraint you set."
                      : `${ranked.matches.length} of ${panels.length} ${panels.length === 1 ? "panel" : "panels"} match${ranked.excluded.length ? `, ${ranked.excluded.length} ruled out` : ""}.${ranked.rankedBy ? ` Ordered by ${PRIORITY_LABEL[ranked.rankedBy].toLowerCase()}.` : " Ordered by rated power, because you chose no priority."}`
                }
                action={<DataBadge cls="calculated" compact />}
              />
              <CardBody className="space-y-2 text-[12.5px] leading-relaxed text-fg-muted">
                <p>
                  Filtered and ordered from the catalogue records themselves. A panel with a missing value keeps its place and is
                  labelled: nothing missing is counted as zero, and nothing here is an estimate of production, savings or
                  installation cost.
                </p>
                {mode === "demo" && <p>Supabase is not connected, so these are the labelled demo records rather than a real catalogue.</p>}
                {logged && !logged.ok && (
                  <p className="text-fg-secondary">
                    <strong className="font-medium text-fg">This run was not recorded.</strong>{" "}
                    {logged.message} The ranking above is unaffected.
                  </p>
                )}
              </CardBody>
            </Card>

            {ranked.matches.map((m, i) => (
              <div key={m.product.id} className="space-y-4">
                {i === 1 && <h3 className="micro pt-2">Other matches, in ranked order</h3>}
                <MatchCard match={m} rank={i + 1} featured={i === 0} />
              </div>
            ))}

            {ranked.status !== "ok" && (
              <EmptyState title={ranked.status === "empty_catalogue" ? "No panels in the catalogue" : "No panel matches every constraint"}>
                {ranked.status === "empty_catalogue"
                  ? "Panels appear here once they are imported from a real data source."
                  : "Widen the budget or roof area, or drop a priority, and run it again. The reasons each panel was ruled out are listed below."}
              </EmptyState>
            )}

            {ranked.excluded.length > 0 && (
              <Card>
                <CardHeader title="Ruled out, and why" subtitle="Shown so the filter is auditable rather than invisible." />
                <CardBody>
                  <ul className="space-y-2 text-[13px] leading-relaxed text-fg-secondary">
                    {ranked.excluded.map((x) => (
                      <li key={x.product.id} className="flex flex-col gap-0.5">
                        <span className="font-medium text-fg">
                          {x.product.manufacturer_name} <span className="font-mono text-[12.5px]">{x.product.model}</span>
                        </span>
                        <span>{x.reason}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
          </div>
        ) : null}

        {result.status === "loading" && (
          <Card><CardBody className="flex items-center gap-3 pt-5 text-[13.5px] text-fg-secondary"><Loader2 className="size-4 animate-spin text-[var(--cls-ai)]" aria-hidden /> The ranking above is ready. Asking the AI Solar Agent for the trade-offs in words…</CardBody></Card>
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
