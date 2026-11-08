import { createSlider, pad2 } from "./slider.js?v=7";

export function initEngagements({ reducedMotion }) {
  const root = document.querySelector("[data-eng-slider]");
  if (!root) return;

  const slides = [...root.querySelectorAll("[data-eng-slide]")];
  const filters = [...document.querySelectorAll("[data-eng-filters] [data-go]")];
  const current = root.querySelector("[data-eng-current]");
  root.querySelector("[data-eng-total]").textContent = pad2(slides.length);

  let cleanup = 0;

  function render(next, prev, dir) {
    clearTimeout(cleanup);
    slides.forEach((s, i) => {
      s.classList.remove("is-under", "is-entering", "from-left");
      if (i !== next && i !== prev) { s.classList.remove("is-active"); s.inert = true; }
    });

    const incoming = slides[next];
    const outgoing = slides[prev];

    outgoing.classList.remove("is-active");
    outgoing.inert = true;
    incoming.inert = false;

    if (reducedMotion) {
      incoming.classList.add("is-active");
    } else {
      // keep the old slide underneath while the new one wipes across it
      outgoing.classList.add("is-under");
      incoming.classList.add("is-active", "is-entering");
      if (dir < 0) incoming.classList.add("from-left");
      cleanup = setTimeout(() => {
        outgoing.classList.remove("is-under");
        incoming.classList.remove("is-entering", "from-left");
      }, 950);
    }

    current.textContent = pad2(next + 1);
    filters.forEach((f) => {
      const on = Number(f.dataset.go) === next;
      f.setAttribute("aria-selected", String(on));
      f.tabIndex = on ? 0 : -1;
    });
  }

  const slider = createSlider({
    root,
    count: slides.length,
    render,
    progress: root.querySelector("[data-eng-progress]"),
    interval: 9000,
    reducedMotion,
  });

  root.querySelector("[data-eng-next]").addEventListener("click", () => slider.next());
  root.querySelector("[data-eng-prev]").addEventListener("click", () => slider.prev());
  filters.forEach((f, i) => {
    f.tabIndex = i === 0 ? 0 : -1;
    f.addEventListener("click", () => slider.go(Number(f.dataset.go)));
    f.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const n = (i + (e.key === "ArrowRight" ? 1 : -1) + filters.length) % filters.length;
      filters[n].focus();
      slider.go(n);
    });
  });
}
