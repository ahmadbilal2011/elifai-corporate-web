/**
 * Elifai — entry module. Each feature lives in its own module and is
 * initialised independently, so a failure in one never blocks the others.
 */
import { initTheme } from "./modules/theme.js?v=8";
import { initChrome } from "./modules/chrome.js?v=8";
import { initHero } from "./modules/hero.js?v=8";
import { initNoc } from "./modules/noc.js?v=8";
import { initPlatforms } from "./modules/platforms.js?v=8";
import { initEcosystem } from "./modules/ecosystem.js?v=8";
import { initReplay } from "./modules/replay.js?v=8";
import { initFootprint } from "./modules/footprint.js?v=8";
import { initEngagements } from "./modules/engagements.js?v=8";
import { initContact } from "./modules/contact.js?v=8";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { reducedMotion };

for (const init of [initTheme, initChrome, initHero, initNoc, initPlatforms, initEcosystem, initReplay, initFootprint, initEngagements, initContact]) {
  try {
    init(ctx);
  } catch (err) {
    console.error(`[elifai] ${init.name} failed`, err);
  }
}
