import { isSupabaseConfigured } from "@/lib/config/env";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { Button } from "@/components/ui/Button";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create account" };

export default function SignupPage() {
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
  return <AuthForm mode="signup" />;
}
