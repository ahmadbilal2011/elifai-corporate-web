import { t, isAr, locale } from "./i18n.js?v=13";
/**
 * Light / dark theme.
 * Default: dark between 19:00 and 03:00 local time, light otherwise, re-checked
 * every minute so an open tab changes over at the boundary. A choice made with the
 * toggle is kept for this browser session and stops the automatic switching.
 */
const KEY = "elifai-theme";

export const themeForHour = (h) => (h >= 19 || h < 3 ? "dark" : "light");

export function initTheme() {
  const root = document.documentElement;
  const buttons = document.querySelectorAll("[data-theme-toggle]");
  const metas = document.querySelectorAll('meta[name="theme-color"]');

  const manual = () => {
    try { return sessionStorage.getItem(KEY); } catch { return null; }
  };

  function apply(theme, animate) {
    if (root.getAttribute("data-theme") === theme && !animate) {
      sync(theme);
      return;
    }
    if (animate) {
      root.classList.add("theme-anim");
      setTimeout(() => root.classList.remove("theme-anim"), 400);
    }
    root.setAttribute("data-theme", theme);
    sync(theme);
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }

  function sync(theme) {
    metas.forEach((m) => m.setAttribute("content", theme === "light" ? "#F6F7F9" : "#0C1219"));
    buttons.forEach((b) => {
      b.setAttribute("aria-label", theme === "light" ? t("Switch to dark mode") : t("Switch to light mode"));
      b.title = manual() ? t("Theme chosen for this visit") : t("Theme follows the time of day: dark 7 pm to 3 am");
    });
  }

  apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

  buttons.forEach((b) => b.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    try { sessionStorage.setItem(KEY, next); } catch { /* ignore */ }
    apply(next, true);
  }));

  // Follow the clock while the page stays open, unless the visitor chose a theme
  setInterval(() => {
    if (manual()) return;
    const want = themeForHour(new Date().getHours());
    if (root.getAttribute("data-theme") !== want) apply(want, true);
  }, 60 * 1000);
}
