import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasCurrentConsent } from "@/lib/legal/consent";

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/placement", "/analysis", "/calculator",
  "/recommend", "/designer", "/purchase", "/passport", "/monitoring", "/maintenance", "/incidents",
  "/reports", "/performance", "/replacement", "/agent", "/notifications", "/provider", "/manufacturer", "/admin"];

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated users away from protected routes.
 * When Supabase is not configured, the app runs in local demo mode and no
 * redirect happens (the UI shows a clear DEMO MODE banner instead).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }
  // Signed in, but has not accepted the current terms and privacy policy
  // (an account from before the documents existed, or a Google sign-in that
  // skipped the sign-up form): read and accept first. One screen, once per
  // version of the documents.
  if (user && isProtected && !hasCurrentConsent(user.user_metadata)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/consent";
    redirect.search = "";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
