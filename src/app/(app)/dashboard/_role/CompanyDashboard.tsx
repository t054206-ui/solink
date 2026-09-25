import Link from "next/link";
import { ArrowRight, CalendarClock, HardHat, Wrench, SprayCan, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { listAppointments, listMaintenance, listProviders } from "@/lib/data/repositories";
import type { ProviderCompany } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * One account for a company, and what it sees depends on what it actually
 * offers — the owner's answer to whether "installer" is a separate role was
 * that it depends on whether the provider does installation, and if not there
 * is an installation area elsewhere.
 *
 * So services drive the screen. `ProviderCompany.kind` already carries
 * installer / maintenance / cleaning, so no new role was needed: a
 * maintenance-only company simply never sees the installation queue, and is
 * told why rather than left wondering.
 */
const ME = "c-demo-installer";

export default async function CompanyDashboard() {
  const [{ data: providers, mode }, { data: cases }, { data: appointments }] = await Promise.all([
    listProviders(),
    listMaintenance(),
    listAppointments(),
  ]);
  const me: ProviderCompany | null = providers.find((p) => p.id === ME) ?? providers[0] ?? null;
  const isDemo = mode === "demo";

  const offersInstall = !!me?.kind.some((k) => k === "installer" || k === "solar_company");
  const offersMaintenance = !!me?.kind.includes("maintenance");
  const offersCleaning = !!me?.kind.includes("cleaning");

  const open = cases.filter((c) => !["resolved", "closed"].includes(c.status));
  const upcoming = appointments.filter((a) => a.status !== "cancelled" && a.status !== "completed");
  const installJobs = upcoming.filter((a) => a.kind === "installation");

  return (
    <>
      {isDemo && <DemoBanner />}
      <PageHeader
        eyebrow="Installer and maintenance"
        title={me?.name ?? "Your company"}
        description="Your queue, your visits, and the record of what was done. What shows here follows the services your company offers."
        actions={
          <Link
            href="/provider"
            className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-border-strong px-4 text-[13.5px] font-medium text-fg hover:bg-inset"
          >
            Full case queue
            <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        }
      />

      <Card>
        <CardHeader title="Services you offer" subtitle="These decide which areas of Solink are open to your account." />
        <CardBody className="flex flex-wrap gap-2">
          <ServiceChip on={offersInstall} icon={<HardHat className="size-3.5" aria-hidden="true" />} label="Installation" />
          <ServiceChip on={offersMaintenance} icon={<Wrench className="size-3.5" aria-hidden="true" />} label="Maintenance" />
          <ServiceChip on={offersCleaning} icon={<SprayCan className="size-3.5" aria-hidden="true" />} label="Cleaning" />
        </CardBody>
      </Card>

      {offersInstall ? (
        <Card className="mt-[var(--grid-gap)]">
          <CardHeader title="Installation jobs" subtitle="Systems scheduled for install." />
          {installJobs.length === 0 ? (
            <CardBody>
              <EmptyState title="No installations scheduled">Accepted purchase requests that need an install date appear here.</EmptyState>
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dense">
                <thead>
                  <tr>
                    <th scope="col">System</th>
                    <th scope="col">Scheduled</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {installJobs.map((a) => (
                    <tr key={a.id}>
                      <th scope="row" className="font-medium text-fg">{a.system_id}</th>
                      <td className="figure">{formatDate(a.scheduled_at)}</td>
                      <td><Badge tone={a.status === "confirmed" ? "good" : "warn"}>{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="mt-[var(--grid-gap)]">
          <CardBody className="flex items-start gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden="true" />
            <p className="text-[13.5px] leading-snug text-fg-secondary">
              Your company is not registered for installation, so the installation queue is hidden. Add the service to your company
              record to see install jobs here.
            </p>
          </CardBody>
        </Card>
      )}

      <Card className="mt-[var(--grid-gap)]">
        <CardHeader title="Open cases" subtitle="Assigned to your company and not yet closed." />
        {open.length === 0 ? (
          <CardBody>
            <EmptyState title="Nothing open">Cases assigned to you appear here.</EmptyState>
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dense">
              <thead>
                <tr>
                  <th scope="col">Case</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Urgency</th>
                  <th scope="col">Visit</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {open.map((c) => (
                  <tr key={c.id}>
                    <th scope="row" className="max-w-[24rem] truncate font-medium text-fg" title={c.detected_issue}>
                      {c.detected_issue}
                      {c.is_demo && <DataBadge cls="demo" compact className="ms-2 align-middle" />}
                    </th>
                    <td className="capitalize text-fg-secondary">{c.kind}</td>
                    <td>
                      <Badge tone={c.urgency === "urgent" ? "critical" : c.urgency === "inspection" ? "warn" : "neutral"}>
                        {c.urgency}
                      </Badge>
                    </td>
                    <td className="figure">{c.appointment_at ? formatDate(c.appointment_at) : "Not set"}</td>
                    <td className="capitalize text-fg-secondary">{c.status.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-[var(--grid-gap)]">
        <CardHeader
          title="Upcoming visits"
          subtitle="Everything on the calendar, whichever service it belongs to."
          action={<CalendarClock className="size-4 text-fg-muted" aria-hidden="true" />}
        />
        <CardBody className="space-y-2">
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled">Confirmed appointments appear here.</EmptyState>
          ) : (
            upcoming.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="figure text-[13px] text-fg">{formatDate(a.scheduled_at)}</span>
                <span className="capitalize text-[13.5px] font-medium text-fg">{a.kind}</span>
                <Badge tone={a.status === "confirmed" ? "good" : "warn"}>{a.status}</Badge>
                {a.notes && <span className="text-[12.5px] text-fg-muted">{a.notes}</span>}
              </div>
            ))
          )}
        </CardBody>
        <CardBody className="border-t border-border">
          <PlaceholderNote k="MAINTENANCE_PRICE" />
        </CardBody>
      </Card>
    </>
  );
}

function ServiceChip({ on, icon, label }: { on: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium ${
        on ? "border-transparent bg-brand-soft text-[var(--brand-strong)]" : "border-dashed border-border text-fg-muted"
      }`}
    >
      {icon}
      {label}
      <span className="micro ms-1">{on ? "on" : "off"}</span>
    </span>
  );
}
