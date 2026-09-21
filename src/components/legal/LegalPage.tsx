"use client";

import Link from "next/link";
import { ArrowRight, ListTree } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";
import { useLocale } from "@/lib/i18n/provider";
import { LEGAL, LEGAL_TOKENS, LEGAL_UPDATED, LEGAL_VALUES, type LegalDoc, type LegalToken } from "@/lib/content/legal";
import type { Locale } from "@/lib/i18n/dictionary";

/**
 * One page component for /privacy and /terms.
 *
 * The same room as About and the Guide: eyebrow, display headline, a short
 * lead, then numbered sections down a single column with a table of contents
 * beside it on wide screens. Nothing is a card grid. The three values only the
 * owner can supply arrive in the copy as {operator}, {contact} and {law} and
 * are rendered with the product's own <Placeholder>, so an unfilled legal
 * document looks exactly like an unfilled tariff: impossible to mistake for
 * the real thing. The draft notice above the text uses the same dashed style.
 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t, locale } = useLocale();
  const d = LEGAL[doc];
  const other = LEGAL[doc === "privacy" ? "terms" : "privacy"];

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="grid-rule pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_40%,#000,transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-14 sm:px-6 lg:pb-16 lg:pt-20">
          <p className="micro wipe">{t("legal.eyebrow")}</p>
          <h1 className="display wipe mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4.2rem)] text-fg" style={{ animationDelay: "90ms" }}>
            {t(d.title)}
          </h1>
          <p className="wipe mt-5 max-w-2xl text-[16.5px] leading-relaxed text-fg-secondary" style={{ animationDelay: "180ms" }}>
            {t(d.sub)}
          </p>
          <p className="rise mt-6 flex items-center gap-2" style={{ animationDelay: "260ms" }}>
            <span className="micro">{t("legal.updated")}</span>
            <span className="tabular font-mono text-[12.5px] text-fg" dir="ltr">{LEGAL_UPDATED}</span>
          </p>
          <p
            className="rise mt-6 max-w-2xl rounded-[var(--radius)] border border-dashed border-[var(--cls-estimated)] bg-[var(--cls-estimated-soft)] px-3.5 py-3 font-mono text-[12px] leading-relaxed text-[var(--cls-estimated)]"
            style={{ animationDelay: "320ms" }}
          >
            {t("legal.draft")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <Toc label={t("legal.toc")} entries={d.sections.map((s, i) => ({ href: `#${s.id}`, label: t(s.title), n: i + 1 }))} />

          <div className="min-w-0 max-w-3xl">
            {d.sections.map((s, i) => (
              <section key={s.id} id={s.id} className={`scroll-mt-24 border-t border-border pt-6 ${i === 0 ? "" : "mt-10"}`}>
                <div className="flex items-baseline gap-3">
                  <span className="micro text-[color:var(--sun-ink)]">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[24px]">{t(s.title)}</h2>
                </div>
                <div className="mt-4 space-y-4">
                  {s.body.map((k) => (
                    <p key={k} className="text-[15px] leading-relaxed text-fg-secondary">
                      <Tokens text={t(k)} locale={locale} />
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <div className="mt-14 border-t border-border pt-6">
              <p className="micro">{t("legal.seeAlso")}</p>
              <Link href={other.path} className="press mt-3 inline-flex items-center gap-2 text-[15px] font-medium text-fg underline-offset-4 hover:underline">
                {t(other.title)}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Replaces {operator}, {contact} and {law} in a paragraph with the owner's
 * value for the current language, or with the product's placeholder marker
 * while a value is still null. The contact address becomes a mailto link.
 */
function Tokens({ text, locale }: { text: string; locale: Locale }) {
  const parts = text.split(/(\{(?:operator|contact|law)\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\{(operator|contact|law)\}$/.exec(part);
        if (!m) return <span key={i}>{part}</span>;
        const token = m[1] as LegalToken;
        const v = LEGAL_VALUES[token];
        if (!v) return <Placeholder key={i} k={LEGAL_TOKENS[token]} className="mx-0.5" />;
        const value = locale === "ar" ? v.ar : v.en;
        if (token === "contact") return <a key={i} href={`mailto:${value}`} className="text-fg underline underline-offset-2" dir="ltr">{value}</a>;
        return <span key={i} className="text-fg">{value}</span>;
      })}
    </>
  );
}

interface TocEntry { href: string; label: string; n: number }

function TocList({ entries }: { entries: TocEntry[] }) {
  return (
    <ol className="space-y-0.5">
      {entries.map((e) => (
        <li key={e.href}>
          <Link href={e.href} className="flex gap-2 rounded-md px-2 py-1.5 text-[13px] leading-snug text-fg-secondary hover:bg-inset hover:text-fg">
            <span aria-hidden="true" className="w-5 shrink-0 text-end tabular font-mono text-[11.5px] text-fg-muted">
              {String(e.n).padStart(2, "0")}
            </span>
            <span className="min-w-0">{e.label}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Same shape as the Guide's table of contents, with bilingual labels. */
function Toc({ label, entries }: { label: string; entries: TocEntry[] }) {
  return (
    <>
      <details className="rounded-[var(--radius-lg)] border border-border bg-elevated lg:hidden">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-[14px] font-semibold text-fg marker:text-fg-muted">
          <ListTree className="size-4 text-[var(--brand-strong)]" aria-hidden="true" />
          {label}
        </summary>
        <nav aria-label={label} className="border-t border-border px-2 py-2">
          <TocList entries={entries} />
        </nav>
      </details>
      <nav aria-label={label} className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto pe-2 lg:block">
        <div className="micro px-2 pb-2">{label}</div>
        <TocList entries={entries} />
      </nav>
    </>
  );
}
