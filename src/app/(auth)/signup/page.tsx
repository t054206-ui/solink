import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { Button } from "@/components/ui/Button";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
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
        <h1 className="text-2xl font-semibold tracking-tight">Create your Solink account</h1>
        <p className="mt-2 text-[14px] text-fg-secondary">Accounts require a connected Supabase project.</p>
        <PlaceholderNote k="SUPABASE_PROJECT" className="mt-5" />
        <Button href="/dashboard" className="mt-6 w-full">Continue in demo mode</Button>
      </div>
    );
  }
  return <AuthForm mode="signup" nextPath={nextPath} />;
}
