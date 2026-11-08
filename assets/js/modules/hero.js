import { createSlider, pad2 } from "./slider.js";
import { createTopology, MODE_LABELS } from "./topology.js";
import { initHud } from "./hud.js";

export function initHero({ reducedMotion }) {
  const root = document.querySelector("[data-hero-slider]");
  if (!root) return;

  const slides = [...root.querySelectorAll("[data-slide]")];
  const tabs = [...root.querySelectorAll("[data-tab]")];
  const current = root.querySelector("[data-current]");
  const total = root.querySelector("[data-total]");
  const pauseBtn = root.querySelector("[data-pause]");
  total.textContent = pad2(slides.length);

  // Topology canvas
  const canvas = document.querySelector("[data-topology]");
  const modeLabel = document.querySelector("[data-console-mode]");
  const rLinks = document.querySelector("[data-r-links]");
  const rMsgs = document.querySelector("[data-r-msgs]");
  let topo = null;
  if (canvas && canvas.getContext) {
    topo = createTopology(canvas, {
      reducedMotion,
      onStats: ({ links, msgs }) => {
        if (rLinks) rLinks.textContent = links;
        if (rMsgs) rMsgs.textContent = msgs;
      },
    });
  }

  const hud = initHud({ reducedMotion });

  function render(next, prev) {
    const incoming = slides[next];
    const outgoing = slides[prev];

    // outgoing slide plays a short exit, then is hidden
    outgoing.classList.remove("is-active");
    if (!reducedMotion) {
      outgoing.classList.add("is-leaving");
      setTimeout(() => {
        outgoing.classList.remove("is-leaving");
        if (!outgoing.classList.contains("is-active")) outgoing.inert = true;
      }, 420);
    }
    outgoing.inert = true;
    incoming.inert = false;
    // restart entrance animation
    void incoming.offsetWidth;
    incoming.classList.add("is-active");

    current.textContent = pad2(next + 1);
    tabs.forEach((t, i) => {
      t.setAttribute("aria-selected", String(i === next));
      t.tabIndex = i === next ? 0 : -1;
    });

    const mode = incoming.dataset.mode;
    topo?.setMode(mode);
    if (modeLabel) modeLabel.textContent = MODE_LABELS[mode] || mode;
  }

  const slider = createSlider({
    root,
    count: slides.length,
    render,
    progress: root.querySelector("[data-progress]"),
    interval: 7500,
    reducedMotion,
  });

  root.querySelector("[data-next]").addEventListener("click", () => slider.next());
  root.querySelector("[data-prev]").addEventListener("click", () => slider.prev());
  tabs.forEach((t, i) => {
    t.tabIndex = i === 0 ? 0 : -1;
    t.addEventListener("click", () => slider.go(i));
  });

  if (reducedMotion) {
    pauseBtn.setAttribute("aria-pressed", "true");
    pauseBtn.setAttribute("aria-label", "Automatic rotation is off");
    pauseBtn.disabled = true;
  } else {
    pauseBtn.addEventListener("click", () => {
      const pressed = pauseBtn.getAttribute("aria-pressed") === "true";
      pauseBtn.setAttribute("aria-pressed", String(!pressed));
      pauseBtn.setAttribute("aria-label", pressed ? "Pause animation" : "Resume animation");
      slider.setUserPaused(!pressed);
      topo?.setPaused(!pressed);
      hud?.setPaused(!pressed);
    });
  }
}
