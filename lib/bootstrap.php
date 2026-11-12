<?php
/**
 * Elifai CMS bootstrap: database, sessions, security helpers.
 *
 * Data lives in SQLite. By default the database sits one level ABOVE the
 * web root (e.g. /home/<user>/elifai-data/elifai.sqlite on cPanel) so it can
 * never be downloaded. If that folder cannot be created, it falls back to
 * <web root>/data/, which is blocked by .htaccess.
 *
 * Requires PHP 7.4+ with pdo_sqlite (enabled on standard cPanel PHP builds).
 */
declare(strict_types=1);

const ELIFAI_VERSION = '1.0';
define('WEB_ROOT', dirname(__DIR__));
define('SITE_URL', 'https://elifai.pk');
define('UPLOAD_DIR', WEB_ROOT . '/uploads');
define('UPLOAD_URL', '/uploads');
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 900;

function data_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;
    $env = getenv('ELIFAI_DATA_DIR');
    $candidates = array_filter([$env ?: null, dirname(WEB_ROOT) . '/elifai-data', WEB_ROOT . '/data']);
    foreach ($candidates as $c) {
        if (is_dir($c) || @mkdir($c, 0750, true)) {
            if (is_writable($c)) {
                if (strpos($c, WEB_ROOT) === 0 && !file_exists($c . '/.htaccess')) {
                    @file_put_contents($c . '/.htaccess', "Require all denied\n");
                }
                return $dir = $c;
            }
        }
    }
    throw new RuntimeException('No writable data folder. Create ~/elifai-data with write permission.');
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO('sqlite:' . data_dir() . '/elifai.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    migrate($pdo);
    return $pdo;
}

function migrate(PDO $pdo): void
{
    $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login TEXT
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  body_md TEXT NOT NULL DEFAULT '',
  sources_md TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  track TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'Beginner',
  duration TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  sort INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'link',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, sort);
CREATE INDEX IF NOT EXISTS idx_articles_pub ON articles(status, published_at);
SQL);
    // first run: load the starter articles and courses
    if ((int)$pdo->query('SELECT COUNT(*) FROM articles')->fetchColumn() === 0
        && (int)$pdo->query('SELECT COUNT(*) FROM courses')->fetchColumn() === 0) {
        require_once __DIR__ . '/seed.php';
        seed_content($pdo);
    }
}

/* ---------------- helpers ---------------- */

function h(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function slugify(string $s): string
{
    $s = strtolower(trim($s));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    return trim(substr($s, 0, 80), '-') ?: 'item-' . bin2hex(random_bytes(3));
}

function read_minutes(string $md): int
{
    $words = str_word_count(strip_tags($md));
    return max(1, (int)round($words / 220));
}

function nice_date(?string $ts): string
{
    if (!$ts) return '';
    $t = strtotime($ts . ' UTC');
    return $t ? gmdate('j F Y', $t) : '';
}

function iso_date(?string $ts): string
{
    if (!$ts) return '';
    $t = strtotime($ts . ' UTC');
    return $t ? gmdate('Y-m-d', $t) : '';
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

/** Only allow http(s) URLs in links stored by admins. */
function safe_url(string $url): string
{
    $url = trim($url);
    if ($url === '') return '';
    if ($url[0] === '/' && (strlen($url) === 1 || $url[1] !== '/')) return $url;
    return preg_match('~^https?://~i', $url) ? $url : '';
}

function youtube_id(string $url): ?string
{
    if (preg_match('~(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})~', $url, $m)) {
        return $m[1];
    }
    return null;
}

function url_host(string $url): string
{
    $host = parse_url($url, PHP_URL_HOST) ?: '';
    return preg_replace('/^www\./', '', $host);
}

/* ---------------- sessions, CSRF, auth ---------------- */

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('elifai_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    // idle timeout: 2 hours
    if (isset($_SESSION['seen']) && time() - $_SESSION['seen'] > 7200) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['seen'] = time();
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . h(csrf_token()) . '">';
}

function csrf_check(): void
{
    start_session();
    $ok = isset($_POST['csrf'], $_SESSION['csrf']) && hash_equals($_SESSION['csrf'], (string)$_POST['csrf']);
    if (!$ok) {
        http_response_code(400);
        exit('Your session expired. Go back, reload the page and try again.');
    }
}

function current_user(): ?array
{
    start_session();
    if (empty($_SESSION['uid'])) return null;
    static $u = null;
    if ($u === null) {
        $st = db()->prepare('SELECT id, email, name FROM users WHERE id = ?');
        $st->execute([$_SESSION['uid']]);
        $u = $st->fetch() ?: null;
    }
    return $u;
}

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 64);
}

