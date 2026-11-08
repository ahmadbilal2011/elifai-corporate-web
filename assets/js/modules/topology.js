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
    cyan: hexToRgb(cs.getPropertyValue("--accent"), [255, 153, 0]),
    emerald: hexToRgb(cs.getPropertyValue("--red"), [209, 0, 0]),
    edge: light ? [15, 23, 42] : [148, 163, 184],
    edgeAlpha: light ? 0.14 : 0.16,
    nodeFill: cs.getPropertyValue("--bg-2").trim() || "#0B0F17",
    amber: hexToRgb(cs.getPropertyValue("--amber"), [255, 194, 71]),
    ok: hexToRgb(cs.getPropertyValue("--emerald"), [61, 220, 151]),
    label: cs.getPropertyValue("--text-2").trim() || "#B4BCCB",
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

export function createTopology(canvas, { reducedMotion = false, onStats } = {}) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const r = rng(42);
  const nodes = Array.from({ length: N }, () => ({
    x: r(), y: r(), tx: 0.5, ty: 0.5, ox: 0, oy: 0, mx: 0, my: 0, hub: false, delay: 0, label: null,
    g: -1, dir: 1, m: 0, act: 0, alertAt: -1e9, patchedAt: -1e9,
  }));
  let C = readColors();
  let edges = [];
  let packets = [];
  let w = 0, h = 0, dpr = 1, aspect = 1;
  let mode = "cloud";
  let switchedAt = 0;
  let pointer = { x: -9999, y: -9999, active: false };
  let raf = 0;
  let running = false;
  let lastSpawn = 0;
  let delivered = 0;
  let statsAt = 0;
  let lastAlert = 0;
  let scanX = -1;
  let clock = 0;

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
    if (!running) draw(performance.now());
  }

  function applyLayout(name, instant = false) {
    const layout = LAYOUTS[name](aspect);
    edges = layout.edges;
    packets = [];
    const now = performance.now();
    switchedAt = now;
    layout.pts.forEach((p, i) => {
      const n = nodes[i];
      n.tx = p.x; n.ty = p.y; n.hub = p.hub; n.label = p.label || null;
      n.g = p.g ?? -1; n.dir = p.dir ?? 1; n.m = p.m ?? 0; n.act = 0; n.mx = 0; n.my = 0; n.alertAt = -1e9; n.patchedAt = -1e9;
      n.delay = instant ? 0 : (i / N) * 380 + r() * 120;
      if (instant) { n.x = p.x; n.y = p.y; }
    });
  }

  function setMode(name) {
    if (!LAYOUTS[name] || name === mode) return;
    mode = name;
    applyLayout(name, reducedMotion);
    if (reducedMotion) draw(performance.now());
  }

  const px = (x) => 24 + x * (w - 48);
  const py = (y) => 20 + y * (h - 40);

  function step(now) {
    const since = now - switchedAt;
    for (const n of nodes) {
      if (since > n.delay) {
        n.x += (n.tx - n.x) * 0.075;
        n.y += (n.ty - n.y) * 0.075;
      }
      // pointer repulsion as a decaying offset
      let fx = 0, fy = 0;
      if (pointer.active) {
        const dx = px(n.x) - pointer.x;
        const dy = py(n.y) - pointer.y;
        const d2 = dx * dx + dy * dy;
        const R = 90;
        if (d2 < R * R && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / R) * 22;
          fx = (dx / d) * f; fy = (dy / d) * f;
        }
      }
      n.ox += (fx - n.ox) * 0.15;
      n.oy += (fy - n.oy) * 0.15;
    }

    animate(now, since);

    if (now - lastSpawn > 90 && edges.length && packets.length < 60) {
      lastSpawn = now;
      const e = edges[Math.floor(Math.random() * edges.length)];
      const flip = mode === "ai" || mode === "pipeline" ? false : Math.random() < 0.5;
      packets.push({ a: flip ? e[1] : e[0], b: flip ? e[0] : e[1], t: 0, v: 0.012 + Math.random() * 0.014 });
    }
    for (const p of packets) p.t += p.v;
    const before = packets.length;
    packets = packets.filter((p) => p.t < 1);
    delivered += before - packets.length;

    if (onStats && now - statsAt > 1000) {
      onStats({ nodes: N, links: edges.length, msgs: delivered });
      delivered = 0;
      statsAt = now;
    }
  }


  /* ---- Per-mode living motion: orbits, inference waves, patch waves, self-healing ---- */
  function rotateAbout(n, cxp, cyp, theta) {
    const nx = px(n.tx), ny = py(n.ty);
    const dx = nx - cxp, dy = ny - cyp;
    const c = Math.cos(theta), s = Math.sin(theta);
    return [cxp + dx * c - dy * s - nx, cyp + dx * s + dy * c - ny];
  }

  function animate(now, since) {
    const t = now / 1000;
    clock = t;
    const k = Math.min(1, Math.max(0, (since - 900) / 1400)); // ease motion in after the morph
    const cxp = px(0.5), cyp = py(0.5);

    for (const n of nodes) { n.mx = 0; n.my = 0; n.act = 0; }

    if (mode === "cloud") {
      // zones spin slowly round their hubs, control plane counter-rotates
      for (const n of nodes) {
        if (n.g === -1) {
          [n.mx, n.my] = rotateAbout(n, cxp, cyp, -t * 0.22 * k);
        } else if (n.g >= 0 && !n.hub) {
          const H = nodes[n.g];
          [n.mx, n.my] = rotateAbout(n, px(H.tx), py(H.ty), t * 0.32 * n.dir * k);
        }
      }
    } else if (mode === "hybrid") {
      // the five clouds orbit the Islamabad NOC; each estate turns on itself too
      const orbit = t * 0.07 * k;
      for (const n of nodes) {
        if (n.g === -2) {
          [n.mx, n.my] = rotateAbout(n, cxp, cyp, -t * 0.45 * k);
        } else if (n.g >= 0) {
          const [ox, oy] = rotateAbout(n, cxp, cyp, orbit);
          let sx = 0, sy = 0;
          if (!n.hub) {
            const H = nodes[n.g];
            [sx, sy] = rotateAbout(n, px(H.tx), py(H.ty), Math.sin(t * 0.6 + n.g) * 0.35 * k);
          }
          n.mx = ox + sx; n.my = oy + sy;
        }
      }
    } else if (mode === "ai") {
      // an activation wave sweeps through the layers, left to right
      const wave = ((t * 0.32) % 1.35) - 0.18;
      for (const n of nodes) {
        const d = n.tx - wave;
        n.act = Math.exp(-(d * d) / 0.0035) * k;
        n.my = Math.sin(t * 1.4 + n.ty * 9) * 2.2 * k;
      }
    } else if (mode === "modules") {
      // Linux fleet: modules breathe, a rolling patch wave marks hosts as patched
      scanX = ((t * 0.16) % 1.3) - 0.12;
      for (const n of nodes) {
        n.my = Math.sin(t * 1.1 + n.m * 0.9) * 2.5 * k;
        if (Math.abs(n.tx - scanX) < 0.02 && now - n.patchedAt > 3000) n.patchedAt = now;
      }
    } else if (mode === "pipeline") {
      const wave = ((t * 0.25) % 1.2) - 0.1;
      for (const n of nodes) { const d = n.tx - wave; n.act = Math.exp(-(d * d) / 0.006) * k; }
    }

    // self-healing incidents: a host flags amber, then recovers green
    if ((mode === "cloud" || mode === "hybrid" || mode === "modules") && now - lastAlert > 2600 && k > 0.5) {
      lastAlert = now;
      const pool = nodes.filter((n) => !n.hub && now - n.alertAt > 6000);
      if (pool.length) pool[Math.floor(Math.random() * pool.length)].alertAt = now;
    }
  }

  function pos(n) {
    return [px(n.x) + n.ox + n.mx, py(n.y) + n.oy + n.my];
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // edges
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${C.edge.join(",")},${C.edgeAlpha})`;
    ctx.beginPath();
    for (const [a, b] of edges) {
      const [x1, y1] = pos(nodes[a]);
      const [x2, y2] = pos(nodes[b]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // edges lit by an activation wave (AI, pipeline)
    if (mode === "ai" || mode === "pipeline") {
      for (const [a, b] of edges) {
        const act = Math.min(nodes[a].act, nodes[b].act) * 0.7 + Math.max(nodes[a].act, nodes[b].act) * 0.3;
        if (act < 0.08) continue;
        const [x1, y1] = pos(nodes[a]);
        const [x2, y2] = pos(nodes[b]);
        ctx.strokeStyle = `rgba(${C.cyan.join(",")},${0.65 * act})`;
        ctx.lineWidth = 1 + act * 1.2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    // rolling patch wave (Linux fleet)
    if (mode === "modules" && scanX > -0.1 && scanX < 1.1) {
      const sx = px(scanX);
      const g = ctx.createLinearGradient(sx - 40, 0, sx, 0);
      g.addColorStop(0, `rgba(${C.cyan.join(",")},0)`);
      g.addColorStop(1, `rgba(${C.cyan.join(",")},0.14)`);
      ctx.fillStyle = g;
      ctx.fillRect(sx - 40, 14, 40, h - 28);
      ctx.strokeStyle = `rgba(${C.cyan.join(",")},0.7)`;
      ctx.beginPath(); ctx.moveTo(sx, 14); ctx.lineTo(sx, h - 14); ctx.stroke();
      ctx.font = '500 10px "Red Hat Mono", ui-monospace, monospace';
      ctx.fillStyle = C.label;
      ctx.textAlign = sx > w - 140 ? "right" : "left";
      ctx.textBaseline = "top";
      ctx.fillText("rolling patch · rhel / ubuntu", sx + (sx > w - 140 ? -8 : 8), 18);
    }

    // packets
    for (const p of packets) {
      const [x1, y1] = pos(nodes[p.a]);
      const [x2, y2] = pos(nodes[p.b]);
      const x = x1 + (x2 - x1) * p.t;
      const y = y1 + (y2 - y1) * p.t;
      const alpha = Math.sin(p.t * Math.PI);
      ctx.fillStyle = `rgba(${C.cyan.join(",")},${0.25 * alpha})`;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${C.cyan.join(",")},${0.95 * alpha})`;
      ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
    }

    // nodes
    const tnow = performance.now();
    nodes.forEach((n, i) => {
      const [x, y] = pos(n);
      // alert → healed ring
      const since = tnow - n.alertAt;
      if (since < 1500) {
        const pulse = 0.5 + 0.5 * Math.sin(since / 90);
        ctx.strokeStyle = `rgba(${C.amber.join(",")},${0.4 + 0.5 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 7 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      } else if (since < 2800) {
        const p = (since - 1500) / 1300;
        ctx.strokeStyle = `rgba(${C.ok.join(",")},${0.8 * (1 - p)})`;
        ctx.beginPath(); ctx.arc(x, y, 6 + p * 16, 0, Math.PI * 2); ctx.stroke();
      }
      // patched glow
      const pAge = tnow - n.patchedAt;
      if (pAge < 2400) {
        const p = 1 - pAge / 2400;
        ctx.fillStyle = `rgba(${C.ok.join(",")},${0.28 * p})`;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      }
      // radar ping on hubs
      if (n.hub && running) {
        const ph = ((clock * 0.55) + i * 0.37) % 1;
        ctx.strokeStyle = `rgba(${C.emerald.join(",")},${0.35 * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(x, y, 7 + ph * 18, 0, Math.PI * 2); ctx.stroke();
      }
      if (n.act > 0.05) {
        ctx.fillStyle = `rgba(${C.cyan.join(",")},${0.22 * n.act})`;
        ctx.beginPath(); ctx.arc(x, y, 6 + n.act * 8, 0, Math.PI * 2); ctx.fill();
      }
      const grow = n.act * 2.2;
      if (n.hub) {
        ctx.strokeStyle = `rgba(${C.emerald.join(",")},0.5)`;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgb(${C.emerald.join(",")})`;
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = C.nodeFill;
        ctx.beginPath(); ctx.arc(x, y, 3.4 + grow, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = pAge < 2400 ? `rgba(${C.ok.join(",")},0.95)` : `rgba(${C.cyan.join(",")},0.85)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 3.4 + grow, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
    });

    // labels for named hubs (cloud estates, NOC)
    ctx.font = '500 11px "Red Hat Mono", ui-monospace, monospace';
    ctx.textBaseline = "middle";
    ctx.font = '500 11px "Red Hat Mono", ui-monospace, monospace';
    for (const n of nodes) {
      if (!n.label) continue;
      const [x, y] = pos(n);
      const settle = Math.max(0, 1 - Math.hypot(n.tx - n.x, n.ty - n.y) * 12);
      if (settle <= 0.05) continue;
      ctx.globalAlpha = settle;
      ctx.fillStyle = C.label;
      // place the label on the side facing the centre, away from the node fan
      const vx = px(0.5) - x, vy = py(0.5) - y;
      const d = Math.hypot(vx, vy);
      if (d < 40) {
        ctx.textAlign = "center";
        ctx.fillText(n.label, px(0.5), py(0.5) + (h - 40) * 0.075 + 20);
      } else {
        const ux = vx / d, uy = vy / d;
        ctx.textAlign = ux > 0.35 ? "left" : ux < -0.35 ? "right" : "center";
        ctx.fillText(n.label, x + ux * 16, y + uy * 16 + (Math.abs(ux) > 0.35 ? -8 : 0));
      }
      ctx.globalAlpha = 1;
    }

    // pointer lens
    if (pointer.active) {
      ctx.strokeStyle = `rgba(${C.cyan.join(",")},0.18)`;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 90, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function loop(now) {
    step(now);
    draw();
    raf = requestAnimationFrame(loop);
  }

  let userPaused = false;
  function start() {
    if (running || reducedMotion || userPaused) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
  });
  canvas.addEventListener("pointerleave", () => { pointer.active = false; });

  // Only animate while visible on screen and while the tab is visible
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !document.hidden) start(); else stop();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (canvas.getBoundingClientRect().bottom > 0) start();
  });

  document.addEventListener("themechange", () => {
    C = readColors();
    if (!running) draw(performance.now());
  });

  new ResizeObserver(() => resize()).observe(canvas);
  resize();
  if (onStats) onStats({ nodes: N, links: edges.length, msgs: 0 });

  function setPaused(v) {
    userPaused = v;
    if (v) stop(); else if (canvas.getBoundingClientRect().bottom > 0) start();
  }

  return { setMode, setPaused };
}
