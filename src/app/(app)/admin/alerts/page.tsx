import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { Badge } from "@/components/ui/Badge";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { formatDate } from "@/lib/utils";
import { listAlerts } from "@/lib/data/repositories";
import { safe } from "../_lib/data";
import { Table, Th, Td, ModeNotice } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Alerts" };

export default async function AdminAlertsPage() {
  const a = await safe(() => listAlerts(), []);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Alerts" description="ai_alerts raised by the monitoring interpreter. Each carries its data class and the evidence used." />
      <div className="space-y-4">
        <ModeNotice mode={a.mode} />
        <PlaceholderNote k="PRODUCTION_ALERT_THRESHOLDS" />
        {a.error ? <ErrorState>{a.error}</ErrorState> : a.data.length === 0 ? <EmptyState title="No alerts" /> : (
          <Table caption="Alerts">
            <thead><tr><Th>Created</Th><Th>Status</Th><Th>Title</Th><Th>Message</Th><Th>Evidence</Th><Th>Class</Th><Th>Ack.</Th></tr></thead>
            <tbody>{a.data.map((x) => (
              <tr key={x.id}>
                <Td className="whitespace-nowrap">{formatDate(x.created_at)}</Td>
                <Td><Badge tone={x.status === "maintenance_recommended" ? "critical" : x.status === "inspection_recommended" ? "warn" : "neutral"}>{x.status.replace(/_/g, " ")}</Badge></Td>
                <Td className="text-fg">{x.title}</Td>
                <Td className="max-w-md text-[12.5px]">{x.message}</Td>
                <Td className="text-[12px]">{x.evidence.join("; ") || "Not set"}</Td>
                <Td><DataBadge cls={x.cls} compact /></Td>
                <Td>{x.acknowledged ? "Yes" : "No"}</Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </div>
    </>
  );
}
