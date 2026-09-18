"use server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";
import type { OrderItem } from "./purchaseTypes";

type Fail = { ok: false; reason: "demo" | "unauthenticated" | "error"; message?: string };
type Client = NonNullable<Awaited<ReturnType<typeof createClient>>>;
type Ctx = { fail: Fail; c?: never; user?: never } | { fail?: never; c: Client; user: User };

async function userClient(): Promise<Ctx> {
  if (getDataMode() === "demo") return { fail: { ok: false, reason: "demo" } };
  const c = await createClient();
  if (!c) return { fail: { ok: false, reason: "demo" } };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { fail: { ok: false, reason: "unauthenticated", message: "Sign in to continue." } };
  return { c, user };
}

export interface CreateOrderInput {
  items: OrderItem[];
  totals: { value: number | null; currency: string; reason?: string };
  design_id: string | null;
  notes?: string;
}

/** Step 3 "Request a quote": creates an `orders` row with status `requested`. */
export async function createOrderAction(input: CreateOrderInput): Promise<{ ok: true; id: string } | Fail> {
  const r = await userClient();
  if (r.fail) return r.fail;
  const { data, error } = await r.c.from("orders").insert({
    user_id: r.user.id, status: "requested", items: input.items, totals: { ...input.totals, design_id: input.design_id },
    payment_provider: null, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, reason: "error", message: error.message };
  return { ok: true, id: data.id as string };
}

export interface ScheduleInstallationInput {
  order_id: string | null;
  installer_id: string;
  scheduled_at: string; // ISO
  notes?: string;
  system: {
    name: string; design_id: string | null; capacity_kwp: number | null; panel_count: number | null;
    panel_product_id: string | null; inverter_product_id: string | null; battery_product_id: string | null;
  };
}

/**
 * Step 5 "Schedule": creates a `solar_systems` row (status installation_scheduled), an
 * `appointments` row (kind installation, status requested) and links the order.
 */
export async function scheduleInstallationAction(input: ScheduleInstallationInput): Promise<{ ok: true; system_id: string; appointment_id: string } | Fail> {
  const r = await userClient();
  if (r.fail) return r.fail;
  const { c, user } = r;
  const { data: sys, error: e1 } = await c.from("solar_systems").insert({
    user_id: user.id, design_id: input.system.design_id, name: input.system.name, status: "installation_scheduled",
    capacity_kwp: input.system.capacity_kwp, panel_count: input.system.panel_count,
    panel_product_id: input.system.panel_product_id, inverter_product_id: input.system.inverter_product_id, battery_product_id: input.system.battery_product_id,
    installer_id: input.installer_id, installation_date: input.scheduled_at.slice(0, 10), is_demo: false,
  }).select("id").single();
  if (e1) return { ok: false, reason: "error", message: e1.message };
  const { data: appt, error: e2 } = await c.from("appointments").insert({
    user_id: user.id, system_id: sys.id, provider_id: input.installer_id, kind: "installation", scheduled_at: input.scheduled_at, status: "requested", notes: input.notes ?? null,
  }).select("id").single();
  if (e2) return { ok: false, reason: "error", message: e2.message };
  if (input.order_id) {
    await c.from("orders").update({ system_id: sys.id, installer_id: input.installer_id, status: "installation_scheduled" }).eq("id", input.order_id).eq("user_id", user.id);
  }
  return { ok: true, system_id: sys.id as string, appointment_id: appt.id as string };
}
