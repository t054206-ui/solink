import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { listIncidents, listMaintenance, listSystems } from "@/lib/data/repositories";
import { IncidentList } from "./_components/IncidentList";

export const metadata: Metadata = { title: "Incidents", description: "The permanent incident log of your solar system." };

export default async function IncidentsPage() {
  const [{ data: incidents, mode }, { data: systems }, { data: cases }] = await Promise.all([listIncidents(), listSystems(), listMaintenance()]);
  return (
    <div>
      <PageHeader eyebrow="Operate" title="Incidents" description="A permanent log of every problem reported on your system. What happened, what was done, and how it ended. Records are never deleted, only closed."
        actions={<Button href="/incidents/new"><Plus className="size-4" aria-hidden /> Report incident</Button>} />
      {mode === "demo" && <DemoBanner className="mb-4" detail="Demo incidents are shown. Incidents you report are stored on this device only." />}
      <IncidentList mode={mode} serverIncidents={incidents} systems={systems} cases={cases} />
    </div>
  );
}
