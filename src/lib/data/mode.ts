import { isSupabaseConfigured } from "@/lib/config/env";

export type DataMode = "supabase" | "demo";

/** Which backing store the repositories use. Demo mode is always clearly labeled in the UI. */
export function getDataMode(): DataMode {
  return isSupabaseConfigured() ? "supabase" : "demo";
}
