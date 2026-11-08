/** Platform matrix filter: highlights one group, dims the rest. */
export function initPlatforms() {
  const grid = document.querySelector("[data-plat-grid]");
  const buttons = [...document.querySelectorAll("[data-plat-filters] [data-filter]")];
  if (!grid || !buttons.length) return;

  buttons.forEach((btn) => btn.addEventListener("click", () => {
    const f = btn.dataset.filter;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    if (f === "all") delete grid.dataset.filter;
    else grid.dataset.filter = f;
  }));
}
