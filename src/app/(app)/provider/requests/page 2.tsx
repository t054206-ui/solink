import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { EmptyState } from "@/components/ui/States";
import { listMaintenance, listSystems } from "@/lib/data/repositories";
import { formatDate, specText } from "@/lib/utils";
import { MAINTENANCE_STATUS_LABEL } from "@/app/(app)/admin/_components/admin-helpers";
import { getProviderAccess } from "../_lib/access";
import { ProviderIdentity } from "../_components/ProviderBits";

export const metadata: Metadata = {
  title: "Provider requests",
  description: "Maintenance requests addressed to your company that have not been scheduled yet.",
};

/**
 * Requests are the front of the case queue: cases assigned to this company
 * that are still New or Reviewing. The same rows as the queue, filtered, so
 * nothing here can disagree with it. In Supabase mode RLS already limits the
 * rows to this provider; the filter below matters in demo mode.
 */
export default async function ProviderRequestsPage() {
  const access = await getProviderAccess();
  const [{ data: cases, mode }, { data: systems }] = await Promise.all([listMaintenance(), listSystems()]);
  const systemName = new Map(systems.map((s) => [s.id, s.name]));
  const open = cases
    .filter((c) => (!access.providerId || c.provider_id === access.providerId) && (c.status === "new" || c.status === "reviewing"))
    .sort((a, b) => (a.urgency === "urgent" ? -1 : 1) - (b.urgency === "urgent" ? -1 : 1) || b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <PageHeader
        eyebrow="Maintenance provider"
        title="Requests"
        description="Cases sent to your company that are still waiting for a decision or a visit date. Once you schedule one it moves to the case queue and Appointments."
      />
      <ProviderIdentity name={access.providerName} mode={mode} isDemoProvider={access.isDemoProvider} className="mb-4" />
      {open.length === 0 ? (
        <EmptyState title="No open requests">New maintenance requests from homeowners appear here until you schedule them. Everything already scheduled is in the case queue.</EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-dense">
            <thead><tr><th scope="col">Received</th><th scope="col">System</th><th scope="col">Issue</th><th scope="col">Kind</th><th scope="col">Urgency</th><th scope="col">Status</th><th scope="col">Cost</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {open.map((c) => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap text-fg-muted">{formatDate(c.created_at)}</td>
                  <td className="font-medium text-fg">{systemName.get(c.system_id) ?? "System"}{c.is_demo && <DataBadge cls="demo" compact className="ml-2" />}</td>
                  <td className="max-w-[28ch] truncate text-fg-secondary" title={c.detected_issue}>{c.detected_issue}</td>
                  <td className="capitalize text-fg-secondary">{c.kind.replace(/_/g, " ")}</td>
                  <td><Badge tone={c.urgency === "urgent" ? "critical" : c.urgency === "inspection" ? "warn" : "neutral"}>{c.urgency}</Badge></td>
                  <td><Badge tone="warn">{MAINTENANCE_STATUS_LABEL[c.status]}</Badge></td>
                  <td className="text-fg-secondary">{specText(c.cost)}</td>
                  <td><Link href={`/provider/cases/${c.id}`} className="font-medium text-fg underline-offset-2 hover:underline">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-[12.5px] text-fg-muted">You see the system, the governorate and the issue, never the homeowner&apos;s address, email or phone.</p>
    </div>
  );
}
