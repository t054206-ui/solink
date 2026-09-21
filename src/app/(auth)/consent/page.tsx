import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasCurrentConsent } from "@/lib/legal/consent";
import { ConsentForm } from "@/components/auth/ConsentForm";

export const metadata = { title: "Before you continue" };

/**
 * One screen, once per version of the documents: read and accept the terms
 * and the privacy policy, including storage and processing outside Kuwait.
 * Reached from /auth/callback (a Google sign-in that skipped the sign-up
 * form) and from proxy.ts (an account that predates the documents). Someone
 * who already accepted, or who is not signed in, has no business here.
 */
export default async function ConsentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const nextPath = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  const c = await createClient();
  if (!c) redirect("/dashboard");
  const { data: { user } } = await c.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (hasCurrentConsent(user.user_metadata)) redirect(nextPath);
  return <ConsentForm nextPath={nextPath} email={user.email ?? ""} />;
}
