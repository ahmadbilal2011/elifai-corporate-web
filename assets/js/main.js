/**
 * Elifai — entry module. Each feature lives in its own module and is
 * initialized independently, so a failure in one never blocks the others.
 */
import { initTheme } from "./modules/theme.js?v=16";
import { initChrome } from "./modules/chrome.js?v=16";
import { initHero } from "./modules/hero.js?v=16";
import { initNoc } from "./modules/noc.js?v=16";
import { initPlatforms } from "./modules/platforms.js?v=16";
import { initEcosystem } from "./modules/ecosystem.js?v=16";
import { initReplay } from "./modules/replay.js?v=16";
import { initFootprint } from "./modules/footprint.js?v=16";
import { initEngagements } from "./modules/engagements.js?v=16";
import { initContact } from "./modules/contact.js?v=16";
import { initLive } from "./modules/live.js?v=16";
import { initServices } from "./modules/services.js?v=16";
import { initTelecom } from "./modules/telecom.js?v=16";
import { initHub } from "./modules/hub.js?v=16";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { reducedMotion };

for (const init of [initTheme, initChrome, initServices, initTelecom, initHero, initNoc, initPlatforms, initEcosystem, initReplay, initFootprint, initEngagements, initContact, initLive, initHub]) {
  try {
    init(ctx);
  } catch (err) {
    console.error(`[elifai] ${init.name} failed`, err);
  }
}
