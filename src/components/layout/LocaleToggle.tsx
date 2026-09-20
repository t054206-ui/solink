"use client";

import { useLocale } from "@/lib/i18n/provider";

/**
 * One button, two languages. It shows the language you would switch TO, which
 * is the convention every bilingual Kuwaiti app uses — an Arabic reader looks
 * for the word "English", not for a flag or a globe icon.
 */
export function LocaleToggle({ className = "" }: { className?: string }) {
  const { locale, t, toggle } = useLocale();
  return (
    <button
      type="button"
      onClick={toggle}
      lang={locale === "en" ? "ar" : "en"}
      aria-label={locale === "en" ? "التبديل إلى العربية" : "Switch to English"}
      className={`press inline-flex h-9 items-center rounded-full border border-border px-3.5 text-[13px] font-medium text-fg-secondary hover:border-border-strong hover:text-fg ${className}`}
    >
      {t("locale.switchTo")}
    </button>
  );
}
