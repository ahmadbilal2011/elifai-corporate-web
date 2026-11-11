import { t, isAr, locale } from "./i18n.js?v=14";
/**
 * Executive inquiry form — client-side validation and AJAX submit to /contact.php.
 * Works without JavaScript too (plain POST; contact.php redirects back).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FALLBACK =
  'You can also email <a href="mailto:info@elifai.pk">info@elifai.pk</a> or message us on <a href="https://wa.me/966540952792" target="_blank" rel="noopener">WhatsApp</a>.';

const FB = isAr ? t("FALLBACK") : FALLBACK;

export function initContact() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const status = form.querySelector("[data-status]");
  const submit = form.querySelector("[data-submit]");
  const ts = form.querySelector("[data-ts]");
  ts.value = String(Date.now());

  // Prefill the topic from any CTA carrying data-topic
  document.querySelectorAll("[data-topic]").forEach((link) => {
    link.addEventListener("click", () => {
      const select = form.querySelector("#f-topic");
      const value = link.dataset.topic;
      if ([...select.options].some((o) => o.value === value)) select.value = value;
    });
  });

  // Reflect a no-JS redirect result (?sent=1 / ?sent=0)
  const params = new URLSearchParams(location.search);
  if (params.has("sent")) {
    setStatus(params.get("sent") === "1"
      ? ["ok", t("Thank you. Your enquiry has been sent and we will reply within one business day.")]
      : ["err", `${t("Your enquiry could not be sent.")} ${FB}`]);
  }

  const rules = {
    name: (v) => (v.trim().length >= 2 ? "" : t("Enter your full name.")),
    email: (v) => (EMAIL_RE.test(v.trim()) ? "" : t("Enter an email address like name@company.com.")),
    message: (v) => (v.trim().length >= 20 ? "" : t("Add a little more detail, at least 20 characters.")),
    consent: (_, el) => (el.checked ? "" : t("Tick the box so we can use these details to reply.")),
  };

  function validateField(name) {
    const el = form.elements[name];
    if (!el || !rules[name]) return true;
    const msg = rules[name](el.value, el);
    const field = el.closest(".field");
    const err = form.querySelector(`#${el.id}-err`);
    field.classList.toggle("has-error", Boolean(msg));
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) {
      err.textContent = msg;
      if (msg) el.setAttribute("aria-describedby", err.id);
      else el.removeAttribute("aria-describedby");
    }
    return !msg;
  }

  Object.keys(rules).forEach((name) => {
    const el = form.elements[name];
    el.addEventListener("blur", () => { if (el.value || el.type === "checkbox") validateField(name); });
    el.addEventListener("input", () => { if (el.closest(".field").classList.contains("has-error")) validateField(name); });
    el.addEventListener("change", () => validateField(name));
  });

  function setStatus([kind, html]) {
    status.className = `form-status ${kind === "ok" ? "is-ok" : kind === "err" ? "is-err" : ""}`;
    status.innerHTML = html;
  }

  function setLoading(on) {
    submit.disabled = on;
    submit.classList.toggle("is-loading", on);
    submit.querySelector(".btn-label").textContent = on ? t("Sending") : t("Send enquiry");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const results = Object.keys(rules).map(validateField);
    if (results.includes(false)) {
      const firstBad = form.querySelector('[aria-invalid="true"]');
      firstBad?.focus();
      setStatus(["err", t("Check the highlighted fields and try again.")]);
      return;
    }

    setLoading(true);
    setStatus(["", t("Sending your enquiry")]);

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json", "X-Requested-With": "fetch" },
        credentials: "same-origin",
      });
      let data = null;
      try { data = await res.json(); } catch { /* non-JSON = PHP not running */ }

      if (res.ok && data?.ok) {
        form.reset();
        ts.value = String(Date.now());
        form.querySelectorAll(".has-error").forEach((f) => f.classList.remove("has-error"));
        setStatus(["ok", isAr ? t("Thank you. Your enquiry has been sent and we will reply within one business day.") : (data.message || "Thank you. Your enquiry has been sent.")]);
      } else if (data?.errors) {
        Object.entries(data.errors).forEach(([name, msg]) => {
          const el = form.elements[name];
          const err = el && form.querySelector(`#${el.id}-err`);
          if (err) { err.textContent = msg; el.closest(".field").classList.add("has-error"); }
        });
        setStatus(["err", isAr ? t("Check the highlighted fields and try again.") : (data.message || "Check the highlighted fields and try again.")]);
      } else {
        setStatus(["err", `${isAr ? t("The enquiry service did not respond.") : (data?.message || "The enquiry service did not respond.")} ${FB}`]);
      }
    } catch {
      setStatus(["err", `${t("No connection to the server.")} ${FB}`]);
    } finally {
      setLoading(false);
    }
  });
}
