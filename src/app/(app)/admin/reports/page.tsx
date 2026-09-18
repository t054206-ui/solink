import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { formatDate } from "@/lib/utils";
import { listReports } from "@/lib/data/repositories";
import { safe } from "../_lib/data";
import { Table, Th, Td, ModeNotice } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Reports" };

export default async function AdminReportsPage() {
  const r = await safe(() => listReports(), []);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Reports" description="Monthly reports generated per system. Financial and environmental sections stay unavailable until the tariff and emission factor are provided." />
      <div className="space-y-4">
        <ModeNotice mode={r.mode} />
        {r.error ? <ErrorState>{r.error}</ErrorState> : r.data.length === 0 ? <EmptyState title="No reports generated yet" /> : (
          <Table caption="Reports">
            <thead><tr><Th>Month</Th><Th>System</Th><Th>Energy</Th><Th>Financial</Th><Th>Environmental</Th><Th>Maintenance</Th><Th>AI</Th><Th>Generated</Th></tr></thead>
            <tbody>{r.data.map((x) => (
              <tr key={x.id}>
                <Td className="font-mono text-fg">{x.month}</Td>
                <Td className="font-mono text-[11.5px]">{x.system_id}</Td>
                <Td><DataBadge cls={x.energy.cls} compact /> <span className="tabular">{x.energy.total_kwh !== null ? `${x.energy.total_kwh} kWh` : "—"}</span></Td>
                <Td><DataBadge cls={x.financial.cls} compact /> {x.financial.notes.length > 0 && <div className="text-[11.5px] text-fg-muted">{x.financial.notes.join(" · ")}</div>}</Td>
                <Td><DataBadge cls={x.environmental.cls} compact /> {x.environmental.notes.length > 0 && <div className="text-[11.5px] text-fg-muted">{x.environmental.notes.join(" · ")}</div>}</Td>
                <Td className="text-[12px]">{x.maintenance.incidents} inc · {x.maintenance.cleanings} clean · {x.maintenance.repairs} rep · {x.maintenance.replacements} repl</Td>
                <Td><DataBadge cls={x.ai.cls} compact /></Td>
                <Td className="whitespace-nowrap">{formatDate(x.generated_at)}</Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </div>
    </>
  );
}
