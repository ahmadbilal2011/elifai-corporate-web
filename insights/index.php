<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/layout.php';

$articles = published_articles();
$cats = array_values(array_unique(array_filter(array_column($articles, 'category'))));

page_open([
    'title' => 'Insights for Saudi and Gulf technology leaders | Elifai',
    'description' => 'Practical guides on OpenShift, Red Hat Enterprise Linux, cloud regions in Saudi Arabia, NCA compliance and AI for IT operations, from the engineers who run these platforms.',
    'canonical' => '/insights/',
    'jsonld' => [[
        '@context' => 'https://schema.org', '@type' => 'Blog', 'name' => 'Elifai Insights', 'url' => SITE_URL . '/insights/',
        'publisher' => org_ld(),
        'blogPost' => array_map(function ($a) {
            return ['@type' => 'BlogPosting', 'headline' => $a['title'], 'url' => SITE_URL . '/insights/' . $a['slug'], 'datePublished' => iso_date($a['published_at'])];
        }, array_slice($articles, 0, 10)),
    ]],
], 'insights');
?>
  <main id="main" class="hub">
    <section class="hub-hero">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Insights</nav>
        <p class="hub-kicker mono"><span class="live-dot" aria-hidden="true"></span> Insights</p>
        <h1 class="hub-title">Practical guides for platform and IT leaders</h1>
        <p class="hub-lede">Short, field-tested articles on OpenShift, Red Hat Enterprise Linux, cloud in Saudi Arabia, compliance and AI for operations.</p>
        <?php if ($cats): ?>
        <div class="chips" role="group" aria-label="Filter by topic" data-filter-group="cat">
          <button type="button" class="chip" aria-pressed="true" data-filter="">All</button>
          <?php foreach ($cats as $c): ?><button type="button" class="chip" aria-pressed="false" data-filter="<?= h($c) ?>"><?= h($c) ?></button><?php endforeach; ?>
        </div>
        <?php endif; ?>
      </div>
    </section>
    <section class="hub-body">
      <div class="wrap">
        <?php if (!$articles): ?>
          <p class="hub-empty">New articles are on the way.</p>
        <?php else: ?>
        <div class="post-grid" data-filter-list>
          <?php foreach ($articles as $k => $a): ?>
          <article class="post-card<?= $k === 0 ? ' is-lead' : '' ?>" data-cat="<?= h($a['category']) ?>">
            <a href="/insights/<?= h($a['slug']) ?>" class="post-link">
              <?php if ($a['cover']): ?><img class="post-cover" src="<?= h($a['cover']) ?>" alt="" loading="lazy" decoding="async"><?php endif; ?>
              <span class="post-tag mono"><?= h($a['category'] ?: 'Insight') ?></span>
              <h2 class="post-title"><?= h($a['title']) ?></h2>
              <p class="post-text"><?= h($a['summary']) ?></p>
              <span class="post-meta mono"><time datetime="<?= h(iso_date($a['published_at'])) ?>"><?= h(nice_date($a['published_at'])) ?></time> · <?= read_minutes($a['body_md']) ?> min read<span class="post-go" aria-hidden="true">→</span></span>
            </a>
          </article>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>
        <aside class="hub-cross">
          <div>
            <p class="mono hub-cross-k">Learning hub</p>
            <h2>Free courses with videos, docs and GitHub labs</h2>
            <p>OpenShift, RHEL, Ansible and practical AI for operations, curated by our engineers.</p>
          </div>
          <a class="btn btn-primary" href="/learning/">Open the learning hub</a>
        </aside>
      </div>
    </section>
  </main>
<?php
page_close();
