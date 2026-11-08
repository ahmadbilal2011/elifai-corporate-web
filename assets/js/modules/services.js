/**
 * Services: vertical tabs with an animated visual per service.
 * Rotates every 7 s while in view; stops for good once the visitor picks a tab.
 */
const INTERVAL = 7000;

export function initServices({ reducedMotion }) {
  const root = document.querySelector("[data-svc]");
  if (!root) return;
  const tabs = [...root.querySelectorAll("[data-svc-tab]")];
  const panels = [...root.querySelectorAll("[data-svc-panel]")];
  let index = 0, elapsed = 0, last = 0, raf = 0, onScreen = false, userPicked = false, hover = false;

  /* uptime bars: 30 days, one incident that turns green */
  const up = root.querySelector("[data-uptime]");
  if (up && !up.children.length) {
    for (let d = 0; d < 30; d++) {
      const i = document.createElement("i");
      i.style.setProperty("--d", d);
      if (d === 17) i.className = "is-incident";
      up.append(i);
    }
  }

  /* alert rain for the AIOps funnel */
  const rain = root.querySelector("[data-funnel-rain]");
  if (rain && !rain.children.length) {
    for (let k = 0; k < 26; k++) {
      const dot = document.createElement("i");
      dot.style.left = `${4 + Math.random() * 92}%`;
      dot.style.animationDelay = `${(Math.random() * 2.4).toFixed(2)}s`;
      dot.className = Math.random() < 0.25 ? "warn" : Math.random() < 0.2 ? "bad" : "";
      rain.append(dot);
    }
  }
  const count = root.querySelector("[data-funnel-count]");

  function show(i, focus) {
    index = (i + tabs.length) % tabs.length;
    elapsed = 0;
    tabs.forEach((t, k) => {
      const on = k === index;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      t.style.setProperty("--p", on ? 0 : 0);
    });
    panels.forEach((p, k) => {
      const on = k === index;
      p.hidden = !on;
      p.classList.toggle("is-active", false);
      if (on) { void p.offsetWidth; p.classList.add("is-active"); }
    });
    if (focus) tabs[index].focus();
    if (index === 1 && count) animateCount(count, 412);
  }

  function animateCount(el, to) {
    if (reducedMotion) { el.textContent = String(to); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 1400);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  tabs.forEach((t, k) => {
    t.addEventListener("click", () => { userPicked = true; root.classList.add("is-picked"); show(k); });
    t.addEventListener("keydown", (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (document.documentElement.dir === "rtl") { keys.ArrowRight = -1; keys.ArrowLeft = 1; }
      if (e.key in keys) { e.preventDefault(); userPicked = true; root.classList.add("is-picked"); show(index + keys[e.key], true); }
      if (e.key === "Home") { e.preventDefault(); show(0, true); }
      if (e.key === "End") { e.preventDefault(); show(tabs.length - 1, true); }
    });
  });
  root.addEventListener("pointerenter", () => { hover = true; });
  root.addEventListener("pointerleave", () => { hover = false; });

  if (reducedMotion) { show(0); return; }

  function frame(now) {
    const dt = last ? now - last : 0;
    last = now;
    if (!userPicked && !hover && onScreen && !document.hidden) {
      elapsed += dt;
      tabs[index].style.setProperty("--p", Math.min(1, elapsed / INTERVAL).toFixed(3));
      if (elapsed >= INTERVAL) show(index + 1);
    }
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }, { threshold: 0.3 }).observe(root);
  show(0);
}
