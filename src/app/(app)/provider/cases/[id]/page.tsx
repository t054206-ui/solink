import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { getMaintenanceCase, getProfile, listAppointments, listIncidents, listProviders, listSystems } from "@/lib/data/repositories";
import { getProviderAccess } from "../../_lib/access";
import { ProviderCaseDetail } from "./ProviderCaseDetail";

export const metadata: Metadata = {
  title: "Provider case and work record",
  description: "The case as the provider sees it, with the work record form: technician, work performed, parts, cost, before/after photos and status.",
};

export default async function ProviderCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getProviderAccess();
  const [{ data: serverCase, mode }, { data: systems }, { data: providers }, { data: incidents }, { data: appointments }] = await Promise.all([
    getMaintenanceCase(id), listSystems(), listProviders(), listIncidents(), listAppointments(),
  ]);
  // Supabase mode: RLS already restricted the read to this company, so a missing
  // row means the case does not exist or is not ours. Demo mode may still hold
  // the case in this browser's local store, so the client resolves it there.
  if (!serverCase && mode === "supabase") notFound();

  /** Request time, computed here so the client component renders purely. */
  const nowIso = new Date().toISOString();
  const demoProfile = mode === "demo" ? (await getProfile()).data : null;
  const system = systems.find((s) => s.id === serverCase?.system_id) ?? null;
  const governorate = demoProfile && system && system.user_id === demoProfile.user_id ? demoProfile.governorate ?? null : null;

  return (
    <div>
      <PageHeader
        eyebrow="Maintenance provider"
        title="Case & work record"
        description="What was detected, what you did, and what it cost. Costs stay unavailable until you enter one: Solink never assumes a figure."
        actions={<Button href="/provider" variant="ghost">Back to queue</Button>}
      />
      <ProviderCaseDetail
        id={id}
        mode={mode}
        providerId={access.providerId}
        providerName={access.providerName}
        serverCase={serverCase}
        systems={systems}
        providers={providers}
        appointments={appointments}
        relatedIncidents={incidents.filter((i) => i.maintenance_case_id === id)}
        governorate={governorate}
        nowIso={nowIso}
      />
    </div>
  );
}
