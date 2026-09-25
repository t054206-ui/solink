import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { formatDate } from "@/lib/utils";
import { getPassport, listSystems } from "@/lib/data/repositories";
import { safe } from "../_lib/data";
import { Table, Th, Td, ModeNotice } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Solar Passports" };

export default async function AdminPassportsPage() {
  const systems = await safe(listSystems, []);
  const passports = (await Promise.all(systems.data.map((s) => safe(() => getPassport(s.id), null)))).map((r, i) => ({ passport: r.data, system: systems.data[i] })).filter((x) => x.passport);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Solar Passports" description="solar_passports: one permanent record per installed system, frozen to the product version and the manufacturer version in force at installation. The database refuses any later change to a snapshot." />
      <div className="space-y-4">
        <ModeNotice mode={systems.mode} />
        {systems.error ? <ErrorState>{systems.error}</ErrorState> : passports.length === 0 ? <EmptyState title="No passports issued yet">A passport is created when a system reaches Installed.</EmptyState> : (
          <Table caption="Passports">
            <thead><tr><Th>Passport no.</Th><Th>System</Th><Th>Panel snapshot</Th><Th>Inverter snapshot</Th><Th>Panels / capacity</Th><Th>Installer</Th><Th>Installed</Th><Th>Warranty</Th></tr></thead>
            <tbody>{passports.map(({ passport: p, system: s }) => (
              <tr key={p!.id}>
                <Td className="font-mono text-[12px] text-fg">{p!.passport_number}{p!.is_demo && <DataBadge cls="demo" compact className="ml-1" />}</Td>
                <Td>{s.name}</Td>
                <Td>{p!.panel_snapshot ? `${p!.panel_snapshot.manufacturer} ${p!.panel_snapshot.model}` : "Not set"}{p!.panel_snapshot?.version_id && <div className="font-mono text-[11px] text-fg-muted">spec {p!.panel_snapshot.version_id}</div>}{p!.panel_snapshot?.manufacturer_version_id && <div className="font-mono text-[11px] text-fg-muted">mfr {p!.panel_snapshot.manufacturer_version_id}</div>}</Td>
                <Td>{p!.inverter_snapshot ? `${p!.inverter_snapshot.manufacturer} ${p!.inverter_snapshot.model}` : "Not set"}</Td>
                <Td className="tabular">{p!.panel_count ?? "Not set"} / {p!.capacity_kwp !== null ? `${p!.capacity_kwp} kWp` : "Not set"}</Td>
                <Td>{p!.installation_company ?? "Not set"}</Td>
                <Td className="whitespace-nowrap">{formatDate(p!.installation_date)}</Td>
                <Td className="text-[12px]">product {p!.warranty.product_years ?? "Not set"} y · performance {p!.warranty.performance_years ?? "Not set"} y · installer {p!.warranty.installer_years ?? "Not set"} y</Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </div>
    </>
  );
}
