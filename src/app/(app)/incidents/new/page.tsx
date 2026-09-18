import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { listSystems } from "@/lib/data/repositories";
import { IncidentForm } from "./IncidentForm";

export const metadata: Metadata = { title: "Report incident — Solink", description: "Record a problem with your solar system." };

export default async function NewIncidentPage({ searchParams }: { searchParams: Promise<{ system?: string; panel?: string }> }) {
  const sp = await searchParams;
  const { data: systems, mode } = await listSystems();
  const panel = sp.panel && /^\d+$/.test(sp.panel) ? Number(sp.panel) : null;
  return (
    <div>
      <PageHeader eyebrow="Incidents" title="Report an incident" description="Describe what happened. The record stays on file and can be linked to a maintenance case." actions={<Button href="/incidents" variant="ghost">Back to incidents</Button>} />
      {mode === "demo" && <DemoBanner className="mb-4" detail="Your report is stored on this device only. Images are previewed, not uploaded." />}
      {systems.length === 0 ? (
        <EmptyState title="No system to report against">Incidents belong to an installed system recorded in your Solar Passport.</EmptyState>
      ) : (
        <IncidentForm mode={mode} systems={systems} initialSystemId={sp.system ?? systems[0].id} initialPanel={panel} />
      )}
    </div>
  );
}
