"use client";
import { useState } from "react";
import { ExternalLink, Loader2, MapPin, Satellite } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Field, Input } from "@/components/ui/Form";
import { ErrorState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";
import type {
  AnalysisSources,
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
 * comes back. No key, no provider call and no prompt exists in the browser.
 *
 * Stage labels are honest about where a run stopped. The server reports the
 * stage it failed at, and that is the stage named here, rather than a single
 * "something went wrong".
 */

const STAGES = [
  "Finding location…",
  "Analysing roof and solar potential…",
  "Checking weather conditions…",
  "Generating solar analysis…",
  "Saving analysis…",
] as const;

const STAGE_LABEL: Record<string, string> = {
  input: "the address you entered",
  auth: "your session",
  geocoding: "finding the location",
  google_solar: "reading the roof",
  weather: "checking the weather",
  analysis: "generating the analysis",
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

export function SiteAnalysis({ latest }: { latest: SiteAnalysisRow | null }) {
  const saved = fromRow(latest);
  const [address, setAddress] = useState("");
  const [state, setState] = useState<State>(saved ? { status: "done", result: saved } : { status: "idle" });

  const running = state.status === "running";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (running || address.trim().length < 3) return;

    // The stage counter walks forward on a timer because the server does the
    // whole pipeline in one request. It is a progress indication, not a claim
    // about which call is in flight; the real stage only matters on failure,
    // and that comes back from the server.
    setState({ status: "running", stage: 0 });
    const ticks = [1, 2, 3, 4].map((i) =>
      setTimeout(() => setState((s) => (s.status === "running" ? { status: "running", stage: i } : s)), i * 2500),
    );

    try {
      const res = await fetch("/api/analysis/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const body = (await res.json().catch(() => null)) as (Success | { ok: false; stage: string; message: string }) | null;
      if (body && body.ok) setState({ status: "done", result: body });
      else
        setState({
          status: "error",
          stage: body?.stage ?? "analysis",
          message: body?.message ?? `The analysis could not be completed (HTTP ${res.status}).`,
        });
    } catch {
      setState({ status: "error", stage: "analysis", message: "Could not reach the analysis service. Check your connection and try again." });
    } finally {
      ticks.forEach(clearTimeout);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={
            <>
              <Satellite className="size-4 text-[var(--brand-strong)]" aria-hidden="true" /> Analyse a specific address
            </>
          }
          subtitle="Solink reads the roof from Google's Solar API and the current conditions from WeatherAPI, then explains what they mean. Every figure below comes from one of those two, or is named as a calculation."
          action={<DataBadge cls="source" compact />}
        />
        <CardBody>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end" aria-busy={running}>
            <Field label="Address" className="flex-1" help="A street address, block and area, or a building name.">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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

          <p className="mt-2 text-[12px] text-fg-muted" aria-live="polite">
            {running ? STAGES[Math.min((state as { stage: number }).stage, STAGES.length - 1)] : " "}
          </p>
        </CardBody>
      </Card>

      {state.status === "error" && (
        <ErrorState title={`The analysis stopped at ${STAGE_LABEL[state.stage] ?? "an earlier step"}`}>{state.message}</ErrorState>
      )}

      {state.status === "done" && <Result result={state.result} isSaved={saved?.id === state.result.id} />}
    </div>
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

function Result({ result, isSaved }: { result: Success; isSaved: boolean }) {
  const { analysis: a, solar, weather, location, sources } = result;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Analysis"
          subtitle={location.formattedAddress ?? location.address}
          action={<DataBadge cls="ai" compact />}
        />
        <CardBody className="space-y-4">
          <div className="rounded-[10px] border border-border bg-inset p-3">
            <div className="micro">Overall feasibility</div>
            <div className="mt-0.5 text-[16px] font-semibold text-fg">{VERDICT[a.feasibility.verdict]}</div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-fg-secondary">{a.feasibility.summary}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="text-[14px] font-medium text-fg">Roof</h3>
              <div className="mt-1.5">
                <List items={a.roofAssessment.findings} />
              </div>
            </section>
            <section>
              <h3 className="text-[14px] font-medium text-fg">Solar potential</h3>
              <div className="mt-1.5">
                <List items={a.solarPotential.findings} />
              </div>
            </section>
            <section>
              <h3 className="text-[14px] font-medium text-fg">Weather considerations</h3>
              <div className="mt-1.5">
                <List items={a.weatherConsiderations.findings} />
              </div>
            </section>
            <section>
              <h3 className="text-[14px] font-medium text-fg">System considerations</h3>
              <div className="mt-1.5">
                <List items={a.systemConsiderations} />
              </div>
            </section>
          </div>

          <section>
            <h3 className="flex items-center gap-2 text-[14px] font-medium text-fg">
              Annual energy <DataBadge cls={a.energy.annualEnergyDcKwh === null ? "unavailable" : "source"} compact />
            </h3>
            <p className="figure mt-0.5 text-[18px] text-fg">
              {a.energy.annualEnergyDcKwh === null ? "Unavailable" : `${Math.round(a.energy.annualEnergyDcKwh).toLocaleString("en-US")} kWh`}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{a.energy.basis}</p>
          </section>

          <section>
            <h3 className="text-[14px] font-medium text-fg">Reasoning</h3>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-fg-secondary">{a.reasoning}</p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <h3 className="flex items-center gap-2 text-[14px] font-medium text-fg">
                Taken from the providers <DataBadge cls="source" compact />
              </h3>
              <div className="mt-1.5">
                <List items={a.solarPotential.apiProvidedValues} />
              </div>
            </section>
            <section>
              <h3 className="flex items-center gap-2 text-[14px] font-medium text-fg">
                Worked out by Solink <DataBadge cls="calculated" compact />
              </h3>
              <div className="mt-1.5">
                <List items={a.solarPotential.calculatedValues} />
              </div>
            </section>
          </div>

          <section>
            <h3 className="text-[14px] font-medium text-fg">Limitations</h3>
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
            <Row label="Resolved address" value={location.formattedAddress ?? "Unavailable"} />
            <Row label="Coordinates" value={`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`} />
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
            <Row label="Temperature now" value={n(weather.temperatureC, " °C", 1)} />
            <Row label="Cloud cover" value={n(weather.cloudCoverPct, " %", 0)} />
            <Row label="Humidity" value={n(weather.humidityPct, " %", 0)} />
            <Row label="Wind" value={n(weather.windKph, " km/h", 0)} />
            <Row label="PM10 (airborne dust indicator)" value={n(weather.pm10, "", 1)} />
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
            <SourceRow label="Roof and solar data" source={sources.googleSolar} />
            <SourceRow label="Weather" source={sources.weather} />
            <Row label="Analysis" value={result.model ? `Generated by ${result.model} from the data above` : "Generated by the AI Solar Agent"} />
            <Row label="Saved" value={`${formatDate(result.completedAt)}${isSaved ? " (restored from your saved analyses)" : ""}`} />
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-fg-muted">
            The analysis is an interpretation of the provider data, not a survey. A roof still has to be inspected before anything is installed.
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
