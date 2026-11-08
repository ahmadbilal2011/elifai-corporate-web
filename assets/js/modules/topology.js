/**
 * Topology canvas — 48 nodes that morph between four layouts, one per
 * service vertical. Nodes spring toward their targets with a stagger,
 * messages travel along edges, and the pointer gently repels nodes.
 */

const N = 48;

/* Colours follow the active theme's CSS custom properties */
function hexToRgb(v, fallback) {
  const m = (v || "").trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const light = document.documentElement.getAttribute("data-theme") === "light";
  return {
    ok: hexToRgb(cs.getPropertyValue("--emerald"), [61, 220, 151]),
    warn: hexToRgb(cs.getPropertyValue("--accent"), [255, 153, 0]),
    bad: hexToRgb(cs.getPropertyValue("--red"), [209, 0, 0]),
    edge: light ? [20, 28, 39] : [160, 174, 196],
    edgeAlpha: light ? 0.12 : 0.14,
    nodeFill: cs.getPropertyValue("--bg").trim() || "#0C1219",
    label: cs.getPropertyValue("--text-2").trim() || "#B9C2D0",
    text: cs.getPropertyValue("--text").trim() || "#EEF1F6",
    chip: cs.getPropertyValue("--bg-2").trim() || "#121A25",
  };
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Layouts return { pts: [{x,y,hub}], edges: [[a,b]] } in a 0..1 unit box,
   with x pre-scaled by aspect so circles stay round. */
const LAYOUTS = {
  cloud(aspect) {
    const pts = [];
    const edges = [];
    const cx = 0.5, cy = 0.5;
    // control plane: 6 nodes in a small ring
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * 0.07 / aspect, y: cy + Math.sin(a) * 0.07, hub: true, g: -1 });
      edges.push([i, (i + 1) % 6]);
    }
    // three zones of 14 nodes
    for (let z = 0; z < 3; z++) {
      const za = -Math.PI / 2 + (z / 3) * Math.PI * 2;
      const zx = cx + Math.cos(za) * 0.31 / aspect;
      const zy = cy + Math.sin(za) * 0.31;
      const base = pts.length;
      pts.push({ x: zx, y: zy, hub: true, g: base, dir: z % 2 ? -1 : 1 });
      edges.push([base, z * 2], [base, z * 2 + 1]);
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * Math.PI * 2 + z;
        const r = i % 2 ? 0.115 : 0.085;
        pts.push({ x: zx + Math.cos(a) * r / aspect, y: zy + Math.sin(a) * r, hub: false, g: base, dir: z % 2 ? -1 : 1 });
        edges.push([base, base + 1 + i]);
      }
    }
    return { pts, edges };
  },

  hybrid(aspect) {
    // Islamabad NOC ring in the centre, five cloud estates around it
    const pts = [];
    const edges = [];
    const cx = 0.5, cy = 0.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * 0.075 / aspect, y: cy + Math.sin(a) * 0.075, hub: i === 0, label: i === 0 ? "noc · islamabad" : null, g: -2 });
      edges.push([i, (i + 1) % 8]);
    }
    const clouds = ["aws", "google cloud", "oracle oci", "alibaba", "vmware"];
    clouds.forEach((name, c) => {
      const a = -Math.PI / 2 + (c / clouds.length) * Math.PI * 2;
      const hx = cx + Math.cos(a) * 0.34 / aspect;
      const hy = cy + Math.sin(a) * 0.34;
      const base = pts.length;
      pts.push({ x: hx, y: hy, hub: true, label: name, g: base, dir: c % 2 ? -1 : 1 });
      edges.push([base, (c * 2) % 8]);
      for (let i = 0; i < 7; i++) {
        const b = a + ((i - 3) / 7) * 1.5;
        const r = 0.1 + (i % 2) * 0.03;
        pts.push({ x: hx + Math.cos(b) * r / aspect, y: hy + Math.sin(b) * r, hub: false, g: base, dir: c % 2 ? -1 : 1 });
        edges.push([base, base + 1 + i]);
      }
    });
    return { pts, edges };
  },

  ai() {
    const layers = [6, 9, 12, 10, 7, 4];
    const pts = [];
    const edges = [];
    const r = rng(7);
    const starts = [];
    layers.forEach((count, li) => {
      starts.push(pts.length);
      const x = 0.1 + (li / (layers.length - 1)) * 0.8;
      for (let i = 0; i < count; i++) {
        const y = 0.5 + (i - (count - 1) / 2) * (0.78 / 11);
        pts.push({ x, y, hub: li === layers.length - 1 });
      }
    });
    for (let li = 0; li < layers.length - 1; li++) {
      for (let i = 0; i < layers[li]; i++) {
        const a = starts[li] + i;
        const links = 2 + Math.floor(r() * 2);
        for (let k = 0; k < links; k++) {
          const b = starts[li + 1] + Math.floor(r() * layers[li + 1]);
          edges.push([a, b]);
        }
      }
    }
    return { pts, edges };
  },

  pipeline() {
    // 6 stages, each a 2×4 ladder; stages chained top and bottom rails
    const pts = [];
    const edges = [];
    const stages = 6;
    for (let s = 0; s < stages; s++) {
      const sx = 0.1 + (s / (stages - 1)) * 0.8;
      const base = pts.length;
      for (let i = 0; i < 8; i++) {
        const col = i % 2, row = Math.floor(i / 2);
        const y = 0.5 + (row - 1.5) * 0.09;
        pts.push({ x: sx + (col - 0.5) * 0.05, y, hub: row === 0 && col === 0 });
        if (col === 0) edges.push([base + i, base + i + 1]);
        if (row < 3) edges.push([base + i, base + i + 2]);
      }
      if (s > 0) {
        edges.push([base - 8 + 1, base]);       // top rail
        edges.push([base - 8 + 7, base + 6]);   // bottom rail
        edges.push([base - 8 + 3, base + 2]);   // mid lane
      }
    }
    return { pts, edges };
  },

  modules() {
    // 8 × 6 grid grouped into 2×3 modules, with a few service links between modules
    const pts = [];
    const edges = [];
    const cols = 8, rows = 6;
    const idx = (c, r) => r * cols + c;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = Math.floor(c / 2), gy = Math.floor(r / 3);
        const x = 0.12 + c * 0.1 + gx * 0.02;
        const y = 0.2 + r * 0.11 + gy * 0.04;
        pts.push({ x, y, hub: c % 2 === 0 && r % 3 === 1, m: gx + gy * 4 });
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c % 2 === 0) edges.push([idx(c, r), idx(c + 1, r)]);
        if (r % 3 !== 2) edges.push([idx(c, r), idx(c, r + 1)]);
      }
    }
    [[0, 2], [2, 4], [4, 6], [6, 4]].forEach(([a, b], i) => {
      const r = i % 2 ? 4 : 1;
      edges.push([idx(a, r), idx(b, r)]);
    });
    edges.push([idx(2, 1), idx(2, 4)], [idx(6, 1), idx(6, 4)]);
    return { pts, edges };
  },
};

