import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, UnavailableState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";
import { listProductDocuments, listAllProducts } from "../_lib/data";
import { Table, Th, Td } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Datasheets" };

export default async function DatasheetsPage() {
  const [docs, products] = await Promise.all([listProductDocuments(), listAllProducts()]);
  const byId = new Map(products.data.map((p) => [p.id, p]));
  const linked = products.data.filter((p) => p.source.datasheet_url);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Datasheets & documents" description="product_documents table (datasheet, manual, warranty, certificate, image) stored in the private product-documents bucket, plus datasheet URLs recorded on products." />
      <div className="space-y-5">
        {docs.mode === "demo" ? (
          <UnavailableState title="Document upload requires Supabase">The product-documents storage bucket and the product_documents table only exist once a Supabase project is connected ([PLACEHOLDER: SUPABASE PROJECT]). Demo products have no uploaded files.</UnavailableState>
        ) : docs.error ? <ErrorState>{docs.error}</ErrorState> : docs.data.length === 0 ? (
          <EmptyState title="No documents uploaded yet">Upload UI is intentionally minimal until the datasheet source is decided; documents can be attached via the product-documents bucket by an admin.</EmptyState>
        ) : (
          <Table caption="Product documents">
            <thead><tr><Th>Product</Th><Th>Kind</Th><Th>Title</Th><Th>Location</Th><Th>Added</Th></tr></thead>
            <tbody>{docs.data.map((d) => { const p = byId.get(d.product_id); return (
              <tr key={d.id}><Td className="text-fg">{p ? `${p.manufacturer_name} ${p.model}` : d.product_id}</Td><Td>{d.kind}</Td><Td>{d.title ?? "Not set"}</Td><Td className="font-mono text-[11.5px]">{d.storage_path ?? d.url ?? "Not set"}</Td><Td className="whitespace-nowrap">{formatDate(d.created_at)}</Td></tr>
            ); })}</tbody>
          </Table>
        )}
        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold">Datasheet links on products</h2>
          {linked.length === 0 ? <EmptyState title="No product has a datasheet URL yet">Add one in the product form under “Images & source tracking”. Verification should reference it.</EmptyState> : (
            <Table caption="Datasheet URLs">
              <thead><tr><Th>Product</Th><Th>Datasheet URL</Th><Th>Verification</Th></tr></thead>
              <tbody>{linked.map((p) => <tr key={p.id}><Td className="text-fg">{p.manufacturer_name} {p.model}</Td><Td><a href={p.source.datasheet_url!} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2">{p.source.datasheet_url}</a></Td><Td>{p.source.verification_status}</Td></tr>)}</tbody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
