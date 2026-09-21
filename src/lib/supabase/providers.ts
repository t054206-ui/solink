import "server-only";
import { publicEnv, isSupabaseConfigured } from "@/lib/config/env";

/**
 * Which sign-in providers the Supabase project has switched on.
 *
 * Supabase Auth publishes this at GET /auth/v1/settings, readable with the
 * public key. The sign-in pages ask before rendering "Continue with Google":
 * when the provider is off, Supabase's authorize endpoint answers a raw JSON
 * error page, and a button that leads there is a button that does nothing.
 * So the pages render it disabled with one plain sentence instead. Any failure
 * to read the settings is treated as "not enabled": Solink does not offer what
 * it cannot confirm.
 */
export async function googleSignInEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseAnonKey },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const json: unknown = await res.json();
    const external = (json as { external?: Record<string, unknown> } | null)?.external;
    return external?.google === true;
  } catch {
    return false;
  }
}