export const MODE_LABELS = {
  cloud: "managed-estate",
  ai: "aiops-correlation",
  hybrid: "gulf-multi-cloud",
  pipeline: "delivery-pipeline",
  modules: "rhel-ubuntu-fleet",
};

/* Engineers on the Islamabad NOC rota (display names for the showcase) */
const AGENTS = [
  "Ali Raza", "Sana Khan", "Hamza Sheikh", "Fatima Malik", "Imran Akhtar", "Noor Ahmed",
  "Zeeshan Haider", "Ayesha Butt", "Usman Javed", "Mariam Siddiqui",
  "Daniel Brooks", "Emma Clarke", "Lucas Meyer", "Sophie Laurent", "James Walker", "Olivia Bennett",
];
const ISSUES = ["disk pressure", "pod crash-loop", "cert expiring", "high latency", "failed patch", "memory leak", "SSH brute-force", "node not ready", "backup missed", "port flapping"];

/* Target share of nodes by state: ~70% healthy, ~10% warning, ~20% incident being fixed */
const SHARE_WARN = 0.1;
const SHARE_BAD = 0.2;

export function createTopology(canvas, { reducedMotion = false, onStats, onIncident } = {}) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const r = rng(42);
  const nodes = Array.from({ length: N }, (_, i) => ({
    i, x: r(), y: r(), tx: 0.5, ty: 0.5, ox: 0, oy: 0, mx: 0, my: 0, hub: false, delay: 0, label: null,
    g: -1, dir: 1, m: 0, act: 0, patchedAt: -1e9,
    state: "ok", since: 0, dur: 0, agent: null, issue: null, healedAt: -1e9,
  }));
  let C = readColors();
  let edges = [];
  let packets = [];
  let w = 0, h = 0, dpr = 1, aspect = 1;
  let mode = "cloud";
  let switchedAt = 0;
  let pointer = { x: -9999, y: -9999, active: false };
  let raf = 0, running = false, userPaused = false;
  let lastSpawn = 0, delivered = 0, statsAt = 0, lastState = 0, scanX = -1;
  let agentIx = Math.floor(r() * AGENTS.length);
  let fixedCount = 0;

  /* seed initial states so the first frame already shows the mix */
  function seedStates(now) {
    nodes.forEach((n) => { n.state = "ok"; n.agent = null; });
    const pool = nodes.filter((n) => !n.hub).sort(() => r() - 0.5);
    const nBad = Math.round(N * SHARE_BAD * 0.8), nWarn = Math.round(N * SHARE_WARN);
    pool.slice(0, nBad).forEach((n, k) => startIncident(n, now - k * 400, true));
    pool.slice(nBad, nBad + nWarn).forEach((n) => { n.state = "warn"; n.since = now; n.dur = 2500 + r() * 4000; });
  }

  function startIncident(n, now, quiet) {
    n.state = "bad";
    n.since = now;
    n.dur = 2600 + r() * 2600;              // time to fix
    n.agent = AGENTS[agentIx++ % AGENTS.length];
    n.issue = ISSUES[Math.floor(r() * ISSUES.length)];
    if (!quiet && onIncident) onIncident({ type: "open", agent: n.agent, issue: n.issue });
  }

  function updateStates(now) {
    let bad = 0, warn = 0;
    for (const n of nodes) {
      if (n.state === "bad") {
        if (now - n.since > n.dur) {
          n.state = "ok"; n.healedAt = now; fixedCount++;
          if (onIncident) onIncident({ type: "fixed", agent: n.agent, issue: n.issue, total: fixedCount });
        } else bad++;
      } else if (n.state === "warn") {
        if (now - n.since > n.dur) {
          // most warnings clear on their own; a few escalate into an incident
          if (r() < 0.3) startIncident(n, now); else n.state = "ok";
        } else warn++;
      }
    }
    if (now - lastState < 350) return;
    lastState = now;
    const candidates = nodes.filter((n) => !n.hub && n.state === "ok" && now - n.healedAt > 2500);
    if (!candidates.length) return;
    const pickOne = () => candidates.splice(Math.floor(r() * candidates.length), 1)[0];
    if (bad < N * SHARE_BAD && candidates.length) startIncident(pickOne(), now);
    if (warn < N * SHARE_WARN && candidates.length) { const n = pickOne(); n.state = "warn"; n.since = now; n.dur = 2500 + r() * 4000; }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    aspect = w / h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyLayout(mode, true);
    if (!running) draw();
  }

  function applyLayout(name, instant = false) {
    const layout = LAYOUTS[name](aspect);
    edges = layout.edges;
    packets = [];
    switchedAt = performance.now();
    layout.pts.forEach((p, i) => {
      const n = nodes[i];
      n.tx = p.x; n.ty = p.y; n.hub = p.hub; n.label = p.label || null;
      n.g = p.g ?? -1; n.dir = p.dir ?? 1; n.m = p.m ?? 0; n.act = 0; n.mx = 0; n.my = 0;
      n.delay = instant ? 0 : (i / N) * 380 + r() * 120;
      if (instant) { n.x = p.x; n.y = p.y; }
      if (n.hub) n.state = "ok";
    });
  }

  function setMode(name) {
    if (!LAYOUTS[name] || name === mode) return;
    mode = name;
    applyLayout(name, reducedMotion);
    if (reducedMotion) draw();
  }

  const px = (x) => 28 + x * (w - 56);
  const py = (y) => 24 + y * (h - 48);

  function rotateAbout(n, cxp, cyp, theta) {
    const nx = px(n.tx), ny = py(n.ty);
    const dx = nx - cxp, dy = ny - cyp;
    const c = Math.cos(theta), s = Math.sin(theta);
    return [cxp + dx * c - dy * s - nx, cyp + dx * s + dy * c - ny];
  }

  /* Calm, slow motion per mode (a full turn takes minutes, not seconds) */
  function animate(now, since) {
    const t = now / 1000;
    const k = Math.min(1, Math.max(0, (since - 900) / 1800));
    const cxp = px(0.5), cyp = py(0.5);
    for (const n of nodes) { n.mx = 0; n.my = 0; n.act = 0; }

    if (mode === "cloud") {
      for (const n of nodes) {
        if (n.g === -1) [n.mx, n.my] = rotateAbout(n, cxp, cyp, -t * 0.03 * k);
        else if (n.g >= 0 && !n.hub) {
          const H = nodes[n.g];
          [n.mx, n.my] = rotateAbout(n, px(H.tx), py(H.ty), Math.sin(t * 0.12 + n.g) * 0.18 * n.dir * k);
        }
      }
    } else if (mode === "hybrid") {
      const orbit = Math.sin(t * 0.05) * 0.12 * k; // gentle sway instead of spinning
      for (const n of nodes) {
        if (n.g === -2) [n.mx, n.my] = rotateAbout(n, cxp, cyp, -t * 0.04 * k);
        else if (n.g >= 0) {
          const [ox, oy] = rotateAbout(n, cxp, cyp, orbit);
          let sx = 0, sy = 0;
          if (!n.hub) { const H = nodes[n.g]; [sx, sy] = rotateAbout(n, px(H.tx), py(H.ty), Math.sin(t * 0.15 + n.g) * 0.15 * k); }
          n.mx = ox + sx; n.my = oy + sy;
        }
      }
    } else if (mode === "ai") {
      const wave = ((t * 0.18) % 1.35) - 0.18;
      for (const n of nodes) {
        const d = n.tx - wave;
        n.act = Math.exp(-(d * d) / 0.004) * k;
        n.my = Math.sin(t * 0.6 + n.ty * 9) * 1.6 * k;
      }
    } else if (mode === "modules") {
      scanX = ((t * 0.09) % 1.3) - 0.12;
      for (const n of nodes) {
        n.my = Math.sin(t * 0.5 + n.m * 0.9) * 2 * k;
        if (Math.abs(n.tx - scanX) < 0.02 && now - n.patchedAt > 4000) n.patchedAt = now;
      }
    }
  }

  function step(now) {
    const since = now - switchedAt;
    for (const n of nodes) {
      if (since > n.delay) {
        n.x += (n.tx - n.x) * 0.06;
        n.y += (n.ty - n.y) * 0.06;
      }
      let fx = 0, fy = 0;
      if (pointer.active) {
        const dx = px(n.x) - pointer.x, dy = py(n.y) - pointer.y;
        const d2 = dx * dx + dy * dy, R = 90;
        if (d2 < R * R && d2 > 0.01) { const d = Math.sqrt(d2), f = (1 - d / R) * 20; fx = (dx / d) * f; fy = (dy / d) * f; }
      }
      n.ox += (fx - n.ox) * 0.12;
      n.oy += (fy - n.oy) * 0.12;
    }
    animate(now, since);
    updateStates(now);

    if (now - lastSpawn > 110 && edges.length && packets.length < 50) {
      lastSpawn = now;
      const e = edges[Math.floor(Math.random() * edges.length)];
      const flip = mode === "ai" || mode === "pipeline" ? false : Math.random() < 0.5;
      packets.push({ a: flip ? e[1] : e[0], b: flip ? e[0] : e[1], t: 0, v: 0.008 + Math.random() * 0.009 });
    }
    for (const p of packets) p.t += p.v;
    const before = packets.length;
    packets = packets.filter((p) => p.t < 1);
    delivered += before - packets.length;

    if (onStats && now - statsAt > 1000) {
      onStats({ nodes: N, links: edges.length, msgs: delivered, fixed: fixedCount });
      delivered = 0; statsAt = now;
    }
  }

  const pos = (n) => [px(n.x) + n.ox + n.mx, py(n.y) + n.oy + n.my];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function roundRect(x, y, ww, hh, rr) {
    ctx.beginPath();
    ctx.moveTo(x + rr, y); ctx.arcTo(x + ww, y, x + ww, y + hh, rr); ctx.arcTo(x + ww, y + hh, x, y + hh, rr);
    ctx.arcTo(x, y + hh, x, y, rr); ctx.arcTo(x, y, x + ww, y, rr); ctx.closePath();
  }

  function draw() {
    const now = performance.now();
    ctx.clearRect(0, 0, w, h);

    // edges
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(C.edge, C.edgeAlpha);
    ctx.beginPath();
    for (const [a, b] of edges) {
      const [x1, y1] = pos(nodes[a]); const [x2, y2] = pos(nodes[b]);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // inference wave lights edges in green
    if (mode === "ai") {
      for (const [a, b] of edges) {
        const act = Math.min(nodes[a].act, nodes[b].act) * 0.7 + Math.max(nodes[a].act, nodes[b].act) * 0.3;
        if (act < 0.08) continue;
        const [x1, y1] = pos(nodes[a]); const [x2, y2] = pos(nodes[b]);
        ctx.strokeStyle = rgba(C.ok, 0.55 * act);
        ctx.lineWidth = 1 + act;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    // rolling patch wave
    if (mode === "modules" && scanX > -0.1 && scanX < 1.1) {
      const sx = px(scanX);
      const g = ctx.createLinearGradient(sx - 50, 0, sx, 0);
      g.addColorStop(0, rgba(C.ok, 0)); g.addColorStop(1, rgba(C.ok, 0.12));
      ctx.fillStyle = g; ctx.fillRect(sx - 50, 18, 50, h - 36);
      ctx.strokeStyle = rgba(C.ok, 0.6);
      ctx.beginPath(); ctx.moveTo(sx, 18); ctx.lineTo(sx, h - 18); ctx.stroke();
      ctx.font = '500 10px "Red Hat Mono", ui-monospace, monospace';
      ctx.fillStyle = C.label; ctx.textBaseline = "top";
      const right = sx > w - 170;
      ctx.textAlign = right ? "right" : "left";
      ctx.fillText("rolling patch · rhel / ubuntu", sx + (right ? -8 : 8), 22);
    }

    // packets (healthy traffic is green)
    for (const p of packets) {
      const [x1, y1] = pos(nodes[p.a]); const [x2, y2] = pos(nodes[p.b]);
      const x = x1 + (x2 - x1) * p.t, y = y1 + (y2 - y1) * p.t;
      const al = Math.sin(p.t * Math.PI);
      ctx.fillStyle = rgba(C.ok, 0.22 * al);
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(C.ok, 0.9 * al);
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }

    // nodes
    for (const n of nodes) {
      const [x, y] = pos(n);
      const col = n.state === "bad" ? C.bad : n.state === "warn" ? C.warn : C.ok;
      const rad = (n.hub ? 4.2 : 3.4) + n.act * 2;

      if (n.state === "bad") {
        // fixing: red node with a progress ring that fills as the engineer works
        const p = Math.min(1, (now - n.since) / n.dur);
        const pulse = 0.5 + 0.5 * Math.sin((now - n.since) / 160);
        ctx.fillStyle = rgba(C.bad, 0.14 + 0.1 * pulse);
        ctx.beginPath(); ctx.arc(x, y, 10 + pulse * 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(C.edge, 0.25); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = rgba(C.ok, 0.95);
        ctx.beginPath(); ctx.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
      const healed = now - n.healedAt;
      if (healed < 1300) {
        const p = healed / 1300;
        ctx.strokeStyle = rgba(C.ok, 0.8 * (1 - p));
        ctx.beginPath(); ctx.arc(x, y, 6 + p * 18, 0, Math.PI * 2); ctx.stroke();
      }
      const pAge = now - n.patchedAt;
      if (pAge < 2400) {
        ctx.fillStyle = rgba(C.ok, 0.25 * (1 - pAge / 2400));
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      }
      if (n.act > 0.05) {
        ctx.fillStyle = rgba(C.ok, 0.18 * n.act);
        ctx.beginPath(); ctx.arc(x, y, 6 + n.act * 8, 0, Math.PI * 2); ctx.fill();
      }
      if (n.hub) {
        ctx.strokeStyle = rgba(C.ok, 0.45);
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = n.state === "ok" && !n.hub ? C.nodeFill : rgba(col, 1);
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.95);
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }

    // hub labels
    ctx.font = '500 11px "Red Hat Mono", ui-monospace, monospace';
    ctx.textBaseline = "middle";
    for (const n of nodes) {
      if (!n.label) continue;
      const [x, y] = pos(n);
      const settle = Math.max(0, 1 - Math.hypot(n.tx - n.x, n.ty - n.y) * 12);
      if (settle <= 0.05) continue;
      ctx.globalAlpha = settle;
      ctx.fillStyle = C.label;
      const vx = px(0.5) - x, vy = py(0.5) - y, d = Math.hypot(vx, vy);
      if (d < 40) { ctx.textAlign = "center"; ctx.fillText(n.label, px(0.5), py(0.5) + (h - 48) * 0.075 + 22); }
      else {
        const ux = vx / d, uy = vy / d;
        ctx.textAlign = ux > 0.35 ? "left" : ux < -0.35 ? "right" : "center";
        ctx.fillText(n.label, x + ux * 16, y + uy * 16 + (Math.abs(ux) > 0.35 ? -8 : 0));
      }
      ctx.globalAlpha = 1;
    }

    // engineer callouts on the three most recent incidents
    const open = nodes.filter((n) => n.state === "bad").sort((a, b) => b.since - a.since).slice(0, 3);
    ctx.font = '500 10.5px "Red Hat Mono", ui-monospace, monospace';
    for (const n of open) {
      const [x, y] = pos(n);
      const p = Math.min(1, (now - n.since) / n.dur);
      const line1 = `${n.agent} fixing`;
      const line2 = `${n.issue} · ${Math.round(p * 100)}%`;
      const tw = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) + 16;
      let bx = x + 14, by = y - 34;
      if (bx + tw > w - 6) bx = x - 14 - tw;
      if (by < 6) by = y + 14;
      ctx.globalAlpha = Math.min(1, (now - n.since) / 250);
      ctx.fillStyle = C.chip;
      roundRect(bx, by, tw, 32, 6); ctx.fill();
      ctx.strokeStyle = rgba(C.bad, 0.55); ctx.stroke();
      ctx.fillStyle = rgba(C.ok, 1);
      ctx.fillRect(bx, by + 30, tw * p, 2);
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = C.text; ctx.fillText(line1, bx + 8, by + 4);
      ctx.fillStyle = C.label; ctx.fillText(line2, bx + 8, by + 17);
      ctx.globalAlpha = 1;
    }

    if (pointer.active) {
      ctx.strokeStyle = rgba(C.ok, 0.2);
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 90, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function loop(now) { step(now); draw(); raf = requestAnimationFrame(loop); }
  function start() { if (running || reducedMotion || userPaused) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
  });
  canvas.addEventListener("pointerleave", () => { pointer.active = false; });

  new IntersectionObserver(([entry]) => { entry.isIntersecting && !document.hidden ? start() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (canvas.getBoundingClientRect().bottom > 0) start(); });
  document.addEventListener("themechange", () => { C = readColors(); if (!running) draw(); });

  new ResizeObserver(() => resize()).observe(canvas);
  resize();
  seedStates(performance.now());
  if (reducedMotion) {
    // static frame: freeze incidents half-way so the mix is visible
    nodes.forEach((n) => { if (n.state === "bad") n.since = performance.now() - n.dur / 2; });
    draw();
  }
  if (onStats) onStats({ nodes: N, links: edges.length, msgs: 0, fixed: 0 });

  return {
    setMode,
    setPaused(v) { userPaused = v; if (v) stop(); else if (canvas.getBoundingClientRect().bottom > 0) start(); },
  };
}
