<?php
declare(strict_types=1);
require __DIR__ . '/_admin.php';
$u = require_login();

$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
$a = ['id' => 0, 'slug' => '', 'title' => '', 'summary' => '', 'category' => '', 'body_md' => '', 'sources_md' => '', 'cover' => '', 'status' => 'draft', 'published_at' => null];
if ($id) {
    $st = db()->prepare('SELECT * FROM articles WHERE id = ?');
    $st->execute([$id]);
    $a = $st->fetch() ?: null;
    if (!$a) { flash('That article no longer exists.', 'err'); redirect('/admin/articles.php'); }
}
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    if (isset($_POST['delete']) && $id) {
        db()->prepare('DELETE FROM articles WHERE id = ?')->execute([$id]);
        flash('Article deleted.');
        redirect('/admin/articles.php');
    }
    $a['title'] = trim((string)($_POST['title'] ?? ''));
    $a['slug'] = slugify((string)($_POST['slug'] ?? '') ?: $a['title']);
    $a['summary'] = trim((string)($_POST['summary'] ?? ''));
    $a['category'] = trim((string)($_POST['category'] ?? ''));
    $a['body_md'] = (string)($_POST['body_md'] ?? '');
    $a['sources_md'] = (string)($_POST['sources_md'] ?? '');
    $a['cover'] = safe_url((string)($_POST['cover'] ?? ''));
    $publish = ($_POST['status'] ?? '') === 'published';

    if (!empty($_FILES['cover_file']['name'])) {
        try { $a['cover'] = save_image_upload($_FILES['cover_file']); }
        catch (RuntimeException $e) { $errors[] = $e->getMessage(); }
    }
    if ($a['title'] === '') $errors[] = 'Add a title.';
    if (mb_strlen($a['summary']) > 300) $errors[] = 'Keep the summary under 300 characters; it is used by Google.';
    $dup = db()->prepare('SELECT COUNT(*) FROM articles WHERE slug = ? AND id != ?');
    $dup->execute([$a['slug'], $id]);
    if ((int)$dup->fetchColumn()) $errors[] = 'Another article already uses the address /insights/' . $a['slug'] . '.';

    if (!$errors) {
        $pubAt = $publish ? ($a['published_at'] ?: now()) : $a['published_at'];
        if ($publish && !empty($_POST['published_on']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$_POST['published_on'])) {
            $pubAt = $_POST['published_on'] . ' 08:00:00';
        }
        $vals = [$a['slug'], $a['title'], $a['summary'], $a['category'], $a['body_md'], $a['sources_md'], $a['cover'], $publish ? 'published' : 'draft', $pubAt, now()];
        if ($id) {
            db()->prepare('UPDATE articles SET slug=?, title=?, summary=?, category=?, body_md=?, sources_md=?, cover=?, status=?, published_at=?, updated_at=? WHERE id=?')
                ->execute(array_merge($vals, [$id]));
        } else {
            db()->prepare('INSERT INTO articles (slug, title, summary, category, body_md, sources_md, cover, status, published_at, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
                ->execute(array_merge($vals, [now()]));
            $id = (int)db()->lastInsertId();
        }
        flash($publish ? 'Published. It is live on /insights now.' : 'Draft saved.');
        redirect('/admin/article.php?id=' . $id);
    }
}

