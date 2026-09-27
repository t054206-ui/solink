import { isSupabaseConfigured } from "@/lib/config/env";
import { Button } from "@/components/ui/Button";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-[14px] text-fg-secondary">Accounts need a connected Supabase project. Until then, Solink runs in demo mode without passwords.</p>
        <Button href="/dashboard" className="mt-6 w-full">Continue in demo mode</Button>
      </div>
    );
  }
  const sp = await searchParams;
  // /auth/callback sends the browser back here when a reset link no longer works.
  const expired = (Array.isArray(sp.error) ? sp.error[0] : sp.error) === "expired";
  return <ForgotPasswordForm expired={expired} />;
}
