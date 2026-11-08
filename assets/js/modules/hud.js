/**
 * Operations-wall HUD around the topology canvas:
 * radar threat sweep, streaming throughput graph, cluster load bars,
 * a scrolling security-event log and live counters.
 * All data is simulated for the showcase. IPs use the RFC 5737
 * documentation ranges, so no real address is ever shown.
 */

const IPS = ["203.0.113.", "198.51.100.", "192.0.2."];
const ip = () => IPS[Math.floor(Math.random() * 3)] + (2 + Math.floor(Math.random() * 250));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const EVENTS = [
  () => ["block", "WAF", `SQLi probe blocked ${ip()}`],
  () => ["block", "IDS", `SSH brute-force dropped ${ip()}`],
  () => ["block", "FW", `Geo-block rule hit ${ip()}`],
  () => ["block", "EDR", `Dropper quarantined wks-${100 + Math.floor(Math.random() * 80)}`],
  () => ["block", "DNS", `C2 domain sinkholed`],
  () => ["ok", "TLS", `Cert rotated ${pick(["api", "portal", "sso", "erp"])}.demo`],
  () => ["ok", "IAM", `MFA passed ops-noc-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}`],
  () => ["ok", "PATCH", `${pick(["RHEL 9", "Ubuntu 24.04", "RHEL 8"])} wave ${1 + Math.floor(Math.random() * 4)} done`],
  () => ["info", "SIEM", `${6 + Math.floor(Math.random() * 30)} events → 1 case`],
  () => ["info", "AIOPS", `Anomaly scored ${(0.6 + Math.random() * 0.39).toFixed(2)}`],
  () => ["info", "DLP", `Upload held for review`],
];

