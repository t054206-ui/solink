"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, CloudSun, ExternalLink, Haze, Loader2, MapPin, Satellite, Thermometer, Wind, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Field, Input } from "@/components/ui/Form";
import { ErrorState } from "@/components/ui/States";
import { Stage } from "@/components/layout/Stage";
import { SiteVisual } from "@/components/three/SiteVisual";
import type { Atmosphere } from "@/components/three/SiteScene";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { formatDate } from "@/lib/utils";
import { forgetPlacementLocation, usePlacementLocation, type CarriedLocation } from "@/lib/solar/placementHandoff";
import { saveProfileLocation } from "../profile/actions";
import type {
  AnalysisSources,
  EnvironmentAssessment,
  EnvironmentLevel,
  NormalisedLocation,
  NormalisedSolar,
  NormalisedWeather,
  SiteAnalysis as Analysis,
  SiteAnalysisRow,
} from "@/lib/solar/siteAnalysis";

/**
 * Address in, analysis out.
 *
 * The work happens on the server: this form posts an address and renders what
 * comes back. No key and no provider call exists in the browser.
 *
 * Since 2026-09-22 the analysis is produced by Solink's own rules rather than
 * by a model, so nothing here credits an AI with it. What the page shows is
 * unchanged: the same cards, in the same order.
 *
 * Stage labels are honest about where a run stopped. The server reports the
 * stage it failed at, and that is the stage named here, rather than a single
 * "something went wrong".
 */

/**
 * The run, as the six things that actually happen on the server, in order.
 *
 * The whole pipeline is one request, so while it is in flight the
 * browser knows only that the address was sent: no step is ticked on a timer,
 * because a tick is a claim that the work finished. When the request returns,
 * a success ticks all six and a failure ticks the ones the reported stage
 * proves were reached, marks that stage as the one that stopped, and leaves
 * the rest untouched.
 */
const RUN_STEPS: { key: string; label: string }[] = [
  { key: "input", label: "Address sent" },
  { key: "geocoding", label: "Location found" },
  { key: "weather", label: "Environmental data retrieved" },
  { key: "analysis", label: "Conditions analysed" },
  { key: "persistence", label: "Analysis saved" },
  { key: "done", label: "Results ready" },
];

/** Where a failed run stopped, in the order the steps above run. */
const FAILED_AT: Record<string, number> = {
  input: 0,
  auth: 0,
  geocoding: 1,
  google_solar: 2,
  weather: 2,
  analysis: 3,
  persistence: 4,
};

const STAGE_LABEL: Record<string, string> = {
  input: "the address you entered",
  auth: "your session",
  geocoding: "finding the location",
  google_solar: "reading the roof",
  weather: "checking the weather",
  analysis: "analysing the conditions",
  persistence: "saving the analysis",
};

interface Success {
  ok: true;
  id: string;
  completedAt: string;
  model: string | null;
  location: NormalisedLocation;
  solar: NormalisedSolar;
  weather: NormalisedWeather;
  sources: AnalysisSources;
  unavailable: string[];
  analysis: Analysis;
}

type State =
  | { status: "idle" }
  | { status: "running"; stage: number }
  | { status: "error"; stage: string; message: string }
  | { status: "done"; result: Success };

/** The most recent saved run, rebuilt into the shape the result view renders. */
function fromRow(row: SiteAnalysisRow | null): Success | null {
  if (!row || row.output?.status !== "completed" || !row.output.analysis) return null;
  const n = row.input_summary?.normalised;
  if (!n) return null;
  return {
    ok: true,
    id: row.id,
    completedAt: row.output.completed_at ?? row.created_at,
    model: row.model,
    location: n.location,
    solar: n.solar,
    weather: n.weather,
    sources: row.output.sources ?? n.sources,
    unavailable: row.output.unavailable ?? n.unavailable,
    analysis: row.output.analysis,
  };
}

/** The rule engine's level as the scene's 0-3 scale; unavailable stays unavailable. */
const LEVEL_INDEX: Record<EnvironmentLevel, number | null> = { unavailable: null, low: 0, moderate: 1, high: 2, extreme: 3 };

