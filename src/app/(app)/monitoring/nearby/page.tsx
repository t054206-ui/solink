import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { Metric } from "@/components/ui/Metric";
import { InfoTip } from "@/components/help/InfoTip";
import { listProduction } from "@/lib/data/repositories";
import { unavailable } from "@/lib/classification";
import { NoSystemState } from "../../_operate/components/NoSystemState";
import { loadOperateContext } from "../../_operate/loadSystem";
import { productionCls, specificYield } from "../../_operate/production";

export const metadata = { title: "Nearby comparison · Solink" };

/** The three explanations a neighbourhood comparison can distinguish between. */
const ANSWERS = [
  { label: "Area-wide", text: "Nearby systems dropped too, so something affected the whole area — dust, cloud, or a grid event." },
  { label: "Weather-related", text: "The drop matches the weather over the period and nearby systems moved the same way." },
  { label: "System-specific", text: "Nearby systems held steady while yours fell. That points at your own installation and is worth inspecting." },
];

export default async function NearbyPage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) return <NoSystemState feature="Nearby comparison" />;
  const { data: production } = await listProduction(ctx.system.id, 400);
  const cls = productionCls(production);
  const yieldC = specificYield(production, ctx.system.capacity_kwp);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={<>Your system against the area <InfoTip term="specific_yield" /></>}
          subtitle="Specific yield (kWh per kWp per year) is the fair way to compare systems of different sizes."
        />
        <CardBody className="space-y-4">
          {cls === "demo" && <DemoBanner text="SIMULATED PRODUCTION — NOT REAL" detail="Your side of this comparison is built from the demo series." />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Your specific yield"
              term="specific_yield"
              data={yieldC}
              unit="kWh/kWp"
              format={(v) => Math.round(v).toLocaleString("en-US")}
            />
            <Metric
              label="Area average"
              term="specific_yield"
              data={unavailable("No anonymised area data is available. [PLACEHOLDER: ANONYMIZED NEARBY SYSTEM DATA]")}
              unit="kWh/kWp"
            />
          </div>
          <p className="text-[13px] leading-relaxed text-fg-muted">
            The comparison column stays empty rather than showing a plausible-looking figure. A number
            here would change how you read your own performance, so it has to come from real systems.
          </p>
          <PlaceholderNote k="ANONYMIZED_NEARBY_SYSTEM_DATA" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What this comparison is for" subtitle="It separates three very different explanations for a drop in output." />
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-3">
            {ANSWERS.map((a) => (
              <li key={a.label} className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
                <h3 className="text-[13.5px] font-semibold text-fg">{a.label}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{a.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-fg-secondary">
            Without it, a quiet week is ambiguous: you cannot tell a dusty month across Kuwait from a
            problem on your own roof. That is why the page exists even before the data does.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Privacy rules this has to meet first" action={<DataBadge cls="unavailable" compact />} />
        <CardBody>
          <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-fg-secondary">
            <li>
              <strong className="text-fg">Aggregates only.</strong> You would see an average across a
              group of systems, never another household&rsquo;s reading.
            </li>
            <li>
              <strong className="text-fg">A minimum group size.</strong> Below a threshold of
              contributing systems, no figure is published, because a small group can identify a home.
            </li>
            <li>
              <strong className="text-fg">Coarse areas.</strong> Comparison is by a broad area such as a
              governorate, never by street or exact coordinates.
            </li>
            <li>
              <strong className="text-fg">No identities, ever.</strong> No names, addresses, system ids
              or anything that could be traced back to a specific installation.
            </li>
            <li>
              <strong className="text-fg">A decision on participation.</strong> Whether contributing is
              opt-in, and what a household gets for it, has not been decided.
            </li>
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
            The database already reserves an aggregates table that stores only an area code, a period,
            a system count and an average yield. It holds no per-household rows by design.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
