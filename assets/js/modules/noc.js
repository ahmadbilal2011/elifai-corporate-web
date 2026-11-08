import { t, isAr, locale } from "./i18n.js?v=11";
/** NOC console: clickable views, live clock, chart reveal, and a live incident queue. */
const AGENTS = ["Ali Raza", "Sana Khan", "Hamza Sheikh", "Fatima Malik", "Imran Akhtar", "Noor Ahmed", "Zeeshan Haider", "Ayesha Butt", "Usman Javed", "Mariam Siddiqui", "Daniel Brooks", "Emma Clarke"];
const ISSUES = [
  ["P3", "Disk 78% on minio-03", "MinIO"], ["P3", "Pod restart loop in payments", "EKS UAE"], ["P2", "Replica lag 40 s", "PostgreSQL"],
  ["P3", "Backup job slow", "Oracle Jeddah"], ["P3", "High memory on kafka-2", "Kafka"], ["P2", "5xx rate above 1%", "API gateway"],
  ["P3", "Node not ready", "GKE Dammam"], ["P3", "Failed login spike", "Keycloak"],
];

export function initNoc({ reducedMotion }) {
  const frame = document.querySelector("[data-noc]");
  if (!frame) return;

  /* clock */
  const clock = frame.querySelector("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: clock.dataset.clock, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tick = () => { clock.textContent = `${fmt.format(new Date())} PKT`; };
    tick();
    setInterval(tick, 1000);
  }

  /* views */
  const tabs = [...frame.querySelectorAll("[data-noc-nav] [data-view]")];
  const views = [...frame.querySelectorAll("[data-noc-view]")];
  function show(name, focus) {
    tabs.forEach((t) => {
      const on = t.dataset.view === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    views.forEach((v) => {
      const on = v.dataset.nocView === name;
      v.hidden = !on;
      v.classList.toggle("is-on", false);
      if (on) { void v.offsetWidth; v.classList.add("is-on"); }
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(t.dataset.view));
    t.addEventListener("keydown", (e) => {
      const rtl = document.documentElement.dir === "rtl";
      const map = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      show(tabs[(i + map[e.key] + tabs.length) % tabs.length].dataset.view, true);
    });
  });

  /* live incident queue: new item arrives red, an engineer picks it up, then it resolves */
  const feed = frame.querySelector("[data-noc-feed]");
  let k = 0;
  function addIncident() {
    if (!feed || feed.closest("[hidden]")) return;
    const [sev, title, where] = ISSUES[k++ % ISSUES.length];
    const who = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    const li = document.createElement("li");
    li.className = "is-new is-open";
    const badge = document.createElement("span");
    badge.className = `sev ${sev === "P2" ? "sev-2" : "sev-3"}`;
    badge.textContent = sev;
    const body = document.createElement("div");
    const b = document.createElement("b"); b.textContent = title;
    const m = document.createElement("span"); m.className = "mono"; m.textContent = `${where} · ${who} ${t("on it")}`;
    body.append(b, m);
    li.append(badge, body);
    feed.prepend(li);
    requestAnimationFrame(() => li.classList.remove("is-new"));
    setTimeout(() => {
      li.classList.remove("is-open");
      li.classList.add("is-fixed");
      m.textContent = `${where} · ${t("resolved by")} ${who} ${t("in")} ${8 + Math.floor(Math.random() * 30)} ${t("min")}`;
    }, 3500 + Math.random() * 1500);
    while (feed.children.length > 5) feed.lastElementChild.remove();
  }

  if (reducedMotion || !("IntersectionObserver" in window)) return;
  frame.classList.add("noc-armed");
  let timer = 0;
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      frame.classList.add("noc-live");
      if (!timer) timer = setInterval(addIncident, 5000);
    } else if (timer) { clearInterval(timer); timer = 0; }
  }, { threshold: 0.3 }).observe(frame);
}
