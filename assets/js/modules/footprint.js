/** Footprint matrix: region cards highlight their map nodes; live local clocks. */
export function initFootprint() {
  const root = document.querySelector("[data-footprint]");
  if (!root) return;

  const map = root.querySelector(".fp-map");
  const cards = [...root.querySelectorAll("[data-target]")];

  function activate(region) {
    if (region) map.dataset.active = region;
    else delete map.dataset.active;
    cards.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.target === region)));
  }

  let pinned = null;
  cards.forEach((card) => {
    const region = card.dataset.target;
    card.addEventListener("mouseenter", () => activate(region));
    card.addEventListener("mouseleave", () => activate(pinned));
    card.addEventListener("focus", () => activate(region));
    card.addEventListener("blur", () => activate(pinned));
    card.addEventListener("click", () => {
      pinned = pinned === region ? null : region;
      activate(pinned ?? region);
    });
  });

  // Clocks
  const clocks = [...root.querySelectorAll("[data-clock]")];
  const formatters = clocks.map((el) => {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: el.dataset.clock, hour: "2-digit", minute: "2-digit", hour12: false,
      });
    } catch {
      return null;
    }
  });
  const labels = { "Asia/Karachi": "PKT", "Asia/Riyadh": "AST", UTC: "UTC" };
  function tick() {
    const now = new Date();
    clocks.forEach((el, i) => {
      const f = formatters[i];
      if (f) el.textContent = `${f.format(now)} ${labels[el.dataset.clock] || ""}`.trim();
    });
  }
  tick();
  setInterval(tick, 20000);
}
