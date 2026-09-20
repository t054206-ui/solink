"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { Field, Input } from "@/components/ui/Form";
import { PasswordInput } from "./PasswordInput";

/**
 * Email + password auth via Supabase (browser client, anon key only).
 *
 * Sign-up asks for a name, an email, a password and the password again; the
 * second copy is checked here before anything is sent. Sign-in asks for email
 * and password. Both password fields carry the eye toggle.
 *
 * The redirect target arrives as a prop. Reading it here with useSearchParams()
 * would opt the component out of server rendering, and a sign-in page whose
 * form only exists after JavaScript loads is not a sign-in page. The pages read
 * ?next= and ?confirmed= on the server and hand them down.
 */
export function AuthForm({ mode, nextPath = "/dashboard", confirmed = false }: { mode: "login" | "signup"; nextPath?: string; confirmed?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(confirmed && mode === "login" ? t("auth.confirmed") : null);
  const [busy, setBusy] = useState(false);

  const mismatch = mode === "signup" && confirm.length > 0 && confirm !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setFieldError(null); setInfo(null);
    if (mode === "signup" && password !== confirm) { setFieldError(t("auth.mismatch")); return; }
    setBusy(true);
    const supabase = createClient();
    if (!supabase) { setError("Supabase is not configured."); setBusy(false); return; }
    if (mode === "signup") {
      // The confirmation link should bring people back to this site, not to the
      // Supabase project's default Site URL. The origin is read at click time so
      // the same code serves localhost, previews and production.
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/login?confirmed=1&next=${encodeURIComponent(nextPath)}` },
      });
      if (error) setError(error.message); else setInfo(t("auth.checkEmail"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else { router.push(nextPath); router.refresh(); }
    }
    setBusy(false);
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

      {error && <p role="alert" className="rounded-[var(--radius)] bg-critical-soft px-3 py-2 text-[13px] text-critical-fg">{error}</p>}
      {info && <p role="status" className="rounded-[var(--radius)] bg-good-soft px-3 py-2 text-[13px] text-good-fg">{info}</p>}

      <button
        type="submit"
        disabled={busy}
        className="press rise inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-[14.5px] font-medium text-brand-fg hover:bg-brand-hover disabled:bg-inset disabled:text-fg-muted"
        style={{ animationDelay: "220ms" }}
      >
        {busy ? t("auth.wait") : login ? t("auth.signin") : t("auth.create")}
        {!busy && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
      </button>

      <div className="rise flex flex-col items-center gap-2 text-center text-[13px] text-fg-muted" style={{ animationDelay: "300ms" }}>
        <p>
          {login ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <Link href={login ? signupHref : loginHref} className="text-fg underline underline-offset-2">{login ? t("auth.createOne") : t("auth.signin")}</Link>
        </p>
        <Link href="/" className="micro hover:text-fg">{t("auth.browse")}</Link>
      </div>
    </form>
  );
}
