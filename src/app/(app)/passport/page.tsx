import Link from "next/link";
import { FileBadge, ArrowRight, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { InfoTip } from "@/components/help/InfoTip";
import { getPassport, listSystems } from "@/lib/data/repositories";
import { DEMO_BANNER } from "@/lib/demo/data";
import { formatDate } from "@/lib/utils";
import { NoSystemState } from "../_operate/components/NoSystemState";

export const metadata = { title: "Solar Passport" };

export default async function PassportListPage() {
  const { data: systems, mode } = await listSystems();
  const rows = await Promise.all(systems.map(async (s) => ({ system: s, passport: (await getPassport(s.id)).data })));
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operate" title={<>Solar System Digital Passport <InfoTip term="passport" /></>}
        description="A permanent record of each installed system: equipment as installed, installer, warranties and the complete maintenance, repair and incident history." />
      {mode === "demo" && <DemoBanner text={DEMO_BANNER} />}
      {rows.length === 0 ? <NoSystemState feature="The Solar Passport" /> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map(({ system, passport }) => (
            <li key={system.id}>
              <Link href={`/passport/${system.id}`} className="group flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-elevated p-5 shadow-sm hover:bg-inset">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-[var(--brand-strong)]"><FileBadge className="size-5" aria-hidden /></span>
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-semibold text-fg">{system.name}</h2>
                      <p className="font-mono text-[12px] text-fg-muted">{passport?.passport_number ?? "No passport issued yet"}</p>
                    </div>
                  </div>
                  <DataBadge cls={system.is_demo ? "demo" : "source"} compact />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                  <dt className="text-fg-muted">Status</dt><dd><Badge tone={system.status === "installed" ? "good" : "neutral"}>{system.status.replace("_", " ")}</Badge></dd>
                  <dt className="text-fg-muted">Capacity</dt><dd className="tabular text-fg">{system.capacity_kwp != null ? `${system.capacity_kwp} kWp` : "—"}{system.panel_count ? ` · ${system.panel_count} panels` : ""}</dd>
                  <dt className="text-fg-muted">Installed</dt><dd className="text-fg">{formatDate(passport?.installation_date ?? system.installation_date)}</dd>
                  <dt className="text-fg-muted">Installer</dt><dd className="truncate text-fg">{passport?.installation_company ?? "—"}</dd>
                  <dt className="text-fg-muted">Panel</dt><dd className="truncate text-fg">{passport?.panel_snapshot ? `${passport.panel_snapshot.manufacturer} ${passport.panel_snapshot.model}` : "—"}</dd>
                  <dt className="text-fg-muted">Warranty</dt><dd className="text-fg">{passport ? `${passport.warranty.product_years ?? "—"} y product · ${passport.warranty.performance_years ?? "—"} y performance` : "—"}</dd>
                </dl>
                <div className="mt-auto flex items-center justify-between text-[13px] font-medium text-fg-secondary">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-fg-muted" aria-hidden /> {passport ? "Open passport" : "View system"}</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
