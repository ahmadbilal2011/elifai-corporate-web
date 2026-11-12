<?php
declare(strict_types=1);
require __DIR__ . '/_admin.php';
$u = require_login();

$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
$c = ['id' => 0, 'slug' => '', 'title' => '', 'summary' => '', 'track' => TRACKS[0], 'level' => 'Beginner', 'duration' => '', 'status' => 'draft', 'sort' => 0, 'published_at' => null];
$lessons = [];
if ($id) {
    $st = db()->prepare('SELECT * FROM courses WHERE id = ?');
    $st->execute([$id]);
    $c = $st->fetch() ?: null;
    if (!$c) { flash('That course no longer exists.', 'err'); redirect('/admin/courses.php'); }
    $lessons = course_lessons($id);
}
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    if (isset($_POST['delete']) && $id) {
        db()->prepare('DELETE FROM courses WHERE id = ?')->execute([$id]);
        flash('Course deleted.');
        redirect('/admin/courses.php');
    }
    $c['title'] = trim((string)($_POST['title'] ?? ''));
    $c['slug'] = slugify((string)($_POST['slug'] ?? '') ?: $c['title']);
    $c['summary'] = trim((string)($_POST['summary'] ?? ''));
    $c['track'] = trim((string)($_POST['track'] ?? '')) ?: TRACKS[0];
    $c['level'] = in_array($_POST['level'] ?? '', LEVELS, true) ? $_POST['level'] : 'Beginner';
    $c['duration'] = trim((string)($_POST['duration'] ?? ''));
    $c['sort'] = (int)($_POST['sort'] ?? 0);
    $publish = ($_POST['status'] ?? '') === 'published';

    $lessons = [];
    foreach ((array)($_POST['lessons'] ?? []) as $row) {
        $title = trim((string)($row['title'] ?? ''));
        $url = trim((string)($row['url'] ?? ''));
        if ($title === '' && $url === '') continue;
        $kind = array_key_exists($row['kind'] ?? '', LESSON_KINDS) ? $row['kind'] : 'link';
        if ($kind === 'link' && youtube_id($url)) $kind = 'video';
        if ($kind === 'link' && url_host($url) === 'github.com') $kind = 'github';
        $lessons[] = ['kind' => $kind, 'title' => $title, 'url' => $url, 'note' => trim((string)($row['note'] ?? ''))];
        $n = count($lessons);
        if ($title === '') $errors[] = "Lesson $n needs a title.";
        if (safe_url($url) === '') $errors[] = "Lesson $n needs a full link starting with https:// (or a page on this site, such as /insights/...)";
        if ($kind === 'video' && !youtube_id($url)) $errors[] = "Lesson $n is marked as a video but the link is not a YouTube video.";
    }
    if ($c['title'] === '') $errors[] = 'Add a course title.';
    $dup = db()->prepare('SELECT COUNT(*) FROM courses WHERE slug = ? AND id != ?');
    $dup->execute([$c['slug'], $id]);
    if ((int)$dup->fetchColumn()) $errors[] = 'Another course already uses the address /learning/' . $c['slug'] . '.';
    if ($publish && !$lessons) $errors[] = 'Add at least one lesson before publishing.';

    if (!$errors) {
        $pdo = db();
        $pdo->beginTransaction();
        $pubAt = $publish ? ($c['published_at'] ?: now()) : $c['published_at'];
        $vals = [$c['slug'], $c['title'], $c['summary'], $c['track'], $c['level'], $c['duration'], $publish ? 'published' : 'draft', $c['sort'], $pubAt, now()];
        if ($id) {
            $pdo->prepare('UPDATE courses SET slug=?, title=?, summary=?, track=?, level=?, duration=?, status=?, sort=?, published_at=?, updated_at=? WHERE id=?')
                ->execute(array_merge($vals, [$id]));
            $pdo->prepare('DELETE FROM lessons WHERE course_id = ?')->execute([$id]);
        } else {
            $pdo->prepare('INSERT INTO courses (slug, title, summary, track, level, duration, status, sort, published_at, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
                ->execute(array_merge($vals, [now()]));
            $id = (int)$pdo->lastInsertId();
        }
        $ins = $pdo->prepare('INSERT INTO lessons (course_id, sort, kind, title, url, note) VALUES (?,?,?,?,?,?)');
        foreach ($lessons as $k => $l) $ins->execute([$id, $k, $l['kind'], $l['title'], $l['url'], $l['note']]);
        $pdo->commit();
        flash($publish ? 'Published. It is live on /learning now.' : 'Draft saved.');
        redirect('/admin/course.php?id=' . $id);
    }
}

$tracks = array_values(array_unique(array_merge(TRACKS, db()->query("SELECT DISTINCT track FROM courses WHERE track != ''")->fetchAll(PDO::FETCH_COLUMN))));
$rows = $lessons ?: [['kind' => 'video', 'title' => '', 'url' => '', 'note' => '']];

