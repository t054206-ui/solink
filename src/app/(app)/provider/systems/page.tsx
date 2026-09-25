import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { EmptyState } from "@/components/ui/States";
import { listMaintenance, listSystems } from "@/lib/data/repositories";
import { formatDate } from "@/lib/utils";
import { SYSTEM_STATUS_LABEL } from "@/app/(app)/admin/_components/admin-helpers";
import { getProviderAccess } from "../_lib/access";
import { ProviderIdentity } from "../_components/ProviderBits";

export const metadata: Metadata = {
  title: "Provider systems",
  description: "Solar systems your company installed or is working on, with their open cases.",
};

/**
 * The systems a provider may see are exactly the ones RLS grants: systems it
 * installed and systems with a case assigned to it. In demo mode the same
 * rule is applied here. No owner details: the row shows the system, not the
 * person.
 */
export default async function ProviderSystemsPage() {
  const access = await getProviderAccess();
  const [{ data: systems, mode }, { data: cases }] = await Promise.all([listSystems(), listMaintenance()]);
  const mine = cases.filter((c) => !access.providerId || c.provider_id === access.providerId);
  const caseSystems = new Set(mine.map((c) => c.system_id));
  const visible = systems.filter((s) => mode === "supabase" || s.installer_id === access.providerId || caseSystems.has(s.id));
  const openCases = (id: string) => mine.filter((c) => c.system_id === id && c.status !== "resolved" && c.status !== "closed").length;

  return (
    <div>
      <PageHeader
        eyebrow="Maintenance provider"
        title="Systems"
        description="Every system your company installed or has a case on. Open a case from the queue to see the work record; the homeowner's own pages stay theirs."
      />
      <ProviderIdentity name={access.providerName} mode={mode} isDemoProvider={access.isDemoProvider} className="mb-4" />
      {visible.length === 0 ? (
        <EmptyState title="No systems yet">A system appears here when a homeowner names your company as installer, or when a maintenance case is assigned to you.</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-dense">
            <thead><tr><th scope="col">System</th><th scope="col">Status</th><th scope="col">Capacity</th><th scope="col">Installed</th><th scope="col">Your role</th><th scope="col">Open cases</th></tr></thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-fg">{s.name}{s.is_demo && <DataBadge cls="demo" compact className="ml-2" />}</td>
                  <td><Badge tone={s.status === "installed" ? "good" : "neutral"}>{SYSTEM_STATUS_LABEL[s.status]}</Badge></td>
                  <td className="tabular text-fg-secondary">{s.capacity_kwp != null ? `${s.capacity_kwp} kWp` : "Not set"}{s.panel_count ? ` · ${s.panel_count} panels` : ""}</td>
                  <td className="whitespace-nowrap text-fg-muted">{formatDate(s.installation_date)}</td>
                  <td className="text-fg-secondary">{s.installer_id === access.providerId ? "Installer" : "Maintenance"}</td>
                  <td>{openCases(s.id) > 0 ? <Link href="/provider" className="font-medium text-fg underline-offset-2 hover:underline">{openCases(s.id)} open</Link> : <span className="text-fg-muted">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
