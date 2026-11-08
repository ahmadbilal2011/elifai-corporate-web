# elifai-corporate-web

Official website for **Elifai**, a venture by **Sysnetrix Pvt Ltd** — AI systems, cloud architecture and enterprise engineering for Pakistan, the GCC and global clients.

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
├── .htaccess                  HTTPS, clean URLs, Brotli/Gzip, caching, security headers
├── .cpanel.yml                Deploy tasks for cPanel Git Version Control
├── robots.txt · sitemap.xml · site.webmanifest
├── assets/
│   ├── css/main.css           Design tokens + all styles
│   ├── img/                   Logo mark, favicon, social preview image
│   └── js/
│       ├── main.js            Entry module
│       └── modules/
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

1. Global header — blurred backdrop on scroll, Elifai mark + "A Sysnetrix venture", "Schedule executive briefing" CTA
2. Hero — four-vertical slider (Cloud, AI, DevOps, Software) with counter, progress bar, pause, drag/swipe, arrow keys, and a live topology canvas that reshapes itself for each vertical; WhatsApp, call and proposal CTAs
3. Technology ticker — GPU-accelerated infinite marquee (pauses on hover, becomes a static list under reduced motion)
4. Capabilities — Enterprise AI & automation, Cloud & multi-cloud DevOps, Custom enterprise software
5. Footprint matrix — coordinate-grid map of Pakistan, KSA and UAE coverage with remote links; region cards highlight the map and show local time
6. Engagements — market-by-market blueprint slider (Pakistan, Saudi Arabia, UAE & GCC, Global)
7. Leadership — CEO statement by Ahmad Bilal with LinkedIn, WhatsApp, phone and email
8. Executive inquiry form — validated, AJAX, honeypot + timing trap + per-IP rate limit
9. Footer — Sysnetrix copyright, market badges, contact links, privacy notice

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

## Editing content

- **Copy** lives directly in `index.html`; every section is marked with a comment banner.
- **Engagement blueprints** are written as representative scenarios. Replace them with named case studies once clients approve publication.
- **Colours, type and spacing** are tokens at the top of `assets/css/main.css`.
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
