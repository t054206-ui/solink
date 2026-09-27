"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { Field } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "./PasswordInput";

/** Sets a new password for the person the reset link signed in. */
export function ResetPasswordForm() {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError(t("auth.mismatch")); return; }
    const supabase = createClient();
    if (!supabase) { setError(t("forgot.failed")); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <h1 className="display text-[30px] text-fg sm:text-[34px]">{t("reset.title")}</h1>
        <p role="status" className="rounded-[var(--radius)] bg-good-soft px-3 py-2 text-[13px] text-good-fg">{t("reset.done")}</p>
        <Button href="/dashboard" size="lg" className="w-full">
          {t("reset.continue")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="wipe">
        <h1 className="display text-[30px] text-fg sm:text-[34px]">{t("reset.title")}</h1>
        <p className="mt-2 text-[14.5px] text-fg-secondary">{t("reset.sub")}</p>
      </div>
      <Field label={t("reset.new")} help={t("auth.min")}>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required className="h-11" />
      </Field>
      <Field label={t("auth.confirm")} error={mismatch ? t("auth.mismatch") : undefined}>
        <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required className="h-11" />
      </Field>
      {error && <p role="alert" className="rounded-[var(--radius)] bg-critical-soft px-3 py-2 text-[13px] text-critical-fg">{error}</p>}
      <button
        type="submit"
        disabled={busy || password.length < 8 || mismatch}
        className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-[14.5px] font-medium text-brand-fg hover:bg-brand-hover disabled:bg-inset disabled:text-fg-muted"
      >
        {busy ? t("auth.wait") : t("reset.save")}
        {!busy && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
      </button>
    </form>
  );
}
