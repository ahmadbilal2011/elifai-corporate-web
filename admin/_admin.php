<?php
/** Shared admin chrome and guards. Not reachable directly (see admin/.htaccess). */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/layout.php';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('Referrer-Policy: same-origin');

function require_login(): array
{
    if (user_count() === 0) { header('Location: /admin/login.php'); exit; }
    $u = current_user();
    if (!$u) { header('Location: /admin/login.php?next=' . rawurlencode($_SERVER['REQUEST_URI'] ?? '/admin/')); exit; }
    return $u;
}

function flash(?string $msg = null, string $type = 'ok'): ?array
{
    start_session();
    if ($msg !== null) { $_SESSION['flash'] = [$type, $msg]; return null; }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

function redirect(string $to): void
{
    header('Location: ' . $to, true, 303);
    exit;
}

function admin_open(string $title, string $active = '', ?array $user = null): void
{
    $v = asset_version();
    $nav = ['index' => ['/admin/', 'Dashboard'], 'articles' => ['/admin/articles.php', 'Articles'], 'courses' => ['/admin/courses.php', 'Courses'], 'settings' => ['/admin/settings.php', 'Settings']];
    ?>
<!doctype html>
<html lang="en" dir="ltr" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><?= h($title) ?> · Elifai admin</title>
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <script src="/assets/js/theme-init.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;600;700&amp;family=Red+Hat+Text:wght@400;500;600&amp;family=Red+Hat+Mono:wght@400;500&amp;display=swap">
  <link rel="stylesheet" href="/assets/css/main.css?v=<?= h($v) ?>">
  <link rel="stylesheet" href="/assets/css/admin.css?v=<?= h($v) ?>">
  <script type="module" src="/assets/js/admin.js?v=<?= h($v) ?>"></script>
</head>
<body class="adm">
<?php if ($user): ?>
  <header class="adm-bar">
    <a class="brand" href="/admin/" aria-label="Elifai admin">
      <svg class="brand-mark" viewBox="86 24 126 467" aria-hidden="true"><path d="M103 29H191V62H139V79H207L198 116H103Z"/><path d="M109 174H122V443L91 474V193Z"/><path d="M134 150H162V458L134 486Z"/><path d="M174 169H203V431L174 460Z"/></svg>
      <span class="brand-text"><span class="brand-name">Elifai</span><span class="brand-tag">admin</span></span>
    </a>
    <nav class="adm-nav" aria-label="Admin">
      <?php foreach ($nav as $k => [$href, $label]): ?>
        <a href="<?= $href ?>"<?= $active === $k ? ' aria-current="page"' : '' ?>><?= $label ?></a>
      <?php endforeach; ?>
    </nav>
    <div class="adm-user">
      <a class="adm-view" href="/" target="_blank" rel="noopener">View site ↗</a>
      <span class="mono"><?= h($user['name']) ?></span>
      <form method="post" action="/admin/logout.php"><?= csrf_field() ?><button class="adm-btn ghost sm" type="submit">Sign out</button></form>
    </div>
  </header>
<?php endif; ?>
  <main class="adm-main<?= $user ? '' : ' adm-center' ?>">
<?php
    $f = $user ? flash() : null;
    if ($f) echo '<p class="adm-flash ' . h($f[0]) . '" role="status">' . h($f[1]) . '</p>';
}

function admin_close(): void
{
    echo "  </main>\n</body>\n</html>\n";
}

function status_pill(string $s): string
{
    return '<span class="pill ' . ($s === 'published' ? 'pub' : 'draft') . '">' . ($s === 'published' ? 'Published' : 'Draft') . '</span>';
}
