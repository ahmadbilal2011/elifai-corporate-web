import { t } from "./i18n.js?v=15";
/** Header blur on scroll, mobile menu, active-section nav, ticker, reveal, year. */
export function initChrome({ reducedMotion }) {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const mobile = document.querySelector("[data-mobile-nav]");

  // Header backdrop once the page scrolls
  const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu
  if (toggle && mobile) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".sr-only").textContent = open ? t("Close menu") : t("Open menu");
      mobile.hidden = !open;
      header.classList.toggle("is-scrolled", open || window.scrollY > 8);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    mobile.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !mobile.hidden) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", (m) => { if (m.matches) setOpen(false); });
  }

  // Mega menu: click or hover opens a panel; Escape, outside click or a link closes it
  const triggers = [...document.querySelectorAll("[data-mm-trigger]")];
  const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)");
  let openTrigger = null, hoverTimer = 0, openedAt = 0;
  const panelOf = (tr) => document.getElementById(tr.getAttribute("aria-controls"));
  const closeAll = () => {
    triggers.forEach((tr) => { tr.setAttribute("aria-expanded", "false"); panelOf(tr).hidden = true; });
    openTrigger = null;
  };
  const openMenu = (tr) => {
    if (openTrigger === tr) return;
    closeAll();
    tr.setAttribute("aria-expanded", "true");
    panelOf(tr).hidden = false;
    openTrigger = tr;
    openedAt = performance.now();
    header?.classList.add("is-scrolled");
  };
  triggers.forEach((tr) => {
    const item = tr.closest(".mm-item");
    tr.addEventListener("click", () => {
      // a click right after hover-open keeps the menu open instead of toggling it shut
      if (openTrigger === tr && performance.now() - openedAt > 500) { closeAll(); onScroll(); } else openMenu(tr);
    });
    tr.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); openMenu(tr); panelOf(tr).querySelector("a")?.focus(); }
    });
    item.addEventListener("pointerenter", () => { if (!hoverable.matches) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => openMenu(tr), openTrigger ? 0 : 120); });
    item.addEventListener("pointerleave", () => { if (!hoverable.matches) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { if (openTrigger === tr) { closeAll(); onScroll(); } }, 220); });
    panelOf(tr).addEventListener("click", (e) => { if (e.target.closest("a")) { closeAll(); onScroll(); } });
  });
  // Live preview: hovering or focusing a service swaps the side panel to that service
  document.querySelectorAll("[data-pv-pane]").forEach((pane) => {
    const panel = pane.closest("[data-mm-panel]");
    const views = [...pane.querySelectorAll("[data-pv-for]")];
    const fallback = views.find((v) => v.classList.contains("is-on"))?.dataset.pvFor;
    let current = fallback;
    const showPv = (key) => {
      if (!key || key === current) return;
      current = key;
      panel.querySelectorAll("[data-pv]").forEach((a) => a.classList.toggle("is-pv", a.dataset.pv === key && key !== fallback));
      views.forEach((v) => {
        const on = v.dataset.pvFor === key;
        v.hidden = !on;
        v.classList.toggle("is-on", on);
      });
    };
    panel.querySelectorAll("[data-pv]").forEach((a) => {
      a.addEventListener("pointerenter", () => showPv(a.dataset.pv));
      a.addEventListener("focus", () => showPv(a.dataset.pv));
    });
    new MutationObserver(() => { if (panel.hidden) showPv(fallback); }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  });
  document.addEventListener("click", (e) => { if (openTrigger && !e.target.closest(".mm-item")) { closeAll(); onScroll(); } });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openTrigger) { const tr = openTrigger; closeAll(); onScroll(); tr.focus(); }
  });
  window.addEventListener("scroll", () => { if (openTrigger && !hoverable.matches) { closeAll(); onScroll(); } }, { passive: true });

  // Highlight the top-level item whose sections are in view
  const groups = [
    ...triggers.map((tr) => ({ el: tr, ids: tr.dataset.sections.split(" ") })),
    ...[...document.querySelectorAll(".nav-link[href^='#']")].map((a) => ({ el: a, ids: [a.getAttribute("href").slice(1)] })),
  ];
  const watched = groups.flatMap((g) => g.ids).map((id) => document.getElementById(id)).filter(Boolean);
  if (watched.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        groups.forEach((g) => g.el.setAttribute("aria-current", String(g.ids.includes(entry.target.id))));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    watched.forEach((s) => io.observe(s));
  }

  // Ticker: duplicate the list once so translate(-50%) loops seamlessly
  const track = document.querySelector("[data-ticker]");
  if (track && !reducedMotion) {
    const list = track.querySelector(".ticker-list");
    const clone = list.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
    track.classList.add("is-running");
  }

  // Capability rules draw in once when they enter the viewport
  const reveals = document.querySelectorAll("[data-reveal]");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    reveals.forEach((el) => io.observe(el));
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
}