function login_blocked(): bool
{
    $st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND at > ?');
    $st->execute([client_ip(), time() - LOGIN_WINDOW_SECONDS]);
    return (int)$st->fetchColumn() >= LOGIN_MAX_ATTEMPTS;
}

function attempt_login(string $email, string $password): bool
{
    db()->prepare('DELETE FROM login_attempts WHERE at < ?')->execute([time() - LOGIN_WINDOW_SECONDS]);
    $st = db()->prepare('SELECT id, pass_hash FROM users WHERE email = ?');
    $st->execute([strtolower(trim($email))]);
    $row = $st->fetch();
    if ($row && password_verify($password, $row['pass_hash'])) {
        start_session();
        session_regenerate_id(true);
        $_SESSION['uid'] = (int)$row['id'];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        if (password_needs_rehash($row['pass_hash'], PASSWORD_DEFAULT)) {
            db()->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $row['id']]);
        }
        db()->prepare('UPDATE users SET last_login = ? WHERE id = ?')->execute([now(), $row['id']]);
        db()->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([client_ip()]);
        return true;
    }
    db()->prepare('INSERT INTO login_attempts (ip, at) VALUES (?, ?)')->execute([client_ip(), time()]);
    usleep(400000);
    return false;
}

function user_count(): int
{
    return (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
}

function logout(): void
{
    start_session();
    $_SESSION = [];
    session_destroy();
}

/* ---------------- uploads ---------------- */

/** Saves an uploaded image and returns its public URL, or throws with a readable message. */
function save_image_upload(array $file): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException('Upload failed. Try a smaller image.');
    if ($file['size'] > MAX_UPLOAD_BYTES) throw new RuntimeException('Image is larger than 3 MB.');
    $info = @getimagesize($file['tmp_name']);
    $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
    if (!$info || !isset($types[$info[2]])) throw new RuntimeException('Only JPG, PNG, WebP or GIF images can be uploaded.');
    $sub = gmdate('Y/m');
    $dir = UPLOAD_DIR . '/' . $sub;
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new RuntimeException('Cannot create the uploads folder.');
    $name = bin2hex(random_bytes(8)) . '.' . $types[$info[2]];
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) throw new RuntimeException('Could not save the image.');
    return UPLOAD_URL . '/' . $sub . '/' . $name;
}

/* ---------------- content queries ---------------- */

function published_articles(int $limit = 0): array
{
    $sql = "SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC, id DESC";
    if ($limit > 0) $sql .= ' LIMIT ' . (int)$limit;
    return db()->query($sql)->fetchAll();
}

function published_courses(): array
{
    return db()->query("SELECT c.*, (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.kind = 'video') AS video_count,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.kind = 'github') AS github_count
        FROM courses c WHERE status = 'published' ORDER BY sort ASC, published_at DESC, id DESC")->fetchAll();
}

function course_lessons(int $courseId): array
{
    $st = db()->prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort ASC, id ASC');
    $st->execute([$courseId]);
    return $st->fetchAll();
}

const TRACKS = ['OpenShift', 'Red Hat Enterprise Linux', 'Automation', 'AI for operations', 'Cloud', 'Kubernetes', 'Networking and fiber', 'Security'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LESSON_KINDS = ['video' => 'YouTube video', 'github' => 'GitHub repository', 'docs' => 'Documentation', 'article' => 'Article', 'link' => 'Other link'];
