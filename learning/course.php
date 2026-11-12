<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/layout.php';
require __DIR__ . '/../lib/markdown.php';

$slug = (string)($_GET['slug'] ?? '');
if (!preg_match('/^[a-z0-9-]{1,80}$/', $slug)) not_found();
$st = db()->prepare('SELECT * FROM courses WHERE slug = ?');
$st->execute([$slug]);
$c = $st->fetch();
$preview = false;
if ($c && $c['status'] !== 'published') {
    $preview = current_user() !== null;
    if (!$preview) $c = null;
}
if (!$c) not_found();

$lessons = course_lessons((int)$c['id']);
$url = '/learning/' . $c['slug'];
$kindLabel = ['video' => 'Video', 'github' => 'GitHub', 'docs' => 'Docs', 'article' => 'Article', 'link' => 'Link'];
$others = array_values(array_filter(published_courses(), function ($x) use ($c) { return $x['id'] !== $c['id']; }));

$ldParts = [];
foreach ($lessons as $l) {
    $ldParts[] = ['@type' => 'CreativeWork', 'name' => $l['title'], 'url' => $l['url']];
}
page_open([
    'title' => $c['title'] . ' | Elifai learning hub',
    'og_title' => $c['title'],
    'description' => $c['summary'],
    'canonical' => $url,
    'robots' => $preview ? 'noindex' : '',
    'jsonld' => [
        ['@context' => 'https://schema.org', '@type' => 'Course', 'name' => $c['title'], 'description' => $c['summary'],
         'url' => SITE_URL . $url, 'provider' => org_ld(), 'educationalLevel' => $c['level'], 'inLanguage' => 'en',
         'isAccessibleForFree' => true, 'hasPart' => $ldParts,
         'offers' => ['@type' => 'Offer', 'price' => 0, 'priceCurrency' => 'USD', 'category' => 'Free'],
         'hasCourseInstance' => ['@type' => 'CourseInstance', 'courseMode' => 'online', 'courseWorkload' => $c['duration'] ?: 'PT2H']],
        ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => SITE_URL . '/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Learning', 'item' => SITE_URL . '/learning/'],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $c['title'], 'item' => SITE_URL . $url]]],
    ],
], 'learning');
?>
  <main id="main" class="hub course-page">
    <section class="hub-hero course-hero">
      <div class="wrap">
        <?php if ($preview): ?><p class="draft-flag mono">Draft preview · only signed-in admins can see this page</p><?php endif; ?>
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/learning/">Learning</a> / <?= h($c['track']) ?></nav>
        <p class="course-top"><span class="course-track mono"><?= h($c['track']) ?></span><span class="lvl lvl-<?= h(strtolower($c['level'])) ?> mono"><?= h($c['level']) ?></span></p>
        <h1 class="hub-title"><?= h($c['title']) ?></h1>
        <p class="hub-lede"><?= h($c['summary']) ?></p>
        <ul class="learn-stats mono">
          <li><b><?= count($lessons) ?></b> lessons</li>
          <?php if ($c['duration']): ?><li><b><?= h($c['duration']) ?></b></li><?php endif; ?>
          <li><b>Free</b> to follow</li>
        </ul>
        <div class="course-progress" data-course-progress="<?= h($c['slug']) ?>" data-total="<?= count($lessons) ?>" hidden>
          <span class="mono"><b data-done>0</b> of <?= count($lessons) ?> done</span><i><em></em></i>
        </div>
      </div>
    </section>
    <section class="hub-body">
      <div class="wrap course-layout">
        <ol class="lessons" data-lessons>
          <?php foreach ($lessons as $k => $l):
              $u = safe_url($l['url']); if ($u === '') continue;
              $yt = $l['kind'] === 'video' ? youtube_id($u) : null; ?>
          <li class="lesson kind-<?= h($l['kind']) ?>" id="lesson-<?= (int)$l['id'] ?>" data-lesson="<?= (int)$l['id'] ?>">
            <div class="lesson-head">
              <span class="lesson-n mono"><?= str_pad((string)($k + 1), 2, '0', STR_PAD_LEFT) ?></span>
              <span class="lesson-kind mono"><?= h($kindLabel[$l['kind']] ?? 'Link') ?></span>
              <label class="lesson-done"><input type="checkbox" data-done-box> <span>Done</span></label>
            </div>
            <h2 class="lesson-title"><?= h($l['title']) ?></h2>
            <?php if ($l['note']): ?><p class="lesson-note"><?= h($l['note']) ?></p><?php endif; ?>
            <?php if ($yt): ?>
              <div class="yt" data-yt="<?= h($yt) ?>">
                <img src="https://i.ytimg.com/vi/<?= h($yt) ?>/hqdefault.jpg" alt="" loading="lazy" decoding="async">
                <button type="button" class="yt-play" aria-label="Play video: <?= h($l['title']) ?>"><svg viewBox="0 0 68 48" aria-hidden="true"><path d="M66.5 7.7A8.6 8.6 0 0 0 60.4 1.6C55.1.2 34 .2 34 .2S12.9.2 7.6 1.6A8.6 8.6 0 0 0 1.5 7.7C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.6 8.6 0 0 0 6.1 6.1C12.9 47.8 34 47.8 34 47.8s21.1 0 26.4-1.4a8.6 8.6 0 0 0 6.1-6.1C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3Z"/><path d="M45 24 27 14v20z" fill="#fff"/></svg></button>
              </div>
              <a class="lesson-ext mono" href="<?= h($u) ?>" target="_blank" rel="noopener">Watch on YouTube ↗</a>
            <?php else: ?>
              <a class="lesson-link" href="<?= h($u) ?>" target="_blank" rel="noopener">
                <span class="lesson-host mono"><?= h(url_host($u)) ?></span>
                <span><?= $l['kind'] === 'github' ? 'Open repository' : ($l['kind'] === 'docs' ? 'Read the documentation' : 'Open link') ?> ↗</span>
              </a>
            <?php endif; ?>
          </li>
          <?php endforeach; ?>
        </ol>
        <aside class="course-side">
          <div class="side-card">
            <p class="mono hub-cross-k">How to use this course</p>
            <ul class="ticks-list">
              <li>Watch or read each lesson in order.</li>
              <li>Tick <b>Done</b> to track progress in this browser.</li>
              <li>Run the GitHub labs on a free sandbox or a test VM.</li>
            </ul>
          </div>
          <?php if ($others): ?>
          <div class="side-card">
            <p class="mono hub-cross-k">Next courses</p>
            <ul class="side-links">
              <?php foreach (array_slice($others, 0, 4) as $o): ?><li><a href="/learning/<?= h($o['slug']) ?>"><span class="mono"><?= h($o['track']) ?></span><?= h($o['title']) ?></a></li><?php endforeach; ?>
            </ul>
          </div>
          <?php endif; ?>
          <div class="side-card side-cta">
            <p><b>Training for your team?</b> We run private workshops on your own platform.</p>
            <a class="btn btn-primary" href="/#contact" data-topic="Executive briefing">Talk to us</a>
          </div>
        </aside>
      </div>
    </section>
  </main>
<?php
page_close();
