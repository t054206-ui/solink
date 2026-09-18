import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { listIncidents, listMaintenance, listSystems } from "@/lib/data/repositories";
import { IncidentDetail } from "./IncidentDetail";

export const metadata: Metadata = { title: "Incident — Solink", description: "Full record of a reported incident." };

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: incidents, mode }, { data: systems }, { data: cases }] = await Promise.all([listIncidents(), listSystems(), listMaintenance()]);
  const serverIncident = incidents.find((i) => i.id === id) ?? null;
  return (
    <div>
      <PageHeader eyebrow="Incidents" title="Incident record" description="Everything recorded about this incident, from the report to the final status." actions={<Button href="/incidents" variant="ghost">All incidents</Button>} />
      <IncidentDetail id={id} mode={mode} serverIncident={serverIncident} systems={systems} cases={cases} />
    </div>
  );
}
