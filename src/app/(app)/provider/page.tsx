import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getProfile, listAppointments, listMaintenance, listProviders, listSystems } from "@/lib/data/repositories";
import { getProviderAccess } from "./_lib/access";
import { CaseQueue } from "./_components/CaseQueue";
import { ProviderIdentity } from "./_components/ProviderBits";

export const metadata: Metadata = {
  title: "Provider case queue",
  description: "Maintenance cases assigned to your company, grouped by urgency, with the system, coarse location and appointment for each job.",
};

export default async function ProviderQueuePage() {
  const access = await getProviderAccess();
  const [{ data: cases, mode }, { data: providers }, { data: systems }, { data: appointments }] = await Promise.all([
    listMaintenance(), listProviders(), listSystems(), listAppointments(),
  ]);
  /** Request time, computed here so client components stay pure. */
  const nowIso = new Date().toISOString();

  /**
   * Coarse location. Only the governorate is ever shown to a provider. In demo
   * mode it comes from the demo homeowner's profile (which records none, so the
   * card says so). In Supabase mode solar_profiles is not readable by a
   * provider, so no location is passed rather than an invented one.
   */
  const demoProfile = mode === "demo" ? (await getProfile()).data : null;
  const governorateBySystem: Record<string, string | null> = {};
  for (const s of systems) governorateBySystem[s.id] = demoProfile && s.user_id === demoProfile.user_id ? demoProfile.governorate ?? null : null;

  return (
    <div>
      <PageHeader
        eyebrow="Maintenance provider"
        title="Case queue"
        description="Jobs waiting on your company, grouped by urgency. Each card carries only what the technician needs to plan the visit: no customer contact details, no assumed prices."
      />
      <ProviderIdentity name={access.providerName} mode={mode} isDemoProvider={access.isDemoProvider} className="mb-4" />
      <CaseQueue
        mode={mode}
        providerId={access.providerId}
        serverCases={cases}
        serverAppointments={appointments}
        providers={providers}
        systems={systems}
        governorateBySystem={governorateBySystem}
        nowIso={nowIso}
      />
    </div>
  );
}
