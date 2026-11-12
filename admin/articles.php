<?php
declare(strict_types=1);
require __DIR__ . '/_admin.php';
$u = require_login();

$q = trim((string)($_GET['q'] ?? ''));
$sql = 'SELECT id, slug, title, category, status, published_at, updated_at FROM articles';
$args = [];
if ($q !== '') { $sql .= ' WHERE title LIKE ? OR category LIKE ?'; $args = ["%$q%", "%$q%"]; }
$sql .= " ORDER BY CASE status WHEN 'draft' THEN 0 ELSE 1 END, COALESCE(published_at, updated_at) DESC";
$st = db()->prepare($sql);
$st->execute($args);
$rows = $st->fetchAll();

admin_open('Articles', 'articles', $u);
?>
    <div class="adm-head">
      <div><p class="mono muted">Insights</p><h1>Articles</h1></div>
      <div class="adm-actions">
        <form class="adm-search" role="search"><input type="search" name="q" value="<?= h($q) ?>" placeholder="Search articles" aria-label="Search articles"></form>
        <a class="adm-btn" href="/admin/article.php">New article</a>
      </div>
    </div>
    <section class="adm-panel">
      <?php if (!$rows): ?><p class="muted">No articles yet.</p><?php else: ?>
      <table class="adm-table">
        <thead><tr><th>Title</th><th>Topic</th><th>Status</th><th>Published</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td><a href="/admin/article.php?id=<?= (int)$r['id'] ?>"><?= h($r['title']) ?></a><br><span class="mono muted sm">/insights/<?= h($r['slug']) ?></span></td>
            <td><?= h($r['category']) ?></td>
            <td><?= status_pill($r['status']) ?></td>
            <td class="mono muted"><?= h(nice_date($r['published_at'])) ?></td>
            <td class="right"><a class="adm-btn ghost sm" href="/insights/<?= h($r['slug']) ?>" target="_blank" rel="noopener">View ↗</a></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </section>
<?php
admin_close();