function atmosphereOf(env: EnvironmentAssessment | undefined): Atmosphere | null {
  if (!env) return null;
  return { dust: LEVEL_INDEX[env.dust.level], heat: LEVEL_INDEX[env.heat.level], wind: LEVEL_INDEX[env.wind.level] };
}

export interface PageHeading { eyebrow: string; title: string; description: string }

export function SiteAnalysis({ latest, heading }: { latest: SiteAnalysisRow | null; heading: PageHeading }) {
  const saved = fromRow(latest);
  // Tablet and up: the scene sits in the hero beside the heading. Phones: it
  // comes after the address form, so the action is never below the picture.
  const wide = useMediaQuery("(min-width: 768px)");
  const [state, setState] = useState<State>(saved ? { status: "done", result: saved } : { status: "idle" });

  /**
   * A location settled on in the Placement Guide, if the person came from
   * there in this tab. It lives in sessionStorage, which the server cannot
   * see, so it is read through a store rather than copied into state after
   * mount: the two renders agree and nothing is set inside an effect.
   */
  const carried = usePlacementLocation();

  /**
   * What the person typed, or null while they have typed nothing. The field
   * falls back to the carried address, so the place they just found is
   * already in it without anything being written into state, and the moment
   * they type, what they typed wins.
   */
  const [typed, setTyped] = useState<string | null>(null);
  const address = typed ?? carried?.address ?? "";

  const running = state.status === "running";
  /** A run completed in this visit, as opposed to one restored from the database. */
  const freshRun = state.status === "done" && saved?.id !== state.result.id;
  /**
   * Which step a failed run stopped at, when the server named a stage this
   * list knows. A failure it cannot place (a rate limit, say) leaves the list
   * out altogether rather than drawing a half-finished run that never ran.
   */
  const failedAt = state.status === "error" ? (FAILED_AT[state.stage] ?? null) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (running || address.trim().length < 3) return;

    setState({ status: "running", stage: 0 });

    try {
      const res = await fetch("/api/analysis/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const body = (await res.json().catch(() => null)) as (Success | { ok: false; stage: string; message: string }) | null;
      if (body && body.ok) {
        setState({ status: "done", result: body });
        // The Solar Profile stopped asking where the roof is; this is where it
        // finds out. The address was already resolved on the server for this
        // run, so nothing new is sent. A failure here is silent on purpose:
        // the analysis succeeded, and a profile write is not what was asked for.
        void saveProfileLocation({
          address: body.location.formattedAddress ?? body.location.address,
          lat: body.location.latitude,
          lng: body.location.longitude,
        });
      }
      else
        setState({
          status: "error",
          // A 429 from the rate limiter carries no stage. Naming a stage we
          // were not told about would be a guess, so it stays unnamed.
          stage: body?.stage ?? "unknown",
          message: body?.message ?? `The analysis could not be completed (HTTP ${res.status}).`,
        });
    } catch {
      setState({ status: "error", stage: "network", message: "Could not reach the analysis service. Check your connection and try again." });
    }
  }

  const shown = state.status === "done" ? state.result : null;
  const atmosphere = atmosphereOf(shown?.analysis.environment);
  const visual = <SiteVisual atmosphere={atmosphere} />;

  return (
    <div className="space-y-5">
      <Stage label="Solar Potential" focus="75% 30%">
        <div className="grid items-center md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative z-10 px-5 py-8 sm:px-8 md:py-12 lg:ps-10">
            <p className="micro wipe">{heading.eyebrow}</p>
            <h1 className="display wipe mt-4 text-[clamp(2.3rem,4.6vw,3.8rem)] text-fg-heading" style={{ animationDelay: "90ms" }}>{heading.title}</h1>
            <p className="wipe mt-4 max-w-md text-[15.5px] leading-relaxed text-fg-secondary" style={{ animationDelay: "180ms" }}>{heading.description}</p>
            {shown && (
              <dl className="rise mt-6 grid gap-2 text-[13px]" style={{ animationDelay: "300ms" }}>
                <HeroFact label="Location" icon={<MapPin className="size-3.5" aria-hidden="true" />}>
                  {shown.location.formattedAddress ?? shown.location.address}
                </HeroFact>
                <HeroFact label="Feasibility">{VERDICT[shown.analysis.feasibility.verdict]}</HeroFact>
                {shown.analysis.environment && (
                  <HeroFact label="Conditions">
                    <Badge tone={STATUS_TONE[shown.analysis.environment.overallStatus]}>{STATUS_LABEL[shown.analysis.environment.overallStatus]}</Badge>
                  </HeroFact>
                )}
              </dl>
            )}
          </div>
          <div className="hidden px-3 pb-3 md:block md:pe-4 md:ps-0 md:pt-4">{wide ? visual : <div className="aspect-[5/4]" />}</div>
        </div>
      </Stage>

      {carried && <CarriedLocationCard location={carried} onDismiss={forgetPlacementLocation} />}

      <Card>
        <CardHeader
          title={
            <>
              <Satellite className="size-4 text-[var(--brand-strong)]" aria-hidden="true" /> Analyse a specific address
            </>
          }
          subtitle="Solink finds the address with Google Maps, reads the conditions there from WeatherAPI, and applies its own analysis rules to what comes back. Every figure below comes from one of those two services, or is named as a Solink rule."
          action={<DataBadge cls="source" compact />}
        />
        <CardBody>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end" aria-busy={running}>
            <Field label="Address" className="flex-1" help="A street address, block and area, or a building name.">
              <Input
                value={address}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="e.g. Block 4, Salmiya, Kuwait"
                autoComplete="street-address"
                maxLength={300}
                required
                minLength={3}
              />
            </Field>
            <Button type="submit" disabled={running || address.trim().length < 3}>
              {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <MapPin className="size-4" aria-hidden="true" />}
              {running ? "Analysing…" : "Analyse this address"}
            </Button>
          </form>

          <p className="mt-2 text-[12.5px] text-fg-muted">
            <Link href="/workflow" className="inline-flex items-center gap-1 font-medium text-data underline underline-offset-2 hover:opacity-80">
              See how this analysis works <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </p>

          {(running || freshRun || failedAt !== null) && <RunProgress complete={freshRun} failedAt={failedAt} />}
        </CardBody>
      </Card>

      {!wide && <div className="md:hidden">{visual}</div>}

      {state.status === "error" && (
        <ErrorState title={`The analysis stopped at ${STAGE_LABEL[state.stage] ?? "an earlier step"}`}>{state.message}</ErrorState>
      )}

      {state.status === "done" && <Result result={state.result} isSaved={saved?.id === state.result.id} />}
    </div>
  );
}

