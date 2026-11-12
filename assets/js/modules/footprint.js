import { t, isAr, locale } from "./i18n.js?v=15";
/**
 * Footprint map: region cards highlight the map, an automatic tour cycles
 * through the regions, packets travel along each link to and from the
 * Islamabad HQ, the HQ sends out a pulse, and local clocks tick.
 */
const SVGNS = "http://www.w3.org/2000/svg";
const LABELS = { pk: "Islamabad HQ", gcc: "Gulf", eu: "Europe", world: "Worldwide" };

export function initFootprint({ reducedMotion } = {}) {
  const root = document.querySelector("[data-footprint]");
  if (!root) return;

  const map = root.querySelector(".fp-map");
  const svg = map.querySelector("svg");
  const cards = [...root.querySelectorAll("[data-target]")];
  const status = map.querySelector("[data-fp-status]");
  const order = cards.map((c) => c.dataset.target);

  function openCount(region) {
    const g = svg.querySelector(`.fp-region[data-region="${region}"]`);
    if (!g) return null;
    const all = g.querySelectorAll(".fp-node").length;
    const open = g.querySelectorAll(".fp-node.is-open").length;
    return { all, open };
  }

  function activate(region) {
    // HQ highlights itself without dimming the rest of the world
    if (region && region !== "pk") map.dataset.active = region; else delete map.dataset.active;
    if (region === "pk") map.dataset.hq = "1"; else delete map.dataset.hq;
    cards.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.target === region)));
    if (!status) return;
    if (!region) { status.textContent = ""; return; }
    if (region === "pk") { status.textContent = t("Islamabad HQ · operations center staffed 24/7"); return; }
    const c = openCount(region);
    status.textContent = c ? `${t(LABELS[region])} · ${c.all} ${t("cities")} · ${c.open} ${t("in business hours now")}` : t(LABELS[region]);
  }

  /* hover / click / automatic tour */
  let pinned = null, hovering = false, tourIx = 0, tourTimer = 0;
  cards.forEach((card) => {
    const region = card.dataset.target;
    card.addEventListener("mouseenter", () => { hovering = true; activate(region); });
    card.addEventListener("mouseleave", () => { hovering = false; activate(pinned); });
    card.addEventListener("focus", () => activate(region));
    card.addEventListener("blur", () => activate(pinned));
    card.addEventListener("click", () => {
      pinned = pinned === region ? null : region;
      stopTour();
      activate(pinned ?? region);
    });
  });
  function stepTour() {
    if (hovering || pinned) return;
    activate(order[tourIx++ % order.length]);
  }
  function startTour() { if (!tourTimer && !pinned) { stepTour(); tourTimer = setInterval(stepTour, 4500); } }
  function stopTour() { clearInterval(tourTimer); tourTimer = 0; }

  /* packets traveling along the links */
  const layer = svg.querySelector("[data-fp-packets]");
  const pulses = svg.querySelector("[data-fp-pulses]");
  const links = [...svg.querySelectorAll(".fp-link")].map((path) => ({
    path, len: path.getTotalLength(), region: path.dataset.regionLink,
  }));
  const packets = [];
  function spawn(now) {
    const l = links[Math.floor(Math.random() * links.length)];
    if (!l || !layer) return;
    const c = document.createElementNS(SVGNS, "circle");
    const kind = Math.random();
    c.setAttribute("r", "2.6");
    c.setAttribute("class", kind < 0.8 ? "pk-ok" : kind < 0.93 ? "pk-warn" : "pk-bad");
    layer.append(c);
    // half the packets go out from HQ, half come back to it
    packets.push({ c, l, t0: now, dur: 1800 + Math.random() * 1600, back: Math.random() < 0.5 });
  }
  function pulse() {
    if (!pulses) return;
    const hq = svg.querySelector(".fp-hq");
    const m = /translate\(([\d.]+)[ ,]+([\d.]+)\)/.exec(hq?.getAttribute("transform") || "");
    if (!m) return;
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", m[1]); c.setAttribute("cy", m[2]); c.setAttribute("r", "6");
    c.setAttribute("class", "fp-pulse");
    pulses.append(c);
    setTimeout(() => c.remove(), 3000);
  }

  let raf = 0, lastSpawn = 0, lastPulse = 0, running = false;
  function frame(now) {
    if (now - lastSpawn > 260) { lastSpawn = now; spawn(now); }
    if (now - lastPulse > 2600) { lastPulse = now; pulse(); }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      let t = (now - p.t0) / p.dur;
      if (t >= 1) { p.c.remove(); packets.splice(i, 1); continue; }
      const along = p.back ? 1 - t : t;
      const pt = p.l.path.getPointAtLength(along * p.l.len);
      p.c.setAttribute("cx", pt.x.toFixed(1));
      p.c.setAttribute("cy", pt.y.toFixed(1));
      p.c.style.opacity = String(Math.sin(t * Math.PI));
      const active = map.dataset.active;
      p.c.classList.toggle("is-dim", Boolean(active) && active !== "pk" && p.l.region !== active);
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reducedMotion) return; running = true; raf = requestAnimationFrame(frame); startTour(); }
  function stop() { running = false; cancelAnimationFrame(raf); stopTour(); }
  new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()), { threshold: 0.2 }).observe(map);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });

  /* clocks */
  const clocks = [...root.querySelectorAll("[data-clock]")];
  const formatters = clocks.map((el) => {
    try {
      return new Intl.DateTimeFormat("en-GB", { timeZone: el.dataset.clock, hour: "2-digit", minute: "2-digit", hour12: false });
    } catch { return null; }
  });
  const labels = { "Asia/Karachi": "PKT", "Asia/Riyadh": "AST", "Europe/Paris": "CET", UTC: "UTC" };
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
