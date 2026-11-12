/**
 * Elifai — entry module. Each feature lives in its own module and is
 * initialized independently, so a failure in one never blocks the others.
 */
import { initTheme } from "./modules/theme.js?v=15";
import { initChrome } from "./modules/chrome.js?v=15";
import { initHero } from "./modules/hero.js?v=15";
import { initNoc } from "./modules/noc.js?v=15";
import { initPlatforms } from "./modules/platforms.js?v=15";
import { initEcosystem } from "./modules/ecosystem.js?v=15";
import { initReplay } from "./modules/replay.js?v=15";
import { initFootprint } from "./modules/footprint.js?v=15";
import { initEngagements } from "./modules/engagements.js?v=15";
import { initContact } from "./modules/contact.js?v=15";
import { initLive } from "./modules/live.js?v=15";
import { initServices } from "./modules/services.js?v=15";
import { initTelecom } from "./modules/telecom.js?v=15";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { reducedMotion };

for (const init of [initTheme, initChrome, initServices, initTelecom, initHero, initNoc, initPlatforms, initEcosystem, initReplay, initFootprint, initEngagements, initContact, initLive]) {
  try {
    init(ctx);
  } catch (err) {
    console.error(`[elifai] ${init.name} failed`, err);
  }
}
