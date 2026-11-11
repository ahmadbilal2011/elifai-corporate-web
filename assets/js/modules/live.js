import { t, isAr, locale } from "./i18n.js?v=13";
/**
 * Small "live" touches that make each section feel current:
 *  - P1 SLA clock replay (Managed services)
 *  - day/night terminator and business-hours city markers (Footprint)
 *  - NOC rota "on shift now" badges (Team)
 *  - Gulf office open/closed state (Contact)
 */
const AGENTS = ["Sana Khan", "Ali Raza", "Fatima Malik", "Hamza Sheikh", "Emma Clarke", "Usman Javed", "Ayesha Butt", "Daniel Brooks"];

/* ---------------- time helpers ---------------- */
function partsIn(tz, d = new Date()) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const o = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return { h: Number(o.hour) % 24, m: Number(o.minute), wd: o.weekday };
}
const GULF_WEEKEND = new Set(["Fri", "Sat"]);
const WEST_WEEKEND = new Set(["Sat", "Sun"]);
function isBusinessHours(tz, d) {
  const { h, wd } = partsIn(tz, d);
  const weekend = tz.startsWith("Asia/") && !/Singapore/.test(tz) ? GULF_WEEKEND : WEST_WEEKEND;
  return !weekend.has(wd) && h >= 9 && h < 18;
}

/* ---------------- SLA clock ---------------- */
function initSlaClock({ reducedMotion }) {
  const box = document.querySelector("[data-slaclock]");
  if (!box) return;
  const ring = box.querySelector("[data-sc-ring]");
  const time = box.querySelector("[data-sc-time]");
  const steps = [...box.querySelectorAll("[data-sc-steps] li")];
  const agentEl = box.querySelector("[data-sc-agent]");
  const END = 690;          // incident resolved at 11:30
  const TARGET = 900;       // 15:00
  const SPEED = 60;         // 1 real second = 60 incident seconds
  let t0 = 0, raf = 0, running = false, holdUntil = 0, agentIx = 0;

  const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  function render(sec) {
    ring.style.strokeDashoffset = String(100 - (sec / TARGET) * 100);
    time.textContent = fmt(sec);
    steps.forEach((li) => {
      const at = Number(li.dataset.at);
      li.classList.toggle("is-done", sec >= at);
      li.classList.toggle("is-now", sec >= at && (steps[steps.indexOf(li) + 1] ? sec < Number(steps[steps.indexOf(li) + 1].dataset.at) : true));
    });
    box.classList.toggle("is-resolved", sec >= END);
  }
  if (reducedMotion) { render(END); return; }

  function frame(now) {
    if (now < holdUntil) { raf = requestAnimationFrame(frame); return; }
    if (!t0) {
      t0 = now;
      agentEl.textContent = AGENTS[agentIx++ % AGENTS.length];
    }
    const sec = Math.min(END, ((now - t0) / 1000) * SPEED);
    render(sec);
    if (sec >= END) { holdUntil = now + 3500; t0 = 0; }
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; t0 = 0; holdUntil = 0; raf = requestAnimationFrame(frame); }
    else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  }, { threshold: 0.3 }).observe(box);
  render(0);
}

/* ---------------- day/night on the world map ---------------- */
// Projection used to draw the map: lon -170..180, lat 72..-46, 1000 px wide.
const LON0 = -170, LAT0 = 72, K = 1000 / 350;
const X = (lon) => (lon - LON0) * K;
const Y = (lat) => (LAT0 - lat) * K;

function sunPosition(d) {
  const rad = Math.PI / 180;
  const jd = d.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = 23.439 * rad;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  let subLon = (ra / rad - gmst * 15) % 360;
  if (subLon > 180) subLon -= 360;
  if (subLon < -180) subLon += 360;
  return { dec, subLon };
}

function initNight() {
  const night = document.querySelector("[data-night]");
  const sun = document.querySelector("[data-sun]");
  const nodes = [...document.querySelectorAll(".fp-node[data-tz]")];
  if (!night) return;
  const rad = Math.PI / 180;

  function update() {
    const now = new Date();
    const { dec, subLon } = sunPosition(now);
    const t = Math.tan(dec) || 1e-6;
    const pts = [];
    for (let lon = LON0; lon <= 180; lon += 2) {
      const lat = Math.atan(-Math.cos((lon - subLon) * rad) / t) / rad;
      pts.push(`${X(lon).toFixed(1)} ${Y(Math.max(-46, Math.min(72, lat))).toFixed(1)}`);
    }
    // night lies away from the pole that has daylight
    const edge = dec > 0 ? Y(-46) + 2 : -2;
    night.setAttribute("d", `M${X(LON0)} ${edge} L${pts.join(" L")} L${X(180)} ${edge} Z`);
    const sLat = dec / rad;
    if (sun) {
      const inView = subLon >= LON0 && sLat <= 72 && sLat >= -46;
      sun.style.display = inView ? "" : "none";
      sun.setAttribute("transform", `translate(${X(subLon).toFixed(1)} ${Y(sLat).toFixed(1)})`);
    }
    nodes.forEach((g) => {
      const open = isBusinessHours(g.dataset.tz, now);
      g.classList.toggle("is-open", open);
      g.classList.toggle("is-closed", !open);
      const { h, m } = partsIn(g.dataset.tz, now);
      const title = g.querySelector("title");
      if (title) title.textContent = `${g.dataset.city}: ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} local, ${open ? "business hours" : "after hours"}`;
    });
  }
  update();
  setInterval(update, 60 * 1000);
}

/* ---------------- NOC rota ---------------- */
function initShifts() {
  const els = [...document.querySelectorAll("[data-shift]")];
  if (!els.length) return;
  function update() {
    const { h } = partsIn("Asia/Karachi");
    els.forEach((el) => {
      const [a, b] = el.dataset.shift.split("-").map(Number);
      const on = a < b ? h >= a && h < b : h >= a || h < b;
      el.classList.toggle("is-on", on);
      el.querySelector("[data-shift-text]").textContent = on
        ? t("On shift now")
        : `${t("Next shift")} ${String(a).padStart(2, "0")}:00 ${t("PKT")}`;
    });
  }
  update();
  setInterval(update, 60 * 1000);
}

/* ---------------- Gulf office hours ---------------- */
function initOffice() {
  const el = document.querySelector("[data-office]");
  if (!el) return;
  function update() {
    const open = isBusinessHours("Asia/Riyadh");
    const { h, m } = partsIn("Asia/Riyadh");
    el.classList.toggle("is-open", open);
    el.replaceChildren();
    el.append(document.createElement("i"));
    el.append(document.createTextNode(open
      ? `${t("Open now")} · ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${t("in Riyadh")}`
      : t("Closed now · opens 09:00 Riyadh time, Sunday to Thursday")));
  }
  update();
  setInterval(update, 60 * 1000);
}

export function initLive(ctx) {
  [initSlaClock, initNight, initShifts, initOffice].forEach((fn) => {
    try { fn(ctx); } catch (err) { console.error(`[elifai] ${fn.name} failed`, err); }
  });
}
