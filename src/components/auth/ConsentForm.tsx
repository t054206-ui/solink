"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { newConsent } from "@/lib/legal/consent";

/**
 * The acceptance screen for people who are signed in without a consent
 * record. The same sentence as the sign-up checkbox, the same record written
 * to the user's metadata, then onward to where they were going.
 *
 * Accepting is mandatory (owner, 2026-09-22): there is no decline path on
 * this screen. Pressing Continue without the box ticked explains what is
 * missing instead of doing nothing.
 */
export function ConsentForm({ nextPath, email }: { nextPath: string; email: string }) {
  const t = useT();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!agreed) { setError(t("auth.consentRequired")); return; }
    setBusy(true); setError(null);
    const supabase = createClient();
    if (!supabase) { setError("Supabase is not configured."); setBusy(false); return; }
    const { error } = await supabase.auth.updateUser({ data: { consent: newConsent() } });
    if (error) { setError(error.message); setBusy(false); return; }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="wipe">
        <h1 className="display text-[30px] text-fg sm:text-[34px]">{t("auth.consentTitle")}</h1>
        <p className="mt-2 text-[14.5px] text-fg-secondary">{t("auth.consentSub")}</p>
        {email && <p className="mt-1 text-[12.5px] text-fg-muted" dir="ltr">{email}</p>}
      </div>
      <ConsentCheckbox id="consent-standalone" checked={agreed} onChange={(v) => { setAgreed(v); if (v) setError(null); }} />
      {error && <p id="consent-error" role="alert" className="rounded-[var(--radius)] bg-critical-soft px-3 py-2 text-[13px] text-critical-fg">{error}</p>}
      <button type="button" onClick={accept} disabled={busy} aria-describedby={error ? "consent-error" : undefined} className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-[14.5px] font-medium text-brand-fg hover:bg-brand-hover disabled:bg-inset disabled:text-fg-muted">
        {busy ? t("auth.wait") : t("auth.consentContinue")}
        {!busy && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
      </button>
    </div>
  );
}

/**
 * The one consent sentence, shared by the sign-up form and the standalone
 * screen: terms, privacy policy, and data stored and processed outside Kuwait.
 * A real checkbox, unticked by default, with the label wired to it.
 */
export function ConsentCheckbox({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius)] border border-border bg-elevated px-3 py-2.5 text-[12.5px] leading-relaxed text-fg-secondary has-[:checked]:border-[var(--brand)]">
      <input id={id} type="checkbox" required aria-required="true" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
      <span>
        {t("auth.consentPrefix")}{" "}
        <Link href="/terms" target="_blank" rel="noopener" className="text-fg underline underline-offset-2">{t("auth.agreeTerms")}</Link>{" "}
        {t("auth.consentMiddle")}{" "}
        <Link href="/privacy" target="_blank" rel="noopener" className="text-fg underline underline-offset-2">{t("auth.agreePrivacy")}</Link>
        {t("auth.consentSuffix")}
      </span>
    </label>
  );
}
