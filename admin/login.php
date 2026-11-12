<?php
declare(strict_types=1);
require __DIR__ . '/_admin.php';

$setup = user_count() === 0;
$error = '';
$next = (string)($_GET['next'] ?? $_POST['next'] ?? '/admin/');
if (!preg_match('~^/admin/[\w./?=&%-]*$~', $next)) $next = '/admin/';

if (!$setup && current_user()) redirect($next);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $pass = (string)($_POST['password'] ?? '');
    if ($setup) {
        $name = trim((string)($_POST['name'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $error = 'Enter a valid email address.';
        elseif ($name === '') $error = 'Enter your name.';
        elseif (strlen($pass) < 10) $error = 'Use a password of at least 10 characters.';
        elseif ($pass !== (string)($_POST['password2'] ?? '')) $error = 'The two passwords do not match.';
        elseif (user_count() > 0) $error = 'An admin account already exists. Sign in instead.';
        else {
            db()->prepare('INSERT INTO users (email, name, pass_hash, created_at) VALUES (?, ?, ?, ?)')
                ->execute([$email, $name, password_hash($pass, PASSWORD_DEFAULT), now()]);
            attempt_login($email, $pass);
            flash('Welcome. Your admin account is ready.');
            redirect('/admin/');
        }
    } else {
        if (login_blocked()) $error = 'Too many attempts. Wait 15 minutes and try again.';
        elseif (attempt_login($email, $pass)) redirect($next);
        else $error = 'That email and password do not match.';
    }
}

admin_open($setup ? 'Create admin account' : 'Sign in');
?>
    <section class="auth-card">
      <div class="auth-brand">
        <svg class="brand-mark" viewBox="86 24 126 467" aria-hidden="true"><path d="M103 29H191V62H139V79H207L198 116H103Z"/><path d="M109 174H122V443L91 474V193Z"/><path d="M134 150H162V458L134 486Z"/><path d="M174 169H203V431L174 460Z"/></svg>
        <span><b>Elifai</b> admin</span>
      </div>
      <h1><?= $setup ? 'Create the first admin account' : 'Sign in' ?></h1>
      <p class="muted"><?= $setup ? 'This page appears only once, before any admin exists. Do it straight after deploying.' : 'Manage insights and learning courses.' ?></p>
      <?php if ($error): ?><p class="adm-flash err" role="alert"><?= h($error) ?></p><?php endif; ?>
      <form method="post" class="adm-form" autocomplete="on">
        <?= csrf_field() ?>
        <input type="hidden" name="next" value="<?= h($next) ?>">
        <?php if ($setup): ?>
        <label>Your name<input name="name" required maxlength="80" value="<?= h($_POST['name'] ?? '') ?>" autocomplete="name"></label>
        <?php endif; ?>
        <label>Email<input type="email" name="email" required maxlength="160" value="<?= h($_POST['email'] ?? '') ?>" autocomplete="username"></label>
        <label>Password<input type="password" name="password" required minlength="<?= $setup ? 10 : 1 ?>" autocomplete="<?= $setup ? 'new-password' : 'current-password' ?>"></label>
        <?php if ($setup): ?>
        <label>Repeat password<input type="password" name="password2" required minlength="10" autocomplete="new-password"></label>
        <?php endif; ?>
        <button class="adm-btn" type="submit"><?= $setup ? 'Create account' : 'Sign in' ?></button>
      </form>
      <p class="auth-foot mono"><a href="/">← Back to elifai.pk</a></p>
    </section>
<?php
admin_close();
