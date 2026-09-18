import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { listManufacturers } from "@/lib/data/repositories";
import { listAllProducts, safe } from "../_lib/data";
import { Table, Th, Td, ModeNotice, VerificationPill } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Manufacturers" };

export default async function ManufacturersPage() {
  const [m, p] = await Promise.all([safe(listManufacturers, []), listAllProducts()]);
  const countBy = new Map<string, number>();
  for (const prod of p.data) if (prod.manufacturer_id) countBy.set(prod.manufacturer_id, (countBy.get(prod.manufacturer_id) ?? 0) + 1);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Manufacturers" description="manufacturers table. New names are created automatically (as Unverified) when a product or CSV import references them." />
      <div className="space-y-4">
        <ModeNotice mode={m.mode} />
        {m.data.every((x) => x.is_demo) && <PlaceholderNote k="REAL_SOLAR_PANEL_DATA_SOURCE" />}
        {m.error ? <ErrorState>{m.error}</ErrorState> : m.data.length === 0 ? <EmptyState title="No manufacturers yet" /> : (
          <Table caption="Manufacturers">
            <thead><tr><Th>Name</Th><Th>Country</Th><Th>Website</Th><Th>Verification</Th><Th>Products</Th><Th>Data</Th></tr></thead>
            <tbody>{m.data.map((x) => (
              <tr key={x.id}><Td className="font-medium text-fg">{x.name}</Td><Td>{x.country ?? "—"}</Td><Td>{x.website ? <a href={x.website} target="_blank" rel="noreferrer" className="underline underline-offset-2">{x.website}</a> : "—"}</Td><Td><VerificationPill status={x.verification_status} /></Td><Td className="tabular">{countBy.get(x.id) ?? 0}</Td><Td>{x.is_demo ? <DataBadge cls="demo" compact /> : "Real"}</Td></tr>
            ))}</tbody>
          </Table>
        )}
      </div>
    </>
  );
}
