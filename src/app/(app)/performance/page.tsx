import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { type Classified, unavailable } from "@/lib/classification";
import { listIncidents, listMaintenance, listProduction } from "@/lib/data/repositories";
import { DEMO_BANNER } from "@/lib/demo/data";
import { AskSolink } from "../_operate/components/AskSolink";
import { NoSystemState } from "../_operate/components/NoSystemState";
import { loadOperateContext } from "../_operate/loadSystem";
import { inheritCls, productionCls, specificYield } from "../_operate/production";
import { ageYears } from "../_ops/production";
import { PerformanceView } from "./_components/PerformanceView";
import { buildYearRows, perYearFromRecords, recordedTotal, REPAIR_KINDS, sumRecordedCosts, UPKEEP_KINDS } from "./_components/rows";

export const metadata: Metadata = {
  title: "Long-term performance — Solink",
  description: "Year-by-year production, degradation comparison and total cost of ownership for your solar system.",
};

export default async function PerformancePage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) {
    return (
      <div>
        <PageHeader eyebrow="Operate" title="Long-term performance" description="How the system has performed over the years, and what it has cost to own." />
        <NoSystemState feature="Long-term performance" />
      </div>
    );
  }

  const system = ctx.system;
  const [{ data: production }, { data: cases }, { data: incidents }] = await Promise.all([
    listProduction(system.id, 3650),
    listMaintenance(system.id),
    listIncidents(system.id),
  ]);

  const cls = productionCls(production);
  const capacityKwp = system.capacity_kwp ?? ctx.passport?.capacity_kwp ?? null;
  const rows = buildYearRows(production, incidents, cases, capacityKwp);

  const totalRecorded: Classified = production.length === 0
    ? unavailable("No production records are available for this system.")
    : inheritCls({ value: Math.round(production.reduce((s, r) => s + r.energy_kwh, 0)), cls: "calculated", source: "Solink calculator", notes: [`Sum of ${production.length} daily records`] }, cls);

  const trailingYield = specificYield(production, capacityKwp);

  const age = ageYears(system.installation_date ?? ctx.passport?.installation_date ?? null, new Date(ctx.nowIso));
  const upkeep = cases.filter((c) => UPKEEP_KINDS.includes(c.kind));
  const cleaning = cases.filter((c) => c.kind === "cleaning");
  const repairs = [...cases.filter((c) => REPAIR_KINDS.includes(c.kind)), ...incidents];

  const prefills = {
    maintenance: perYearFromRecords("maintenance visits", sumRecordedCosts(upkeep), age),
    cleaning: perYearFromRecords("cleaning visits", sumRecordedCosts(cleaning), age),
    repairs: recordedTotal("repairs and replacements", sumRecordedCosts(repairs)),
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operate"
        title="Long-term performance"
        description="Year-by-year output, how it compares with an expected degradation curve, and what the system costs to own. Figures that depend on a rate, a tariff or a price Solink has not been given stay unavailable."
      />
      {ctx.mode === "demo" && <DemoBanner className="mb-4" text={DEMO_BANNER} detail="Demo system and simulated production. Values you type are kept on this device only." />}

      <PerformanceView
        rows={rows}
        cls={cls}
        settings={ctx.settings}
        capacityKwp={capacityKwp}
        systemName={system.name}
        currency={ctx.profile?.currency ?? "KWD"}
        prefills={prefills}
        trailingYield={trailingYield}
        totalRecorded={totalRecorded}
        installationDate={system.installation_date ?? ctx.passport?.installation_date ?? null}
      />

      <AskSolink className="mt-6" topic="e.g. “Is my system producing less than it did last year?”" />
    </div>
  );
}
