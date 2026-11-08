# elifai-corporate-web

Official website for **Elifai**, a venture by **Sysnetrix Pvt Ltd** (headquartered in Islamabad, Pakistan) — remote managed services, AI consultancy for IT operations, Red Hat / Ubuntu platforms and multi-cloud engineering (AWS, Google Cloud, Oracle Cloud, Alibaba Cloud, VMware) for Pakistan, the GCC and global clients.

- Live domain: https://elifai.pk
- Stack: semantic HTML5, hand-written CSS, vanilla ES modules, one PHP file for the contact form
- **No build step, no Node runtime, no framework.** Upload the files and the site works on any cPanel host (Apache or LiteSpeed).

---

## Project structure

```
elifai-corporate-web/
├── index.html                 Home page (all sections)
├── privacy.html               Privacy notice (served at /privacy)
├── 404.html                   Error page
├── contact.php                Contact form handler → emails info@elifai.pk
├── vendor-news.php            Server-side vendor news proxy with cache (live headlines)
├── .htaccess                  HTTPS, clean URLs, Brotli/Gzip, caching, security headers
├── .cpanel.yml                Deploy tasks for cPanel Git Version Control
├── robots.txt · sitemap.xml · site.webmanifest
├── assets/
│   ├── css/main.css           Design tokens + all styles
│   ├── data/vendors.json      38 vendors: category, product families, site, feed sources
│   ├── img/                   Favicon (follows OS light/dark), social image
│   │   └── logo/              Elifai mark SVGs (currentColor, on-dark, on-light) + PNG lockups
│   └── js/
│       ├── theme-init.js      Applies saved light/dark theme before first paint
│       ├── main.js            Entry module
│       └── modules/
│           ├── theme.js       Light / dark toggle
│           ├── hud.js         Hero ops wall: radar, throughput graph, load bars, security log
│           ├── ecosystem.js   Vendor filter, search, live headlines, vendor wire
│           ├── platforms.js   Platform matrix filter
│           ├── replay.js      AIOps incident replay
│           ├── chrome.js      Header blur, mobile menu, active nav, ticker, reveal
│           ├── slider.js      Shared slider engine (autoplay, drag/swipe, keyboard)
│           ├── hero.js        Hero service slider [ 01 / 04 ]
│           ├── topology.js    Interactive canvas that morphs per service
│           ├── engagements.js Market engagement slider with wipe transitions
│           ├── footprint.js   Region map highlighting + live PKT / AST / UTC clocks
│           └── contact.js     Validation + AJAX submit
├── scripts/build-zip.sh       Packages a clean upload zip
└── .github/workflows/deploy-cpanel.yml   Optional FTPS auto-deploy
```

## Page sections

1. Global header — Elifai mark, "by Sysnetrix, Islamabad", light/dark toggle, "Schedule executive briefing" CTA
2. Hero — four-slide slider (Managed services, AIOps, Gulf multi-cloud, Red Hat & Ubuntu) with `[ 01 / 04 ]` counter, progress, pause, drag/swipe and arrow keys, plus a live topology canvas that reshapes per slide (the multi-cloud view shows AWS, Google Cloud, Oracle, Alibaba and VMware estates around the Islamabad NOC)
3. NOC console — live-HTML operations console (demo tenant) showing estates across AWS, Google Cloud, OCI, OpenShift, Alibaba Cloud and VMware, Linux fleet patch status, latency SLO and incidents
4. Technology ticker — infinite, GPU-accelerated, pauses on hover
4. Services — Managed services & remote operations, AI consultancy for operations, Cloud/Linux/Kubernetes engineering, Custom software
5. Vendor ecosystem — 38 vendor names grouped by category; selecting a name shows its latest model (and a live headline when the PHP proxy is running); a running latest-products bar
5b. Platforms — filterable matrix of RHEL, Ubuntu, OpenShift, AWS, Google Cloud, OCI, Alibaba Cloud and VMware with Gulf region notes
6. AI operations — Assess → Pilot → Operate method and an illustrative incident replay
7. Managed services — Advisory / Co-managed / Fully managed tiers, P1–P4 response targets, access and data controls
8. Footprint — dot-matrix world map (Natural Earth, public domain) with Islamabad HQ and remote delivery to 8 Gulf cities, 5 European cities and London, Toronto, Singapore, Nairobi and Sydney; live PKT / AST / CET / UTC clocks
9. Engagements — market-by-market blueprint slider
10. Leadership — CEO statement by Ahmad Bilal with LinkedIn, WhatsApp, phone and email
11. Team — six engineer cards with roles and skills (Atif Nadeem plus five placeholder profiles; replace the placeholders with real staff before launch)
12. Executive inquiry form — validated, AJAX, honeypot + timing trap + per-IP rate limit
13. Footer — Sysnetrix Pvt Ltd copyright (Islamabad), market badges, contact links, privacy notice

