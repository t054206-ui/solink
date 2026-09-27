"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { Field, Input } from "@/components/ui/Form";

/**
 * Asks Supabase to email a password-reset link. The link comes back through
 * /auth/callback (type=recovery), which signs the person in and forwards to
 * /reset-password. The confirmation reads the same whether or not the address
 * has an account, so the form cannot be used to find out who is registered.
 */
export function ForgotPasswordForm({ expired = false }: { expired?: boolean }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(expired ? t("forgot.expired") : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) { setError(t("forgot.failed")); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=${encodeURIComponent("/reset-password")}`,
    });
    setBusy(false);
    if (error) setError(t("forgot.failed"));
    else setSent(true);
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="wipe">
        <h1 className="display text-[30px] text-fg sm:text-[34px]">{t("forgot.title")}</h1>
        <p className="mt-2 text-[14.5px] text-fg-secondary">{t("forgot.sub")}</p>
      </div>

      {sent ? (
        <p role="status" className="rounded-[var(--radius)] bg-good-soft px-3 py-2 text-[13px] text-good-fg">{t("forgot.sent")}</p>
      ) : (
        <>
          <Field label={t("auth.email")}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required className="h-11" />
          </Field>
          {error && <p role="alert" className="rounded-[var(--radius)] bg-critical-soft px-3 py-2 text-[13px] text-critical-fg">{error}</p>}
          <button
            type="submit"
            disabled={busy || !email.includes("@")}
            className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-[14.5px] font-medium text-brand-fg hover:bg-brand-hover disabled:bg-inset disabled:text-fg-muted"
          >
            {busy ? t("auth.wait") : t("forgot.send")}
            {!busy && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
          </button>
        </>
      )}

      <p className="text-center text-[13px] text-fg-muted">
        <Link href="/login" className="text-fg underline underline-offset-2">{t("forgot.back")}</Link>
      </p>
    </form>
  );
}
