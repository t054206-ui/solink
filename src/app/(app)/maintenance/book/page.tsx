import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { listProviders, listSystems } from "@/lib/data/repositories";
import type { MaintenanceKind } from "@/lib/types";
import { MAINT_KIND_ORDER } from "../../_ops/meta";
import { BookingWizard } from "./BookingWizard";

export const metadata: Metadata = { title: "Book maintenance — Solink", description: "Describe the problem, choose a provider and request a time slot." };

export default async function BookMaintenancePage({ searchParams }: { searchParams: Promise<{ kind?: string; system?: string }> }) {
  const sp = await searchParams;
  const [{ data: providers, mode }, { data: systems }] = await Promise.all([listProviders(), listSystems()]);
  const initialKind = (MAINT_KIND_ORDER as string[]).includes(sp.kind ?? "") ? (sp.kind as MaintenanceKind) : "inspection";
  return (
    <div>
      <PageHeader eyebrow="Maintenance" title="Book maintenance" description="Four short steps: the problem, a provider, a time window, and a review. A case is opened and the appointment is requested — the provider confirms it." actions={<Button href="/maintenance" variant="ghost">Back to cases</Button>} />
      {mode === "demo" && <DemoBanner className="mb-4" detail="Providers listed are demo companies. Your booking is saved on this device only and no one is contacted." />}
      {systems.length === 0 ? (
        <EmptyState title="No system to book for">Bookings are tied to an installed system recorded in your Solar Passport.</EmptyState>
      ) : (
        <BookingWizard mode={mode} providers={providers} systems={systems} initialKind={initialKind} initialSystemId={sp.system ?? systems[0].id} />
      )}
    </div>
  );
}
