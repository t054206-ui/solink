import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ResetLinkInvalid } from "@/components/auth/ResetLinkInvalid";

export const metadata = { title: "Choose a new password" };

/**
 * Reached from a reset email via /auth/callback, which has already signed the
 * person in. Without that session there is no account to change, so the page
 * asks for a fresh link instead of showing a form that cannot work.
 */
export default async function ResetPasswordPage() {
  const c = await createClient();
  const user = c ? (await c.auth.getUser()).data.user : null;
  return user ? <ResetPasswordForm /> : <ResetLinkInvalid />;
}