## Logo & themes

- The mark lives in `assets/img/logo/`. `elifai-mark.svg` uses `currentColor`, so it takes the text colour of wherever it is placed; `-on-dark` and `-on-light` have fixed colours for documents and slides.
- **Palette:** AWS "squid ink" navy ground, Red Hat red (`--red`) for primary buttons and brand marks, AWS orange (`--accent`) for signals, links and data highlights, green only for healthy states. Every text pair meets WCAG AA 4.5:1 in both themes.
- **Type:** Red Hat Display (headings), Red Hat Text (body), Red Hat Mono (data), all open-source via Google Fonts.
- **Theme by time of day:** the site opens in dark mode between 19:00 and 03:00 (visitor's local time) and in light mode the rest of the day; an open tab switches over at the boundary. The sun/moon button overrides this for the current browser session. The hours live in `assets/js/theme-init.js` and `assets/js/modules/theme.js`.
- All colours are tokens at the top of `assets/css/main.css`; the light palette is under `:root[data-theme="light"]`.

## Run locally

No install needed. Pick one:

```bash
# Recommended: PHP's built-in server also runs contact.php
php -S localhost:8080

# Static only (form will show the email/WhatsApp fallback)
python3 -m http.server 8080
```

Open http://localhost:8080.

> `.htaccess` rules (clean URLs, headers) are not applied by these dev servers. Use `/privacy.html` locally; `/privacy` works on cPanel.

## Build

There is nothing to compile. To create an upload-ready archive containing only public files:

```bash
bash scripts/build-zip.sh
# → dist/elifai-public_html.zip
```

---

## Deploy to cPanel

### Option A — File Manager upload (simplest)

1. Run `bash scripts/build-zip.sh`, or on Windows select the files listed in the script and zip them.
2. Log in to cPanel → **File Manager** → open `public_html`.
3. Click **Settings** (top right) → tick **Show Hidden Files (dotfiles)** so you can see `.htaccess`.
4. Remove any old placeholder files (e.g. `index.php`, `default.html`, `cgi-bin` can stay).
5. Click **Upload** → choose `elifai-public_html.zip` → wait for 100%.
6. Back in `public_html`, right-click the zip → **Extract** → extract into `/public_html`.
7. Delete the zip. Visit https://elifai.pk.

### Option B — cPanel Git Version Control (recommended for updates)

1. cPanel → **Git Version Control** → **Create**.
2. Clone URL: `https://github.com/ahmadbilal2011/elifai-corporate-web.git`
   (for a private repo, first add an SSH key in cPanel → **SSH Access** and add it as a deploy key on GitHub, then use the `git@github.com:` URL).
3. Repository path: `/home/<cpanel-user>/repositories/elifai-corporate-web` — **not** inside `public_html`.
4. Click **Create**, then open **Manage** → **Pull or Deploy** tab.
5. Click **Update from Remote**, then **Deploy HEAD Commit**. cPanel runs `.cpanel.yml`, which copies the public files into `public_html`.
6. For each future change: push to GitHub → **Update from Remote** → **Deploy HEAD Commit**.

If elifai.pk is an addon domain, edit `DEPLOYPATH` in `.cpanel.yml` to that domain's document root.

### Option C — GitHub Actions auto-deploy (optional)

1. cPanel → **FTP Accounts** → create an account limited to `public_html`.
2. GitHub repo → Settings → Secrets and variables → Actions:
   - Secrets: `CPANEL_FTP_SERVER`, `CPANEL_FTP_USERNAME`, `CPANEL_FTP_PASSWORD`
   - Variables: `CPANEL_DEPLOY_ENABLED` = `true`
3. Every push to `main` now uploads changed files over FTPS.

---

## After the first deploy — checklist

- [ ] **SSL:** cPanel → **SSL/TLS Status** → run AutoSSL so HTTPS works before the redirect kicks in.
- [ ] **Mailbox:** cPanel → **Email Accounts** → make sure `info@elifai.pk` exists (or forwards somewhere you read).
- [ ] **Sender:** create `no-reply@elifai.pk` (or change `MAIL_FROM` in `contact.php` to an address on this account).
- [ ] **Deliverability:** cPanel → **Email Deliverability** → fix any SPF / DKIM warnings for elifai.pk.
- [ ] **PHP version:** cPanel → **MultiPHP Manager** → PHP 8.1 or newer.
- [ ] **Test the form** from the live site and confirm the email arrives (check spam the first time).
- [ ] **Search:** submit `https://elifai.pk/sitemap.xml` in Google Search Console.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| 500 Internal Server Error after upload | Rename `.htaccess` to `.htaccess.off`, reload. If the site appears, your host blocks a directive — re-enable sections one at a time. |
| Redirect loop | Your host terminates SSL at a proxy without setting `X-Forwarded-Proto`. Comment out the "Force HTTPS" block and use cPanel → Domains → **Force HTTPS Redirect** instead. |
| Form says "mail server did not accept" | `MAIL_FROM` must be an address on this cPanel account; check Email Deliverability. |
| Old CSS after an update | Styles are cached for a week. Add `?v=2` to the `main.css` / `main.js` links in the HTML. |
| `/privacy` shows 404 | `mod_rewrite` is off; link to `/privacy.html` or ask the host to enable it. |

## Live vendor updates

`vendor-news.php` fetches each vendor's public news feed on the server, keeps only headlines (title, date, link, source) and caches them in `cache/` for 6 hours. The browser never contacts the vendors directly, and visitors cannot make the script fetch an arbitrary URL; every source is listed in `assets/data/vendors.json`.

For each vendor the sources are tried in order and the first one that returns recent items wins:
1. the vendor's own RSS/Atom feed, where one is listed;
2. public news search limited to the vendor's own domain;
3. public news search for the vendor's name.

Set `ALLOW_NEWS_AGGREGATOR` to `false` at the top of `vendor-news.php` to use only the vendors' own feeds.

**Check the feeds after deploying** (cPanel → Terminal, or SSH):

```bash
cd ~/public_html && php vendor-news.php --check
```

It prints every vendor with `official`, `news` or `FAILED`. Fix a failing vendor by adding its newsroom RSS address to the start of its `feeds` list in `vendors.json`. Optional: warm the cache every 6 hours with a cPanel **Cron Job**: `php ~/public_html/vendor-news.php > /dev/null`.

Requirements: PHP with cURL (standard on cPanel) or `allow_url_fopen` on, and a writable `cache/` folder (created automatically; blocked from the web by `.htaccess`).

## Editing content

- **Copy** lives directly in `index.html`; every section is marked with a comment banner.
- **Engagement blueprints** are written as representative scenarios. Replace them with named case studies once clients approve publication.
- **Cloud region notes** on the Platforms section reflect each provider's published Gulf regions as of November 2026. Review them when providers open new regions (for example the AWS Saudi Arabia region).
- **SLA targets** in the Managed services section are standard targets; adjust them to match your contracts.
- **Colours, type and spacing** are tokens at the top of `assets/css/main.css`.
- **Vendors:** product families are in `index.html` (Vendor ecosystem section) and `assets/data/vendors.json`; keep the two in step when you add or remove a vendor.
- **Latest models:** curated in `assets/data/vendors.json` (`latest`) and mirrored in `index.html` (`data-latest` on each vendor button) as of November 2026; update both when a vendor launches a new flagship.
- **Hero health mix:** the topology keeps roughly 70% of nodes healthy (green), 10% warning (orange) and 20% incidents (red); every incident shows an engineer's progress ring and is fixed within a few seconds. Shares are `SHARE_WARN` / `SHARE_BAD` in `topology.js`; engineer display names are in `AGENTS`.
- **Hero ops wall:** all HUD figures (req/s, security events, cluster load) are simulated for the showcase; event IPs use the RFC 5737 documentation ranges.
- **Canvas animation:** each hero slide has its own motion in `topology.js` (`animate()`): zones orbiting with self-healing alerts (Managed), an activation wave through the layers (AIOps), five clouds orbiting the Islamabad NOC (Multi-cloud), and a rolling patch wave across the Linux fleet. All of it stops under reduced motion and with the pause button.
- **Team:** cards are in the `TEAM` section of `index.html`; initials avatars can be swapped for photos.
- **Hero slides:** each `<article data-slide data-mode="…">` maps to a canvas layout in `topology.js` (`cloud`, `ai`, `pipeline`, `modules`).
- **Contact recipient:** change `MAIL_TO` at the top of `contact.php`.

## Accessibility & performance

- WCAG 2.2 AA colour contrast on all text, visible focus rings, skip link, labelled controls
- Sliders: keyboard arrows, pause control, autoplay stops on hover/focus, `aria-live` updates
- `prefers-reduced-motion` turns off autoplay, the canvas loop, the ticker and all entrance animation
- Canvas renders only while on screen and while the tab is visible
- No images on the critical path; total JS ≈ 30 KB unminified, zero dependencies

---

© Sysnetrix Pvt Ltd. All rights reserved.
