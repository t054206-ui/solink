"use client";
import Link from "next/link";
import { useMemo } from "react";
import { FileBadge, ImageOff, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/States";
import type { DataMode } from "@/lib/data/mode";
import type { Incident, MaintenanceCase, SolarSystem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { MAINT_KIND, MAINT_STATUS } from "../../_ops/meta";
import { isLocalId, mergeRecords, useLocalIncidents, useLocalMaintenance } from "../../_ops/localRecords";
import { CostCell, IncidentStatusPill } from "../../_ops/Pills";

export function IncidentDetail({ id, mode, serverIncident, systems, cases }: { id: string; mode: DataMode; serverIncident: Incident | null; systems: SolarSystem[]; cases: MaintenanceCase[] }) {
  const [localIncidents, , loaded] = useLocalIncidents();
  const [localCases] = useLocalMaintenance();
  const inc = useMemo(() => (mode === "demo" ? localIncidents.find((i) => i.id === id) ?? serverIncident : serverIncident), [mode, localIncidents, id, serverIncident]);
  const allCases = useMemo(() => (mode === "demo" ? mergeRecords(cases, localCases) : cases), [mode, cases, localCases]);

  if (!inc) {
    if (mode === "demo" && !loaded) return <Skeleton className="h-40 w-full" />;
    return <EmptyState title="Incident not found">This incident does not exist or belongs to another account.{mode === "demo" && " Incidents reported in demo mode live only on the device where they were created."}</EmptyState>;
  }

  const system = systems.find((s) => s.id === inc.system_id) ?? null;
  const linked = inc.maintenance_case_id ? allCases.find((c) => c.id === inc.maintenance_case_id) ?? null : null;
  const occurred = new Date(inc.occurred_at);

  return (
    <div className="space-y-4">
      {inc.is_demo && <DemoBanner detail="This is a labeled demo incident. It does not describe a real event." />}
      {isLocalId(inc.id) && <div className="rounded-[10px] border border-border bg-inset px-3 py-2 text-[13px] text-fg-secondary">Saved on this device only (Supabase not connected).</div>}

      <Card>
        <CardBody className="pt-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <IncidentStatusPill status={inc.status} />
            {typeof inc.panel_index === "number" && <Badge tone="data">Panel #{inc.panel_index}</Badge>}
            {inc.is_demo && <DataBadge cls="demo" compact />}
            <span className="ml-auto font-mono text-[11.5px] text-fg-muted">{inc.id}</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-snug text-fg">{inc.reported_problem.split("\n")[0]}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13.5px] sm:grid-cols-4">
            <Row k="Date" v={formatDate(inc.occurred_at)} />
            <Row k="Time" v={Number.isNaN(occurred.getTime()) ? "—" : occurred.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} />
            <Row k="System" v={system?.name ?? "—"} />
            <Row k="Panel" v={typeof inc.panel_index === "number" ? `#${inc.panel_index}` : "Whole system / not specified"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={`/passport/${inc.system_id}`} variant="outline" size="sm"><FileBadge className="size-4" aria-hidden /> Open in Passport</Button>
            {linked ? (
              <Button href={`/maintenance/${linked.id}`} variant="outline" size="sm"><Wrench className="size-4" aria-hidden /> {MAINT_KIND[linked.kind].label} case · {MAINT_STATUS[linked.status].label}</Button>
            ) : inc.status !== "closed" && inc.status !== "resolved" ? (
              <Button href={`/maintenance/book?kind=inspection&system=${inc.system_id}`} variant="outline" size="sm"><Wrench className="size-4" aria-hidden /> Book an inspection</Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Reported problem" />
          <CardBody><p className="whitespace-pre-wrap text-[14px] leading-relaxed text-fg">{inc.reported_problem}</p></CardBody>
        </Card>
        <Card>
          <CardHeader title="AI analysis" action={inc.ai_analysis ? <DataBadge cls={inc.is_demo ? "demo" : "ai"} compact /> : undefined} />
          <CardBody>
            {inc.ai_analysis ? <p className="text-[13.5px] leading-relaxed text-fg-secondary">{inc.ai_analysis}</p> : <p className="text-[13px] text-fg-muted">No AI analysis attached. An AI screening can be run from <Link href="/monitoring/inspection" className="text-[var(--brand-strong)] hover:underline">Monitoring → Inspection</Link>; it is an interpretation, not a diagnosis.</p>}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Images" subtitle={inc.images.length === 0 ? "No images attached." : `${inc.images.length} image${inc.images.length > 1 ? "s" : ""}`} />
        <CardBody>
          {inc.images.length === 0 ? (
            <div className="grid aspect-[5/2] place-items-center rounded-[10px] border border-dashed border-border-strong bg-inset text-[13px] text-fg-muted"><span className="inline-flex items-center gap-1.5"><ImageOff className="size-4" aria-hidden /> No image</span></div>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {inc.images.map((p) => <li key={p} className="aspect-square overflow-hidden rounded-md border border-border bg-inset">{/* Object URLs and private storage paths: next/image cannot optimise these. */}
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={p} alt="Incident photo" className="size-full object-cover" /></li>)}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Action & outcome" subtitle="Filled in as the incident is handled. Empty fields mean nothing has been recorded — not that nothing happened." />
        <CardBody>
          <dl className="grid gap-3 text-[13.5px] sm:grid-cols-2">
            <Row k="Action taken" v={inc.action_taken ?? <span className="text-fg-muted">Not recorded</span>} />
            <Row k="Technician" v={inc.technician_name ?? <span className="text-fg-muted">Not recorded</span>} />
            <Row k="Cost" v={<CostCell cost={inc.cost} />} />
            <Row k="Result" v={inc.result ?? <span className="text-fg-muted">Not recorded</span>} />
            <Row k="Final status" v={<IncidentStatusPill status={inc.status} />} />
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><dt className="text-fg-muted">{k}</dt><dd className="mt-0.5 text-fg">{v}</dd></div>;
}
