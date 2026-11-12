/**
 * Admin panel helpers: Markdown toolbar and live preview, inline image
 * upload, automatic web addresses, confirm prompts and the lesson list.
 */
const csrf = () => document.querySelector('input[name="csrf"]')?.value || "";

async function api(action, data) {
  const body = new FormData();
  body.append("csrf", csrf());
  body.append("action", action);
  for (const [k, v] of Object.entries(data)) body.append(k, v);
  const res = await fetch("/admin/api.php", { method: "POST", body, credentials: "same-origin" });
  const json = await res.json().catch(() => ({ error: "Unexpected server reply." }));
  if (!res.ok || json.error) throw new Error(json.error || "Request failed.");
  return json;
}

function slugify(s) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/* confirm before destructive buttons */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-confirm]");
  if (b && !window.confirm(b.dataset.confirm)) e.preventDefault();
});

/* web address follows the title until the admin edits it */
const title = document.querySelector("[data-title]");
const slug = document.querySelector("[data-slug]");
if (title && slug) {
  let touched = slug.value !== "";
  slug.addEventListener("input", () => { touched = true; slug.value = slugify(slug.value); });
  title.addEventListener("input", () => { if (!touched) slug.placeholder = slugify(title.value) || "auto from title"; });
}

/* Markdown editor */
const input = document.querySelector("[data-md-input]");
const preview = document.querySelector("[data-md-preview]");
if (input && preview) {
  const tabs = document.querySelectorAll("[data-ed-tab]");
  tabs.forEach((t) => t.addEventListener("click", async () => {
    const show = t.dataset.edTab === "preview";
    tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    input.hidden = show;
    preview.hidden = !show;
    if (show) {
      preview.innerHTML = "<p class='hint'>Rendering…</p>";
      try { preview.innerHTML = (await api("preview", { md: input.value })).html || "<p class='hint'>Nothing to preview yet.</p>"; }
      catch (err) { preview.textContent = err.message; }
    }
  }));

  const insert = (before, after = "", placeholder = "") => {
    const { selectionStart: a, selectionEnd: b, value } = input;
    const sel = value.slice(a, b) || placeholder;
    input.setRangeText(before + sel + after, a, b, "end");
    if (!value.slice(a, b) && placeholder) input.setSelectionRange(a + before.length, a + before.length + placeholder.length);
    input.focus();
  };
  document.querySelectorAll("[data-md]").forEach((b) => b.addEventListener("click", () => {
    const md = b.dataset.md;
    if (md === "link") {
      const url = window.prompt("Link address (https://…)");
      if (url) insert("[", `](${url})`, "link text");
    } else if (b.hasAttribute("data-wrap")) insert(md, md, "text");
    else {
      // line prefix
      const start = input.value.lastIndexOf("\n", input.selectionStart - 1) + 1;
      input.setRangeText(md, start, start, "end");
      input.focus();
    }
  }));

  document.querySelector("[data-img-upload]")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const alt = window.prompt("Describe the image in a few words (for screen readers):", "") || "";
    try {
      const { url } = await api("upload", { image: file });
      insert(`\n![${alt}](${url})\n`);
    } catch (err) { window.alert(err.message); }
    e.target.value = "";
  });
}

/* summary character count */
document.querySelectorAll("[data-count]").forEach((t) => {
  const out = document.createElement("span");
  out.className = "hint count";
  t.after(out);
  const upd = () => { out.textContent = `${t.value.length} / ${t.maxLength}`; };
  t.addEventListener("input", upd);
  upd();
});

/* Course lessons: add, remove, reorder, renumber */
const rows = document.querySelector("[data-rows]");
const tpl = document.querySelector("[data-row-template]");
if (rows && tpl) {
  const renumber = () => {
    [...rows.children].forEach((li, i) => {
      li.querySelector(".lr-grip").textContent = String(i + 1).padStart(2, "0");
      li.querySelectorAll("[name^='lessons[']").forEach((el) => { el.name = el.name.replace(/lessons\[\d+\]/, `lessons[${i}]`); });
    });
  };
  document.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.querySelector("[data-kind]").value = b.dataset.add;
    rows.append(li);
    renumber();
    li.querySelector("[name$='[title]']").focus();
  }));
  rows.addEventListener("click", (e) => {
    const li = e.target.closest("[data-row]");
    if (!li) return;
    if (e.target.closest("[data-remove]")) {
      if (rows.children.length > 1 || window.confirm("Remove the last lesson?")) li.remove();
      renumber();
    }
    const mv = e.target.closest("[data-move]");
    if (mv) {
      const dir = Number(mv.dataset.move);
      const sib = dir < 0 ? li.previousElementSibling : li.nextElementSibling;
      if (sib) dir < 0 ? sib.before(li) : sib.after(li);
      renumber();
      mv.focus();
    }
  });
  /* guess the type from a pasted link */
  rows.addEventListener("change", (e) => {
    if (!e.target.matches("[data-url]")) return;
    const kind = e.target.closest("[data-row]").querySelector("[data-kind]");
    const v = e.target.value;
    if (/youtu\.?be/.test(v)) kind.value = "video";
    else if (/github\.com/.test(v)) kind.value = "github";
    else if (/docs?\.|documentation|readthedocs/.test(v) && kind.value === "video") kind.value = "docs";
  });
}
