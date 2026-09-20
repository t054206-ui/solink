"use client";

import { useCallback } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useT } from "@/lib/i18n/provider";
import { replayIntro } from "./introStore";

/**
 * Plays the opening again on demand.
 *
 * Hidden under prefers-reduced-motion, because offering a button whose only
 * function is to start an eleven second animation to someone who has asked for
 * less motion is not a courtesy. The same five explanations are on the hero as
 * plain text for exactly that reader.
 */
export function ReplayIntroButton() {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const onClick = useCallback(() => replayIntro(), []);

  if (reduced) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="press rounded-full border border-border px-3 py-1 text-[11.5px] text-fg-muted hover:border-border-strong hover:text-fg"
    >
      {t("intro.replay")}
    </button>
  );
}
