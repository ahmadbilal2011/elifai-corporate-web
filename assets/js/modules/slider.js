/**
 * Small, dependency-free slider controller.
 * Handles index state, autoplay with a progress bar, pause on hover/focus,
 * pointer drag / swipe, keyboard arrows, and visibility. Rendering of the
 * transition itself is left to the caller through `render(next, prev, dir)`.
 */
export function createSlider({
  root,
  count,
  render,
  progress = null,
  interval = 7000,
  autoplay = true,
  reducedMotion = false,
  dragThreshold = 48,
}) {
  let index = 0;
  let elapsed = 0;
  let last = 0;
  let raf = 0;
  let paused = !autoplay || reducedMotion;
  let userPaused = false;
  let hover = false;
  let focusInside = false;
  let onScreen = true;
  const listeners = new Set();

  function go(next, dir) {
    next = (next + count) % count;
    if (next === index) return;
    const prev = index;
    index = next;
    const direction = dir ?? (next > prev ? 1 : -1);
    render(next, prev, direction);
    elapsed = 0;
    setProgress(0);
    listeners.forEach((fn) => fn(next));
  }

  const nextSlide = () => go(index + 1, 1);
  const prevSlide = () => go(index - 1, -1);

  function setProgress(p) {
    if (progress) progress.style.transform = `scaleX(${p})`;
  }

  function isHalted() {
    return paused || userPaused || hover || focusInside || !onScreen || document.hidden;
  }

  function tick(now) {
    const dt = last ? now - last : 0;
    last = now;
    if (!isHalted()) {
      elapsed += dt;
      setProgress(Math.min(elapsed / interval, 1));
      if (elapsed >= interval) nextSlide();
    }
    raf = requestAnimationFrame(tick);
  }

  if (!paused) raf = requestAnimationFrame(tick);

  // Pause while the person is reading or interacting
  root.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hover = true; });
  root.addEventListener("pointerleave", () => { hover = false; });
  root.addEventListener("focusin", () => { focusInside = true; });
  root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) focusInside = false; });

  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }, { threshold: 0.25 }).observe(root);

  // Keyboard
  root.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); nextSlide(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prevSlide(); }
  });

  // Drag / swipe (horizontal only; vertical scrolling stays native via touch-action: pan-y)
  let startX = 0, startY = 0, dragging = false, pointerId = null;
  root.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("a, button, input, select, textarea")) return;
    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
  });
  root.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    if (Math.abs(e.clientX - startX) > 8) root.classList.add("is-dragging");
  });
  const endDrag = (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    root.classList.remove("is-dragging");
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > dragThreshold && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dx < 0 ? nextSlide() : prevSlide();
    }
  };
  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", () => { dragging = false; root.classList.remove("is-dragging"); });

  return {
    go,
    next: nextSlide,
    prev: prevSlide,
    get index() { return index; },
    setUserPaused(v) {
      userPaused = v;
      if (!v && !raf && !reducedMotion) { paused = false; last = 0; raf = requestAnimationFrame(tick); }
    },
    onChange(fn) { listeners.add(fn); },
  };
}

export const pad2 = (n) => String(n).padStart(2, "0");
