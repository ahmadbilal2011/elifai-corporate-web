/**
 * Insights and Learning pages: filters, search, click-to-play YouTube,
 * per-browser lesson progress, and the live "latest insights" cards on
 * the home page.
 */
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

function initFilters() {
  const list = document.querySelector("[data-filter-list]");
  if (!list) return;
  const items = [...list.children];
  const groups = [...document.querySelectorAll("[data-filter-group]")];
  const search = document.querySelector("[data-filter-search]");
  const empty = document.querySelector("[data-filter-empty]");
  const state = {};
  const apply = () => {
    const q = (search?.value || "").trim().toLowerCase();
    let shown = 0;
    items.forEach((el) => {
      let ok = Object.entries(state).every(([key, val]) => !val || el.dataset[key] === val);
      if (ok && q) ok = (el.dataset.text || el.textContent.toLowerCase()).includes(q);
      el.hidden = !ok;
      if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  };
  groups.forEach((g) => {
    const key = g.dataset.filterGroup;
    state[key] = "";
    g.addEventListener("click", (e) => {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      g.querySelectorAll("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      state[key] = b.dataset.filter;
      apply();
    });
  });
  search?.addEventListener("input", apply);
}

function initYouTube() {
  document.querySelectorAll("[data-yt]").forEach((box) => {
    box.querySelector(".yt-play")?.addEventListener("click", () => {
      const id = box.dataset.yt;
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      f.title = box.closest("[data-lesson]")?.querySelector(".lesson-title")?.textContent || "Video";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      f.referrerPolicy = "strict-origin-when-cross-origin";
      box.replaceChildren(f);
      box.classList.add("is-playing");
    });
  });
}

function initProgress() {
  const bar = document.querySelector("[data-course-progress]");
  if (!bar) return;
  const key = `elifai-course-${bar.dataset.courseProgress}`;
  const done = new Set(store.get(key) || []);
  const total = Number(bar.dataset.total) || 1;
  const out = bar.querySelector("[data-done]");
  const fill = bar.querySelector("em");
  const render = () => {
    out.textContent = String(done.size);
    fill.style.width = `${Math.round((done.size / total) * 100)}%`;
    bar.hidden = false;
  };
  document.querySelectorAll("[data-lesson]").forEach((li) => {
    const id = li.dataset.lesson;
    const box = li.querySelector("[data-done-box]");
    if (!box) return;
    box.checked = done.has(id);
    li.classList.toggle("is-done", box.checked);
    box.addEventListener("change", () => {
      box.checked ? done.add(id) : done.delete(id);
      li.classList.toggle("is-done", box.checked);
      store.set(key, [...done]);
      render();
    });
  });
  render();
}

/* Home page: replace the three static cards with the latest published articles */
async function initHomeFeed() {
  const grid = document.querySelector("[data-insights]");
  // the Arabic home keeps its translated cards; articles are written in English
  if (!grid || document.documentElement.lang !== "en") return;
  try {
    const res = await fetch("/insights/feed.json", { headers: { Accept: "application/json" } });
    if (!res.ok) return;
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) return;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    grid.innerHTML = items.map((a) => `
      <article class="insight">
        <a href="${esc(a.url)}" class="insight-link">
          <span class="insight-tag mono">${esc(a.category)}</span>
          <h3 class="insight-title">${esc(a.title)}</h3>
          <p class="insight-text">${esc(a.summary)}</p>
          <span class="insight-meta mono">${Number(a.minutes) || 3} min read<span aria-hidden="true">Read article</span></span>
        </a>
      </article>`).join("");
  } catch { /* keep the static cards */ }
}

export function initHub() {
  initFilters();
  initYouTube();
  initProgress();
  initHomeFeed();
}
