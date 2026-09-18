"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";
import type { MonthlyReport } from "@/lib/types";

/**
 * Report server actions.
 * Supabase mode: upsert into reports (unique per system + month) for the signed-in user.
 * Demo mode: { ok:false, reason:"demo" } → the client keeps the generated report on this device.
 *
 * Server-side PDF generation is a future step; today "Download PDF" is the browser's print-to-PDF of a
 * print-styled view (see ReportView).
 */
export type ActionFail = { ok: false; reason: "demo" | "unauthenticated" | "invalid" | "error"; message: string };
export type SaveReportResult = { ok: true; report: MonthlyReport } | ActionFail;

const Input = z.object({
  system_id: z.string().min(1), month: z.string().regex(/^\d{4}-\d{2}$/),
  energy: z.unknown(), financial: z.unknown(), maintenance: z.unknown(), environmental: z.unknown(), ai: z.unknown(),
});

export async function saveReport(raw: unknown): Promise<SaveReportResult> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid", message: "Invalid report payload." };
  if (getDataMode() === "demo") return { ok: false, reason: "demo", message: "Supabase is not connected; the report is kept on this device only." };
  const c = await createClient();
  if (!c) return { ok: false, reason: "demo", message: "Supabase is not connected; the report is kept on this device only." };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to save reports." };
  const d = parsed.data;
  const { data, error } = await c.from("reports").upsert({ ...d, user_id: user.id, is_demo: false, generated_at: new Date().toISOString() }, { onConflict: "system_id,month" }).select("*").single();
  if (error) return { ok: false, reason: "error", message: error.message };
  revalidatePath("/reports");
  return { ok: true, report: data as MonthlyReport };
}
