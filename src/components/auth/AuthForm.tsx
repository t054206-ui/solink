"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { Field, Input } from "@/components/ui/Form";
import { PasswordInput } from "./PasswordInput";
import { ConsentCheckbox } from "./ConsentForm";
import { newConsent } from "@/lib/legal/consent";

/**
 * Email + password auth via Supabase (browser client, anon key only), and
 * Google through Supabase's OAuth flow.
 *
 * Sign-up asks for a name, an email, a password and the password again; the
 * second copy is checked here before anything is sent. Sign-in asks for email
 * and password. Both password fields carry the eye toggle.
 *
 * Sign-up requires one explicit tick: terms, privacy policy, and data stored and
 * processed outside Kuwait. Both buttons stay disabled until it is ticked, and
 * the tick is recorded on the user (metadata `consent`, versioned by the date
 * of the documents). See lib/legal/consent.ts.
 *
 * "Continue with Google" calls signInWithOAuth and comes back through
 * /auth/callback, which exchanges the code for a session and forwards to
 * nextPath. The pages ask Supabase whether the Google provider is enabled
 * (lib/supabase/providers.ts) and pass the answer down: when it is not, the
 * button renders disabled with one plain sentence under it, because the
 * alternative is Supabase's raw JSON error page, and a button that does
 * nothing must say why.
 *
 * The redirect target arrives as a prop. Reading it here with useSearchParams()
 * would opt the component out of server rendering, and a sign-in page whose
 * form only exists after JavaScript loads is not a sign-in page. The pages read
 * ?next=, ?confirmed= and ?error= on the server and hand them down.
 */
