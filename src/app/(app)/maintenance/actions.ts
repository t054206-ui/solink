"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";
import type { Appointment, MaintenanceCase } from "@/lib/types";
import { appointmentKindFor } from "../_ops/meta";

/**
 * Maintenance server actions.
 * Supabase mode: insert/update maintenance_cases + appointments for the signed-in user (RLS applies).
 * Demo mode: return { ok: false, reason: "demo" } and the client persists to local storage instead.
 */

export type ActionFail = { ok: false; reason: "demo" | "unauthenticated" | "invalid" | "error"; message: string };
const DEMO_FAIL: ActionFail = { ok: false, reason: "demo", message: "Supabase is not connected; saving on this device only." };

const KIND = z.enum(["cleaning", "inspection", "minor_maintenance", "repair", "replacement", "annual_maintenance"]);
const URGENCY = z.enum(["urgent", "inspection", "routine"]);

const CreateCaseInput = z.object({
  system_id: z.string().min(1),
  provider_id: z.string().min(1).nullable(),
  kind: KIND,
  urgency: URGENCY.default("routine"),
  detected_issue: z.string().min(3).max(2000),
  appointment_at: z.string().datetime({ offset: true }).nullable(),
  notes: z.string().max(2000).nullable().optional(),
});
export type CreateCaseInputT = z.infer<typeof CreateCaseInput>;

export type CreateCaseResult = { ok: true; caseRecord: MaintenanceCase; appointment: Appointment | null } | ActionFail;

export async function createMaintenanceCase(raw: unknown): Promise<CreateCaseResult> {
  const parsed = CreateCaseInput.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  if (getDataMode() === "demo") return DEMO_FAIL;
  const c = await createClient();
  if (!c) return DEMO_FAIL;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to book maintenance." };
  const d = parsed.data;
  const { data: caseRow, error } = await c.from("maintenance_cases").insert({
    system_id: d.system_id, user_id: user.id, provider_id: d.provider_id, kind: d.kind, status: "new", urgency: d.urgency,
    detected_issue: d.detected_issue, appointment_at: d.appointment_at, notes: d.notes ?? null,
    cost: { value: null, status: "unavailable" }, is_demo: false,
  }).select("*").single();
  if (error) return { ok: false, reason: "error", message: error.message };
  let appointment: Appointment | null = null;
  if (d.appointment_at) {
    const { data: ap, error: apErr } = await c.from("appointments").insert({
      user_id: user.id, system_id: d.system_id, provider_id: d.provider_id, kind: appointmentKindFor(d.kind), scheduled_at: d.appointment_at, status: "requested",
      notes: `Maintenance case ${caseRow.id}`,
    }).select("*").single();
    if (apErr) return { ok: false, reason: "error", message: `Case saved but the appointment could not be requested: ${apErr.message}` };
    appointment = ap as Appointment;
  }
  revalidatePath("/maintenance");
  return { ok: true, caseRecord: caseRow as MaintenanceCase, appointment };
}

const NoteInput = z.object({ id: z.string().min(1), note: z.string().min(1).max(2000) });
export type UpdateCaseResult = { ok: true; caseRecord: MaintenanceCase } | ActionFail;

/** Append a homeowner note to a case (own cases only via RLS). */
export async function addMaintenanceNote(raw: unknown): Promise<UpdateCaseResult> {
  const parsed = NoteInput.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid", message: "A note is required." };
  if (getDataMode() === "demo") return DEMO_FAIL;
  const c = await createClient();
  if (!c) return DEMO_FAIL;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to add a note." };
  const { data: existing, error: readErr } = await c.from("maintenance_cases").select("notes").eq("id", parsed.data.id).maybeSingle();
  if (readErr) return { ok: false, reason: "error", message: readErr.message };
  if (!existing) return { ok: false, reason: "error", message: "Case not found." };
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const notes = `${existing.notes ? `${existing.notes}\n` : ""}[${stamp}] ${parsed.data.note}`;
  const { data, error } = await c.from("maintenance_cases").update({ notes, updated_at: new Date().toISOString() }).eq("id", parsed.data.id).select("*").single();
  if (error) return { ok: false, reason: "error", message: error.message };
  revalidatePath(`/maintenance/${parsed.data.id}`);
  return { ok: true, caseRecord: data as MaintenanceCase };
}

/** Homeowner cancels a case that has not started: status → closed, note recorded. */
export async function cancelMaintenanceCase(raw: unknown): Promise<UpdateCaseResult> {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid", message: "Case id is required." };
  if (getDataMode() === "demo") return DEMO_FAIL;
  const c = await createClient();
  if (!c) return DEMO_FAIL;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to cancel a case." };
  const now = new Date().toISOString();
  const { data, error } = await c.from("maintenance_cases").update({ status: "closed", notes: `Cancelled by homeowner on ${now.slice(0, 10)}.`, updated_at: now })
    .eq("id", parsed.data.id).in("status", ["new", "reviewing", "scheduled"]).select("*").single();
  if (error) return { ok: false, reason: "error", message: error.message };
  await c.from("appointments").update({ status: "cancelled" }).eq("system_id", data.system_id).eq("status", "requested").like("notes", `%${parsed.data.id}%`);
  revalidatePath("/maintenance"); revalidatePath(`/maintenance/${parsed.data.id}`);
  return { ok: true, caseRecord: data as MaintenanceCase };
}
