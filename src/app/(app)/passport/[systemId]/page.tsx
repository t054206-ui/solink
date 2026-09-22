import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench, AlertOctagon, SprayCan, Replace, Hammer, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { InfoTip } from "@/components/help/InfoTip";
import type { DataClass } from "@/lib/classification";
import { getPassport, getSystem, listIncidents, listMaintenance } from "@/lib/data/repositories";
import { DEMO_BANNER } from "@/lib/demo/data";
import type { Incident, MaintenanceCase, MaintenanceKind, SolarPassport } from "@/lib/types";
import { VERIFICATION_LABEL } from "@/app/(app)/marketplace/_components/product-helpers";
import { formatDate, specText } from "@/lib/utils";
import { AskSolink } from "../../_operate/components/AskSolink";
import { PrintButton } from "../_components/PrintButton";
import { requestNow } from "../../_operate/loadSystem";

export async function generateMetadata({ params }: { params: Promise<{ systemId: string }> }): Promise<Metadata> {
  const { systemId } = await params;
  const { data } = await getSystem(systemId);
  return { title: data ? `Solar Passport: ${data.name}` : "Solar Passport" };
}

export default async function PassportPage({ params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  const { data: system } = await getSystem(systemId);
  if (!system) notFound();
  const [{ data: passport }, { data: maintenance }, { data: incidents }, nowIso] = await Promise.all([getPassport(systemId), listMaintenance(systemId), listIncidents(systemId), requestNow()]);
  const cls: DataClass = system.is_demo ? "demo" : "source";

  if (!passport) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Solar Passport" title={system.name} description="No passport has been issued for this system yet." actions={<Link href="/passport" className="text-[13px] font-medium text-fg-secondary hover:text-fg">← All systems</Link>} />
        <EmptyState title="Passport not issued">A passport is created when the installation is recorded and equipment snapshots are frozen. Current system status: <strong>{system.status.replace("_", " ")}</strong>.</EmptyState>
      </div>
    );
  }

  const ps = passport.panel_snapshot, inv = passport.inverter_snapshot;
  const specs = (ps?.specs ?? {}) as Record<string, unknown>;
  const panelRows: [string, string, string?][] = [
    ["Rated power", specText(asSpec(specs.rated_power_w)), "peak_power"],
    ["Module efficiency", specText(asSpec(specs.module_efficiency_pct)), "efficiency"],
    ["Cell technology", specText(asSpec(specs.cell_technology))],
    ["Number of cells", specText(asSpec(specs.number_of_cells))],
    ["Voc", specText(asSpec(specs.voc_v)), "voc"], ["Isc", specText(asSpec(specs.isc_a)), "isc"],
    ["Vmp", specText(asSpec(specs.vmp_v)), "vmp"], ["Imp", specText(asSpec(specs.imp_a)), "imp"],
    ["Max system voltage", specText(asSpec(specs.max_system_voltage_v))],
    ["Temperature coefficient (Pmax)", specText(asSpec(specs.temperature_coefficient_pmax_pct_per_c)), "temperature_coefficient"],
    ["Operating temperature", specText(asSpec(specs.operating_temperature_range_c))],
    ["Dimensions (L × W × T)", `${specText(asSpec(specs.length_mm))} × ${specText(asSpec(specs.width_mm))} × ${specText(asSpec(specs.thickness_mm))}`],
    ["Weight", specText(asSpec(specs.weight_kg))],
    ["Product warranty", specText(asSpec(specs.product_warranty_years)), "product_warranty"],
    ["Performance warranty", `${specText(asSpec(specs.performance_warranty_years))} → ${specText(asSpec(specs.performance_warranty_end_pct))} of rated power`, "performance_warranty"],
  ];
  const invRows = Object.entries(inv?.specs ?? {}).filter(([k]) => k !== "additional").map(([k, v]) => [labelize(k), specText(asSpec(v))] as [string, string]);

  const byKind = (kinds: MaintenanceKind[]) => maintenance.filter((m) => kinds.includes(m.kind));
  const tabs = [
    { id: "timeline", label: "Timeline", content: <Timeline maintenance={maintenance} incidents={incidents} /> },
    { id: "maintenance", label: `Maintenance (${maintenance.length})`, content: <MaintenanceList items={maintenance} /> },
    { id: "repairs", label: `Repairs (${byKind(["repair"]).length})`, content: <MaintenanceList items={byKind(["repair"])} empty="No repairs recorded." /> },
    { id: "replacements", label: `Replacements (${byKind(["replacement"]).length})`, content: <MaintenanceList items={byKind(["replacement"])} empty="No replacements recorded." /> },
    { id: "cleaning", label: `Cleaning (${byKind(["cleaning"]).length})`, content: <MaintenanceList items={byKind(["cleaning"])} empty="No cleaning visits recorded." /> },
    { id: "incidents", label: `Incidents (${incidents.length})`, content: <IncidentList items={incidents} /> },
  ];

  return (
    <div className="space-y-6" id="passport-print-root">
      <style>{`@media print {
        aside, header, nav, button.fixed, [role="tablist"], .print\\:hidden { display: none !important; }
        main { padding: 0 !important; }
        #passport-print-root { font-size: 12px; }
        #passport-print-root a { text-decoration: none; color: inherit; }
        .print-all-history { display: block !important; }
      }`}</style>

      <PageHeader eyebrow={<span className="inline-flex items-center gap-2">Solar System Digital Passport <InfoTip term="passport" /></span>} title={system.name}
        description={<span className="font-mono text-[13px]">Passport № {passport.passport_number}</span>}
        actions={<><Link href="/passport" className="print:hidden inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-fg-secondary hover:bg-inset hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> All systems</Link><PrintButton /></>} />

      {passport.is_demo && <DemoBanner text={DEMO_BANNER} detail="This passport describes a demo system and demo products. Nothing in it is a real record." />}

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Installation">
        <Card className="lg:col-span-2">
          <CardHeader title={<>Installation <InfoTip term="installation_record" /></>} action={<DataBadge cls={cls} compact />} />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
              <Row k="Installation date" v={formatDate(passport.installation_date)} />
              <Row k="Commissioning date" v={formatDate(system.commissioning_date)} />
              <Row k="Installation company" v={passport.installation_company ?? "—"} />
              <Row k="Installer reference" v={passport.installer_id ?? "—"} mono />
              <Row k="Panels" v={passport.panel_count != null ? `${passport.panel_count}` : "—"} />
              <Row k="Capacity" v={passport.capacity_kwp != null ? `${passport.capacity_kwp} kWp` : "—"} />
              <Row k="System status" v={<Badge tone={system.status === "installed" ? "good" : "neutral"}>{system.status.replace("_", " ")}</Badge>} />
              <Row k="Monitoring source" v={system.monitoring_source ?? "Not connected"} />
            </dl>
            {passport.installation_notes && <p className="mt-3 text-[13px] text-fg-secondary">{passport.installation_notes}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={<>Warranties <InfoTip term="warranties" /></>} subtitle="Expiry dates are calculated from the installation date." />
          <CardBody>
            <ul className="space-y-2.5 text-[13.5px]">
              <WarrantyRow label="Product" term="product_warranty" years={passport.warranty.product_years} from={passport.installation_date} cls={cls} nowIso={nowIso} />
              <WarrantyRow label="Performance" term="performance_warranty" years={passport.warranty.performance_years} from={passport.installation_date} cls={cls} nowIso={nowIso} />
              <WarrantyRow label="Installer workmanship" years={passport.warranty.installer_years} from={passport.installation_date} cls={cls} nowIso={nowIso} />
            </ul>
            {passport.warranty.notes && <p className="mt-3 text-[12.5px] text-fg-muted">{passport.warranty.notes}</p>}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Equipment">
        <Card>
          <CardHeader title={<>Solar panels <InfoTip term="datasheet" /></>} subtitle={ps ? `${ps.manufacturer} · ${ps.model}` : "No panel snapshot"} action={<DataBadge cls={cls} compact />} />
          <CardBody>
            {ps ? (
              <>
                <dl className="divide-y divide-border text-[13px]">
                  {panelRows.map(([k, v, term]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 py-1.5"><dt className="flex items-center gap-1 text-fg-muted">{k}{term && <InfoTip term={term} />}</dt><dd className="tabular text-right font-medium text-fg">{v}</dd></div>
                  ))}
                </dl>
                <VersionNote versionId={ps.version_id} />
                <ManufacturerAtInstallation snapshot={ps} cls={cls} />
              </>
            ) : <p className="text-[13px] text-fg-muted">The panel specification snapshot was not recorded.</p>}
          </CardBody>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader title={<>Inverter <InfoTip term="inverter" /></>} subtitle={inv ? `${inv.manufacturer} · ${inv.model}` : "No inverter snapshot"} action={<DataBadge cls={cls} compact />} />
            <CardBody>
              {inv ? (
                <>
                  <dl className="divide-y divide-border text-[13px]">
                    {invRows.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-3 py-1.5"><dt className="text-fg-muted">{k}</dt><dd className="tabular text-right font-medium text-fg">{v}</dd></div>)}
                  </dl>
                  <VersionNote versionId={inv.version_id} />
                </>
              ) : <p className="text-[13px] text-fg-muted">The inverter specification snapshot was not recorded.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={<>Battery <InfoTip term="battery" /></>} />
            <CardBody><p className="text-[13px] text-fg-secondary">{system.battery_product_id ? `Battery reference ${system.battery_product_id}. No specification snapshot is stored in this passport.` : "No battery is part of this system."}</p></CardBody>
          </Card>
        </div>
      </section>

      <section aria-label="History">
        <Card>
          <CardHeader title="History" subtitle="Every maintenance visit, repair, replacement, cleaning and incident recorded against this system." action={<DataBadge cls={cls} compact />} />
          <CardBody>
            <div className="print:hidden"><Tabs tabs={tabs} /></div>
            <div className="print-all-history hidden space-y-6">
              <h4 className="font-semibold">Timeline</h4>{tabs[0].content}
              <h4 className="font-semibold">Incidents</h4>{tabs[5].content}
            </div>
          </CardBody>
        </Card>
      </section>

      <AskSolink topic="e.g. “What does my performance warranty actually promise?”" className="print:hidden" />
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return <div className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 sm:border-0 sm:py-0"><dt className="text-fg-muted">{k}</dt><dd className={`text-right text-fg ${mono ? "font-mono text-[12px]" : ""}`}>{v}</dd></div>;
}

function WarrantyRow({ label, term, years, from, cls, nowIso }: { label: string; term?: string; years: number | null; from: string | null; cls: DataClass; nowIso: string }) {
  const expiry = years != null && from ? addYears(from, years) : null;
  const expired = expiry ? new Date(expiry).getTime() < new Date(nowIso).getTime() : false;
  return (
    <li className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1 font-medium text-fg">{label}{term && <InfoTip term={term} />}</span><DataBadge cls={years == null ? "unavailable" : cls} compact /></div>
      {years == null ? <p className="mt-1 text-[12.5px] text-fg-muted">Not recorded.</p> : (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span className="text-fg-secondary">{years} years</span>
          <span className="inline-flex items-center gap-1.5 text-fg-secondary">{expiry ? <>until <span className="tabular font-medium text-fg">{formatDate(expiry)}</span>{expired && <Badge tone="serious">expired</Badge>}</> : "start date unknown"}<DataBadge cls="calculated" compact /></span>
        </div>
      )}
    </li>
  );
}

/**
 * The manufacturer as it stood when the passport was issued: written into the
 * snapshot by the database (migration 0008) and never updated afterwards, so
 * a later rename, re-verification or archive of the company changes nothing
 * here. The link to the current profile is offered as such: current, not
 * historical.
 */
function ManufacturerAtInstallation({ snapshot, cls }: { snapshot: NonNullable<SolarPassport["panel_snapshot"]>; cls: DataClass }) {
  const ms = snapshot.manufacturer_snapshot ?? null;
  return (
    <div className="mt-3 rounded-[var(--radius-md)] border border-border p-3 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-medium text-fg">Manufacturer at installation <InfoTip term="manufacturer_record" /></span>
        <DataBadge cls={cls} compact />
      </div>
      <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <div className="flex justify-between gap-2"><dt className="text-fg-muted">Company</dt><dd className="text-right font-medium text-fg">{snapshot.manufacturer}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-fg-muted">Legal name</dt><dd className="text-right text-fg">{ms?.legal_name ?? <span className="text-fg-muted">Not recorded</span>}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-fg-muted">Headquarters</dt><dd className="text-right text-fg">{ms?.headquarters_country ?? <span className="text-fg-muted">Not recorded</span>}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-fg-muted">Company verification then</dt><dd className="text-right text-fg">{ms ? VERIFICATION_LABEL[ms.verification_status] : <span className="text-fg-muted">Not recorded</span>}</dd></div>
        <div className="flex justify-between gap-2 sm:col-span-2"><dt className="text-fg-muted">Manufacturer data version</dt><dd className="text-right font-mono text-[12px] text-fg">{snapshot.manufacturer_version_id ?? "not recorded (issued before company versioning)"}</dd></div>
      </dl>
      <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">
        Frozen when the passport was issued{snapshot.snapshot_at ? ` on ${formatDate(snapshot.snapshot_at)}` : ""}. Later changes to the company record do not alter this passport.
        {ms?.slug && <> <Link href={`/marketplace/manufacturers/${encodeURIComponent(ms.slug)}`} className="underline underline-offset-2 hover:text-fg">Current company profile</Link> (may differ).</>}
      </p>
    </div>
  );
}

function VersionNote({ versionId }: { versionId: string | null }) {
  return (
    <p className="mt-3 rounded-[var(--radius-md)] bg-inset p-2.5 text-[12px] leading-relaxed text-fg-muted">
      <span className="font-medium text-fg-secondary">Spec version:</span> <span className="font-mono">{versionId ?? "not recorded"}</span>. Specifications are frozen at installation; later manufacturer changes to the product listing do not alter this record.
    </p>
  );
}

const KIND_ICON: Record<MaintenanceKind, typeof Wrench> = { cleaning: SprayCan, inspection: CalendarDays, minor_maintenance: Wrench, repair: Hammer, replacement: Replace, annual_maintenance: Wrench };
const STATUS_TONE: Record<MaintenanceCase["status"], "neutral" | "warn" | "good" | "brand"> = { new: "warn", reviewing: "warn", scheduled: "brand", in_progress: "brand", resolved: "good", closed: "neutral" };

function MaintenanceList({ items, empty = "No maintenance recorded." }: { items: MaintenanceCase[]; empty?: string }) {
  if (items.length === 0) return <EmptyState title={empty} className="py-6" />;
  return (
    <ul className="divide-y divide-border">
      {[...items].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((m) => {
        const Icon = KIND_ICON[m.kind];
        return (
          <li key={m.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[8px] bg-inset text-fg-secondary"><Icon className="size-4" aria-hidden /></span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
                <span className="font-medium capitalize text-fg">{m.kind.replace("_", " ")}</span>
                <Badge tone={STATUS_TONE[m.status]}>{m.status.replace("_", " ")}</Badge>
                <Badge tone={m.urgency === "urgent" ? "critical" : m.urgency === "inspection" ? "warn" : "neutral"}>{m.urgency}</Badge>
                {m.is_demo && <DataBadge cls="demo" compact />}
                <span className="ml-auto">{formatDate(m.appointment_at ?? m.created_at)}</span>
              </div>
              <p className="text-[13.5px] text-fg">{m.detected_issue}</p>
              <dl className="grid gap-x-4 gap-y-0.5 text-[12.5px] text-fg-secondary sm:grid-cols-2">
                {m.technician_name && <div><dt className="inline text-fg-muted">Technician: </dt><dd className="inline">{m.technician_name}</dd></div>}
                {m.work_performed && <div className="sm:col-span-2"><dt className="inline text-fg-muted">Work: </dt><dd className="inline">{m.work_performed}</dd></div>}
                {m.parts && <div><dt className="inline text-fg-muted">Parts: </dt><dd className="inline">{m.parts}</dd></div>}
                <div><dt className="inline text-fg-muted">Cost: </dt><dd className="inline">{specText(m.cost)}</dd></div>
                {m.production_before_kwh != null && m.production_after_kwh != null && <div><dt className="inline text-fg-muted">Daily kWh before → after: </dt><dd className="tabular inline">{m.production_before_kwh} → {m.production_after_kwh}</dd></div>}
              </dl>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function IncidentList({ items }: { items: Incident[] }) {
  if (items.length === 0) return <EmptyState title="No incidents recorded." className="py-6" />;
  return (
    <ul className="divide-y divide-border">
      {[...items].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).map((i) => (
        <li key={i.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[8px] bg-serious-soft text-serious-fg"><AlertOctagon className="size-4" aria-hidden /></span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
              <Badge tone={i.status === "open" ? "critical" : i.status === "investigating" ? "warn" : i.status === "resolved" ? "good" : "neutral"}>{i.status}</Badge>
              {i.panel_index != null && <span>Panel #{i.panel_index}</span>}
              {i.is_demo && <DataBadge cls="demo" compact />}
              <span className="ml-auto">{formatDate(i.occurred_at)}</span>
            </div>
            <p className="text-[13.5px] text-fg">{i.reported_problem}</p>
            <dl className="grid gap-x-4 gap-y-0.5 text-[12.5px] text-fg-secondary sm:grid-cols-2">
              {i.action_taken && <div className="sm:col-span-2"><dt className="inline text-fg-muted">Action: </dt><dd className="inline">{i.action_taken}</dd></div>}
              {i.technician_name && <div><dt className="inline text-fg-muted">Technician: </dt><dd className="inline">{i.technician_name}</dd></div>}
              <div><dt className="inline text-fg-muted">Cost: </dt><dd className="inline">{specText(i.cost)}</dd></div>
              {i.result && <div className="sm:col-span-2"><dt className="inline text-fg-muted">Result: </dt><dd className="inline">{i.result}</dd></div>}
              {i.maintenance_case_id && <div><dt className="inline text-fg-muted">Linked case: </dt><dd className="inline font-mono text-[12px]">{i.maintenance_case_id}</dd></div>}
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Timeline({ maintenance, incidents }: { maintenance: MaintenanceCase[]; incidents: Incident[] }) {
  type Ev = { at: string; kind: "maintenance" | "incident"; title: string; detail: string; demo: boolean; icon: typeof Wrench };
  const events: Ev[] = [
    ...maintenance.map<Ev>((m) => ({ at: m.appointment_at ?? m.created_at, kind: "maintenance", title: `${m.kind.replace("_", " ")} · ${m.status.replace("_", " ")}`, detail: m.work_performed ?? m.detected_issue, demo: m.is_demo, icon: KIND_ICON[m.kind] })),
    ...incidents.map<Ev>((i) => ({ at: i.occurred_at, kind: "incident", title: `Incident · ${i.status}`, detail: i.reported_problem, demo: i.is_demo, icon: AlertOctagon })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (events.length === 0) return <EmptyState title="No history yet" className="py-6">Maintenance visits and incidents will appear here as they are recorded.</EmptyState>;
  return (
    <ol className="relative ml-3 border-l border-border pl-6">
      {events.map((e, idx) => (
        <li key={idx} className="relative pb-5 last:pb-0">
          <span className={`absolute -left-[31px] top-0.5 grid size-5 place-items-center rounded-full border-2 border-[var(--bg-elevated)] ${e.kind === "incident" ? "bg-serious text-white" : "bg-data text-white"}`}><e.icon className="size-3" aria-hidden /></span>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted"><time dateTime={e.at} className="tabular font-medium text-fg-secondary">{formatDate(e.at)}</time><span className="capitalize">{e.title}</span>{e.demo && <DataBadge cls="demo" compact />}</div>
          <p className="mt-0.5 text-[13.5px] text-fg">{e.detail}</p>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- helpers ---------------- */

function asSpec(v: unknown): { value: unknown; unit?: string; status?: string } | undefined {
  if (v && typeof v === "object" && "value" in v) return v as { value: unknown; unit?: string; status?: string };
  return undefined;
}
function labelize(k: string) { return k.replace(/_/g, " ").replace(/\b(kw|kwh|ac|dc|mppt|pct)\b/gi, (m) => m.toUpperCase()).replace(/^./, (c) => c.toUpperCase()); }
function addYears(iso: string, years: number): string {
  const d = new Date(iso); d.setUTCFullYear(d.getUTCFullYear() + years); return d.toISOString();
}
