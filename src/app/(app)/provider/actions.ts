"use server";
/**
 * Maintenance-provider server actions (Supabase mode only).
 *
 * Every action re-checks provider access on the server — the client is never
 * trusted — and writes are additionally scoped by RLS (maintenance_cases and
 * provider_prices are restricted to my_provider_id()).
 *
 * In demo mode there is no server to write to: the actions return
 * { ok: false, reason: "demo" } and the client persists the same record to this
 * browser instead (see _ops/localRecords.ts), so the homeowner pages show it too.
 *
 * Costs are SpecValue. A cost is either a positive amount or an explicit
 * { value: null, status: "unavailable" } — never 0, never assumed.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceStatus, SpecValue } from "@/lib/types";
import { getProviderAccess } from "./_lib/access";
import { canMoveTo, transitionReason } from "./_lib/workflow";
import { formatAvailability } from "./_lib/services";

export type ProviderActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string; reason: "demo" | "unauthorized" | "invalid" | "error" };

const DEMO_ERROR = "Supabase is not connected, so nothing can be saved on the server. The record is kept on this device only.";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;
type Gate = { c: SupabaseClient; userId: string; providerId: string } | { fail: ProviderActionResult };

async function gate(): Promise<Gate> {
  const access = await getProviderAccess();
  if (access.mode === "demo") return { fail: { ok: false, error: DEMO_ERROR, reason: "demo" } };
  if (!access.authorized || !access.providerId || !access.userId) {
    return { fail: { ok: false, error: access.reason ?? "Your account is not linked to a provider company.", reason: "unauthorized" } };
  }
  const c = await createClient();
  if (!c) return { fail: { ok: false, error: DEMO_ERROR, reason: "demo" } };
  return { c, userId: access.userId, providerId: access.providerId };
}

const STATUS = z.enum(["new", "reviewing", "scheduled", "in_progress", "resolved", "closed"]);
const KIND = z.enum(["cleaning", "inspection", "minor_maintenance", "repair", "replacement", "annual_maintenance"]);

const WorkRecordInput = z.object({
  id: z.string().min(1),
  appointment_at: z.string().datetime({ offset: true }).nullable(),
  technician_name: z.string().max(120).nullable(),
  work_performed: z.string().max(4000).nullable(),
  parts: z.string().max(2000).nullable(),
  cost_unavailable: z.boolean(),
  cost_value: z.number().positive().nullable(),
  status: STATUS,
  notes: z.string().max(4000).nullable(),
});

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

async function uploadImage(c: SupabaseClient, userId: string, file: File): Promise<{ path: string } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "Only image files are accepted." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Each image must be 8 MB or smaller." };
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await c.storage.from("maintenance-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `Image upload failed: ${error.message}` };
  return { path };
}

/**
 * Records the technician's work on a case assigned to the provider's company.
 * formData: the WorkRecordInput fields as strings, plus optional
 * "before_image" / "after_image" files (stored in maintenance-images/<userId>/).
 */
