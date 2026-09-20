import { isSupabaseConfigured } from "@/lib/config/env";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { Button } from "@/components/ui/Button";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  // Only a same-origin path is honoured; anything else falls back to the dashboard.
  const nextPath = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
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
  return <AuthForm mode="login" nextPath={nextPath} />;
}
