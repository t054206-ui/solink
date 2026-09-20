"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { DICTIONARIES, DIRECTION, type Dict, type DictKey, type Locale } from "./dictionary";

interface LocaleValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: DictKey) => string;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

const LocaleContext = createContext<LocaleValue | null>(null);

/**
 * Locale lives in localStorage rather than the URL, because demo mode has no
 * accounts and no server session to hang a preference on. The inline script in
 * the root layout applies lang/dir before first paint so an Arabic reader does
 * not watch the page flip direction. This effect keeps those attributes in sync
 * afterwards. It writes to the DOM, never to state, so
 * react-hooks/set-state-in-effect stays satisfied.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useLocalStore<Locale>("locale", "en");
  const dir = DIRECTION[locale] ?? "ltr";

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("lang", locale);
    el.setAttribute("dir", dir);
  }, [locale, dir]);

  const t = useCallback(
    (key: DictKey) => {
      const dict: Dict = DICTIONARIES[locale] ?? DICTIONARIES.en;
      return dict[key] ?? DICTIONARIES.en[key] ?? key;
    },
    [locale],
  );

  const toggle = useCallback(() => setLocale(locale === "en" ? "ar" : "en"), [locale, setLocale]);

  const value = useMemo<LocaleValue>(
    () => ({ locale, dir, t, setLocale, toggle }),
    [locale, dir, t, setLocale, toggle],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

/** Shorthand for the common case. */
export function useT(): (key: DictKey) => string {
  return useLocale().t;
}
