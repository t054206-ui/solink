"use client";

import { useIntroOnScreen } from "./introStore";
import { IntroFilm } from "./film/IntroFilm";

/**
 * Mounts the opening when the store says it should be on screen, and unmounts
 * it when the film says it is done. The server always renders nothing, so the
 * page's HTML is the site itself and the opening is something that arrives
 * over it rather than something the site waits behind.
 */
export function IntroHost() {
  return useIntroOnScreen() ? <IntroFilm /> : null;
}