function hexToRgb(v, fb) {
  const m = (v || "").trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return fb;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function initHud({ reducedMotion }) {
  const root = document.querySelector("[data-hud]");
  if (!root) return null;

  const radar = root.querySelector("[data-radar]");
  const stream = root.querySelector("[data-stream]");
  const bars = [...root.querySelectorAll("[data-bars] li")];
  const log = root.querySelector("[data-seclog]");
  const el = (k) => root.querySelector(`[data-h-${k}]`);
  const out = { rps: el("rps"), p95: el("p95"), err: el("err"), threats: el("threats"), blocked: el("blocked") };

  let C;
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    C = {
      red: hexToRgb(cs.getPropertyValue("--red"), [209, 0, 0]),
      accent: hexToRgb(cs.getPropertyValue("--accent"), [255, 153, 0]),
      ok: hexToRgb(cs.getPropertyValue("--emerald"), [61, 220, 151]),
      line: document.documentElement.dataset.theme === "light" ? [20, 28, 39] : [160, 174, 196],
    };
  }
  colors();
  document.addEventListener("themechange", () => { colors(); if (!running) drawAll(performance.now()); });

  /* ---------- state ---------- */
  const N = 64;
  const seriesIn = Array.from({ length: N }, (_, i) => 0.55 + Math.sin(i / 6) * 0.12);
  const seriesOut = Array.from({ length: N }, (_, i) => 0.35 + Math.cos(i / 7) * 0.1);
  let shift = 0; // 0..1 sub-step for smooth scrolling
  let rps = 12480, p95 = 184, err = 0.02, blocked = 18204, threats = 0;
  const blips = [];
  let sweep = 0;

  function fit(c) {
    const r = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }
  let R = fit(radar), S = fit(stream);
  new ResizeObserver(() => { R = fit(radar); S = fit(stream); if (!running) drawAll(performance.now()); }).observe(root);

  /* ---------- radar ---------- */
  function drawRadar(dt) {
    const { ctx, w, h } = R;
    const cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2 - 3;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(${C.line.join(",")},0.22)`;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, (rad * i) / 3, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - rad, cy); ctx.lineTo(cx + rad, cy); ctx.moveTo(cx, cy - rad); ctx.lineTo(cx, cy + rad); ctx.stroke();

    // sweep wedge
    const g = ctx.createConicGradient ? ctx.createConicGradient(sweep - 0.9, cx, cy) : null;
    if (g) {
      g.addColorStop(0, `rgba(${C.accent.join(",")},0)`);
      g.addColorStop(0.14, `rgba(${C.accent.join(",")},0.32)`);
      g.addColorStop(0.145, `rgba(${C.accent.join(",")},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = `rgba(${C.accent.join(",")},0.9)`;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweep) * rad, cy + Math.sin(sweep) * rad); ctx.stroke();

    // blips fade after the sweep passes them
    for (const b of blips) {
      b.life -= dt / 2600;
      const x = cx + Math.cos(b.a) * b.r * rad, y = cy + Math.sin(b.a) * b.r * rad;
      const col = b.hostile ? C.red : C.ok;
      ctx.fillStyle = `rgba(${col.join(",")},${Math.max(0, b.life)})`;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      if (b.hostile) {
        ctx.strokeStyle = `rgba(${col.join(",")},${Math.max(0, b.life) * 0.6})`;
        ctx.beginPath(); ctx.arc(x, y, 6 + (1 - b.life) * 6, 0, Math.PI * 2); ctx.stroke();
      }
    }
    for (let i = blips.length - 1; i >= 0; i--) if (blips[i].life <= 0) blips.splice(i, 1);
  }

  /* ---------- stream graph ---------- */
  function drawStream() {
    const { ctx, w, h } = S;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(${C.line.join(",")},0.14)`;
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { const y = (h * i) / 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const stepX = w / (N - 2);
    const path = (arr) => {
      ctx.beginPath();
      arr.forEach((v, i) => {
        const x = (i - shift) * stepX;
        const y = h - 4 - v * (h - 8);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
    };
    // area + line: inbound
    path(seriesIn);
    ctx.lineTo(w + stepX, h); ctx.lineTo(-stepX, h); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(${C.accent.join(",")},0.28)`);
    g.addColorStop(1, `rgba(${C.accent.join(",")},0)`);
    ctx.fillStyle = g; ctx.fill();
    path(seriesIn); ctx.strokeStyle = `rgb(${C.accent.join(",")})`; ctx.lineWidth = 1.6; ctx.stroke();
    // outbound
    path(seriesOut); ctx.strokeStyle = `rgba(${C.red.join(",")},0.9)`; ctx.lineWidth = 1.3; ctx.stroke();
    // head dot
    const lastY = h - 4 - seriesIn[N - 2] * (h - 8);
    ctx.fillStyle = `rgb(${C.accent.join(",")})`;
    ctx.beginPath(); ctx.arc((N - 2 - shift) * stepX, lastY, 2.6, 0, Math.PI * 2); ctx.fill();
  }

  function drawAll() { drawRadar(0); drawStream(); }

  /* ---------- discrete updates ---------- */
  function updateBars() {
    bars.forEach((b, i) => {
      const prev = Number(b.dataset.v || 0.4 + Math.random() * 0.3);
      let v = prev + (Math.random() - 0.48) * 0.22;
      if (i === 5) v = Math.min(v, 0.55); // the VMware estate is being drained
      v = Math.max(0.12, Math.min(0.96, v));
      b.dataset.v = v.toFixed(3);
      b.style.setProperty("--v", v.toFixed(3));
      b.classList.toggle("is-hot", v > 0.82);
    });
  }

  function pushEvent() {
    const [lv, tag, text] = pick(EVENTS)();
    const li = document.createElement("li");
    li.className = "is-new";
    li.innerHTML = `<span class="lv lv-${lv}">${tag}</span>`;
    li.append(document.createTextNode(text));
    log.prepend(li);
    while (log.children.length > 6) log.lastElementChild.remove();
    requestAnimationFrame(() => li.classList.remove("is-new"));
    if (lv === "block") {
      blocked += 1 + Math.floor(Math.random() * 3);
      out.blocked.textContent = blocked.toLocaleString("en-US");
    }
  }

  function updateCounters() {
    rps = Math.round(Math.max(9000, Math.min(16000, rps + (Math.random() - 0.5) * 900)));
    p95 = Math.round(Math.max(150, Math.min(260, p95 + (Math.random() - 0.5) * 14)));
    err = Math.max(0.01, Math.min(0.09, err + (Math.random() - 0.5) * 0.012));
    out.rps.textContent = rps.toLocaleString("en-US");
    out.p95.textContent = p95;
    out.err.textContent = err.toFixed(2);
  }

  updateBars();
  if (reducedMotion) {
    drawAll();
    return { setPaused() {} };
  }

  /* ---------- loop ---------- */
  let running = false, raf = 0, last = 0, paused = false, onScreen = true;
  let tBars = 0, tLog = 0, tCnt = 0, tBlip = 0, tPoint = 0;

  function frame(now) {
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    sweep = (sweep + dt * 0.0021) % (Math.PI * 2);

    // advance stream: one new point every 220 ms, scrolled smoothly
    tPoint += dt;
    shift = Math.min(1, tPoint / 220);
    if (tPoint >= 220) {
      tPoint = 0; shift = 0;
      const nIn = Math.max(0.12, Math.min(0.95, seriesIn[N - 1] + (Math.random() - 0.5) * 0.12 + (0.58 - seriesIn[N - 1]) * 0.08));
      const nOut = Math.max(0.08, Math.min(0.8, seriesOut[N - 1] + (Math.random() - 0.5) * 0.1 + (0.36 - seriesOut[N - 1]) * 0.08));
      seriesIn.shift(); seriesIn.push(Math.random() < 0.03 ? Math.min(0.97, nIn + 0.3) : nIn);
      seriesOut.shift(); seriesOut.push(nOut);
    }

    tBlip += dt;
    if (tBlip > 700) {
      tBlip = 0;
      const hostile = Math.random() < 0.45;
      blips.push({ a: sweep - 0.05, r: 0.25 + Math.random() * 0.7, life: 1, hostile });
      if (hostile) out.threats.textContent = String(++threats);
    }

    tBars += dt; if (tBars > 1100) { tBars = 0; updateBars(); }
    tLog += dt; if (tLog > 1700) { tLog = 0; pushEvent(); }
    tCnt += dt; if (tCnt > 900) { tCnt = 0; updateCounters(); }

    drawRadar(dt);
    drawStream();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || paused || !onScreen || document.hidden) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? start() : stop(); }).observe(root);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  root.classList.add("is-live");

  return {
    setPaused(v) {
      paused = v;
      root.classList.toggle("is-paused", v);
      v ? stop() : start();
    },
  };
}
