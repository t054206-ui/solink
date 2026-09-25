import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { Badge } from "@/components/ui/Badge";
import { Placeholder } from "@/components/ui/Placeholder";
import { formatDate, specText } from "@/lib/utils";
import { listIncidents } from "@/lib/data/repositories";
import { safe } from "../_lib/data";
import { Table, Th, Td, ModeNotice } from "../_components/AdminBits";
import { INCIDENT_STATUS_LABEL } from "../_components/admin-helpers";

export const metadata: Metadata = { title: "Admin · Incidents" };

export default async function AdminIncidentsPage() {
  const inc = await safe(() => listIncidents(), []);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Incidents" description="incidents table: reported problems, AI analysis (labeled), action taken and result. Read-only overview." />
      <div className="space-y-4">
        <ModeNotice mode={inc.mode} />
        {inc.error ? <ErrorState>{inc.error}</ErrorState> : inc.data.length === 0 ? <EmptyState title="No incidents" /> : (
          <Table caption="Incidents">
            <thead><tr><Th>Occurred</Th><Th>Status</Th><Th>Panel</Th><Th>Reported problem</Th><Th>AI analysis</Th><Th>Action / result</Th><Th>Images</Th><Th>Cost</Th></tr></thead>
            <tbody>{inc.data.map((i) => (
              <tr key={i.id}>
                <Td className="whitespace-nowrap">{formatDate(i.occurred_at)}{i.is_demo && <DataBadge cls="demo" compact className="ml-1" />}</Td>
                <Td><Badge tone={i.status === "open" ? "critical" : i.status === "investigating" ? "warn" : "neutral"}>{INCIDENT_STATUS_LABEL[i.status]}</Badge></Td>
                <Td className="tabular">{i.panel_index ?? "Not set"}</Td>
                <Td className="max-w-xs">{i.reported_problem}</Td>
                <Td className="max-w-xs">{i.ai_analysis ? <><DataBadge cls={i.is_demo ? "demo" : "ai"} compact /> <span className="text-[12.5px]">{i.ai_analysis}</span></> : "Not set"}</Td>
                <Td className="max-w-xs">{i.action_taken ?? "Not set"}{i.result && <div className="text-[12px] text-fg-muted">{i.result}</div>}</Td>
                <Td className="tabular">{i.images.length}</Td>
                <Td>{i.cost.value === null ? <Placeholder k="MAINTENANCE_PRICE" /> : specText(i.cost)}</Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </div>
    </>
  );
}
