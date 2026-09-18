"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv, isSupabaseConfigured } from "@/lib/config/env";

/** Browser Supabase client. Returns null when Supabase is not configured (demo mode). */
export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
