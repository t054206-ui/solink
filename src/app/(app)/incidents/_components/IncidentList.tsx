"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Wrench } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import type { DataMode } from "@/lib/data/mode";
import type { Incident, IncidentStatus, MaintenanceCase, SolarSystem } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { INCIDENT_STATUS, INCIDENT_STATUS_ORDER, MAINT_KIND } from "../../_ops/meta";
import { isLocalId, mergeRecords, useLocalIncidents, useLocalMaintenance } from "../../_ops/localRecords";
import { IncidentStatusPill } from "../../_ops/Pills";

type Filter = IncidentStatus | "all";

export function IncidentList({ mode, serverIncidents, systems, cases }: { mode: DataMode; serverIncidents: Incident[]; systems: SolarSystem[]; cases: MaintenanceCase[] }) {
  const [localIncidents] = useLocalIncidents();
  const [localCases] = useLocalMaintenance();
  const [filter, setFilter] = useState<Filter>("all");
  const incidents = useMemo(() => (mode === "demo" ? mergeRecords(serverIncidents, localIncidents) : serverIncidents).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)), [mode, serverIncidents, localIncidents]);
  const allCases = useMemo(() => (mode === "demo" ? mergeRecords(cases, localCases) : cases), [mode, cases, localCases]);
  const filtered = incidents.filter((i) => filter === "all" || i.status === filter);
  const systemName = (id: string) => systems.find((s) => s.id === id)?.name ?? "System";

  return (
    <Card>
      <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto border-b border-border px-5 py-3">
        {(["all", ...INCIDENT_STATUS_ORDER] as Filter[]).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
            className={cn("shrink-0 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors", filter === f ? "border-brand bg-brand-soft text-[var(--brand-strong)]" : "border-border text-fg-secondary hover:bg-inset")}>
            {f === "all" ? "All" : INCIDENT_STATUS[f].label}<span className="ml-1 tabular text-fg-muted">{f === "all" ? incidents.length : incidents.filter((i) => i.status === f).length}</span>
          </button>
        ))}
      </div>
      <CardBody className="pt-4">
        {filtered.length === 0 ? (
          <EmptyState title={incidents.length === 0 ? "No incidents recorded" : "No incidents with this status"}>{incidents.length === 0 ? "Report a problem and it stays on record with everything done about it." : "Try another status."}</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((i) => {
              const linked = i.maintenance_case_id ? allCases.find((c) => c.id === i.maintenance_case_id) ?? null : null;
              return (
                <li key={i.id}>
                  <Link href={`/incidents/${i.id}`} className="-mx-2 flex items-start gap-3 rounded-[10px] px-2 py-3 hover:bg-inset focus-visible:bg-inset focus-visible:outline-none">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <IncidentStatusPill status={i.status} />
                        {typeof i.panel_index === "number" && <Badge tone="data">Panel #{i.panel_index}</Badge>}
                        {i.is_demo && <DataBadge cls="demo" compact />}
                        {isLocalId(i.id) && <Badge tone="neutral">Saved on this device</Badge>}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[14px] text-fg">{i.reported_problem}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-fg-muted">
                        <span>{formatDate(i.occurred_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span><span aria-hidden>·</span><span>{systemName(i.system_id)}</span>
                        {i.maintenance_case_id && <><span aria-hidden>·</span><span className="inline-flex items-center gap-1"><Wrench className="size-3" aria-hidden />{linked ? `${MAINT_KIND[linked.kind].label} case` : "Maintenance case"}</span></>}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
