/**
 * Pure helpers shared by the provider pages and the provider server actions.
 * No data is invented here: every function only reads recorded fields.
 */
import type { Appointment, MaintenanceCase, MaintenanceStatus, SolarSystem } from "@/lib/types";
import { MAINT_STATUS, MAINT_STATUS_ORDER } from "../../_ops/meta";

/**
 * Status transitions are forward-only through MAINT_STATUS_ORDER: a case may
 * stay where it is, skip forward, or be sent back to "reviewing" (the one
 * backward step allowed, for a case that needs re-assessment). Anything else
 * would rewrite history.
 */
export function canMoveTo(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  if (to === from) return true;
  if (to === "reviewing") return true;
  return MAINT_STATUS_ORDER.indexOf(to) > MAINT_STATUS_ORDER.indexOf(from);
}

/** Why a transition is not offered, for the disabled option's label and the server error. */
export function transitionReason(from: MaintenanceStatus, to: MaintenanceStatus): string | null {
  if (canMoveTo(from, to)) return null;
  return `A case cannot go back from ${MAINT_STATUS[from].label} to ${MAINT_STATUS[to].label}. Only “${MAINT_STATUS.reviewing.label}” can be re-entered.`;
}

/** The appointment recorded for a case: linked by note reference, else by system + time. */
export function appointmentForCase(appointments: Appointment[], c: Pick<MaintenanceCase, "id" | "system_id" | "appointment_at">): Appointment | null {
  return (
    appointments.find((a) => a.notes?.includes(c.id)) ??
    (c.appointment_at ? appointments.find((a) => a.system_id === c.system_id && a.scheduled_at === c.appointment_at) : undefined) ??
    null
  );
}

/** The case an appointment belongs to, by the same rule, or null when it stands alone. */
export function caseForAppointment(cases: MaintenanceCase[], a: Appointment): MaintenanceCase | null {
  return (
    cases.find((c) => a.notes?.includes(c.id)) ??
    cases.find((c) => c.system_id === a.system_id && c.appointment_at === a.scheduled_at) ??
    null
  );
}

/** Photos actually attached to a case (paths recorded on the row). */
export function caseImageCount(c: Pick<MaintenanceCase, "before_image_path" | "after_image_path">): number {
  return [c.before_image_path, c.after_image_path].filter(Boolean).length;
}

/**
 * Panel information the provider needs, only when it is recorded on the system.
 * Returns null rather than a guess.
 */
export function panelInfo(system: SolarSystem | null | undefined): string | null {
  if (!system) return null;
  const parts: string[] = [];
  if (system.panel_count !== null) parts.push(`${system.panel_count} panels`);
  if (system.capacity_kwp !== null) parts.push(`${system.capacity_kwp} kWp`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Coarse location only. Providers never see the address, email or phone —
 * the governorate is the finest location Solink shows, and only when the
 * homeowner recorded one.
 */
export function coarseLocation(governorate: string | null | undefined): string {
  return governorate?.trim() ? governorate.trim() : "Governorate not shared";
}

/** UTC calendar day of an ISO timestamp, for "today" comparisons against a server-supplied nowIso. */
export function isoDay(iso: string | null | undefined): string | null {
  return iso ? iso.slice(0, 10) : null;
}
