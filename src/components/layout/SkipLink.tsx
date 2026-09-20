"use client";

import { useT } from "@/lib/i18n/provider";

/**
 * First thing a keyboard user reaches, invisible until focused. It has to
 * follow the language switch like everything else — a skip link that stays in
 * English on an Arabic page is the one control a screen-reader user most needs
 * to understand.
 */
export function SkipLink() {
  const t = useT();
  return (
    <a href="#main" className="skip-link">
      {t("nav.skip")}
    </a>
  );
}
