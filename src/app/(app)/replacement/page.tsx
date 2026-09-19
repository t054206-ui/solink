import type { Metadata } from "next";
import Link from "next/link";
import { Replace, Store } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { EmptyState } from "@/components/ui/States";
import { getProduct, listIncidents, listMaintenance } from "@/lib/data/repositories";
import { DEMO_BANNER } from "@/lib/demo/data";
import type { MaintenanceCase } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { AskSolink } from "../_operate/components/AskSolink";
import { NoSystemState } from "../_operate/components/NoSystemState";
import { loadOperateContext } from "../_operate/loadSystem";
import { CostCell } from "../_ops/Pills";
import { MAINT_STATUS } from "../_ops/meta";
import { EquipmentTable } from "./_components/EquipmentTable";
import { buildEquipmentRows, unattributedReplacements } from "./_components/equipment";

export const metadata: Metadata = {
  title: "Replacement",
  description: "Equipment age, warranty expiry and replacement history for your solar system, with end-of-life criteria shown as undefined.",
};

const BROWSE = [
  { href: "/marketplace?category=solar_panel", label: "Browse solar panels" },
  { href: "/marketplace?category=inverter", label: "Browse inverters" },
  { href: "/marketplace?category=battery", label: "Browse batteries" },
] as const;

export default async function ReplacementPage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) {
    return (
      <div>
        <PageHeader eyebrow="Operate" title="Equipment &amp; replacement" description="Equipment age, warranty cover and replacement history." />
        <NoSystemState feature="Replacement planning" />
      </div>
    );
  }

  const system = ctx.system;
  const [{ data: cases }, { data: incidents }] = await Promise.all([listMaintenance(system.id), listIncidents(system.id)]);
  const { data: battery } = system.battery_product_id ? await getProduct(system.battery_product_id) : { data: null };

  const rows = buildEquipmentRows({ system, passport: ctx.passport, battery, cases, nowIso: ctx.nowIso });
  const cls = system.is_demo ? "demo" : "source";
  const repairCount = cases.filter((c) => c.kind === "repair" || c.kind === "minor_maintenance").length;
  const replacements = cases.filter((c) => c.kind === "replacement");
  const unattributed = unattributedReplacements(cases, rows);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Equipment &amp; replacement"
        description="What is installed, how old it is, how long it is still under warranty, and what has already been replaced. Solink does not declare anything end-of-life: the criteria for that decision have not been defined."
      />

      {ctx.mode === "demo" && <DemoBanner text={DEMO_BANNER} detail="Demo system, demo equipment and demo maintenance records." />}

      {!ctx.passport && (
        <EmptyState title="No passport issued for this system">
          Equipment details, warranty terms and installation dates come from the Solar Passport snapshot taken at installation. Rows below show only what the system record itself holds.
        </EmptyState>
      )}

      <Card>
        <CardHeader
          title="Installed equipment"
          subtitle="Warranty terms are copied from the frozen passport snapshot; expiry dates are calculated from the installation date."
          action={<DataBadge cls={cls} compact />}
        />
        <CardBody className="space-y-4">
          <EquipmentTable rows={rows} cls={cls} repairCount={repairCount} />
          <p className="text-[12px] leading-relaxed text-fg-muted">
            Repairs are recorded against the system as a whole ({repairCount} repair{repairCount === 1 ? "" : "s"} and {incidents.length} incident{incidents.length === 1 ? "" : "s"} on record), not against an individual component, so the same count is shown on every row. Replacements are attributed to a component only when the record names it.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="When should something be replaced?" subtitle="This is a decision Solink refuses to fake." />
        <CardBody className="space-y-3">
          <p className="text-[13.5px] leading-relaxed text-fg-secondary">
            Solink will not tell you that a component <em>will fail</em> or that it <em>is at end of life</em>. Deciding that requires criteria: a minimum acceptable output, an age limit, a repair-frequency limit or an economic test. And those have not been defined for this platform. What the table above shows is factual: age, warranty cover and the repairs and replacements actually recorded.
          </p>
          <p className="text-[13.5px] leading-relaxed text-fg-secondary">
            Once criteria are defined, each component will be measured against them here, and <strong className="text-fg">inspection or replacement may be worth considering</strong> for any component that meets them. Until then, a warranty that has expired is simply a fact worth knowing, not a recommendation to replace anything.
          </p>
          <PlaceholderNote k="END_OF_LIFE_CRITERIA" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Replacement history (${replacements.length})`} subtitle="Every component replacement recorded against this system, newest first." action={<DataBadge cls={replacements.length === 0 ? "unavailable" : cls} compact />} />
        <CardBody>
          {replacements.length === 0 ? (
            <EmptyState title="No replacement recorded" className="py-8">
              Nothing on this system has been replaced yet, or a replacement happened without being recorded in Solink. Replacements booked through Maintenance appear here automatically.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {[...replacements].sort((a, b) => (b.appointment_at ?? b.created_at).localeCompare(a.appointment_at ?? a.created_at)).map((c) => (
                <ReplacementItem key={c.id} c={c} />
              ))}
            </ul>
          )}
          {unattributed.length > 0 && (
            <p className="mt-3 text-[12px] text-fg-muted">
              {unattributed.length} replacement record{unattributed.length === 1 ? " does" : "s do"} not name a component, so {unattributed.length === 1 ? "it is" : "they are"} not counted against any row above.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Browse replacement equipment" subtitle="The marketplace shows each product's data source and verification status. Prices appear only where a company has published them." />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {BROWSE.map((b) => (
              <Button key={b.href} href={b.href} variant="outline" size="sm"><Store className="size-4" aria-hidden /> {b.label}</Button>
            ))}
          </div>
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            Replacing a component changes your Solar Passport: record the work through <Link href="/maintenance" className="underline underline-offset-2">Maintenance</Link> so the new equipment, its warranty and its installation date are captured in the permanent record.
          </p>
        </CardBody>
      </Card>

      <AskSolink topic="e.g. “What is still under warranty on my system?”" />
    </div>
  );
}

function ReplacementItem({ c }: { c: MaintenanceCase }) {
  const status = MAINT_STATUS[c.status];
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[8px] bg-inset text-fg-secondary"><Replace className="size-4" aria-hidden /></span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
          <Badge tone={status.tone}>{status.label}</Badge>
          {c.is_demo && <DataBadge cls="demo" compact />}
          <span className="ml-auto tabular">{formatDate(c.appointment_at ?? c.created_at)}</span>
        </div>
        <p className="text-[13.5px] text-fg">{c.work_performed ?? c.detected_issue}</p>
        <dl className="grid gap-x-4 gap-y-0.5 text-[12.5px] text-fg-secondary sm:grid-cols-2">
          {c.parts && <div><dt className="inline text-fg-muted">Parts: </dt><dd className="inline">{c.parts}</dd></div>}
          {c.technician_name && <div><dt className="inline text-fg-muted">Technician: </dt><dd className="inline">{c.technician_name}</dd></div>}
          <div><dt className="inline text-fg-muted">Cost: </dt><dd className="inline"><CostCell cost={c.cost} /></dd></div>
        </dl>
      </div>
    </li>
  );
}
