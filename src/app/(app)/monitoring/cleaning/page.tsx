import { SprayCan, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Metric } from "@/components/ui/Metric";
import { Placeholder } from "@/components/ui/Placeholder";
import { InfoTip } from "@/components/help/InfoTip";
import { classified, unavailable, type Classified } from "@/lib/classification";
import { listMaintenance, listProduction } from "@/lib/data/repositories";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import { formatDate } from "@/lib/utils";
import { AskSolink } from "../../_operate/components/AskSolink";
import { NoSystemState } from "../../_operate/components/NoSystemState";
import { StatusPill } from "../../_operate/components/StatusPill";
import { AirQuality, WeatherFallback } from "../../_operate/components/WeatherSummary";
import { loadOperateContext } from "../../_operate/loadSystem";
import { loadWeatherForProfile } from "../../_operate/loadWeather";
import { cleaningEffectiveness, deriveStatus, lastCleaning, sevenVsThirty } from "../../_operate/production";

export const metadata = { title: "Cleaning · Monitoring · Solink" };

export default async function CleaningPage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) return <NoSystemState feature="Cleaning status" />;
  const [{ data: production }, { data: maintenance }, weather] = await Promise.all([listProduction(ctx.system.id, 400), listMaintenance(ctx.system.id), loadWeatherForProfile(ctx.profile, 1)]);

  const signal = sevenVsThirty(production);
  const derived = deriveStatus(signal, ctx.settings, production);
  const last = lastCleaning(maintenance);
  const lastDate = last?.appointment_at ?? last?.updated_at ?? null;
  const daysSince: Classified = lastDate
    ? classified(Math.floor((new Date(ctx.nowIso).getTime() - new Date(lastDate).getTime()) / 86400000), last?.is_demo ? "demo" : "calculated", "Maintenance records", [`Today − ${formatDate(lastDate)}`])
    : unavailable("No completed cleaning visit is on record.");
  const effect = cleaningEffectiveness(last);

  const headline = derived.status === "insufficient_data"
    ? (derived.thresholdsDefined ? "Additional data is required." : derived.headline)
    : derived.status === "normal" ? "No cleaning indicated by the production trend."
    : derived.status === "monitor" ? "Performance decline detected. Continue monitoring; cleaning may be recommended if it persists."
    : "Performance decline detected. Cleaning may be recommended; an inspection may be useful first.";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={<><SprayCan className="size-4 text-[var(--brand-strong)]" aria-hidden /> Cleaning status</>} subtitle="Combines the production trend, your cleaning history and environmental indicators. It suggests; it does not diagnose." action={<StatusPill status={derived.status} />} />
        <CardBody className="space-y-4">
          {derived.cls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} />}
          <p className="text-[16px] font-semibold leading-snug text-fg">{headline}</p>
          <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-fg-secondary">
            {derived.lines.map((l) => <li key={l}>{l}</li>)}
            {lastDate ? <li>Last completed cleaning: {formatDate(lastDate)}.</li> : <li>No completed cleaning visit is on record, so the interval since the last cleaning is unknown.</li>}
            {weather.status !== "ok" && <li>Environmental indicators are unavailable, so airborne dust could not be considered.</li>}
          </ul>
          {!derived.thresholdsDefined && <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg-muted">Decision thresholds: <Placeholder k="PRODUCTION_ALERT_THRESHOLDS" /></div>}
          <div className="flex flex-wrap gap-2">
            <Button href="/maintenance/book?kind=cleaning"><CalendarPlus className="size-4" aria-hidden /> Book cleaning</Button>
            <Button href="/monitoring/inspection" variant="outline">Screen a photo first</Button>
          </div>
        </CardBody>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Inputs">
        <Metric label="Production trend (7d vs 30d)" term="energy_production" data={signal.deviation} format={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`} footnote="Calculated from daily records" />
        <Metric label="Days since last cleaning" data={daysSince} unit="days" format={(v) => String(v)} footnote={lastDate ? `Visit on ${formatDate(lastDate)}` : undefined} />
        <Metric label="Previous cleaning effect" data={effect} format={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%`} footnote={last?.production_before_kwh != null && last?.production_after_kwh != null ? `${last.production_before_kwh} → ${last.production_after_kwh} kWh/day` : undefined} />
        <Metric label="System capacity" term="kwp" data={ctx.system.capacity_kwp != null ? classified(ctx.system.capacity_kwp, ctx.system.is_demo ? "demo" : "source", "System record") : unavailable("Not recorded.")} unit="kWp" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Details">
        <Card>
          <CardHeader title={<>Environmental indicators <InfoTip term="soiling" /></>} subtitle="Airborne particulates at your location right now." />
          <CardBody className="space-y-3">
            {weather.status === "ok" ? <AirQuality state={weather} /> : <WeatherFallback state={weather} compact />}
            <div className="rounded-[var(--radius-md)] border border-dashed border-border-strong bg-inset p-3 text-[12.5px] leading-relaxed text-fg-secondary">
              <p className="font-medium text-fg">Rule Solink follows</p>
              <p className="mt-1">PM2.5 and PM10 describe the air, not the panel surface. High readings can make soiling more likely over time, but Solink never treats them as evidence that panels <em>are</em> dirty, and never states that cleaning is required because of them. A production decline plus dusty conditions means &quot;cleaning may be recommended&quot;, and an inspection or photo screening is the way to confirm.</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Previous cleaning effectiveness" subtitle="Before/after daily production from the last completed cleaning record." action={last ? <DataBadge cls={effect.cls} compact /> : undefined} />
          <CardBody className="space-y-3">
            {!last ? <p className="text-[13px] text-fg-muted">No completed cleaning on record.</p> : (
              <>
                <dl className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-[var(--radius-md)] border border-border bg-inset p-3"><dt className="text-fg-muted">Before</dt><dd className="tabular mt-1 text-lg font-semibold text-fg">{last.production_before_kwh ?? "—"} <span className="text-[12px] font-medium text-fg-muted">kWh/day</span></dd></div>
                  <div className="rounded-[var(--radius-md)] border border-border bg-inset p-3"><dt className="text-fg-muted">After</dt><dd className="tabular mt-1 text-lg font-semibold text-fg">{last.production_after_kwh ?? "—"} <span className="text-[12px] font-medium text-fg-muted">kWh/day</span></dd></div>
                </dl>
                <p className="text-[13px] text-fg-secondary">{last.work_performed ?? last.detected_issue} · {formatDate(lastDate)}{last.technician_name ? ` · ${last.technician_name}` : ""}</p>
                {effect.value !== null ? (
                  <p className="text-[13px] text-fg-secondary">Change: <span className="tabular font-medium text-fg">{effect.value >= 0 ? "+" : ""}{(effect.value * 100).toFixed(0)}%</span>. {effect.notes?.slice(-1)[0]}</p>
                ) : <p className="text-[13px] text-fg-muted">{effect.reason}</p>}
                <p className="text-[12px] text-fg-muted">Weather and season also changed between the two readings, so this figure is indicative and not attributable to cleaning alone.</p>
              </>
            )}
          </CardBody>
        </Card>
      </section>

      <AskSolink topic="e.g. “Should I book a cleaning now or wait?”" />
    </div>
  );
}
