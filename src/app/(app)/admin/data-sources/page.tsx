import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, UnavailableState } from "@/components/ui/States";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { formatDate } from "@/lib/utils";
import { listDataSources, listAllProducts } from "../_lib/data";
import { Table, Th, Td } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Data Sources" };

export default async function DataSourcesPage() {
  const [ds, products] = await Promise.all([listDataSources(), listAllProducts()]);
  const usage = new Map<string, number>();
  for (const p of products.data) usage.set(p.source.data_source, (usage.get(p.source.data_source) ?? 0) + 1);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Data Sources" description="data_sources table (datasheet, manufacturer site, participating company, external DB, licensed API, CSV, Excel, manual) and the source strings currently attached to products." />
      <div className="space-y-5">
        <PlaceholderNote k="REAL_SOLAR_PANEL_DATA_SOURCE" />
        {ds.mode === "demo" ? <UnavailableState title="Registered data sources require Supabase">CSV imports register a data_sources row automatically once a database is connected.</UnavailableState>
          : ds.error ? <ErrorState>{ds.error}</ErrorState> : ds.data.length === 0 ? <EmptyState title="No data sources registered yet" /> : (
          <Table caption="Data sources">
            <thead><tr><Th>Name</Th><Th>Kind</Th><Th>URL</Th><Th>Notes</Th><Th>Created</Th></tr></thead>
            <tbody>{ds.data.map((d) => <tr key={d.id}><Td className="font-medium text-fg">{d.name}</Td><Td>{d.kind}</Td><Td>{d.url ? <a href={d.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">{d.url}</a> : "Not set"}</Td><Td>{d.notes ?? "Not set"}</Td><Td className="whitespace-nowrap">{formatDate(d.created_at)}</Td></tr>)}</tbody>
          </Table>
        )}
        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">Sources referenced by products</h2>
          {usage.size === 0 ? <EmptyState title="No products" /> : (
            <Table caption="Source usage">
              <thead><tr><Th>source.data_source</Th><Th>Products</Th></tr></thead>
              <tbody>{[...usage.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => <tr key={name}><Td className="text-fg">{name}</Td><Td className="tabular">{n}</Td></tr>)}</tbody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
