import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

/**
 * Sign-in gate for route handlers that spend money or return per-user data
 * (Claude, WeatherAPI, Google). The proxy does not cover /api, so without
 * this any visitor could call them. In demo mode there are no accounts, so
 * the gate lets the call through; the paid keys are normally absent there.
 * Returns the user, or the 401 response to send back.
 */
export async function requireUser(): Promise<{ user: { id: string } } | { response: Response }> {
  if (!isSupabaseConfigured()) return { user: { id: "demo" } };
  const c = await createClient();
  const { data: { user } } = c ? await c.auth.getUser() : { data: { user: null } };
  if (!user) return { response: Response.json({ ok: false, reason: "unauthenticated", message: "Sign in to use this." }, { status: 401 }) };
  return { user: { id: user.id } };
}
