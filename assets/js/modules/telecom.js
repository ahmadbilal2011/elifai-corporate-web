/**
 * Telecom section: four tabs with animated visuals (fibre route, DWDM,
 * rack certification, campus network), plus OTDR, cable and tracker cards.
 * Tabs rotate every 8 s while in view and stop once the visitor picks one.
 */

const INTERVAL = 8000;
const TIA = ["#2F6FE0", "#FF8A00", "#1FAE6F", "#8B5A2B", "#8C98A6", "#F2F2F2", "#E02424", "#1A1A1A", "#F5D000", "#8E44AD", "#F48FB1", "#22C3C3"];

export function initTelecom({ reducedMotion }) {
  const root = document.querySelector("[data-tel]");
  if (!root) return;
  const section = root.closest("section");
  const tabs = [...root.querySelectorAll("[data-tel-tab]")];
  const panels = [...root.querySelectorAll("[data-tel-panel]")];
  let index = 0, elapsed = 0, last = 0, onScreen = false, userPicked = false, hover = false, certTimer = 0, kmRaf = 0;

  if (reducedMotion) section.querySelectorAll("animateMotion").forEach((a) => a.remove());

  /* rack ports */
  const ports = [];
  root.querySelectorAll("[data-tel-ports]").forEach((row) => {
    for (let k = 0; k < Number(row.dataset.telPorts); k++) { const i = document.createElement("i"); row.append(i); ports.push(i); }
  });
  const cert = root.querySelector("[data-tel-cert]");
  function runCert() {
    clearInterval(certTimer);
    ports.forEach((p) => p.classList.remove("on", "fail"));
    let n = 0;
    const total = ports.length;
    const show = () => { if (cert) cert.textContent = `${n} / ${total}`; };
    if (reducedMotion) { ports.forEach((p) => p.classList.add("on")); n = total; show(); return; }
    certTimer = setInterval(() => {
      if (n >= total) { clearInterval(certTimer); return; }
      const p = ports[n];
      if (n === 41) { p.classList.add("fail"); setTimeout(() => { p.classList.remove("fail"); p.classList.add("on"); }, 900); }
      else p.classList.add("on");
      n++; show();
    }, 45);
  }

  /* km counter for the route */
  const km = root.querySelector("[data-tel-km]");
  function runKm() {
    if (!km) return;
    cancelAnimationFrame(kmRaf);
    const to = 4.8;
    if (reducedMotion) { km.textContent = `${to.toFixed(1)} km`; return; }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 3000);
      km.textContent = `${(to * (1 - Math.pow(1 - p, 3))).toFixed(1)} km`;
      if (p < 1) kmRaf = requestAnimationFrame(tick);
    };
    kmRaf = requestAnimationFrame(tick);
  }

  function show(i, focus) {
    index = (i + tabs.length) % tabs.length;
    elapsed = 0;
    tabs.forEach((tab, k) => {
      const on = k === index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      tab.style.setProperty("--p", 0);
    });
    panels.forEach((p, k) => {
      const on = k === index;
      p.hidden = !on;
      p.classList.remove("is-active");
      if (on) { void p.offsetWidth; p.classList.add("is-active"); }
    });
    if (focus) tabs[index].focus();
    if (index === 0) runKm();
    if (index === 2) runCert();
  }

  const pick = () => { userPicked = true; root.classList.add("is-picked"); };
  tabs.forEach((tab, k) => {
    tab.addEventListener("click", () => { pick(); show(k); });
    tab.addEventListener("keydown", (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (document.documentElement.dir === "rtl") { keys.ArrowRight = -1; keys.ArrowLeft = 1; }
      if (e.key in keys) { e.preventDefault(); pick(); show(index + keys[e.key], true); }
      if (e.key === "Home") { e.preventDefault(); pick(); show(0, true); }
      if (e.key === "End") { e.preventDefault(); pick(); show(tabs.length - 1, true); }
    });
  });
  root.addEventListener("pointerenter", () => { hover = true; });
  root.addEventListener("pointerleave", () => { hover = false; });

  /* cable cross-section: 12 colour-coded tubes of fibres */
  const cable = section.querySelector("[data-tel-cable]");
  if (cable) {
    const ns = "http://www.w3.org/2000/svg";
    const el = (name, attrs, parent) => { const n = document.createElementNS(ns, name); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.append(n); return n; };
    el("circle", { cx: 80, cy: 75, r: 68, class: "jacket" }, cable);
    const g = el("g", { class: "spin" }, cable);
    el("circle", { cx: 80, cy: 75, r: 16, class: "core" }, g);
    TIA.forEach((c, k) => {
      const a = (k / 12) * Math.PI * 2;
      const x = 80 + Math.cos(a) * 45, y = 75 + Math.sin(a) * 45;
      el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 10.5, fill: c, class: "tube" }, g);
      for (let f = 0; f < 6; f++) {
        const b = (f / 6) * Math.PI * 2 + k;
        const fib = el("circle", { cx: (x + Math.cos(b) * 5.2).toFixed(1), cy: (y + Math.sin(b) * 5.2).toFixed(1), r: 1.3, class: "fib" }, g);
        fib.style.setProperty("--d", `${((k * 6 + f) % 17) * 0.14}s`);
      }
    });
  }

  /* cards and flow: start animations when they scroll into view */
  const flow = section.querySelector("[data-tel-flow]");
  const setFlowWidth = () => { if (flow) flow.style.setProperty("--flow-w", `${flow.clientWidth}px`); };
  setFlowWidth();
  window.addEventListener("resize", setFlowWidth, { passive: true });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.35 });
  section.querySelectorAll(".tel-card").forEach((c) => io.observe(c));
  if (flow && !reducedMotion) io.observe(flow);

  if (reducedMotion) { section.querySelectorAll(".tel-card").forEach((c) => c.classList.add("in")); show(0); return; }

  let raf = 0;
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
  let started = false;
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && !started) { started = true; show(0); }
    if (onScreen && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }, { threshold: 0.25 }).observe(root);
}
