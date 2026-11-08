/* Runs before first paint: applies the saved light/dark choice (dark by default). */
(function () {
  var theme = "dark";
  try {
    var saved = localStorage.getItem("elifai-theme");
    if (saved === "light" || saved === "dark") theme = saved;
  } catch (e) { /* storage blocked: keep default */ }
  document.documentElement.setAttribute("data-theme", theme);
})();
