<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/layout.php';
require __DIR__ . '/../lib/markdown.php';

$slug = (string)($_GET['slug'] ?? '');
if (!preg_match('/^[a-z0-9-]{1,80}$/', $slug)) not_found();

// admins can preview drafts
$preview = false;
$st = db()->prepare('SELECT * FROM articles WHERE slug = ?');
$st->execute([$slug]);
$a = $st->fetch();
if ($a && $a['status'] !== 'published') {
    $preview = current_user() !== null;
    if (!$preview) $a = null;
}
if (!$a) not_found();

$url = '/insights/' . $a['slug'];
$mins = read_minutes($a['body_md']);
$related = array_values(array_filter(published_articles(4), function ($x) use ($a) { return $x['id'] !== $a['id']; }));
$related = array_slice($related, 0, 3);

page_open([
    'title' => $a['title'] . ' | Elifai Insights',
    'og_title' => $a['title'],
    'description' => $a['summary'],
    'canonical' => $url,
    'type' => 'article',
    'published' => iso_date($a['published_at']),
    'image' => $a['cover'] ?: null,
    'robots' => $preview ? 'noindex' : '',
    'jsonld' => [
        ['@context' => 'https://schema.org', '@type' => 'Article', 'headline' => $a['title'], 'description' => $a['summary'],
         'datePublished' => iso_date($a['published_at']), 'dateModified' => iso_date($a['updated_at']), 'inLanguage' => 'en',
         'mainEntityOfPage' => SITE_URL . $url, 'image' => $a['cover'] ? SITE_URL . $a['cover'] : SITE_URL . '/assets/img/og-image.png',
         'author' => ['@type' => 'Organization', 'name' => 'Elifai engineering team', 'url' => SITE_URL . '/'], 'publisher' => org_ld()],
        ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => SITE_URL . '/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Insights', 'item' => SITE_URL . '/insights/'],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $a['title'], 'item' => SITE_URL . $url]]],
    ],
], 'insights');
?>
  <main id="main" class="article">
    <article class="wrap prose">
      <?php if ($preview): ?><p class="draft-flag mono">Draft preview · only signed-in admins can see this page</p><?php endif; ?>
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/insights/">Insights</a><?= $a['category'] ? ' / ' . h($a['category']) : '' ?></nav>
      <h1><?= h($a['title']) ?></h1>
      <p class="meta"><?= h($a['category'] ?: 'Insight') ?> · <?= $mins ?> min read · Elifai engineering team<?php if ($a['published_at']): ?> · <time datetime="<?= h(iso_date($a['published_at'])) ?>"><?= h(nice_date($a['published_at'])) ?></time><?php endif; ?></p>
      <?php if ($a['cover']): ?><img class="article-cover" src="<?= h($a['cover']) ?>" alt="" decoding="async"><?php endif; ?>
      <?php if ($a['summary']): ?><p class="lede"><?= h($a['summary']) ?></p><?php endif; ?>
      <?= markdown($a['body_md']) ?>

      <aside class="article-cta">
        <h2 style="margin-top:0">Need this done for your organization?</h2>
        <p>Elifai by Sysnetrix designs, secures and runs cloud, Linux and AI platforms for organizations in Saudi Arabia and across the Gulf, with 24/7 remote support.</p>
        <a class="btn btn-primary" href="/#contact" data-topic="Executive briefing">Schedule an executive briefing</a>
      </aside>
      <?php if (trim($a['sources_md']) !== ''): ?>
      <h2>Sources</h2>
      <div class="sources"><?= markdown($a['sources_md']) ?></div>
      <?php endif; ?>
      <?php if ($related): ?>
      <section class="related"><h2>More insights</h2><ul>
        <?php foreach ($related as $r): ?><li><a href="/insights/<?= h($r['slug']) ?>"><?= h($r['title']) ?></a></li><?php endforeach; ?>
      </ul></section>
      <?php endif; ?>
    </article>
  </main>
<?php
page_close();
