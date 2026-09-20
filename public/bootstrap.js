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
  } catch (e) {}
})();
