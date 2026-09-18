import { Badge } from "@/components/ui/Badge";
import { Placeholder } from "@/components/ui/Placeholder";
import { specText } from "@/lib/utils";
import type { IncidentStatus, MaintenanceKind, MaintenanceStatus, SpecValue, Urgency } from "@/lib/types";
import { INCIDENT_STATUS, MAINT_KIND, MAINT_STATUS, URGENCY } from "./meta";

export function MaintStatusPill({ status }: { status: MaintenanceStatus }) {
  const m = MAINT_STATUS[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const m = URGENCY[urgency];
  return <Badge tone={m.tone} className="capitalize">{m.label}</Badge>;
}

export function KindBadge({ kind }: { kind: MaintenanceKind }) {
  return <Badge tone="neutral">{MAINT_KIND[kind].label}</Badge>;
}

export function IncidentStatusPill({ status }: { status: IncidentStatus }) {
  const m = INCIDENT_STATUS[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/**
 * A cost field. Costs are SpecValue and are usually unavailable because
 * providers have not entered prices — in that case the MAINTENANCE PRICE
 * placeholder is shown rather than any assumed figure.
 */
export function CostCell({ cost, currency = "KWD" }: { cost: SpecValue | undefined | null; currency?: string }) {
  if (!cost || cost.value === null || cost.value === undefined) {
    const st = cost && "status" in cost ? cost.status : "unavailable";
    if (st === "not_applicable") return <span className="text-fg-muted">Not applicable</span>;
    if (st === "pending_verification") return <span className="text-fg-muted">Pending verification</span>;
    return <span className="inline-flex flex-wrap items-center gap-1.5"><span className="text-fg-muted">Unavailable</span><Placeholder k="MAINTENANCE_PRICE" /></span>;
  }
  return <span className="tabular text-fg">{specText({ value: cost.value, unit: cost.unit ?? currency })}</span>;
}
