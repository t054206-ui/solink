import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { UnavailableState } from "@/components/ui/States";
import { InfoTip } from "@/components/help/InfoTip";
import { getProduct, listProduction } from "@/lib/data/repositories";
import { specNum } from "@/lib/utils";
import { AskSolink } from "../_operate/components/AskSolink";
import { NoSystemState } from "../_operate/components/NoSystemState";
import { ProductionCharts } from "../_operate/components/ProductionCharts";
import { SignalsCard } from "../_operate/components/SignalsCard";
import { buildProductionChartData } from "../_operate/chartData";
import { loadOperateContext, profileLocation } from "../_operate/loadSystem";
import { AiMonitorPanel } from "./_components/AiMonitorPanel";
import Link from "next/link";
import { Stage } from "@/components/layout/Stage";
import { DataBadge } from "@/components/ui/DataBadge";
import { LiveArrayVisual } from "@/components/three/PageVisuals";
import type { Classified } from "@/lib/classification";
import { formatNumber } from "@/lib/solar/calculations";
import { deriveStatus, monthToDateKwh, sevenVsThirty, todayKwh } from "../_operate/production";
import { StatusPill } from "../_operate/components/StatusPill";
import { HEALTH_STYLE, HealthMark, healthOf } from "./_components/health";
import { DemoPanelLayout } from "./_components/DemoPanelLayout";

export const metadata = { title: "Monitoring" };

export default async function MonitoringOverviewPage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) return <NoSystemState feature="Monitoring" />;
  const [{ data: production }, panelProduct] = await Promise.all([
    listProduction(ctx.system.id, 400),
    ctx.system.panel_product_id ? getProduct(ctx.system.panel_product_id).then((r) => r.data).catch(() => null) : Promise.resolve(null),
  ]);
  const chart = buildProductionChartData(production);
  // The live view reads only what the page already computes elsewhere: the
  // system status (the same derivation as Signals) and today / this month
  // (the same functions as the Home Overview).
  const derived = deriveStatus(sevenVsThirty(production), ctx.settings, production);
  const health = healthOf(derived.status);
  const today = todayKwh(production);
  const month = monthToDateKwh(production);

  return (
    <div className="space-y-6">
      <Stage label="Live system view" focus="30% 45%">
        <div className="grid items-center md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="order-2 px-3 pb-3 sm:px-5 md:order-1 md:py-5">
            {ctx.system.panel_count !== null ? (
              <LiveArrayVisual
                count={ctx.system.panel_count}
                producing={today.value !== null}
                health={health}
                caption={<>Your {ctx.system.panel_count} panels as recorded. Only the inverter lamp shows a state: the system status beside it. Per-panel state is unknown until panel-level monitoring is connected.{today.value !== null ? " The cable pulse shows that today has a production record." : ""}</>}
              />
            ) : (
              <p className="p-6 text-center text-[13px] text-fg-muted">The number of panels is not recorded for this system, so the array is not drawn.</p>
            )}
          </div>
          <div className="order-1 space-y-5 px-5 pb-2 pt-6 sm:px-7 md:order-2 md:py-8 md:pe-8">
            <div>
              <h2 className="micro" style={{ color: "var(--brand)" }}>Live system view</h2>
              <p className="mt-1 text-[13px] text-fg-muted">{ctx.system.name}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-4 shadow-[var(--shadow-sm)]">
              <div className="flex flex-wrap items-center gap-2">
                <HealthMark health={health} />
                <StatusPill status={derived.status} />
                <DataBadge cls={derived.cls} compact />
              </div>
              <p className={`mt-2 text-[15px] font-semibold leading-snug ${health === "unknown" ? "text-fg" : HEALTH_STYLE[health].fg}`}>{derived.headline}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <LiveFigure label="Today" data={today} />
              <LiveFigure label="This month" data={month} />
            </dl>
            <p className="flex items-start gap-2 text-[12.5px] leading-snug text-fg-muted">
              <HealthMark health="unknown" size="sm" className="mt-px" />
              <span>Per-panel state: unknown. No panel-level data source is connected. <Link href="/monitoring/panels" className="underline underline-offset-2 hover:text-fg">Why</Link></span>
            </p>
          </div>
        </div>
      </Stage>

      <Card>
        <CardHeader title={<>Production <InfoTip term="energy_production" /></>} subtitle={`${ctx.system.name} · daily records aggregated by Solink.`} />
        <CardBody><ProductionCharts data={chart} /></CardBody>
      </Card>

      {ctx.system.panel_count !== null && (
        <Card>
          <CardHeader title="Panel layout" subtitle="What per-panel monitoring will look like once hardware reports it." />
          <CardBody>
            <DemoPanelLayout
              count={ctx.system.panel_count}
              panelLabel={panelProduct ? `${panelProduct.manufacturer_name} ${panelProduct.model}` : null}
              ratedW={panelProduct ? specNum(panelProduct.specs.rated_power_w) : null}
            />
          </CardBody>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-5" aria-label="Assessment">
        <div className="lg:col-span-3"><AiMonitorPanel systemId={ctx.system.id} location={profileLocation(ctx.profile)} /></div>
        <SignalsCard records={production} settings={ctx.settings} className="lg:col-span-2" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Live data">
        <Card>
          <CardHeader title={<>Live monitoring <InfoTip term="live_monitoring" /></>} subtitle="Real-time power, inverter status and per-string data." />
          <CardBody className="space-y-3">
            <UnavailableState title="Live monitoring is not connected yet">{ctx.system.monitoring_source ? `Source: ${ctx.system.monitoring_source}` : "This system has no monitoring source. Once inverter or meter data is connected, live readings replace this notice."}</UnavailableState>
            <PlaceholderNote k="SOLAR_MONITORING_HARDWARE_API" />
          </CardBody>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader title="How to read this page" />
            <CardBody>
              <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-fg-secondary">
                <li><strong className="text-fg">Charts</strong> aggregate the daily records Solink holds. A DEMO banner means the series is simulated.</li>
                <li><strong className="text-fg">Signals</strong> is plain arithmetic. It can describe a decline but cannot judge it until alert thresholds are defined.</li>
                <li><strong className="text-fg">AI Energy Monitoring</strong> runs only when you ask, reads your real records, and labels its output as interpretation.</li>
              </ul>
            </CardBody>
          </Card>
          <AskSolink topic="e.g. “Is the drop in the last week unusual?”" />
        </div>
      </section>
    </div>
  );
}

/** A production figure from the page's records, with its class; missing stays missing. */
function LiveFigure({ label, data }: { label: string; data: Classified }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-3">
      <dt className="micro flex items-center justify-between gap-2">{label}<DataBadge cls={data.cls} compact /></dt>
      <dd className="mt-1">
        {data.value !== null ? (
          <span className="figure text-[24px] font-medium text-[color:var(--sun-ink)]">{formatNumber(data.value, 1)}<span className="ms-1 text-[12px] text-fg-muted">kWh</span></span>
        ) : (
          <span className="text-[13px] font-medium text-fg-secondary">Unavailable</span>
        )}
      </dd>
    </div>
  );
}