$cats = db()->query("SELECT DISTINCT category FROM articles WHERE category != '' ORDER BY category")->fetchAll(PDO::FETCH_COLUMN);
admin_open($id ? 'Edit article' : 'New article', 'articles', $u);
?>
    <div class="adm-head">
      <div><p class="mono muted"><a href="/admin/articles.php">Articles</a> / <?= $id ? 'Edit' : 'New' ?></p><h1><?= $id ? h($a['title']) : 'New article' ?></h1></div>
      <div class="adm-actions">
        <?php if ($id): ?><?= status_pill($a['status']) ?><a class="adm-btn ghost" href="/insights/<?= h($a['slug']) ?>" target="_blank" rel="noopener"><?= $a['status'] === 'published' ? 'View live' : 'Preview draft' ?> ↗</a><?php endif; ?>
      </div>
    </div>
    <?php foreach ($errors as $e): ?><p class="adm-flash err" role="alert"><?= h($e) ?></p><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data" class="adm-form adm-editor" data-editor>
      <?= csrf_field() ?>
      <input type="hidden" name="id" value="<?= (int)$id ?>">
      <div class="ed-main">
        <label>Title<input name="title" required maxlength="160" value="<?= h($a['title']) ?>" data-title></label>
        <label>Summary <span class="hint">One or two sentences. Shown under the title, on cards and in Google results.</span>
          <textarea name="summary" rows="3" maxlength="300" data-count><?= h($a['summary']) ?></textarea></label>
        <div class="ed-body">
          <div class="ed-tabs" role="tablist">
            <button type="button" role="tab" aria-selected="true" data-ed-tab="write">Write</button>
            <button type="button" role="tab" aria-selected="false" data-ed-tab="preview">Preview</button>
            <span class="ed-tools">
              <button type="button" data-md="## " title="Heading">H</button>
              <button type="button" data-md="**" data-wrap title="Bold"><b>B</b></button>
              <button type="button" data-md="*" data-wrap title="Italic"><em>I</em></button>
              <button type="button" data-md="- " title="Bullet list">•</button>
              <button type="button" data-md="1. " title="Numbered list">1.</button>
              <button type="button" data-md="link" title="Link">🔗</button>
              <label class="ed-img" title="Insert image">🖼<input type="file" accept="image/*" data-img-upload hidden></label>
            </span>
          </div>
          <textarea name="body_md" rows="22" class="mono" data-md-input placeholder="Write in Markdown. ## for headings, - for lists, [text](https://link) for links."><?= h($a['body_md']) ?></textarea>
          <div class="ed-preview prose" data-md-preview hidden></div>
        </div>
        <label>Sources <span class="hint">Optional. One link per line, e.g. - [Red Hat release notes](https://docs.redhat.com/...)</span>
          <textarea name="sources_md" rows="5" class="mono"><?= h($a['sources_md']) ?></textarea></label>
      </div>
      <aside class="ed-side">
        <div class="adm-panel">
          <h2>Publish</h2>
          <label class="radio"><input type="radio" name="status" value="draft"<?= $a['status'] !== 'published' ? ' checked' : '' ?>> Draft (private)</label>
          <label class="radio"><input type="radio" name="status" value="published"<?= $a['status'] === 'published' ? ' checked' : '' ?>> Published</label>
          <label>Publish date<input type="date" name="published_on" value="<?= h(iso_date($a['published_at'])) ?>"></label>
          <button class="adm-btn wide" type="submit">Save</button>
        </div>
        <div class="adm-panel">
          <h2>Details</h2>
          <label>Topic<input name="category" list="cats" maxlength="40" value="<?= h($a['category']) ?>" placeholder="e.g. OpenShift"></label>
          <datalist id="cats"><?php foreach ($cats as $c): ?><option value="<?= h($c) ?>"><?php endforeach; ?></datalist>
          <label>Web address<span class="slug-row"><span class="mono muted">/insights/</span><input name="slug" maxlength="80" value="<?= h($a['slug']) ?>" pattern="[a-z0-9\-]*" data-slug placeholder="auto from title"></span></label>
        </div>
        <div class="adm-panel">
          <h2>Cover image</h2>
          <?php if ($a['cover']): ?><img class="ed-cover" src="<?= h($a['cover']) ?>" alt=""><?php endif; ?>
          <label>Upload<input type="file" name="cover_file" accept="image/jpeg,image/png,image/webp"></label>
          <label>Or image URL<input name="cover" value="<?= h($a['cover']) ?>" placeholder="/uploads/..."></label>
          <p class="hint">Wide images work best (1600 × 900). Max 3 MB.</p>
        </div>
        <?php if ($id): ?>
        <div class="adm-panel danger">
          <button class="adm-btn ghost danger wide" type="submit" name="delete" value="1" formnovalidate data-confirm="Delete this article permanently?">Delete article</button>
        </div>
        <?php endif; ?>
      </aside>
    </form>
<?php
admin_close();
