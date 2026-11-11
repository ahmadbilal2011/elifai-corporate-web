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

const AGENTS = ["Ali Raza", "Sana Khan", "Hamza Sheikh", "Fatima Malik", "Imran Akhtar", "Noor Ahmed", "Zeeshan Haider", "Daniel Brooks", "Emma Clarke", "Lucas Meyer", "Sophie Laurent", "James Walker"];
const OK_EVENTS = [
  () => ["ok", "TLS", `Cert rotated ${pick(["api", "portal", "sso", "erp"])}.demo`],
  () => ["ok", "IAM", `MFA passed ops-noc-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}`],
  () => ["ok", "PATCH", `${pick(["RHEL 10", "RHEL 9", "Ubuntu 24.04", "Ubuntu 26.04"])} wave ${1 + Math.floor(Math.random() * 4)} done`],
  () => ["ok", "BACKUP", `${pick(["erp-db", "core-pg", "vault", "minio"])} snapshot verified`],
  () => ["ok", "HEALTH", `${pick(["EKS", "GKE", "OKE", "OpenShift", "ACK"])} probes 100% green`],
  () => ["ok", "DR", `Failover test passed ${pick(["Dammam", "Jeddah", "Dubai"])}`],
  () => ["ok", "SLO", `Checkout p95 within target`],
];
const INFO_EVENTS = [
  () => ["info", "AIOPS", `Anomaly scored ${(0.6 + Math.random() * 0.39).toFixed(2)}, watching`],
  () => ["info", "CAP", `Node pool at ${70 + Math.floor(Math.random() * 15)}%, scale-out queued`],
];
const BLOCK_EVENTS = [
  () => ["block", "WAF", `SQLi probe blocked ${ip()}`],
  () => ["block", "IDS", `SSH brute-force dropped ${ip()}`],
  () => ["block", "FW", `Geo-block rule hit ${ip()}`],
  () => ["block", "EDR", `Dropper quarantined wks-${100 + Math.floor(Math.random() * 80)}`],
  () => ["block", "DNS", `C2 domain sinkholed`],
];
function nextEvent() {
  const x = Math.random();
  if (x < 0.7) return pick(OK_EVENTS)();
  if (x < 0.8) return pick(INFO_EVENTS)();
  return pick(BLOCK_EVENTS)();
}

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
      green: hexToRgb(cs.getPropertyValue("--emerald"), [61, 220, 151]),
      accent: hexToRgb(cs.getPropertyValue("--accent"), [255, 153, 0]),
      ok: hexToRgb(cs.getPropertyValue("--emerald"), [61, 220, 151]),
      line: document.documentElement.dataset.theme === "light" ? [20, 28, 39] : [160, 174, 196],
    };
  }
  colors();
  document.addEventListener("themechange", () => { colors(); if (!running) drawAll(performance.now()); });

  /* ---------- state ---------- */
  const N = 64;
  const seriesIn = Array.from({ length: N }, (_, i) => 0.4 + Math.sin(i / 6) * 0.14);
  const seriesOut = Array.from({ length: N }, (_, i) => 0.25 + Math.cos(i / 7) * 0.08);
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
      g.addColorStop(0, `rgba(${C.green.join(",")},0)`);
      g.addColorStop(0.14, `rgba(${C.green.join(",")},0.3)`);
      g.addColorStop(0.145, `rgba(${C.green.join(",")},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = `rgba(${C.green.join(",")},0.9)`;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweep) * rad, cy + Math.sin(sweep) * rad); ctx.stroke();

    // blips fade after the sweep passes them
    for (const b of blips) {
      b.life -= dt / 2600;
      const x = cx + Math.cos(b.a) * b.r * rad, y = cy + Math.sin(b.a) * b.r * rad;
      // hostile contacts show red, then turn green once neutralised
      const col = b.hostile && b.life > 0.55 ? C.red : C.green;
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
    // color follows the value: green when low, orange in the middle, red when high
    const top = 4, bottom = h - 4;
    const valueGrad = (alpha) => {
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, `rgba(${C.red.join(",")},${alpha})`);
      g.addColorStop(0.3, `rgba(${C.red.join(",")},${alpha})`);
      g.addColorStop(0.42, `rgba(${C.accent.join(",")},${alpha})`);
      g.addColorStop(0.55, `rgba(${C.accent.join(",")},${alpha})`);
      g.addColorStop(0.68, `rgba(${C.green.join(",")},${alpha})`);
      g.addColorStop(1, `rgba(${C.green.join(",")},${alpha})`);
      return g;
    };
    // threshold guides at the color boundaries
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = `rgba(${C.red.join(",")},0.35)`;
    ctx.beginPath(); ctx.moveTo(0, top + (bottom - top) * 0.36); ctx.lineTo(w, top + (bottom - top) * 0.36); ctx.stroke();
    ctx.strokeStyle = `rgba(${C.accent.join(",")},0.35)`;
    ctx.beginPath(); ctx.moveTo(0, top + (bottom - top) * 0.62); ctx.lineTo(w, top + (bottom - top) * 0.62); ctx.stroke();
    ctx.setLineDash([]);

    path(seriesIn);
    ctx.lineTo(w + stepX, h); ctx.lineTo(-stepX, h); ctx.closePath();
    ctx.fillStyle = valueGrad(0.16); ctx.fill();
    path(seriesIn); ctx.strokeStyle = valueGrad(1); ctx.lineWidth = 1.8; ctx.stroke();
    path(seriesOut); ctx.strokeStyle = valueGrad(0.75); ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

    const v = seriesIn[N - 2];
    const lastY = h - 4 - v * (h - 8);
    const headCol = v > 0.64 ? C.red : v > 0.38 ? C.accent : C.green;
    ctx.fillStyle = `rgb(${headCol.join(",")})`;
    ctx.beginPath(); ctx.arc((N - 2 - shift) * stepX, lastY, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawAll() { drawRadar(0); drawStream(); }

  /* ---------- discrete updates ---------- */
  function updateBars() {
    bars.forEach((b, i) => {
      const prev = Number(b.dataset.v || 0.4 + Math.random() * 0.3);
      let v = prev + (Math.random() - 0.5) * 0.24 + (0.5 - prev) * 0.15;
      if (i === 5) v = Math.min(v, 0.5); // the VMware estate is being drained
      v = Math.max(0.15, Math.min(0.97, v));
      b.dataset.v = v.toFixed(3);
      b.style.setProperty("--v", v.toFixed(3));
      // low = green, medium = orange, high = red
      b.classList.toggle("is-warm", v > 0.6 && v <= 0.8);
      b.classList.toggle("is-hot", v > 0.8);
    });
  }

  const pending = [];
  function addLine(lv, tag, text) {
    const li = document.createElement("li");
    li.className = "is-new";
    if (!log) return;
    li.innerHTML = `<span class="lv lv-${lv}">${tag}</span>`;
    li.append(document.createTextNode(text));
    log.prepend(li);
    while (log.children.length > 6) log.lastElementChild.remove();
    requestAnimationFrame(() => li.classList.remove("is-new"));
  }
  function pushEvent() {
    const [lv, tag, text] = nextEvent();
    if (lv === "block") {
      const who = pick(AGENTS);
      addLine("block", tag, `${text} · ${who} on it`);
      pending.push({ at: performance.now() + 2200 + Math.random() * 1500, who, tag });
      blocked += 1 + Math.floor(Math.random() * 3);
      out.blocked.textContent = blocked.toLocaleString("en-US");
    } else {
      addLine(lv, tag, text);
    }
  }
  function flushPending(now) {
    for (let i = pending.length - 1; i >= 0; i--) {
      if (now >= pending[i].at) {
        const p = pending.splice(i, 1)[0];
        addLine("ok", "FIXED", `${p.tag} resolved by ${p.who}`);
      }
    }
  }
  let lastIncidentLog = 0;
  function logIncident(ev) {
    const now = performance.now();
    if (now - lastIncidentLog < 2400) return; // keep the log readable
    lastIncidentLog = now;
    if (ev.type === "open") addLine("block", "INC", `${ev.issue} → ${ev.agent}`);
    else addLine("ok", "FIXED", `${ev.issue} · ${ev.agent}`);
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
    return { setPaused() {}, logIncident() {} };
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
      const nIn = Math.max(0.1, Math.min(0.95, seriesIn[N - 1] + (Math.random() - 0.5) * 0.14 + (0.4 - seriesIn[N - 1]) * 0.1));
      const nOut = Math.max(0.06, Math.min(0.8, seriesOut[N - 1] + (Math.random() - 0.5) * 0.1 + (0.25 - seriesOut[N - 1]) * 0.1));
      seriesIn.shift(); seriesIn.push(Math.random() < 0.05 ? Math.min(0.95, nIn + 0.35) : nIn);
      seriesOut.shift(); seriesOut.push(nOut);
    }

    tBlip += dt;
    if (tBlip > 700) {
      tBlip = 0;
      const hostile = Math.random() < 0.2;
      blips.push({ a: sweep - 0.05, r: 0.25 + Math.random() * 0.7, life: 1, hostile });
      if (hostile) out.threats.textContent = String(++threats);
    }

    tBars += dt; if (tBars > 1100) { tBars = 0; updateBars(); }
    tLog += dt; if (tLog > 1900) { tLog = 0; pushEvent(); }
    flushPending(now);
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
    logIncident,
    setPaused(v) {
      paused = v;
      root.classList.toggle("is-paused", v);
      v ? stop() : start();
    },
  };
}