/**
 * The location carried over from the Placement Guide.
 *
 * It states what was resolved and how precisely, in the guide's own words, so
 * the person can see they are still talking about the same place. It is a
 * starting point, not a result: the analysis below still resolves the address
 * itself through Google, and reports what that run found.
 */
function CarriedLocationCard({ location, onDismiss }: { location: CarriedLocation; onDismiss: () => void }) {
  const ns = location.latitude >= 0 ? "N" : "S";
  const ew = location.longitude >= 0 ? "E" : "W";
  const coords = `${Math.abs(location.latitude).toFixed(2)}° ${ns}, ${Math.abs(location.longitude).toFixed(2)}° ${ew}`;

  return (
    <Card>
      <CardHeader
        title={
          <>
            <MapPin className="size-4 text-[var(--brand-strong)]" aria-hidden="true" /> Location
          </>
        }
        subtitle="Carried over from the Placement Guide, in this browser."
        action={
          <button
            type="button"
            onClick={onDismiss}
            className="press inline-flex items-center gap-1 rounded-[var(--radius)] px-2 py-1 text-[12.5px] text-fg-secondary hover:bg-inset hover:text-fg"
          >
            <X className="size-3.5" aria-hidden="true" /> Use a different place
          </button>
        }
      />
      <CardBody>
        <p className="text-[17px] font-semibold leading-snug text-fg">
          {location.address ?? "Your device's location"}
        </p>
        <p className="figure mt-0.5 text-[13.5px] text-fg-secondary">{coords}</p>

        {location.source === "address" ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
            {location.typed && location.typed !== location.address ? <>You entered &ldquo;{location.typed}&rdquo;. </> : null}
            Google Maps resolved it{location.precision ? ` (${location.precision})` : ""}
            {location.approximate
              ? ", which is a nearby street or area rather than the building itself."
              : "."}{" "}
            The address is already in the field below, so you do not have to find it again.
          </p>
        ) : (
          <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
            These coordinates came from your browser, and Solink did not look up an address for them. The analysis
            below works from an address, so enter one for this area to run it.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * What the run has actually done, while it is doing it.
 *
 * A tick here means the step is confirmed. While the request is in flight only
 * the first line is ticked, because sending the address is the only thing the
 * browser has done: the rest happen on the server inside one request, and
 * ticking them on a timer would be a guess dressed up as progress. When a run
 * fails, the server names the stage it stopped at; the steps before it are
 * ticked, that one is marked, and the ones after it stay untouched.
 */
function RunProgress({ failedAt, complete }: { failedAt: number | null; complete: boolean }) {
  const failed = failedAt !== null;
  // Ticked: everything, once the server returned a completed run; everything
  // before the stage it named, when it failed; otherwise only the send.
  const through = complete ? RUN_STEPS.length : failed ? failedAt : 1;
  return (
    <div className="mt-3 rounded-[var(--radius)] border border-border bg-inset p-3" aria-live="polite">
      <ol className="space-y-1.5">
        {RUN_STEPS.map((step, i) => {
          const done = i < through;
          const stopped = failed && i === failedAt;
          return (
            <li key={step.key} className="flex items-center gap-2 text-[13px]">
              {done ? (
                <CheckCircle2 className="size-4 shrink-0 text-good-fg" aria-hidden="true" />
              ) : stopped ? (
                <XCircle className="size-4 shrink-0 text-critical-fg" aria-hidden="true" />
              ) : (
                <Circle className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
              )}
              <span className={done ? "text-fg-secondary" : stopped ? "font-medium text-fg" : "text-fg-muted"}>
                {step.label}
                {stopped ? " — stopped here" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {!failed && !complete && (
        <p className="mt-2.5 flex items-center gap-2 border-t border-border/70 pt-2.5 text-[12px] text-fg-muted">
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
          Running on the server. Each step is ticked when it is confirmed, not before.
        </p>
      )}
    </div>
  );
}

/** One fact from the analysis, repeated in the hero exactly as the result card states it. */
function HeroFact({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3 border-t border-border/70 pt-2">
      <dt className="micro w-24 shrink-0">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 break-words text-fg">{icon}{children}</dd>
    </div>
  );
}

/**
 * The level a factor already has, drawn as four steps. Decorative: the badge
 * beside it names the level in words, so the meter is hidden from assistive
 * technology and an unavailable level draws four empty steps.
 */
function LevelMeter({ level }: { level: EnvironmentLevel }) {
  const n = LEVEL_INDEX[level];
  const tone = LEVEL_TONE[level];
  const fill = tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : tone === "serious" ? "var(--serious)" : tone === "critical" ? "var(--critical)" : "var(--border-strong)";
  return (
    <span aria-hidden="true" className="inline-flex items-end gap-[3px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[5px] rounded-[1px]"
          style={{ height: 6 + i * 3, background: n !== null && i <= n ? fill : "transparent", border: n !== null && i <= n ? "none" : "1px solid var(--border-strong)" }}
        />
      ))}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-border/70 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-fg-muted sm:w-52">{label}</dt>
      <dd className="min-w-0 break-words text-fg sm:text-right">{value}</dd>
    </div>
  );
}

const n = (v: number | null, unit = "", digits = 0) =>
  v === null ? "Unavailable" : `${v.toLocaleString("en-US", { maximumFractionDigits: digits })}${unit}`;

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-[13px] text-fg-muted">None reported.</p>;
  return (
    <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-fg-secondary">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span aria-hidden="true" className="text-fg-muted">
            ·
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const VERDICT: Record<Analysis["feasibility"]["verdict"], string> = {
  promising: "Promising",
  mixed: "Mixed",
  poor: "Poor",
  insufficient_data: "Not enough data",
};

const LEVEL_LABEL: Record<EnvironmentLevel, string> = {
  unavailable: "Unavailable",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  extreme: "Extreme",
};

const LEVEL_TONE: Record<EnvironmentLevel, "neutral" | "good" | "warn" | "serious" | "critical"> = {
  unavailable: "neutral",
  low: "good",
  moderate: "warn",
  high: "serious",
  extreme: "critical",
};

const STATUS_LABEL: Record<EnvironmentAssessment["overallStatus"], string> = {
  unavailable: "Unavailable",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  attention_required: "Attention required",
};

const STATUS_TONE: Record<EnvironmentAssessment["overallStatus"], "neutral" | "good" | "warn" | "serious" | "critical"> = {
  unavailable: "neutral",
  low: "good",
  moderate: "warn",
  high: "serious",
  attention_required: "critical",
};

/**
 * The environmental conditions the rules were applied to: one line per factor,
 * each with the level Solink reached and the sentence explaining how.
 * Rendered only when the stored analysis has it — rows saved before the rule
 * engine existed do not, and are left as they were.
 */
function Environment({ env }: { env: EnvironmentAssessment }) {
  const factors: { label: string; level: EnvironmentLevel; note: string; icon: ReactNode }[] = [
    { label: "Heat exposure", level: env.heat.level, note: env.heat.note, icon: <Thermometer className="size-4" aria-hidden="true" /> },
    { label: "Dust and soiling risk", level: env.dust.level, note: env.dust.note, icon: <Haze className="size-4" aria-hidden="true" /> },
    { label: "Air quality", level: env.airQuality.level, note: env.airQuality.note, icon: <CloudSun className="size-4" aria-hidden="true" /> },
    { label: "Wind exposure", level: env.wind.level, note: env.wind.note, icon: <Wind className="size-4" aria-hidden="true" /> },
  ];

  return (
    <section>
      <h3 className="flex items-center gap-2 text-[14px] font-medium text-fg-heading">
        Environmental conditions <DataBadge cls="calculated" compact />
      </h3>
      <div className="mt-1.5 rounded-[10px] border border-border bg-inset p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="micro">Overall</span>
          <Badge tone={STATUS_TONE[env.overallStatus]}>{STATUS_LABEL[env.overallStatus]}</Badge>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{env.statusReason}</p>
      </div>
      <dl className="mt-2 text-[13px]">
        {factors.map((f) => (
          <div key={f.label} className="-mx-2 flex flex-col gap-1 rounded-[var(--radius)] border-t border-border/70 px-2 py-2.5 transition-colors hover:bg-inset sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <dt className="flex shrink-0 flex-wrap items-center gap-2 text-fg-muted sm:w-60">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[var(--brand-strong)]">{f.icon}</span>
              {f.label} <LevelMeter level={f.level} /> <Badge tone={LEVEL_TONE[f.level]}>{LEVEL_LABEL[f.level]}</Badge>
            </dt>
            <dd className="min-w-0 break-words leading-relaxed text-fg-secondary sm:text-right">{f.note}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-1 border-t border-border/70 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <dt className="flex shrink-0 items-center gap-2 text-fg-muted sm:w-52">
            Forecast{" "}
            <Badge tone={env.forecast.alerts.length > 0 ? "warn" : "neutral"}>
              {env.forecast.alerts.length > 0 ? `${env.forecast.alerts.length} to watch` : `${env.forecast.daysAnalysed} days`}
            </Badge>
          </dt>
          <dd className="min-w-0 break-words leading-relaxed text-fg-secondary sm:text-right">
            {env.forecast.note}
            {env.forecast.alerts.length > 0 && (
              <ul className="mt-1 space-y-1">
                {env.forecast.alerts.map((a) => (
                  <li key={`${a.date}-${a.kind}`}>{a.detail}</li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Result({ result, isSaved }: { result: Success; isSaved: boolean }) {
  const { analysis: a, solar, weather, location, sources } = result;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Analysis"
          subtitle={location.formattedAddress ?? location.address}
          action={<DataBadge cls="calculated" compact />}
        />
        <CardBody className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-4 shadow-[var(--shadow-sm)]">
            <div className="micro">Overall feasibility</div>
            <div className="display mt-1.5 text-[28px] text-fg">{VERDICT[a.feasibility.verdict]}</div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-secondary">{a.feasibility.summary}</p>
          </div>

          {a.environment && <Environment env={a.environment} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="text-[14px] font-medium text-fg-heading">Roof</h3>
              <div className="mt-1.5">
                <List items={a.roofAssessment.findings} />
              </div>
            </section>
            <section>
              <h3 className="text-[14px] font-medium text-fg-heading">Solar potential</h3>
              <div className="mt-1.5">
                <List items={a.solarPotential.findings} />
              </div>
            </section>
            <section>
              <h3 className="text-[14px] font-medium text-fg-heading">Weather considerations</h3>
              <div className="mt-1.5">
                <List items={a.weatherConsiderations.findings} />
              </div>
            </section>
            <section>
              <h3 className="text-[14px] font-medium text-fg-heading">Maintenance considerations</h3>
              <div className="mt-1.5">
                <List items={a.systemConsiderations} />
              </div>
            </section>
          </div>

          <section>
            <h3 className="flex items-center gap-2 text-[14px] font-medium text-fg-heading">
              Annual energy <DataBadge cls={a.energy.annualEnergyDcKwh === null ? "unavailable" : "source"} compact />
            </h3>
            <p className="figure mt-0.5 text-[18px] text-fg">
              {a.energy.annualEnergyDcKwh === null ? "Unavailable" : `${Math.round(a.energy.annualEnergyDcKwh).toLocaleString("en-US")} kWh`}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{a.energy.basis}</p>
          </section>

          <section>
            <h3 className="text-[14px] font-medium text-fg-heading">How this was reached</h3>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-fg-secondary">{a.reasoning}</p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="flex items-center gap-2 text-[14px] font-medium text-fg-heading">
                Taken from the providers <DataBadge cls="source" compact />
              </h3>
              <div className="mt-1.5">
                <List items={a.solarPotential.apiProvidedValues} />
              </div>
            </section>
            <section>
              <h3 className="flex items-center gap-2 text-[14px] font-medium text-fg-heading">
                Worked out by Solink <DataBadge cls="calculated" compact />
              </h3>
              <div className="mt-1.5">
                <List items={a.solarPotential.calculatedValues} />
              </div>
            </section>
          </div>

          <section>
            <h3 className="text-[14px] font-medium text-fg-heading">Limitations</h3>
            <div className="mt-1.5">
              <List items={[...a.limitations, ...a.roofAssessment.limitations]} />
            </div>
            <p className="mt-2 text-[12.5px] text-fg-muted">
              Data completeness: <span className="text-fg-secondary">{a.dataCompleteness.level}</span>
              {a.dataCompleteness.missing.length > 0 ? ` · missing: ${a.dataCompleteness.missing.join(", ")}` : null}
            </p>
          </section>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What the providers returned" subtitle="The measurements the analysis above was built from, before interpretation." action={<DataBadge cls="source" compact />} />
        <CardBody>
          <dl className="text-[13px]">
            <Row label="Requested address" value={location.address} />
            <Row label="Resolved address" value={location.formattedAddress ?? "Unavailable"} />
            <Row label="Coordinates" value={`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`} />
            <Row
              label="Match precision"
              value={
                location.approximate
                  ? `Approximate${location.matchPrecision ? ` (${location.matchPrecision})` : ""} — a nearby street or area, not the exact building`
                  : `Exact building${location.matchPrecision ? ` (${location.matchPrecision})` : ""}`
              }
            />
            <Row label="Roof area" value={n(solar.wholeRoofAreaM2, " m²", 1)} />
            <Row label="Roof segments" value={solar.roofSegments.length > 0 ? String(solar.roofSegments.length) : "Unavailable"} />
            <Row
              label="Pitch / azimuth (largest segment)"
              value={
                solar.roofSegments.length > 0
                  ? `${n(solar.roofSegments[0].pitchDegrees, "°", 1)} / ${n(solar.roofSegments[0].azimuthDegrees, "°", 0)}`
                  : "Unavailable"
              }
            />
            <Row label="Maximum sunshine" value={n(solar.maxSunshineHoursPerYear, " hours/year", 0)} />
            <Row label="Maximum panels modelled" value={n(solar.maxArrayPanelsCount)} />
            <Row label="Modelled annual energy (DC)" value={n(solar.bestConfigYearlyEnergyDcKwh, " kWh", 0)} />
            <Row label="Imagery date" value={solar.imageryDate ? formatDate(solar.imageryDate) : "Unavailable"} />
            <Row label="Condition now" value={weather.condition ?? "Unavailable"} />
            <Row label="Temperature now" value={n(weather.temperatureC, " °C", 1)} />
            <Row label="Cloud cover" value={n(weather.cloudCoverPct, " %", 0)} />
            <Row label="Humidity" value={n(weather.humidityPct, " %", 0)} />
            <Row label="Wind" value={n(weather.windKph, " km/h", 0)} />
            <Row label="PM10 (airborne dust indicator)" value={n(weather.pm10, " µg/m³", 1)} />
            <Row label="PM2.5" value={n(weather.pm2_5, " µg/m³", 1)} />
            <Row label="US EPA air-quality index" value={n(weather.usEpaIndex, "", 0)} />
            <Row label="Forecast days returned" value={weather.forecast.length > 0 ? String(weather.forecast.length) : "Unavailable"} />
          </dl>
          {result.unavailable.length > 0 && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-fg-muted">
              Not returned by any provider: {result.unavailable.join(", ")}. These are left empty rather than estimated.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Sources &amp; References" subtitle="Where each part of this analysis came from." />
        <CardBody>
          <dl className="text-[13px]">
            <SourceRow label="Location" source={sources.geocoding} />
            <SourceRow label="Roof measurements (optional)" source={sources.googleSolar} />
            <SourceRow label="Weather" source={sources.weather} />
            <Row
              label="Analysis"
              value={
                a.environment
                  ? `${a.environment.engine.label} ${a.environment.engine.version}, applied to the data above. No AI model was used.`
                  : result.model
                    ? `Generated by ${result.model} from the data above`
                    : "Generated from the data above"
              }
            />
            <Row
              label="Stored"
              value={`Saved to your Solink account on ${formatDate(result.completedAt)}${isSaved ? ", and restored here from your saved analyses" : ""}. Only you can read it.`}
            />
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-fg-muted">
            The analysis applies Solink&apos;s environmental rules to the provider data. No AI model takes part in it, and
            roof measurements are optional: when they are unavailable the rest of the analysis still runs, and the
            roof rows above read &ldquo;Unavailable&rdquo; rather than zero. It is not a survey and it does not measure this
            building: a roof still has to be inspected before anything is installed.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">
            <Link href="/workflow" className="inline-flex items-center gap-1 font-medium text-data underline underline-offset-2 hover:opacity-80">
              See how this analysis works <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function SourceRow({ label, source }: { label: string; source: AnalysisSources[keyof AnalysisSources] }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-border/70 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-fg-muted sm:w-52">{label}</dt>
      <dd className="min-w-0 break-words text-fg sm:text-right">
        {source.provider}
        {source.url ? (
          <>
            {" · "}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-data underline underline-offset-2 hover:opacity-80"
              aria-label={`${label} source documentation (opens in a new tab)`}
            >
              View source
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          </>
        ) : (
          <span className="text-fg-muted"> · Source unavailable</span>
        )}
      </dd>
    </div>
  );
}
