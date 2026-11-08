/*
 * Runs before first paint.
 * Default theme follows the visitor's local clock: dark from 19:00 until 03:00,
 * light the rest of the day. A theme picked with the toggle overrides this for
 * the current browser session only, so the next visit follows the clock again.
 */
(function () {
  var h = new Date().getHours();
  var theme = (h >= 19 || h < 3) ? "dark" : "light";
  try {
    var manual = sessionStorage.getItem("elifai-theme");
    if (manual === "light" || manual === "dark") theme = manual;
  } catch (e) { /* storage blocked: keep the clock-based theme */ }
  document.documentElement.setAttribute("data-theme", theme);
})();
