/**
 * Elifai — entry module. Each feature lives in its own module and is
 * initialised independently, so a failure in one never blocks the others.
 */
import { initTheme } from "./modules/theme.js";
import { initChrome } from "./modules/chrome.js";
import { initHero } from "./modules/hero.js";
import { initPlatforms } from "./modules/platforms.js";
import { initReplay } from "./modules/replay.js";
import { initFootprint } from "./modules/footprint.js";
import { initEngagements } from "./modules/engagements.js";
import { initContact } from "./modules/contact.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { reducedMotion };

for (const init of [initTheme, initChrome, initHero, initPlatforms, initReplay, initFootprint, initEngagements, initContact]) {
  try {
    init(ctx);
  } catch (err) {
    console.error(`[elifai] ${init.name} failed`, err);
  }
}
