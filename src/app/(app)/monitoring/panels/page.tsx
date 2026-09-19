import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataBadge } from "@/components/ui/DataBadge";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { UnavailableState } from "@/components/ui/States";
import { InfoTip } from "@/components/help/InfoTip";
import { NoSystemState } from "../../_operate/components/NoSystemState";
import { loadOperateContext } from "../../_operate/loadSystem";
import { PanelGrid } from "../_components/PanelGrid";

export const metadata = { title: "Panel-by-panel" };

/** What panel-level hardware would unlock, listed honestly as not-yet-available. */
const WOULD_SHOW = [
  { title: "Production per panel", text: "Energy from each individual panel over the day, week or month." },
  { title: "Panel status", text: "Normal, underperforming or fault, per panel, instead of one figure for the whole array." },
  { title: "Panel comparison", text: "Each panel against the array average, so an outlier is obvious." },
  { title: "Underperformer detection", text: "Panels that stay consistently below their neighbours, which can indicate shading, soiling or a fault." },
];

export default async function PanelsPage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) return <NoSystemState feature="Panel-by-panel monitoring" />;

  const count = ctx.system.panel_count ?? ctx.passport?.panel_count ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={<>Your array <InfoTip term="string" /></>}
          subtitle={count !== null ? `${count} panels recorded for ${ctx.system.name}.` : "The number of panels is not recorded for this system."}
          action={<DataBadge cls="unavailable" compact />}
        />
        <CardBody className="space-y-4">
          {count !== null ? (
            <>
              <PanelGrid count={count} />
              <p className="text-[13px] leading-relaxed text-fg-muted">
                Every panel is drawn in the unknown state. Solink knows how many panels you have from
                your system record, but nothing reports how each one is performing.
              </p>
            </>
          ) : (
            <UnavailableState title="Panel count unknown">
              Add the number of panels to your system record, or complete the Solar Passport, and the
              array layout will be drawn here.
            </UnavailableState>
          )}
          <PlaceholderNote k="PANEL_LEVEL_MONITORING_DATA_SOURCE" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What appears once panel-level data is connected" subtitle="Nothing below is estimated or simulated. It simply needs a data source." />
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-2">
            {WOULD_SHOW.map((f) => (
              <li key={f.title} className="rounded-[var(--radius-md)] border border-dashed border-border-strong bg-inset p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[13.5px] font-semibold text-fg">{f.title}</h3>
                  <DataBadge cls="unavailable" compact />
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{f.text}</p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Why this needs hardware" />
        <CardBody className="space-y-3 text-[13.5px] leading-relaxed text-fg-secondary">
          <p>
            A standard string inverter reports one total for the whole array, so per-panel figures
            cannot be derived from it. Panel-level readings come from power optimisers or
            micro-inverters fitted to each panel, or from a monitoring platform that exposes them.
          </p>
          <p>
            Until such a source is connected, Solink will not display per-panel numbers. Inventing
            them would make a faulty panel look healthy, or a healthy one look faulty.
          </p>
          <p>
            In the meantime, whole-system signals on the Overview page and a photo screening on the
            Inspection page are the honest alternatives.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button href="/monitoring" size="sm" variant="outline">System signals</Button>
            <Button href="/monitoring/inspection" size="sm" variant="outline">Photo inspection</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
