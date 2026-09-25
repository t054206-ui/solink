import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { Badge } from "@/components/ui/Badge";
import { Placeholder } from "@/components/ui/Placeholder";
import { listProviders } from "@/lib/data/repositories";
import { safe } from "../_lib/data";
import { Table, Th, Td, ModeNotice, VerificationPill } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Solar Companies & Providers" };

const KIND_LABEL: Record<string, string> = { solar_company: "Solar company", installer: "Installer", maintenance: "Maintenance", cleaning: "Cleaning" };

export default async function ProvidersPage() {
  const p = await safe(listProviders, []);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Solar Companies & Providers" description="provider_companies table: solar companies, installers, maintenance and cleaning providers. Prices are entered by providers themselves (provider_prices)." />
      <div className="space-y-4">
        <ModeNotice mode={p.mode} />
        {p.error ? <ErrorState>{p.error}</ErrorState> : p.data.length === 0 ? <EmptyState title="No provider companies yet" /> : (
          <Table caption="Provider companies">
            <thead><tr><Th>Company</Th><Th>Kinds</Th><Th>Service area</Th><Th>Contact</Th><Th>Verification</Th><Th>Prices</Th><Th>Data</Th></tr></thead>
            <tbody>{p.data.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium text-fg">{c.name}</Td>
                <Td><div className="flex flex-wrap gap-1">{c.kind.map((k) => <Badge key={k}>{KIND_LABEL[k] ?? k}</Badge>)}</div></Td>
                <Td>{c.service_area ?? "Not set"}</Td>
                <Td>{c.contact_email ?? c.phone ?? "Not set"}</Td>
                <Td><VerificationPill status={c.verification_status} /></Td>
                <Td>{c.is_demo ? <Placeholder k="MAINTENANCE_PRICE" /> : <span className="text-fg-muted">See provider_prices</span>}</Td>
                <Td>{c.is_demo ? <DataBadge cls="demo" compact /> : "Real"}</Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
        <p className="text-[12.5px] text-fg-muted">Verification of a company is an admin decision recorded on the company row; it is separate from product verification.</p>
      </div>
    </>
  );
}
