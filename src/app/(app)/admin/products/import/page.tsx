import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { Tabs } from "@/components/ui/Tabs";
import { UnavailableState, EmptyState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { getDataMode } from "@/lib/data/mode";
import { listProductImports } from "../../_lib/data";
import { CsvImport } from "../../_components/CsvImport";
import { Table, Th, Td, ModeNotice } from "../../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Product Imports" };

function PendingDecision({ method }: { method: string }) {
  return <UnavailableState title={`${method} import: pending decision`}>The import method has not been decided ([PLACEHOLDER: SOLAR PANEL DATA IMPORT METHOD]). This tab is reserved so the workflow can be added without changing the product schema; the CSV path already exercises product_imports and product_import_rows.</UnavailableState>;
}

export default async function ImportPage() {
  const mode = getDataMode();
  const imports = await listProductImports();
  return (
    <>
      <PageHeader eyebrow="Admin" title="Product Imports" description="Load real solar-panel data into the catalog. Every imported record starts Unverified with its validation flags visible." />
      <div className="space-y-4">
        <ModeNotice mode={mode} />
        <div className="grid gap-3 md:grid-cols-2">
          <PlaceholderNote k="SOLAR_PANEL_DATA_IMPORT_METHOD" />
          <PlaceholderNote k="REAL_SOLAR_PANEL_DATA_SOURCE" />
        </div>
        <Tabs tabs={[
          { id: "csv", label: "CSV", content: <CsvImport mode={mode} /> },
          { id: "excel", label: "Excel", content: <PendingDecision method="Excel" /> },
          { id: "api", label: "API", content: <PendingDecision method="API" /> },
          { id: "bulk", label: "Bulk", content: <PendingDecision method="Bulk upload" /> },
          { id: "manual", label: "Manual", content: (
            <div className="space-y-3">
              <p className="text-[13.5px] text-fg-secondary">Enter one product at a time with a SpecValue editor per field, source tracking and an explicit verification step.</p>
              <Button href="/admin/products/new">Open manual entry form</Button>
            </div>
          ) },
        ]} />

        <section aria-labelledby="hist-h" className="space-y-2">
          <h2 id="hist-h" className="text-[15px] font-semibold">Import history (product_imports)</h2>
          {mode === "demo" ? <UnavailableState title="Import history requires Supabase">Applied imports are recorded in product_imports once a database is connected. In demo mode, CSV imports stay in this browser.</UnavailableState>
            : imports.error ? <ErrorState>{imports.error}</ErrorState>
            : imports.data.length === 0 ? <EmptyState title="No imports yet" />
            : (
              <Table caption="Product imports">
                <thead><tr><Th>Date</Th><Th>Method</Th><Th>File</Th><Th>Status</Th><Th>Summary</Th></tr></thead>
                <tbody>{imports.data.map((i) => (
                  <tr key={i.id}><Td className="whitespace-nowrap">{formatDate(i.created_at)}</Td><Td>{i.method}</Td><Td className="font-mono text-[12px]">{i.file_path ?? "—"}</Td><Td>{i.status}</Td>
                    <Td className="font-mono text-[11.5px]">{["inserted", "flagged", "duplicates", "rejected"].map((k) => `${k}: ${String((i.summary as Record<string, unknown>)[k] ?? "—")}`).join(" · ")}</Td></tr>
                ))}</tbody>
              </Table>
            )}
        </section>
      </div>
    </>
  );
}
