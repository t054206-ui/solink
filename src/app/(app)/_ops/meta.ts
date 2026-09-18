/**
 * Shared display metadata for the operations features
 * (Maintenance, Incidents, Reports, Performance, Replacement).
 */
import type { IncidentStatus, MaintenanceKind, MaintenanceStatus, Urgency } from "@/lib/types";

export type Tone = "neutral" | "brand" | "good" | "warn" | "serious" | "critical" | "data";

export const MAINT_STATUS_ORDER: MaintenanceStatus[] = ["new", "reviewing", "scheduled", "in_progress", "resolved", "closed"];
export const MAINT_STATUS: Record<MaintenanceStatus, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "data" },
  reviewing: { label: "Reviewing", tone: "brand" },
  scheduled: { label: "Scheduled", tone: "warn" },
  in_progress: { label: "In progress", tone: "serious" },
  resolved: { label: "Resolved", tone: "good" },
  closed: { label: "Closed", tone: "neutral" },
};
export const OPEN_MAINT_STATUSES: MaintenanceStatus[] = ["new", "reviewing", "scheduled", "in_progress"];

export const MAINT_KIND_ORDER: MaintenanceKind[] = ["cleaning", "inspection", "minor_maintenance", "repair", "replacement", "annual_maintenance"];
export const MAINT_KIND: Record<MaintenanceKind, { label: string; description: string }> = {
  cleaning: { label: "Cleaning", description: "Removing dust and sand from the panels." },
  inspection: { label: "Inspection", description: "A technician checks the system without necessarily repairing anything." },
  minor_maintenance: { label: "Minor maintenance", description: "Small fixes such as tightening connectors or replacing fuses." },
  repair: { label: "Repair", description: "Fixing a fault in a panel, inverter, wiring or other component." },
  replacement: { label: "Replacement", description: "Replacing a component with a new one." },
  annual_maintenance: { label: "Annual maintenance", description: "A scheduled yearly check-up of the whole system." },
};

export const URGENCY: Record<Urgency, { label: string; tone: Tone; description: string }> = {
  urgent: { label: "Urgent", tone: "critical", description: "Needs attention soon." },
  inspection: { label: "Inspection recommended", tone: "warn", description: "Worth having a technician take a look." },
  routine: { label: "Routine", tone: "neutral", description: "Regular upkeep; no sign of a fault." },
};

export const INCIDENT_STATUS_ORDER: IncidentStatus[] = ["open", "investigating", "resolved", "closed"];
export const INCIDENT_STATUS: Record<IncidentStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "critical" },
  investigating: { label: "Investigating", tone: "warn" },
  resolved: { label: "Resolved", tone: "good" },
  closed: { label: "Closed", tone: "neutral" },
};

/** Maintenance workflow stages (Feature 21). */
export const WORKFLOW_STAGES = [
  "Problem Detected", "Customer Notified", "Provider Selected", "Booking", "Technician", "Inspection", "Repair", "Resolution", "Record Updated",
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

/** Which workflow stage a case is at, derived only from recorded facts. */
export function stageIndexForCase(c: { status: MaintenanceStatus; provider_id: string | null; technician_name?: string | null; work_performed?: string | null }): number {
  switch (c.status) {
    case "closed": return 8;
    case "resolved": return 7;
    case "in_progress": return c.work_performed ? 6 : 5;
    case "scheduled": return c.technician_name ? 4 : 3;
    case "reviewing": return c.provider_id ? 2 : 1;
    case "new":
    default: return c.provider_id ? 3 : 1;
  }
}

/** Appointment kind matching a maintenance kind (appointments.kind enum). */
export function appointmentKindFor(kind: MaintenanceKind): "maintenance" | "inspection" | "cleaning" {
  if (kind === "cleaning") return "cleaning";
  if (kind === "inspection" || kind === "annual_maintenance") return "inspection";
  return "maintenance";
}

/** Provider kinds that can serve a maintenance kind. */
export function providerKindsFor(kind: MaintenanceKind): ("maintenance" | "cleaning" | "installer" | "solar_company")[] {
  if (kind === "cleaning") return ["cleaning", "maintenance"];
  if (kind === "replacement") return ["maintenance", "installer", "solar_company"];
  return ["maintenance", "installer"];
}
