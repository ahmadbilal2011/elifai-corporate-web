<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/layout.php';

$courses = published_courses();
$tracks = array_values(array_unique(array_filter(array_column($courses, 'track'))));
$levels = array_values(array_intersect(LEVELS, array_unique(array_column($courses, 'level'))));
$totalLessons = array_sum(array_column($courses, 'lesson_count'));
$totalVideos = array_sum(array_column($courses, 'video_count'));

page_open([
    'title' => 'Learning hub: free OpenShift, RHEL and AI courses | Elifai',
    'description' => 'Free, curated learning paths on Red Hat OpenShift, Red Hat Enterprise Linux, Ansible and practical AI for IT operations, with YouTube lessons, official documentation and GitHub labs.',
    'canonical' => '/learning/',
    'jsonld' => [[
        '@context' => 'https://schema.org', '@type' => 'ItemList', 'name' => 'Elifai learning hub',
        'itemListElement' => array_map(function ($c, $i) {
            return ['@type' => 'ListItem', 'position' => $i + 1, 'url' => SITE_URL . '/learning/' . $c['slug'], 'name' => $c['title']];
        }, $courses, array_keys($courses)),
    ]],
], 'learning');
?>
  <main id="main" class="hub">
    <section class="hub-hero learn-hero">
      <div class="learn-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Learning</nav>
        <p class="hub-kicker mono"><span class="live-dot" aria-hidden="true"></span> Learning hub</p>
        <h1 class="hub-title">Learn the platforms we run every day</h1>
        <p class="hub-lede">Free learning paths curated by Elifai engineers: short videos, official documentation and GitHub labs you can run yourself.</p>
        <ul class="learn-stats mono" aria-label="At a glance">
          <li><b><?= count($courses) ?></b> courses</li>
          <li><b><?= (int)$totalLessons ?></b> lessons</li>
          <li><b><?= (int)$totalVideos ?></b> videos</li>
          <li><b>Free</b> for everyone</li>
        </ul>
        <div class="learn-tools">
          <label class="search">
            <span class="visually-hidden">Search courses</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" placeholder="Search courses, e.g. OpenShift, vLLM" data-filter-search>
          </label>
          <?php if ($tracks): ?>
          <div class="chips" role="group" aria-label="Filter by track" data-filter-group="track">
            <button type="button" class="chip" aria-pressed="true" data-filter="">All tracks</button>
            <?php foreach ($tracks as $t): ?><button type="button" class="chip" aria-pressed="false" data-filter="<?= h($t) ?>"><?= h($t) ?></button><?php endforeach; ?>
          </div>
          <?php endif; ?>
          <?php if (count($levels) > 1): ?>
          <div class="chips chips-sm" role="group" aria-label="Filter by level" data-filter-group="level">
            <button type="button" class="chip" aria-pressed="true" data-filter="">Any level</button>
            <?php foreach ($levels as $l): ?><button type="button" class="chip" aria-pressed="false" data-filter="<?= h($l) ?>"><?= h($l) ?></button><?php endforeach; ?>
          </div>
          <?php endif; ?>
        </div>
      </div>
    </section>
    <section class="hub-body">
      <div class="wrap">
        <?php if (!$courses): ?>
          <p class="hub-empty">The first courses are being prepared.</p>
        <?php else: ?>
        <div class="course-grid" data-filter-list>
          <?php foreach ($courses as $c): ?>
          <article class="course-card" data-track="<?= h($c['track']) ?>" data-level="<?= h($c['level']) ?>" data-text="<?= h(strtolower($c['title'] . ' ' . $c['summary'] . ' ' . $c['track'])) ?>">
            <a href="/learning/<?= h($c['slug']) ?>" class="course-link">
              <span class="course-top">
                <span class="course-track mono"><?= h($c['track']) ?></span>
                <span class="lvl lvl-<?= h(strtolower($c['level'])) ?> mono"><?= h($c['level']) ?></span>
              </span>
              <h2 class="course-title"><?= h($c['title']) ?></h2>
              <p class="course-text"><?= h($c['summary']) ?></p>
              <span class="course-meta mono">
                <span><?= (int)$c['lesson_count'] ?> lessons</span>
                <?php if ($c['video_count']): ?><span><?= (int)$c['video_count'] ?> videos</span><?php endif; ?>
                <?php if ($c['github_count']): ?><span><?= (int)$c['github_count'] ?> GitHub</span><?php endif; ?>
                <?php if ($c['duration']): ?><span><?= h($c['duration']) ?></span><?php endif; ?>
              </span>
              <span class="course-go">Start course <span aria-hidden="true">→</span></span>
            </a>
          </article>
          <?php endforeach; ?>
        </div>
        <p class="hub-empty" data-filter-empty hidden>No courses match. Try another track or search term.</p>
        <?php endif; ?>
        <aside class="hub-cross">
          <div>
            <p class="mono hub-cross-k">Need hands-on help?</p>
            <h2>Train your team on your own platform</h2>
            <p>We run private workshops on OpenShift, RHEL and AI for operations, using your clusters and your runbooks.</p>
          </div>
          <a class="btn btn-primary" href="/#contact" data-topic="Executive briefing">Ask about team training</a>
        </aside>
      </div>
    </section>
  </main>
<?php
page_close();
