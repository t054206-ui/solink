"use server";
import { friendlyDbError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";
import type { SavedDesign } from "./designTypes";

export type SaveDesignResult = { ok: true; id: string } | { ok: false; reason: "demo" | "unauthenticated" | "error"; message?: string };

/**
 * Persist a design to `solar_designs` for the signed-in user.
 * In demo mode nothing is written server-side — the client stores it locally.
 */
export async function saveDesignAction(design: Omit<SavedDesign, "id" | "created_at">): Promise<SaveDesignResult> {
  if (getDataMode() === "demo") return { ok: false, reason: "demo" };
  const c = await createClient();
  if (!c) return { ok: false, reason: "demo" };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to save designs." };
  const { data, error } = await c.from("solar_designs").insert({
    user_id: user.id,
    name: design.name,
    roof: design.roof,
    panel_product_id: design.panel_product_id,
    layout: design.layout,
    summary: { ...design.summary, panel: design.panel, panel_name: design.panel_name, is_demo_product: design.is_demo_product, modules: design.modules ?? [] },
    is_ai_suggested: design.is_ai_suggested,
  }).select("id").single();
  if (error) return { ok: false, reason: "error", message: friendlyDbError(error) };
  return { ok: true, id: data.id as string };
}
