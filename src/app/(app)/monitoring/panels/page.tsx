import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
          subtitle={count !== null ? `${count} panels recorded for ${ctx.system.name}.` : "Your array, from your Solar Passport."}
        />
        <CardBody className="space-y-4">
          {count !== null ? (
            <>
              <PanelGrid
                count={count}
                panelLabel={ctx.passport?.panel_snapshot ? `${ctx.passport.panel_snapshot.manufacturer} ${ctx.passport.panel_snapshot.model}` : null}
                capacityKwp={ctx.passport?.capacity_kwp ?? ctx.system.capacity_kwp}
              />
            </>
          ) : (
            <UnavailableState title="Your array is drawn here">
              Add the number of panels to your system record, or complete the Solar Passport, and the
              array layout will be drawn here.
            </UnavailableState>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What per-panel readings add" subtitle="With optimizers or micro-inverters on each panel, this page shows:" />
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-2">
            {WOULD_SHOW.map((f) => (
              <li key={f.title} className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
                <h3 className="text-[13.5px] font-semibold text-fg-heading">{f.title}</h3>
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
            Solink only shows per-panel numbers that a device has measured. Estimating them would
            make a faulty panel look healthy, or a healthy one look faulty.
          </p>
          <p>
            With a string inverter, whole-system signals on the Overview page and a photo check on
            the Inspection page cover the array.
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
