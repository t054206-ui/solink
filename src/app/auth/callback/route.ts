import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google (or any Supabase OAuth provider) sends the browser back.
 *
 * Supabase's PKCE flow lands here with ?code=; exchanging it for a session
 * sets the auth cookies on this response, and the browser continues to the
 * page it was heading for. Only a same-origin path is honoured for ?next=, the
 * same rule the sign-in pages apply. A missing code or a failed exchange goes
 * back to /login with a flag the form turns into a plain sentence.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const raw = url.searchParams.get("next");
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  const fail = url.clone();
  fail.pathname = "/login";
  fail.search = "";
  fail.searchParams.set("error", "google");
  fail.searchParams.set("next", next);

  if (!code) return NextResponse.redirect(fail);
  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(fail);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  const done = url.clone();
  done.pathname = next;
  done.search = "";
  return NextResponse.redirect(done);
}
