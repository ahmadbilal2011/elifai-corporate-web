/**
 * Elifai — entry module. Each feature lives in its own module and is
 * initialised independently, so a failure in one never blocks the others.
 */
import { initTheme } from "./modules/theme.js?v=11";
import { initChrome } from "./modules/chrome.js?v=11";
import { initHero } from "./modules/hero.js?v=11";
import { initNoc } from "./modules/noc.js?v=11";
import { initPlatforms } from "./modules/platforms.js?v=11";
import { initEcosystem } from "./modules/ecosystem.js?v=11";
import { initReplay } from "./modules/replay.js?v=11";
import { initFootprint } from "./modules/footprint.js?v=11";
import { initEngagements } from "./modules/engagements.js?v=11";
import { initContact } from "./modules/contact.js?v=11";
import { initLive } from "./modules/live.js?v=11";
import { initServices } from "./modules/services.js?v=11";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { reducedMotion };

for (const init of [initTheme, initChrome, initServices, initHero, initNoc, initPlatforms, initEcosystem, initReplay, initFootprint, initEngagements, initContact, initLive]) {
  try {
    init(ctx);
  } catch (err) {
    console.error(`[elifai] ${init.name} failed`, err);
  }
}
