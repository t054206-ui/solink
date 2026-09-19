import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { listAppointments, listMaintenance, listSystems } from "@/lib/data/repositories";
import { getProviderAccess } from "../_lib/access";
import { ProviderIdentity } from "../_components/ProviderBits";
import { AppointmentsList } from "../_components/AppointmentsList";

export const metadata: Metadata = {
  title: "Provider appointments",
  description: "Upcoming and past appointments booked with your company, each linked to its maintenance case.",
};

export default async function ProviderAppointmentsPage() {
  const access = await getProviderAccess();
  const [{ data: appointments, mode }, { data: cases }, { data: systems }] = await Promise.all([
    listAppointments(), listMaintenance(), listSystems(),
  ]);
  /** Request time from the server: the client never reads the clock while rendering. */
  const nowIso = new Date().toISOString();

  return (
    <div>
      <PageHeader
        eyebrow="Maintenance provider"
        title="Appointments"
        description="Every visit booked with your company, split into what is still ahead and what has already passed."
      />
      <ProviderIdentity name={access.providerName} mode={mode} isDemoProvider={access.isDemoProvider} className="mb-4" />
      <AppointmentsList mode={mode} serverAppointments={appointments} serverCases={cases} systems={systems} nowIso={nowIso} />
    </div>
  );
}
