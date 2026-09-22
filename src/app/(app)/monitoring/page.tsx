import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { UnavailableState } from "@/components/ui/States";
import { InfoTip } from "@/components/help/InfoTip";
import { listProduction } from "@/lib/data/repositories";
import { AskSolink } from "../_operate/components/AskSolink";
import { NoSystemState } from "../_operate/components/NoSystemState";
import { ProductionCharts } from "../_operate/components/ProductionCharts";
import { SignalsCard } from "../_operate/components/SignalsCard";
import { buildProductionChartData } from "../_operate/chartData";
import { loadOperateContext, profileLocation } from "../_operate/loadSystem";
import { AiMonitorPanel } from "./_components/AiMonitorPanel";

export const metadata = { title: "Monitoring" };

export default async function MonitoringOverviewPage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) return <NoSystemState feature="Monitoring" />;
  const { data: production } = await listProduction(ctx.system.id, 400);
  const chart = buildProductionChartData(production);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={<>Production <InfoTip term="energy_production" /></>} subtitle={`${ctx.system.name} · daily records aggregated by Solink.`} />
        <CardBody><ProductionCharts data={chart} /></CardBody>
      </Card>

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
