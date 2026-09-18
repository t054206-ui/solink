import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { getMaintenanceCase, listAppointments, listIncidents, listProviders, listSystems } from "@/lib/data/repositories";
import { CaseDetail } from "./CaseDetail";

export const metadata: Metadata = { title: "Maintenance case — Solink", description: "Timeline, appointment, work performed and before/after record for a maintenance case." };

export default async function MaintenanceCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: serverCase, mode }, { data: providers }, { data: systems }, { data: appointments }, { data: incidents }] = await Promise.all([
    getMaintenanceCase(id), listProviders(), listSystems(), listAppointments(), listIncidents(),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Maintenance" title="Maintenance case" description="The complete record of this case. Production figures are calculated from the records available; no cause is inferred." actions={<Button href="/maintenance" variant="ghost">All cases</Button>} />
      <CaseDetail id={id} mode={mode} serverCase={serverCase} providers={providers} systems={systems} appointments={appointments} relatedIncidents={incidents.filter((i) => i.maintenance_case_id === id)} />
    </div>
  );
}