export function AuthForm({
  mode,
  nextPath = "/dashboard",
  confirmed = false,
  authError = null,
  googleEnabled = false,
}: {
  mode: "login" | "signup";
  nextPath?: string;
  confirmed?: boolean;
  /** Set by the pages when /auth/callback sent the browser back with ?error=. */
  authError?: "google" | null;
  /** Read from Supabase's public settings by the page; false disables the button. */
  googleEnabled?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(authError === "google" ? t("auth.googleFailed") : null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(confirmed && mode === "login" ? t("auth.confirmed") : null);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const mismatch = mode === "signup" && confirm.length > 0 && confirm !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setFieldError(null); setInfo(null);
    if (mode === "signup" && password !== confirm) { setFieldError(t("auth.mismatch")); return; }
    if (mode === "signup" && !agreed) { setError(t("auth.consentRequired")); return; }
    setBusy(true);
    const supabase = createClient();
    if (!supabase) { setError("Supabase is not configured."); setBusy(false); return; }
    if (mode === "signup") {
      // The confirmation link should bring people back to this site, not to the
      // Supabase project's default Site URL. The origin is read at click time so
      // the same code serves localhost, previews and production.
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name.trim(), consent: newConsent() }, emailRedirectTo: `${window.location.origin}/login?confirmed=1&next=${encodeURIComponent(nextPath)}` },
      });
      if (error) setError(error.message); else setInfo(t("auth.checkEmail"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else { router.push(nextPath); router.refresh(); }
    }
    setBusy(false);
  }

  async function google() {
    setError(null); setFieldError(null); setInfo(null);
    if (mode === "signup" && !agreed) { setError(t("auth.consentRequired")); return; }
    setBusy(true);
    const supabase = createClient();
    if (!supabase) { setError("Supabase is not configured."); setBusy(false); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // The callback records consent only when the box was ticked here; a
      // sign-in that turns out to be a new account is sent to /consent instead.
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}${mode === "signup" && agreed ? "&consent=1" : ""}` },
    });
    // On success the browser is already leaving for Google; only the failure
    // path reaches the next line.
    if (error) {
      setError(/not enabled|unsupported provider/i.test(error.message) ? t("auth.googleUnavailable") : error.message);
      setBusy(false);
    }
  }

  const login = mode === "login";
  const signupHref = nextPath === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`;
  const loginHref = nextPath === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="wipe">
        <h1 className="display text-[30px] text-fg sm:text-[34px]">{login ? t("auth.loginTitle") : t("auth.signupTitle")}</h1>
        <p className="mt-2 text-[14.5px] text-fg-secondary">{login ? t("auth.loginSub") : t("auth.signupSub")}</p>
      </div>

      <div className="rise grid gap-4" style={{ animationDelay: "120ms" }}>
        {!login && (
          <Field label={t("auth.fullName")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required className="h-11" />
          </Field>
        )}
        <Field label={t("auth.email")}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required className="h-11" />
        </Field>
        <Field label={t("auth.password")} help={login ? undefined : t("auth.min")}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={login ? "current-password" : "new-password"} minLength={8} required className="h-11" />
        </Field>
        {!login && (
          <Field label={t("auth.confirm")} error={fieldError ?? (mismatch ? t("auth.mismatch") : undefined)}>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required className="h-11" />
          </Field>
        )}
      </div>

      {!login && <div className="rise" style={{ animationDelay: "200ms" }}><ConsentCheckbox id="consent-signup" checked={agreed} onChange={setAgreed} /></div>}

      {error && <p role="alert" className="rounded-[var(--radius)] bg-critical-soft px-3 py-2 text-[13px] text-critical-fg">{error}</p>}
      {info && <p role="status" className="rounded-[var(--radius)] bg-good-soft px-3 py-2 text-[13px] text-good-fg">{info}</p>}

      <button
        type="submit"
        disabled={busy || (!login && !agreed)}
        className="press rise inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-[14.5px] font-medium text-brand-fg hover:bg-brand-hover disabled:bg-inset disabled:text-fg-muted"
        style={{ animationDelay: "220ms" }}
      >
        {busy ? t("auth.wait") : login ? t("auth.signin") : t("auth.create")}
        {!busy && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
      </button>

      <div className="rise flex items-center gap-3" style={{ animationDelay: "250ms" }} aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="micro">{t("auth.or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="rise grid gap-2" style={{ animationDelay: "280ms" }}>
        <button
          type="button"
          onClick={google}
          disabled={busy || !googleEnabled || (!login && !agreed)}
          aria-describedby={googleEnabled ? undefined : "google-unavailable"}
          className="press inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-border-strong bg-elevated text-[14.5px] font-medium text-fg hover:bg-inset disabled:border-border disabled:bg-inset disabled:text-fg-muted"
        >
          <GoogleMark muted={!googleEnabled} />
          {t("auth.google")}
        </button>
        {!googleEnabled && (
          <p id="google-unavailable" className="text-center text-[12px] leading-relaxed text-fg-muted">{t("auth.googleUnavailable")}</p>
        )}
      </div>

      <div className="rise flex flex-col items-center gap-3 text-center text-[13px] text-fg-muted" style={{ animationDelay: "330ms" }}>
        <p>
          {login ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <Link href={login ? signupHref : loginHref} className="text-fg underline underline-offset-2">{login ? t("auth.createOne") : t("auth.signin")}</Link>
        </p>
        {/* The site is not locked behind an account. A real link, readable at a
            glance, one step quieter than the two buttons above it. When the
            gate sent them here with a real destination (nextPath is not the
            plain-visit default of /dashboard), browsing returns them there
            instead of the homepage — otherwise a guest hitting a protected
            page and clicking this loops straight back to the same gate. */}
        <Link href={nextPath !== "/dashboard" ? nextPath : "/"} className="press inline-flex items-center gap-1.5 text-[13.5px] font-medium text-fg-secondary hover:text-fg">
          {t("auth.browse")}
          <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </form>
  );
}

/** Google's "G", the four brand colours, drawn inline so it needs no asset. Greys out with a disabled button. */
function GoogleMark({ muted = false }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={`size-[18px] shrink-0 ${muted ? "opacity-40 grayscale" : ""}`} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
