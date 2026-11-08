/**
 * Vendor ecosystem: category filter, search, per-vendor live headlines and a
 * scrolling "vendor wire" across all vendors. Headlines come from
 * /vendor-news.php (server-side, cached). If PHP is not available, the
 * section still works as a static directory with links to each vendor.
 */
const ENDPOINT = "/vendor-news.php";

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" });
  const data = await res.json(); // throws on HTML / PHP missing
  if (!res.ok || !data.ok) throw new Error(data.message || "unavailable");
  return data;
}

export function initEcosystem({ reducedMotion }) {
  const root = document.getElementById("ecosystem");
  if (!root) return;

  /* ---------- filter + search ---------- */
  const chips = [...root.querySelectorAll("[data-vfilters] [data-vcat]")];
  const groups = [...root.querySelectorAll(".vgroup")];
  const rows = [...root.querySelectorAll(".vendor")];
  const search = root.querySelector("[data-vsearch]");
  const empty = root.querySelector("[data-vempty]");
  let cat = "all";

  function apply() {
    const q = (search.value || "").trim().toLowerCase();
    let shown = 0;
    groups.forEach((g) => {
      const catOk = cat === "all" || g.dataset.cat === cat;
      let inGroup = 0;
      g.querySelectorAll(".vendor").forEach((r) => {
        const ok = catOk && (!q || r.dataset.name.includes(q));
        r.hidden = !ok;
        if (ok) inGroup++;
      });
      g.hidden = inGroup === 0;
      shown += inGroup;
    });
    empty.hidden = shown !== 0;
  }
  chips.forEach((c) => c.addEventListener("click", () => {
    cat = c.dataset.vcat;
    chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    apply();
  }));
  search.addEventListener("input", apply);

  /* ---------- per-vendor headlines ---------- */
  const loaded = new Map();
  function renderNews(box, vendorRow, data) {
    box.replaceChildren();
    const site = vendorRow.querySelector(".vendor-site");
    if (!data || !data.items || !data.items.length) {
      const p = el("p", "vnews-empty", "No recent headlines could be loaded. ");
      const a = el("a", null, `Visit ${site.textContent}`);
      a.href = site.href; a.target = "_blank"; a.rel = "noopener";
      p.append(a);
      box.append(p);
      return;
    }
    const ul = el("ul", "vnews-list");
    data.items.forEach((i) => {
      const li = el("li");
      const a = el("a", null, i.title);
      a.href = i.link; a.target = "_blank"; a.rel = "noopener nofollow";
      const meta = el("span", "vnews-meta mono", [i.source, fmtDate(i.date)].filter(Boolean).join(" · "));
      li.append(a, meta);
      ul.append(li);
    });
    const foot = el("p", "vnews-foot mono", data.via === "official" ? `From ${site.textContent} · updated ${fmtDate(data.fetched)}` : `Via public news search · updated ${fmtDate(data.fetched)}`);
    box.append(ul, foot);
  }

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-news-btn]");
    if (!btn) return;
    const row = btn.closest(".vendor");
    const box = row.querySelector("[data-news]");
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    btn.textContent = open ? "Latest updates" : "Hide updates";
    box.hidden = open;
    row.classList.toggle("is-open", !open);
    if (open || loaded.has(row.dataset.vendor)) return;

    box.replaceChildren(el("p", "vnews-loading mono", "Fetching latest headlines"));
    try {
      const data = await getJSON(`${ENDPOINT}?v=${encodeURIComponent(row.dataset.vendor)}`);
      loaded.set(row.dataset.vendor, data);
      renderNews(box, row, data);
    } catch {
      loaded.set(row.dataset.vendor, null);
      renderNews(box, row, null);
    }
  });

  /* ---------- vendor wire ---------- */
  const wire = root.querySelector("[data-vwire]");
  const list = root.querySelector("[data-vwire-list]");
  async function loadWire() {
    try {
      const data = await getJSON(`${ENDPOINT}?wire=1`);
      if (!data.items.length) return;
      const frag = document.createDocumentFragment();
      const build = () => data.items.forEach((i) => {
        const li = el("li");
        const v = el("b", null, i.vendor);
        const a = el("a", null, i.title);
        a.href = i.link; a.target = "_blank"; a.rel = "noopener nofollow";
        li.append(v, a, el("span", "mono", fmtDate(i.date)));
        frag.append(li);
      });
      build();
      list.replaceChildren(frag);
      if (!reducedMotion) {
        // duplicate for a seamless loop
        [...list.children].forEach((li) => { const c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.querySelector("a").tabIndex = -1; list.append(c); });
        list.style.setProperty("--dur", `${Math.max(40, data.items.length * 6)}s`);
        list.classList.add("is-running");
      }
      wire.hidden = false;
    } catch {
      wire.hidden = true; // PHP not available (e.g. local static preview)
    }
  }
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    loadWire();
    setInterval(loadWire, 15 * 60 * 1000);
  }, { rootMargin: "300px" });
  io.observe(root);
}
