<?php
declare(strict_types=1);
require __DIR__ . '/_admin.php';
$u = require_login();

$rows = db()->query("SELECT c.*, (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS n FROM courses c ORDER BY sort ASC, id DESC")->fetchAll();
admin_open('Courses', 'courses', $u);
?>
    <div class="adm-head">
      <div><p class="mono muted">Learning hub</p><h1>Courses</h1></div>
      <div class="adm-actions"><a class="adm-btn" href="/admin/course.php">New course</a></div>
    </div>
    <section class="adm-panel">
      <?php if (!$rows): ?><p class="muted">No courses yet.</p><?php else: ?>
      <table class="adm-table">
        <thead><tr><th>Course</th><th>Track</th><th>Level</th><th>Lessons</th><th>Status</th><th>Order</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td><a href="/admin/course.php?id=<?= (int)$r['id'] ?>"><?= h($r['title']) ?></a><br><span class="mono muted sm">/learning/<?= h($r['slug']) ?></span></td>
            <td><?= h($r['track']) ?></td>
            <td><?= h($r['level']) ?></td>
            <td class="mono"><?= (int)$r['n'] ?></td>
            <td><?= status_pill($r['status']) ?></td>
            <td class="mono muted"><?= (int)$r['sort'] ?></td>
            <td class="right"><a class="adm-btn ghost sm" href="/learning/<?= h($r['slug']) ?>" target="_blank" rel="noopener">View ↗</a></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </section>
<?php
admin_close();
