import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { listIncidents, listMaintenance, listProduction, listReports, listSystems } from "@/lib/data/repositories";
import { getPlatformSettings, settingsToAssumptions } from "@/lib/data/settings";
import { monthsCovered } from "../_ops/production";
import { ReportsIndex } from "./_components/ReportsIndex";

export const metadata: Metadata = { title: "Monthly reports", description: "Monthly energy, financial, maintenance and environmental reports for your solar system." };

const HEADING = {
  eyebrow: "Operate",
  title: "Monthly reports",
  description: "One report per month: energy produced, what it may have saved, maintenance activity and environmental impact. Any figure that needs an input Solink does not have is shown as unavailable.",
};

export default async function ReportsPage() {
  const [{ data: reports, mode }, { data: systems }, { data: cases }, { data: incidents }, settings] = await Promise.all([
    listReports(), listSystems(), listMaintenance(), listIncidents(), getPlatformSettings(),
  ]);
  const system = systems[0] ?? null;
  const { data: production } = system ? await listProduction(system.id, 400) : { data: [] };
  const assumptions = settingsToAssumptions(settings);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const months = monthsCovered(production).filter((m) => m !== currentMonth); // only complete months can be reported

  return (
    <div>
      {system ? (
        <ReportsIndex
          heading={HEADING}
          demoNotice={mode === "demo" ? <DemoBanner className="mb-4" detail="Demo reports built on a simulated production series. Reports you generate are kept on this device." /> : null}
          mode={mode} serverReports={reports} systems={systems} production={production} cases={cases} incidents={incidents} assumptions={assumptions} months={months}
        />
      ) : (
        <>
          <PageHero label="Monthly reports" {...HEADING} />
          {mode === "demo" && <DemoBanner className="mb-4" detail="Demo reports built on a simulated production series. Reports you generate are kept on this device." />}
          <EmptyState title="No system to report on">Monthly reports are produced for an installed system recorded in your Solar Passport.</EmptyState>
        </>
      )}
    </div>
  );
}
