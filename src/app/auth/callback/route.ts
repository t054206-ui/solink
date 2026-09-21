import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCurrentConsent, newConsent } from "@/lib/legal/consent";

/**
 * Where Google (or any Supabase OAuth provider) sends the browser back.
 *
 * Supabase's PKCE flow lands here with ?code=; exchanging it for a session
 * sets the auth cookies on this response, and the browser continues to the
 * page it was heading for. Only a same-origin path is honoured for ?next=, the
 * same rule the sign-in pages apply. A missing code or a failed exchange goes
 * back to /login with a flag the form turns into a plain sentence.
 *
 * Consent: the sign-up form sends ?consent=1 only after the person ticked the
 * box, and that is recorded on the user here. Someone arriving without it,
 * for instance a new person who pressed Google on the sign-in page, is sent to
 * /consent to read and accept before anything else; proxy.ts enforces the same
 * rule for every protected route.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const raw = url.searchParams.get("next");
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  const consented = url.searchParams.get("consent") === "1";

  const fail = url.clone();
  fail.pathname = "/login";
  fail.search = "";
  fail.searchParams.set("error", "google");
  fail.searchParams.set("next", next);

  if (!code) return NextResponse.redirect(fail);
  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(fail);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  let hasConsent = hasCurrentConsent(data.user?.user_metadata);
  if (!hasConsent && consented) {
    const { error: updErr } = await supabase.auth.updateUser({ data: { consent: newConsent() } });
    hasConsent = !updErr;
  }

  const done = url.clone();
  done.search = "";
  if (hasConsent) {
    done.pathname = next;
  } else {
    done.pathname = "/consent";
    done.searchParams.set("next", next);
  }
  return NextResponse.redirect(done);
}
