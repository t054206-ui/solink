"use client";

import { useIntroOnScreen } from "./introStore";
import { IntroSequence } from "./IntroSequence";

/**
 * Mounts the opening when this browser has not seen it, and unmounts it when
 * the sequence says it is done. The server always renders nothing, so the
 * page's HTML is the site itself and the opening is something that arrives
 * over it rather than something the site waits behind.
 */
export function IntroHost() {
  return useIntroOnScreen() ? <IntroSequence /> : null;
}
