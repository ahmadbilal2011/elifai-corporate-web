/** Light / dark theme toggle. Saves the choice and tells the canvas to repaint. */
export function initTheme() {
  const root = document.documentElement;
  const buttons = document.querySelectorAll("[data-theme-toggle]");
  const metas = document.querySelectorAll('meta[name="theme-color"]');

  function apply(theme, animate) {
    if (animate) {
      root.classList.add("theme-anim");
      setTimeout(() => root.classList.remove("theme-anim"), 400);
    }
    root.setAttribute("data-theme", theme);
    metas.forEach((m) => m.setAttribute("content", theme === "light" ? "#F5F6F8" : "#080A0F"));
    buttons.forEach((b) => b.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode"));
    try { localStorage.setItem("elifai-theme", theme); } catch { /* ignore */ }
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }

  apply(root.getAttribute("data-theme") === "light" ? "light" : "dark", false);
  buttons.forEach((b) => b.addEventListener("click", () => {
    apply(root.getAttribute("data-theme") === "light" ? "dark" : "light", true);
  }));
}
