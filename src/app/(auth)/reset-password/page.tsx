import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ResetLinkInvalid } from "@/components/auth/ResetLinkInvalid";

export const metadata = { title: "Choose a new password" };

/** A reset link must have been opened within this long for the form to show. */
const RESET_WINDOW_SECONDS = 60 * 60;

/**
 * Reached from a reset email via /auth/callback, which has already signed the
 * person in. The form shows only when the session's most recent sign-in came
 * from an email link, within an hour of the current token being issued, read
 * from the signed token's `amr` and `iat` claims (they cannot be edited in the
 * browser). Someone who is merely signed in with a password or Google, for
 * instance at an unattended computer, gets the "request a new link" screen.
 */
export default async function ResetPasswordPage() {
  const c = await createClient();
  if (!c) return <ResetLinkInvalid />;
  const { data } = await c.auth.getClaims();
  const claims = data?.claims;
  const amr = (claims?.amr ?? []) as unknown[];
  const latest = amr
    .filter((e): e is { method: string; timestamp: number } => typeof e === "object" && e !== null && "method" in e && "timestamp" in e)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  const fromEmailLink =
    !!latest &&
    latest.method !== "password" &&
    latest.method !== "oauth" &&
    typeof claims?.iat === "number" &&
    claims.iat - latest.timestamp < RESET_WINDOW_SECONDS;
  return fromEmailLink ? <ResetPasswordForm /> : <ResetLinkInvalid />;
}
