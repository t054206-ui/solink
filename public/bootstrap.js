/* Applies a stored theme/locale choice before paint. The server already renders
   the default (light, English, LTR), so this only has work to do for someone
   who previously chose dark or Arabic. Keys match useLocalStore. */
(function () {
  try {
    var d = document.documentElement;
    var t = JSON.parse(localStorage.getItem("solink:theme"));
    if (t === "dark") d.setAttribute("data-theme", "dark");
    else if (t === "system") d.removeAttribute("data-theme");
    var l = JSON.parse(localStorage.getItem("solink:locale"));
    if (l === "ar") {
      d.setAttribute("lang", "ar");
      d.setAttribute("dir", "rtl");
    }
    /* The opening. FREQUENCY mirrors INTRO_FREQUENCY in
       src/components/intro/introStore.ts and must change with it:
       "always" every page load, "session" once per tab, "once" once per
       browser. The attribute goes on before paint so a visitor never sees the
       landing page flash behind the opening; the overlay takes it off again
       when the sequence starts to leave. The timeout is a dead man's switch:
       without it, a browser that never gets as far as running React would
       hold the curtain up for ever. */
    var FREQUENCY = "always";
    var KEY = "solink:intro-seen-v2";
    var seen =
      FREQUENCY === "always" ? false
      : (FREQUENCY === "session" ? sessionStorage : localStorage).getItem(KEY) === "1";
    if (
      !seen &&
      !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      d.setAttribute("data-intro", "pending");
      setTimeout(function () {
        d.removeAttribute("data-intro");
      }, 16000);
    }
  } catch (e) {}
})();
