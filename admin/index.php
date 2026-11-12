<?php
declare(strict_types=1);
require __DIR__ . '/_admin.php';
$u = require_login();

$c = function (string $sql) { return (int)db()->query($sql)->fetchColumn(); };
$stats = [
    ['Published articles', $c("SELECT COUNT(*) FROM articles WHERE status='published'"), '/admin/articles.php'],
    ['Draft articles', $c("SELECT COUNT(*) FROM articles WHERE status!='published'"), '/admin/articles.php'],
    ['Published courses', $c("SELECT COUNT(*) FROM courses WHERE status='published'"), '/admin/courses.php'],
    ['Lessons', $c('SELECT COUNT(*) FROM lessons'), '/admin/courses.php'],
];
$recent = db()->query("SELECT 'article' AS t, id, title, status, updated_at FROM articles
    UNION ALL SELECT 'course', id, title, status, updated_at FROM courses ORDER BY updated_at DESC LIMIT 8")->fetchAll();

admin_open('Dashboard', 'index', $u);
?>
    <div class="adm-head">
      <div><p class="mono muted">Signed in as <?= h($u['email']) ?></p><h1>Dashboard</h1></div>
      <div class="adm-actions">
        <a class="adm-btn" href="/admin/article.php">New article</a>
        <a class="adm-btn ghost" href="/admin/course.php">New course</a>
      </div>
    </div>
    <div class="adm-stats">
      <?php foreach ($stats as [$label, $n, $href]): ?>
        <a class="adm-stat" href="<?= $href ?>"><b><?= $n ?></b><span><?= h($label) ?></span></a>
      <?php endforeach; ?>
    </div>
    <section class="adm-panel">
      <h2>Recently edited</h2>
      <table class="adm-table">
        <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>
        <?php foreach ($recent as $r): ?>
          <tr>
            <td><a href="/admin/<?= $r['t'] ?>.php?id=<?= (int)$r['id'] ?>"><?= h($r['title']) ?></a></td>
            <td class="mono"><?= $r['t'] === 'article' ? 'Article' : 'Course' ?></td>
            <td><?= status_pill($r['status']) ?></td>
            <td class="mono muted"><?= h(nice_date($r['updated_at'])) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </section>
    <section class="adm-panel adm-tips">
      <h2>Quick guide</h2>
      <ul>
        <li><b>Articles</b> appear on <a href="/insights/" target="_blank" rel="noopener">/insights</a>, on the home page and in the sitemap as soon as you publish them.</li>
        <li><b>Courses</b> appear on <a href="/learning/" target="_blank" rel="noopener">/learning</a>. Add lessons as YouTube videos, GitHub repositories, documentation or articles.</li>
        <li>Save as <b>Draft</b> to preview privately; only signed-in admins can see drafts.</li>
      </ul>
    </section>
<?php
admin_close();
