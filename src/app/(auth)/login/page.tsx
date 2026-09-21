import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";
import { googleSignInEnabled } from "@/lib/supabase/providers";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { Button } from "@/components/ui/Button";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  // Only a same-origin path is honoured; anything else falls back to the dashboard.
  const nextPath = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  // Someone already signed in has nowhere to go on this page but onward.
  const c = await createClient();
  if (c) {
    const { data: { user } } = await c.auth.getUser();
    if (user) redirect(nextPath);
  }
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-[14px] text-fg-secondary">Authentication requires a connected Supabase project. Until then, Solink runs in clearly labeled demo mode without accounts.</p>
        <PlaceholderNote k="SUPABASE_PROJECT" className="mt-5" />
        <Button href="/dashboard" className="mt-6 w-full">Continue in demo mode</Button>
      </div>
    );
  }
  const confirmed = (Array.isArray(sp.confirmed) ? sp.confirmed[0] : sp.confirmed) === "1";
  // /auth/callback sends the browser back here when a Google sign-in did not complete.
  const authError = (Array.isArray(sp.error) ? sp.error[0] : sp.error) === "google" ? "google" : null;
  const googleEnabled = await googleSignInEnabled();
  return <AuthForm mode="login" nextPath={nextPath} confirmed={confirmed} authError={authError} googleEnabled={googleEnabled} />;
}
