<?php
/**
 * Shared page chrome for the PHP pages (Insights and Learning).
 * Uses the same stylesheet, theme script and modules as the static site.
 */
declare(strict_types=1);

function asset_version(): string
{
    static $v = null;
    if ($v === null) {
        $html = @file_get_contents(WEB_ROOT . '/index.html', false, null, 0, 8000) ?: '';
        $v = preg_match('/main\.css\?v=(\d+)/', $html, $m) ? $m[1] : '1';
    }
    return $v;
}

/**
 * $meta: title, description, canonical (path), type (website|article),
 *        published (Y-m-d), image, jsonld (array of arrays), robots
 */
function page_open(array $meta, string $active = ''): void
{
    $v = asset_version();
    $title = $meta['title'] ?? 'Elifai';
    $desc = $meta['description'] ?? '';
    $canon = SITE_URL . ($meta['canonical'] ?? '/');
    $img = $meta['image'] ?? SITE_URL . '/assets/img/og-image.png';
    if ($img && $img[0] === '/') $img = SITE_URL . $img;
    header('Content-Type: text/html; charset=utf-8');
    ?>
<!doctype html>
<html lang="en" dir="ltr" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title><?= h($title) ?></title>
  <meta name="description" content="<?= h($desc) ?>">
  <?php if (!empty($meta['robots'])): ?><meta name="robots" content="<?= h($meta['robots']) ?>"><?php endif; ?>
  <meta name="theme-color" content="#0C1219" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#F6F7F9" media="(prefers-color-scheme: light)">
  <meta name="color-scheme" content="dark light">
  <link rel="canonical" href="<?= h($canon) ?>">
  <meta property="og:type" content="<?= h($meta['type'] ?? 'website') ?>">
  <meta property="og:site_name" content="Elifai">
  <meta property="og:title" content="<?= h($meta['og_title'] ?? $title) ?>">
  <meta property="og:description" content="<?= h($desc) ?>">
  <meta property="og:url" content="<?= h($canon) ?>">
  <meta property="og:image" content="<?= h($img) ?>">
  <meta property="og:locale" content="en_US">
  <?php if (!empty($meta['published'])): ?><meta property="article:published_time" content="<?= h($meta['published']) ?>"><?php endif; ?>
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="alternate" type="application/rss+xml" title="Elifai Insights" href="/insights/feed.xml">
  <script src="/assets/js/theme-init.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;600;700&amp;family=Red+Hat+Text:wght@400;500;600&amp;family=Red+Hat+Mono:wght@400;500&amp;display=swap">
  <link rel="stylesheet" href="/assets/css/main.css?v=<?= h($v) ?>">
  <script type="module" src="/assets/js/main.js?v=<?= h($v) ?>"></script>
  <?php foreach (($meta['jsonld'] ?? []) as $ld): ?>
  <script type="application/ld+json"><?= json_encode($ld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?></script>
  <?php endforeach; ?>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header is-scrolled" data-header>
    <div class="wrap header-inner">
      <a class="brand" href="/" aria-label="Elifai by Sysnetrix, home">
        <svg class="brand-mark" viewBox="86 24 126 467" aria-hidden="true"><path d="M103 29H191V62H139V79H207L198 116H103Z"/><path d="M109 174H122V443L91 474V193Z"/><path d="M134 150H162V458L134 486Z"/><path d="M174 169H203V431L174 460Z"/></svg>
        <span class="brand-text"><span class="brand-name">Elifai</span><span class="brand-tag">by Sysnetrix</span></span>
      </a>
      <nav class="sub-nav" aria-label="Resources">
        <a href="/" class="sub-nav-link">Home</a>
        <a href="/insights/" class="sub-nav-link"<?= $active === 'insights' ? ' aria-current="page"' : '' ?>>Insights</a>
        <a href="/learning/" class="sub-nav-link"<?= $active === 'learning' ? ' aria-current="page"' : '' ?>>Learning</a>
      </nav>
      <div class="header-actions">
        <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to light mode">
          <svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          <svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
        </button>
        <a class="btn btn-primary sub-nav-cta" href="/#contact">Talk to an engineer</a>
      </div>
    </div>
  </header>
<?php
}

function page_close(): void
{
    ?>
  <footer class="site-footer">
    <div class="wrap footer-legal">
      <p>© <span data-year><?= gmdate('Y') ?></span> Sysnetrix Pvt Ltd. All rights reserved. Elifai is a venture of Sysnetrix Pvt Ltd.</p>
      <p><a href="/">Home</a><span class="sep" aria-hidden="true">/</span><a href="/insights/">Insights</a><span class="sep" aria-hidden="true">/</span><a href="/learning/">Learning</a><span class="sep" aria-hidden="true">/</span><a href="/privacy">Privacy notice</a><span class="sep" aria-hidden="true">/</span><a href="mailto:info@elifai.pk">info@elifai.pk</a></p>
    </div>
  </footer>
</body>
</html>
<?php
}

function not_found(): void
{
    http_response_code(404);
    page_open(['title' => 'Page not found | Elifai', 'description' => 'This page does not exist.', 'canonical' => '/404', 'robots' => 'noindex']);
    echo '<main id="main" class="article"><div class="wrap prose"><h1>Page not found</h1><p>The page you were looking for has moved or no longer exists.</p><p><a href="/insights/">Browse insights</a> or <a href="/learning/">open the learning hub</a>.</p></div></main>';
    page_close();
    exit;
}

function org_ld(): array
{
    return ['@type' => 'Organization', 'name' => 'Elifai by Sysnetrix', 'url' => SITE_URL . '/',
        'logo' => ['@type' => 'ImageObject', 'url' => SITE_URL . '/assets/img/logo-mark.svg']];
}
