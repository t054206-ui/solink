"use server";
import { friendlyDbError } from "@/lib/api/errors";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";
import { sniffFileType } from "@/lib/files/sniffFileType";
import type { Incident } from "@/lib/types";

/**
 * Incident server actions.
 * Supabase mode: insert into incidents (user_id = signed-in user; RLS applies) and upload images to
 * storage bucket incident-images/<user_id>/… . Demo mode: { ok:false, reason:"demo" } → client stores locally.
 */
export type ActionFail = { ok: false; reason: "demo" | "unauthenticated" | "invalid" | "error"; message: string };
const DEMO_FAIL: ActionFail = { ok: false, reason: "demo", message: "Supabase is not connected; saving on this device only." };
const MAX_BYTES = 8 * 1024 * 1024;

const CreateIncidentInput = z.object({
  system_id: z.string().min(1),
  occurred_at: z.string().datetime({ offset: true }),
  panel_index: z.number().int().min(1).nullable(),
  reported_problem: z.string().min(3).max(2000),
});
export type CreateIncidentResult = { ok: true; incident: Incident } | ActionFail;

/** formData: fields of CreateIncidentInput as strings + zero or more "images" files. */
export async function createIncident(formData: FormData): Promise<CreateIncidentResult> {
  const rawPanel = String(formData.get("panel_index") ?? "").trim();
  const parsed = CreateIncidentInput.safeParse({
    system_id: formData.get("system_id"), occurred_at: formData.get("occurred_at"),
    panel_index: rawPanel === "" ? null : Number(rawPanel), reported_problem: formData.get("reported_problem"),
  });
  if (!parsed.success) return { ok: false, reason: "invalid", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  if (getDataMode() === "demo") return DEMO_FAIL;
  const c = await createClient();
  if (!c) return DEMO_FAIL;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to report an incident." };

  const images: string[] = [];
  for (const f of formData.getAll("images")) {
    if (!(f instanceof File) || f.size === 0) continue;
    if (!f.type.startsWith("image/")) return { ok: false, reason: "invalid", message: "Only image files are accepted." };
    if (f.size > MAX_BYTES) return { ok: false, reason: "invalid", message: "Each image must be 8 MB or smaller." };
    const sniffed = await sniffFileType(f);
    if (!sniffed || !sniffed.startsWith("image/")) return { ok: false, reason: "invalid", message: "One of those files' contents doesn't look like an image." };
    const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${user.id}/${Date.now()}-${safe}`;
    const { error } = await c.storage.from("incident-images").upload(path, f, { contentType: sniffed, upsert: false });
    if (error) return { ok: false, reason: "error", message: `Image upload failed: ${error.message}` };
    images.push(path);
  }

  const d = parsed.data;
  const { data, error } = await c.from("incidents").insert({
    system_id: d.system_id, user_id: user.id, panel_index: d.panel_index, occurred_at: d.occurred_at, reported_problem: d.reported_problem,
    images, status: "open", cost: { value: null, status: "unavailable" }, is_demo: false,
  }).select("*").single();
  if (error) return { ok: false, reason: "error", message: friendlyDbError(error) };
  revalidatePath("/incidents");
  return { ok: true, incident: data as Incident };
}
