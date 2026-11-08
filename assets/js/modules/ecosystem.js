/**
 * Vendor ecosystem: names only, latest model on click, and a running
 * "latest products" bar. The bar starts with the curated latest models and,
 * when /vendor-news.php is available, mixes in live headlines from vendor feeds.
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
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.message || "unavailable");
  return data;
}

export function initEcosystem({ reducedMotion }) {
  const root = document.getElementById("ecosystem");
  if (!root) return;

  /* ---------- filter + search ---------- */
  const filters = [...root.querySelectorAll("[data-vfilters] [data-vcat]")];
  const groups = [...root.querySelectorAll(".vgroup")];
  const search = root.querySelector("[data-vsearch]");
  const empty = root.querySelector("[data-vempty]");
  let cat = "all";

  function apply() {
    const q = (search.value || "").trim().toLowerCase();
    let shown = 0;
    groups.forEach((g) => {
      const catOk = cat === "all" || g.dataset.cat === cat;
      let n = 0;
      g.querySelectorAll(".vchip").forEach((c) => {
        const ok = catOk && (!q || c.dataset.name.includes(q));
        c.parentElement.hidden = !ok;
        if (ok) n++;
      });
      g.hidden = n === 0;
      shown += n;
    });
    empty.hidden = shown !== 0;
  }
  filters.forEach((f) => f.addEventListener("click", () => {
    cat = f.dataset.vcat;
    filters.forEach((x) => x.setAttribute("aria-pressed", String(x === f)));
    apply();
  }));
  search.addEventListener("input", apply);

  /* ---------- latest model on click ---------- */
  const news = new Map();
  async function headline(slug) {
    if (news.has(slug)) return news.get(slug);
    try {
      const data = await getJSON(`${ENDPOINT}?v=${encodeURIComponent(slug)}`);
      const item = data.items && data.items[0] ? data.items[0] : null;
      news.set(slug, item);
      return item;
    } catch {
      news.set(slug, null);
      return null;
    }
  }

  root.addEventListener("click", async (e) => {
    const chip = e.target.closest(".vchip");
    if (!chip) return;
    const group = chip.closest(".vgroup");
    const box = group.querySelector("[data-vdetail]");
    const wasOpen = chip.getAttribute("aria-expanded") === "true";
    group.querySelectorAll(".vchip").forEach((c) => c.setAttribute("aria-expanded", "false"));
    if (wasOpen) { box.hidden = true; return; }
    chip.setAttribute("aria-expanded", "true");

    const host = new URL(chip.dataset.site).hostname.replace(/^www\./, "");
    box.replaceChildren();
    const name = el("p", "vd-name", chip.textContent);
    const model = el("p", "vd-model");
    model.append(el("span", "vd-k mono", "Latest model"), el("b", null, chip.dataset.latest));
    const link = el("a", "vd-site mono", host);
    link.href = chip.dataset.site; link.target = "_blank"; link.rel = "noopener";
    const live = el("p", "vd-live mono", "Checking latest news");
    box.append(name, model, live, link);
    box.hidden = false;

    const item = await headline(chip.dataset.vendor);
    if (chip.getAttribute("aria-expanded") !== "true") return;
    if (item) {
      live.replaceChildren(el("span", "vd-k", "In the news "));
      const a = el("a", null, item.title);
      a.href = item.link; a.target = "_blank"; a.rel = "noopener nofollow";
      live.append(a, el("span", "vd-date", item.date ? ` · ${fmtDate(item.date)}` : ""));
    } else {
      live.remove();
    }
  });

  /* ---------- running latest-products bar ---------- */
  const list = root.querySelector("[data-vwire-list]");
  const startTicker = () => {
    if (reducedMotion || list.classList.contains("is-running")) return;
    [...list.children].forEach((li) => {
      const c = li.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      c.querySelectorAll("a").forEach((a) => { a.tabIndex = -1; });
      list.append(c);
    });
    list.style.setProperty("--dur", `${Math.max(60, list.children.length * 2.6)}s`);
    list.classList.add("is-running");
  };

  async function mixLive() {
    try {
      const data = await getJSON(`${ENDPOINT}?wire=1`);
      if (!data.items || !data.items.length) return;
      const originals = [...list.children].filter((li) => !li.hasAttribute("aria-hidden") && !li.classList.contains("is-live"));
      list.classList.remove("is-running");
      list.replaceChildren();
      // alternate a live headline after every two curated models
      let k = 0;
      originals.forEach((li, i) => {
        list.append(li);
        if (i % 2 === 1 && k < data.items.length) {
          const it = data.items[k++];
          const n = el("li", "is-live");
          const a = el("a", null, it.title);
          a.href = it.link; a.target = "_blank"; a.rel = "noopener nofollow";
          n.append(el("b", null, it.vendor), a, el("span", "mono", fmtDate(it.date)));
          list.append(n);
        }
      });
      startTicker();
    } catch { /* PHP not available: keep the curated bar */ }
  }

  startTicker();
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    mixLive();
    setInterval(mixLive, 20 * 60 * 1000);
  }, { rootMargin: "300px" });
  io.observe(root);
}