export async function saveWorkRecord(formData: FormData): Promise<ProviderActionResult> {
  const rawCost = text(formData, "cost_value");
  const parsed = WorkRecordInput.safeParse({
    id: formData.get("id"),
    appointment_at: text(formData, "appointment_at"),
    technician_name: text(formData, "technician_name"),
    work_performed: text(formData, "work_performed"),
    parts: text(formData, "parts"),
    cost_unavailable: formData.get("cost_unavailable") === "1",
    cost_value: rawCost === null ? null : Number(rawCost),
    status: formData.get("status"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) {
    return { ok: false, reason: "invalid", error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  const d = parsed.data;
  if (!d.cost_unavailable && d.cost_value === null) {
    return { ok: false, reason: "invalid", error: "Enter a cost above 0, or mark the cost as not provided." };
  }
  const cost: SpecValue = d.cost_unavailable || d.cost_value === null ? { value: null, status: "unavailable" } : { value: d.cost_value, unit: "KWD" };

  const g = await gate();
  if ("fail" in g) return g.fail;

  const { data: existing, error: readErr } = await g.c
    .from("maintenance_cases").select("id, status, system_id").eq("id", d.id).eq("provider_id", g.providerId).maybeSingle();
  if (readErr) return { ok: false, reason: "error", error: readErr.message };
  if (!existing) return { ok: false, reason: "unauthorized", error: "This case is not assigned to your company." };

  const from = existing.status as MaintenanceStatus;
  if (!canMoveTo(from, d.status)) {
    return { ok: false, reason: "invalid", error: transitionReason(from, d.status) ?? "That status change is not allowed." };
  }

  const update: Record<string, unknown> = {
    technician_name: d.technician_name, work_performed: d.work_performed, parts: d.parts,
    cost, status: d.status, notes: d.notes, updated_at: new Date().toISOString(),
  };
  if (d.appointment_at) update.appointment_at = d.appointment_at;

  for (const [field, column] of [["before_image", "before_image_path"], ["after_image", "after_image_path"]] as const) {
    const f = formData.get(field);
    if (!(f instanceof File) || f.size === 0) continue;
    const up = await uploadImage(g.c, g.userId, f);
    if ("error" in up) return { ok: false, reason: "invalid", error: up.error };
    update[column] = up.path;
  }

  const { error } = await g.c.from("maintenance_cases").update(update).eq("id", d.id).eq("provider_id", g.providerId);
  if (error) return { ok: false, reason: "error", error: error.message };

  if (d.appointment_at) {
    // Best effort: keep a linked appointment in step with the case.
    await g.c.from("appointments").update({ scheduled_at: d.appointment_at, status: "confirmed" })
      .eq("provider_id", g.providerId).like("notes", `%${d.id}%`);
  }

  revalidatePath("/provider");
  revalidatePath(`/provider/cases/${d.id}`);
  revalidatePath("/provider/appointments");
  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${d.id}`);
  return { ok: true, message: "Work record saved." };
}

const ServiceInput = z.object({
  service: KIND,
  price_unavailable: z.boolean(),
  price_value: z.number().positive().nullable(),
  days: z.array(z.number().int().min(0).max(6)).max(7),
  from: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")),
  to: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")),
});
export type ServiceInputT = z.infer<typeof ServiceInput>;

/**
 * Saves one row of the provider's price list (provider_prices). A price is
 * either a positive amount or an explicit "not provided" — homeowner-facing
 * maintenance estimates stay unavailable until a real price exists here.
 */
export async function saveProviderService(raw: unknown): Promise<ProviderActionResult> {
  const parsed = ServiceInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  const d = parsed.data;
  if (!d.price_unavailable && d.price_value === null) {
    return { ok: false, reason: "invalid", error: "Enter a price above 0, or leave it marked as not provided." };
  }
  if ((d.from && !d.to) || (d.to && !d.from)) {
    return { ok: false, reason: "invalid", error: "A time window needs both a start and an end time." };
  }
  const price: SpecValue = d.price_unavailable || d.price_value === null ? { value: null, status: "unavailable" } : { value: d.price_value, unit: "KWD" };
  const notes = formatAvailability({ days: d.days, from: d.from, to: d.to }) || null;

  const g = await gate();
  if ("fail" in g) return g.fail;

  const { data: existing, error: readErr } = await g.c
    .from("provider_prices").select("id").eq("provider_id", g.providerId).eq("service", d.service).maybeSingle();
  if (readErr) return { ok: false, reason: "error", error: readErr.message };

  const row = { provider_id: g.providerId, service: d.service, price, currency: "KWD", notes, updated_at: new Date().toISOString() };
  const { error } = existing
    ? await g.c.from("provider_prices").update(row).eq("id", existing.id)
    : await g.c.from("provider_prices").insert(row);
  if (error) return { ok: false, reason: "error", error: error.message };

  revalidatePath("/provider/services");
  revalidatePath("/maintenance");
  return { ok: true, message: price.value === null ? "Saved. The price stays unavailable until a figure is entered." : "Price and availability saved." };
}
