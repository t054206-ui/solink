import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { Placeholder } from "@/components/ui/Placeholder";
import { formatDate } from "@/lib/utils";
import { listProviders, listSystems } from "@/lib/data/repositories";
import { listAllProducts, safe } from "../_lib/data";
import { Table, Th, Td, ModeNotice } from "../_components/AdminBits";
import { SYSTEM_STATUS_LABEL } from "../_components/admin-helpers";

export const metadata: Metadata = { title: "Admin · Solar Systems" };

export default async function AdminSystemsPage() {
  const [systems, products, providers] = await Promise.all([safe(listSystems, []), listAllProducts(), safe(listProviders, [])]);
  const prod = new Map(products.data.map((p) => [p.id, p]));
  const prov = new Map(providers.data.map((p) => [p.id, p.name]));
  return (
    <>
      <PageHeader eyebrow="Admin" title="Solar Systems" description="solar_systems table. Owner identity is not shown; the admin role sees system-level facts only." />
      <div className="space-y-4">
        <ModeNotice mode={systems.mode} />
        {systems.error ? <ErrorState>{systems.error}</ErrorState> : systems.data.length === 0 ? <EmptyState title="No systems yet" /> : (
          <Table caption="Solar systems">
            <thead><tr><Th>System</Th><Th>Status</Th><Th>Capacity</Th><Th>Panels</Th><Th>Panel product</Th><Th>Installer</Th><Th>Installed</Th><Th>Monitoring</Th></tr></thead>
            <tbody>{systems.data.map((s) => { const p = s.panel_product_id ? prod.get(s.panel_product_id) : undefined; return (
              <tr key={s.id}>
                <Td><div className="font-medium text-fg">{s.name}</div>{s.is_demo && <DataBadge cls="demo" compact />}</Td>
                <Td>{SYSTEM_STATUS_LABEL[s.status]}</Td>
                <Td className="tabular">{s.capacity_kwp !== null ? `${s.capacity_kwp} kWp` : "—"}</Td>
                <Td className="tabular">{s.panel_count ?? "—"}</Td>
                <Td>{p ? `${p.manufacturer_name} ${p.model}` : "—"}{s.panel_version_id && <div className="font-mono text-[11px] text-fg-muted">v: {s.panel_version_id}</div>}</Td>
                <Td>{s.installer_id ? prov.get(s.installer_id) ?? s.installer_id : "—"}</Td>
                <Td className="whitespace-nowrap">{formatDate(s.installation_date)}</Td>
                <Td>{s.monitoring_source ?? <Placeholder k="SOLAR_MONITORING_HARDWARE_API" />}</Td>
              </tr>
            ); })}</tbody>
          </Table>
        )}
      </div>
    </>
  );
}
