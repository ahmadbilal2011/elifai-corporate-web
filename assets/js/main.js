/**
 * Elifai — entry module. Each feature lives in its own module and is
 * initialized independently, so a failure in one never blocks the others.
 */
import { initTheme } from "./modules/theme.js?v=14";
import { initChrome } from "./modules/chrome.js?v=14";
import { initHero } from "./modules/hero.js?v=14";
import { initNoc } from "./modules/noc.js?v=14";
import { initPlatforms } from "./modules/platforms.js?v=14";
import { initEcosystem } from "./modules/ecosystem.js?v=14";
import { initReplay } from "./modules/replay.js?v=14";
import { initFootprint } from "./modules/footprint.js?v=14";
import { initEngagements } from "./modules/engagements.js?v=14";
import { initContact } from "./modules/contact.js?v=14";
import { initLive } from "./modules/live.js?v=14";
import { initServices } from "./modules/services.js?v=14";
import { initTelecom } from "./modules/telecom.js?v=14";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { reducedMotion };

for (const init of [initTheme, initChrome, initServices, initTelecom, initHero, initNoc, initPlatforms, initEcosystem, initReplay, initFootprint, initEngagements, initContact, initLive]) {
  try {
    init(ctx);
  } catch (err) {
    console.error(`[elifai] ${init.name} failed`, err);
  }
}
