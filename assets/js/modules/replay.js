/** AIOps incident replay: reveals the log line by line once it scrolls into view. */
export function initReplay({ reducedMotion }) {
  const box = document.querySelector("[data-replay]");
  if (!box) return;
  const lines = [...box.querySelectorAll("[data-line]")];
  const btn = box.querySelector("[data-replay-btn]");
  let timers = [];

  if (reducedMotion) {
    btn.hidden = true;
    return;
  }

  function play() {
    timers.forEach(clearTimeout);
    timers = [];
    box.classList.add("is-armed");
    lines.forEach((l) => l.classList.remove("is-shown"));
    lines.forEach((l, i) => {
      timers.push(setTimeout(() => l.classList.add("is-shown"), 350 + i * 650));
    });
  }

  box.classList.add("is-armed");
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { play(); io.disconnect(); }
  }, { threshold: 0.45 });
  io.observe(box);
  btn.addEventListener("click", play);
}
