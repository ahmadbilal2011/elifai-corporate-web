/** NOC console: live clock and a one-time draw of the chart and fleet bars when it comes into view. */
export function initNoc({ reducedMotion }) {
  const frame = document.querySelector("[data-noc]");
  if (!frame) return;

  const clock = frame.querySelector("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: clock.dataset.clock, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tick = () => { clock.textContent = `${fmt.format(new Date())} PKT`; };
    tick();
    setInterval(tick, 1000);
  }

  if (reducedMotion || !("IntersectionObserver" in window)) return;
  frame.classList.add("noc-armed");
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    frame.classList.add("noc-live");
    io.disconnect();
  }, { threshold: 0.35 });
  io.observe(frame);
}
