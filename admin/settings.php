<?php
declare(strict_types=1);
require __DIR__ . '/_admin.php';
$u = require_login();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $act = (string)($_POST['action'] ?? '');
    if ($act === 'password') {
        $st = db()->prepare('SELECT pass_hash FROM users WHERE id = ?');
        $st->execute([$u['id']]);
        $new = (string)($_POST['new'] ?? '');
        if (!password_verify((string)($_POST['current'] ?? ''), (string)$st->fetchColumn())) $errors[] = 'Your current password is not right.';
        elseif (strlen($new) < 10) $errors[] = 'Use a new password of at least 10 characters.';
        elseif ($new !== (string)($_POST['new2'] ?? '')) $errors[] = 'The two new passwords do not match.';
        else {
            db()->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);
            session_regenerate_id(true);
            flash('Password changed.');
            redirect('/admin/settings.php');
        }
    } elseif ($act === 'add') {
        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $name = trim((string)($_POST['name'] ?? ''));
        $pass = (string)($_POST['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Enter a valid email address.';
        elseif ($name === '') $errors[] = 'Enter a name.';
        elseif (strlen($pass) < 10) $errors[] = 'Give them a temporary password of at least 10 characters.';
        else {
            try {
                db()->prepare('INSERT INTO users (email, name, pass_hash, created_at) VALUES (?, ?, ?, ?)')->execute([$email, $name, password_hash($pass, PASSWORD_DEFAULT), now()]);
                flash("Admin $name added. Share the temporary password privately and ask them to change it.");
                redirect('/admin/settings.php');
            } catch (PDOException $e) { $errors[] = 'That email already has an account.'; }
        }
    } elseif ($act === 'remove') {
        $rid = (int)($_POST['uid'] ?? 0);
        if ($rid === (int)$u['id']) $errors[] = 'You cannot remove your own account.';
        else {
            db()->prepare('DELETE FROM users WHERE id = ?')->execute([$rid]);
            flash('Admin removed.');
            redirect('/admin/settings.php');
        }
    }
}

$users = db()->query('SELECT id, name, email, last_login FROM users ORDER BY id')->fetchAll();
admin_open('Settings', 'settings', $u);
?>
    <div class="adm-head"><div><p class="mono muted">Account</p><h1>Settings</h1></div></div>
    <?php foreach ($errors as $e): ?><p class="adm-flash err" role="alert"><?= h($e) ?></p><?php endforeach; ?>
    <div class="adm-cols">
      <section class="adm-panel">
        <h2>Change your password</h2>
        <form method="post" class="adm-form">
          <?= csrf_field() ?><input type="hidden" name="action" value="password">
          <label>Current password<input type="password" name="current" required autocomplete="current-password"></label>
          <label>New password<input type="password" name="new" required minlength="10" autocomplete="new-password"></label>
          <label>Repeat new password<input type="password" name="new2" required minlength="10" autocomplete="new-password"></label>
          <button class="adm-btn" type="submit">Change password</button>
        </form>
      </section>
      <section class="adm-panel">
        <h2>Admins</h2>
        <table class="adm-table">
          <tbody>
          <?php foreach ($users as $x): ?>
            <tr><td><?= h($x['name']) ?><br><span class="mono muted sm"><?= h($x['email']) ?></span></td>
              <td class="mono muted sm"><?= $x['last_login'] ? 'Last in ' . h(nice_date($x['last_login'])) : 'Never signed in' ?></td>
              <td class="right"><?php if ((int)$x['id'] !== (int)$u['id']): ?>
                <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="remove"><input type="hidden" name="uid" value="<?= (int)$x['id'] ?>">
                <button class="adm-btn ghost sm danger" type="submit" data-confirm="Remove <?= h($x['name']) ?> as admin?">Remove</button></form>
              <?php else: ?><span class="pill pub">You</span><?php endif; ?></td></tr>
          <?php endforeach; ?>
          </tbody>
        </table>
        <h2 style="margin-top:22px">Add an admin</h2>
        <form method="post" class="adm-form">
          <?= csrf_field() ?><input type="hidden" name="action" value="add">
          <label>Name<input name="name" required maxlength="80"></label>
          <label>Email<input type="email" name="email" required maxlength="160"></label>
          <label>Temporary password<input type="text" name="password" required minlength="10" autocomplete="off"></label>
          <button class="adm-btn ghost" type="submit">Add admin</button>
        </form>
      </section>
    </div>
<?php
admin_close();
