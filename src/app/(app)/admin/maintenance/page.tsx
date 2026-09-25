import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { Placeholder } from "@/components/ui/Placeholder";
import { DataBadge } from "@/components/ui/DataBadge";
import { formatDate, specText } from "@/lib/utils";
import { listMaintenance, listProviders } from "@/lib/data/repositories";
import { safe } from "../_lib/data";
import { Table, Th, Td, ModeNotice } from "../_components/AdminBits";
import { MAINTENANCE_STATUS_LABEL } from "../_components/admin-helpers";

export const metadata: Metadata = { title: "Admin · Maintenance Requests" };

export default async function AdminMaintenancePage() {
  const [cases, providers] = await Promise.all([safe(() => listMaintenance(), []), safe(listProviders, [])]);
  const provName = new Map(providers.data.map((p) => [p.id, p.name]));
  return (
    <>
      <PageHeader eyebrow="Admin" title="Maintenance Requests" description="maintenance_cases across all systems (admin has read-only access under RLS). Costs are only shown when a provider recorded them." />
      <div className="space-y-4">
        <ModeNotice mode={cases.mode} />
        {cases.error ? <ErrorState>{cases.error}</ErrorState> : cases.data.length === 0 ? <EmptyState title="No maintenance cases" /> : (
          <Table caption="Maintenance cases">
            <thead><tr><Th>Created</Th><Th>Kind</Th><Th>Urgency</Th><Th>Status</Th><Th>Provider</Th><Th>Issue</Th><Th>Appointment</Th><Th>Cost</Th></tr></thead>
            <tbody>{cases.data.map((c) => (
              <tr key={c.id}>
                <Td className="whitespace-nowrap">{formatDate(c.created_at)}{c.is_demo && <DataBadge cls="demo" compact className="ml-1" />}</Td>
                <Td>{c.kind.replace(/_/g, " ")}</Td>
                <Td><Badge tone={c.urgency === "urgent" ? "critical" : c.urgency === "inspection" ? "warn" : "neutral"}>{c.urgency}</Badge></Td>
                <Td>{MAINTENANCE_STATUS_LABEL[c.status]}</Td>
                <Td>{c.provider_id ? provName.get(c.provider_id) ?? c.provider_id : "Unassigned"}</Td>
                <Td className="max-w-xs">{c.detected_issue}</Td>
                <Td className="whitespace-nowrap">{c.appointment_at ? formatDate(c.appointment_at, { dateStyle: "medium", timeStyle: "short" }) : "Not set"}</Td>
                <Td>{c.cost.value === null ? <Placeholder k="MAINTENANCE_PRICE" /> : specText(c.cost)}</Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </div>
    </>
  );
}