function lesson_row(int $i, array $l): string
{
    $opts = '';
    foreach (LESSON_KINDS as $k => $label) $opts .= '<option value="' . $k . '"' . (($l['kind'] ?? '') === $k ? ' selected' : '') . '>' . h($label) . '</option>';
    return '<li class="lesson-row" data-row>
      <div class="lr-grip mono" aria-hidden="true">' . str_pad((string)($i + 1), 2, '0', STR_PAD_LEFT) . '</div>
      <div class="lr-fields">
        <div class="lr-line">
          <label class="lr-kind">Type<select name="lessons[' . $i . '][kind]" data-kind>' . $opts . '</select></label>
          <label class="lr-title">Lesson title<input name="lessons[' . $i . '][title]" maxlength="160" value="' . h($l['title'] ?? '') . '"></label>
        </div>
        <label>Link <span class="hint">YouTube, GitHub, documentation or article URL</span><input name="lessons[' . $i . '][url]" type="text" inputmode="url" maxlength="500" value="' . h($l['url'] ?? '') . '" placeholder="https://" data-url></label>
        <label>Note <span class="hint">Optional, one line on what to learn here</span><input name="lessons[' . $i . '][note]" maxlength="300" value="' . h($l['note'] ?? '') . '"></label>
      </div>
      <div class="lr-ops">
        <button type="button" class="adm-btn ghost sm" data-move="-1" aria-label="Move up">↑</button>
        <button type="button" class="adm-btn ghost sm" data-move="1" aria-label="Move down">↓</button>
        <button type="button" class="adm-btn ghost sm danger" data-remove aria-label="Remove lesson">✕</button>
      </div>
    </li>';
}

admin_open($id ? 'Edit course' : 'New course', 'courses', $u);
?>
    <div class="adm-head">
      <div><p class="mono muted"><a href="/admin/courses.php">Courses</a> / <?= $id ? 'Edit' : 'New' ?></p><h1><?= $id ? h($c['title']) : 'New course' ?></h1></div>
      <div class="adm-actions">
        <?php if ($id): ?><?= status_pill($c['status']) ?><a class="adm-btn ghost" href="/learning/<?= h($c['slug']) ?>" target="_blank" rel="noopener"><?= $c['status'] === 'published' ? 'View live' : 'Preview draft' ?> ↗</a><?php endif; ?>
      </div>
    </div>
    <?php foreach ($errors as $e): ?><p class="adm-flash err" role="alert"><?= h($e) ?></p><?php endforeach; ?>

    <form method="post" class="adm-form adm-editor" data-course-form>
      <?= csrf_field() ?>
      <input type="hidden" name="id" value="<?= (int)$id ?>">
      <div class="ed-main">
        <label>Course title<input name="title" required maxlength="160" value="<?= h($c['title']) ?>" data-title></label>
        <label>Summary <span class="hint">Two sentences on who it is for and what they will be able to do.</span>
          <textarea name="summary" rows="3" maxlength="400"><?= h($c['summary']) ?></textarea></label>
        <div class="adm-panel lessons-panel">
          <div class="lp-head"><h2>Lessons</h2><span class="hint">Drag order with ↑ ↓. YouTube links play inside the page.</span></div>
          <ol class="lesson-rows" data-rows>
            <?php foreach ($rows as $i => $l) echo lesson_row($i, $l); ?>
          </ol>
          <template data-row-template><?= lesson_row(999, ['kind' => 'video']) ?></template>
          <div class="lp-add">
            <button type="button" class="adm-btn ghost" data-add="video">+ YouTube video</button>
            <button type="button" class="adm-btn ghost" data-add="github">+ GitHub repository</button>
            <button type="button" class="adm-btn ghost" data-add="docs">+ Documentation</button>
            <button type="button" class="adm-btn ghost" data-add="article">+ Article or link</button>
          </div>
        </div>
      </div>
      <aside class="ed-side">
        <div class="adm-panel">
          <h2>Publish</h2>
          <label class="radio"><input type="radio" name="status" value="draft"<?= $c['status'] !== 'published' ? ' checked' : '' ?>> Draft (private)</label>
          <label class="radio"><input type="radio" name="status" value="published"<?= $c['status'] === 'published' ? ' checked' : '' ?>> Published</label>
          <button class="adm-btn wide" type="submit">Save</button>
        </div>
        <div class="adm-panel">
          <h2>Details</h2>
          <label>Track<input name="track" list="tracks" maxlength="40" value="<?= h($c['track']) ?>"></label>
          <datalist id="tracks"><?php foreach ($tracks as $t): ?><option value="<?= h($t) ?>"><?php endforeach; ?></datalist>
          <label>Level<select name="level"><?php foreach (LEVELS as $l): ?><option<?= $c['level'] === $l ? ' selected' : '' ?>><?= h($l) ?></option><?php endforeach; ?></select></label>
          <label>Duration <span class="hint">e.g. 3 hours</span><input name="duration" maxlength="30" value="<?= h($c['duration']) ?>"></label>
          <label>Order on the page <span class="hint">Lower numbers show first</span><input type="number" name="sort" value="<?= (int)$c['sort'] ?>"></label>
          <label>Web address<span class="slug-row"><span class="mono muted">/learning/</span><input name="slug" maxlength="80" value="<?= h($c['slug']) ?>" pattern="[a-z0-9\-]*" data-slug placeholder="auto from title"></span></label>
        </div>
        <?php if ($id): ?>
        <div class="adm-panel danger">
          <button class="adm-btn ghost danger wide" type="submit" name="delete" value="1" formnovalidate data-confirm="Delete this course and its lessons permanently?">Delete course</button>
        </div>
        <?php endif; ?>
      </aside>
    </form>
<?php
admin_close();
