<?php
/**
 * Elifai — vendor news proxy (cPanel / PHP 7.4+).
 *
 * Browsers cannot read other companies' news feeds directly (CORS), so this
 * script fetches them server-side, keeps a cache, and returns headlines only
 * (title, link, date, source) as JSON. It never fetches a URL supplied by the
 * visitor: every feed address comes from assets/data/vendors.json.
 *
 *   GET /vendor-news.php?v=<slug>   → latest headlines for one vendor
 *   GET /vendor-news.php?wire=1     → newest cached headlines across vendors
 *                                     (refreshes a few stale vendors per call)
 *   php vendor-news.php --check     → CLI: test every feed and print results
 */

declare(strict_types=1);

// ------------------------------------------------------------------ config
const CACHE_TTL       = 6 * 3600;   // refresh each vendor at most every 6 hours
const FAIL_TTL        = 30 * 60;    // after a failure, wait 30 minutes before retrying
const ITEMS_PER_VENDOR = 4;
const FETCH_TIMEOUT   = 6;          // seconds per feed
const MAX_BYTES       = 2000000;    // ignore feeds larger than ~2 MB
const WIRE_WARM_PER_CALL = 3;       // stale vendors refreshed per ?wire=1 call
const ALLOW_NEWS_AGGREGATOR = true; // set false to use only vendors' own feeds
// -------------------------------------------------------------------------

$isCli = PHP_SAPI === 'cli';
$dataFile = __DIR__ . '/assets/data/vendors.json';
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir) && !@mkdir($cacheDir, 0750, true)) {
    $cacheDir = rtrim(sys_get_temp_dir(), '/') . '/elifai-vendor-cache';
    @mkdir($cacheDir, 0750, true);
}
if (is_dir($cacheDir) && !is_file($cacheDir . '/.htaccess')) {
    @file_put_contents($cacheDir . '/.htaccess', "Require all denied\nDeny from all\n");
}

function out(array $payload, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=600');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function load_vendors(string $file): array
{
    $json = json_decode((string) @file_get_contents($file), true);
    $map = [];
    foreach (($json['vendors'] ?? []) as $v) {
        if (!empty($v['slug'])) { $map[$v['slug']] = $v; }
    }
    return $map;
}

function http_get(string $url): ?string
{
    if (!preg_match('#^https://#i', $url)) { return null; }
    $ua = 'Mozilla/5.0 (compatible; ElifaiNewsBot/1.0; +https://elifai.pk)';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS=> CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT => FETCH_TIMEOUT,
            CURLOPT_TIMEOUT        => FETCH_TIMEOUT + 2,
            CURLOPT_USERAGENT      => $ua,
            CURLOPT_HTTPHEADER     => ['Accept: application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5'],
            CURLOPT_ENCODING       => '',
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        if (!is_string($body) || $code >= 400 || strlen($body) > MAX_BYTES) { return null; }
        return $body;
    }
    if (!ini_get('allow_url_fopen')) { return null; }
    $ctx = stream_context_create(['http' => ['timeout' => FETCH_TIMEOUT, 'user_agent' => $ua, 'follow_location' => 1, 'max_redirects' => 3]]);
    $body = @file_get_contents($url, false, $ctx, 0, MAX_BYTES);
    return is_string($body) ? $body : null;
}

/** Parses RSS 2.0 or Atom; returns headlines only. */
function parse_feed(string $xml, string $fallbackSource): array
{
    $prev = libxml_use_internal_errors(true);
    $doc = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NONET | LIBXML_NOCDATA);
    libxml_use_internal_errors($prev);
    if (!$doc) { return []; }

    $items = [];
    if (isset($doc->channel->item)) {
        foreach ($doc->channel->item as $it) {
            $source = isset($it->source) ? trim((string) $it->source) : $fallbackSource;
            $items[] = ['title' => (string) $it->title, 'link' => (string) $it->link, 'date' => (string) ($it->pubDate ?? ''), 'source' => $source];
        }
    } elseif (isset($doc->entry)) {
        foreach ($doc->entry as $en) {
            $link = '';
            foreach ($en->link as $l) {
                $rel = (string) ($l['rel'] ?? 'alternate');
                if ($rel === 'alternate' || $link === '') { $link = (string) $l['href']; }
            }
            $items[] = ['title' => (string) $en->title, 'link' => $link, 'date' => (string) ($en->updated ?? $en->published ?? ''), 'source' => $fallbackSource];
        }
    }

    $clean = [];
    foreach ($items as $i) {
        $title = trim(html_entity_decode(strip_tags($i['title']), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $link  = trim($i['link']);
        if ($title === '' || !preg_match('#^https?://#i', $link)) { continue; }
        // Aggregator titles end with " - Publisher"; split it off into source
        $source = $i['source'];
        if (preg_match('/^(.*)\s+-\s+([^-]{2,60})$/u', $title, $m) && stripos($link, 'news.google.') !== false) {
            $title = $m[1];
            $source = $source ?: $m[2];
            if ($source === $fallbackSource) { $source = $m[2]; }
        }
        $ts = strtotime($i['date']) ?: 0;
        if ($ts > time() + 3600) { $ts = time(); } // malformed future dates
        $clean[] = [
            'title'  => mb_substr($title, 0, 180, 'UTF-8'),
            'link'   => $link,
            'date'   => $ts ? gmdate('c', $ts) : null,
            'source' => mb_substr($source, 0, 60, 'UTF-8'),
            'ts'     => $ts,
        ];
    }
    usort($clean, static fn($a, $b) => $b['ts'] <=> $a['ts']);
    return $clean;
}

function cache_path(string $dir, string $slug): string
{
    return $dir . '/' . preg_replace('/[^a-z0-9-]/', '', $slug) . '.json';
}

function read_cache(string $dir, string $slug): ?array
{
    $f = cache_path($dir, $slug);
    if (!is_file($f)) { return null; }
    $c = json_decode((string) @file_get_contents($f), true);
    return is_array($c) ? $c : null;
}

function is_fresh(?array $c): bool
{
    if (!$c) { return false; }
    $ttl = empty($c['items']) ? FAIL_TTL : CACHE_TTL;
    return (time() - (int) ($c['fetched'] ?? 0)) < $ttl;
}

function refresh(string $dir, array $vendor): array
{
    $host = parse_url($vendor['site'] ?? '', PHP_URL_HOST) ?: $vendor['name'];
    $result = ['slug' => $vendor['slug'], 'name' => $vendor['name'], 'site' => $vendor['site'] ?? null,
               'items' => [], 'via' => null, 'fetched' => time()];
    foreach (($vendor['feeds'] ?? []) as $feed) {
        $isAggregator = stripos($feed, 'news.google.') !== false;
        if ($isAggregator && !ALLOW_NEWS_AGGREGATOR) { continue; }
        $body = http_get($feed);
        if ($body === null) { continue; }
        $items = parse_feed($body, $isAggregator ? '' : preg_replace('/^www\./', '', $host));
        // keep only the last 120 days so stale feeds don't look current
        $items = array_values(array_filter($items, static fn($i) => !$i['ts'] || $i['ts'] > time() - 120 * 86400));
        if ($items) {
            $result['items'] = array_slice($items, 0, ITEMS_PER_VENDOR);
            $result['via'] = $isAggregator ? 'news' : 'official';
            break;
        }
    }
    @file_put_contents(cache_path($dir, $vendor['slug']), json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    return $result;
}

function public_view(array $c): array
{
    return [
        'slug' => $c['slug'], 'name' => $c['name'], 'via' => $c['via'],
        'fetched' => gmdate('c', (int) $c['fetched']),
        'items' => array_map(static fn($i) => ['title' => $i['title'], 'link' => $i['link'], 'date' => $i['date'], 'source' => $i['source']], $c['items']),
    ];
}

$vendors = load_vendors($dataFile);
if (!$vendors) {
    if ($isCli) { fwrite(STDERR, "vendors.json missing or invalid\n"); exit(1); }
    out(['ok' => false, 'message' => 'Vendor list unavailable.'], 500);
}

// --------------------------------------------------------------- CLI check
if ($isCli) {
    $force = in_array('--check', $argv ?? [], true);
    foreach ($vendors as $v) {
        $c = $force ? refresh($cacheDir, $v) : (is_fresh(read_cache($cacheDir, $v['slug'])) ? read_cache($cacheDir, $v['slug']) : refresh($cacheDir, $v));
        printf("%-14s %-9s %d items  %s\n", $v['slug'], $c['via'] ?? 'FAILED', count($c['items']), $c['items'][0]['title'] ?? '');
    }
    exit(0);
}

// --------------------------------------------------------------- HTTP
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') { out(['ok' => false, 'message' => 'Method not allowed.'], 405); }

if (isset($_GET['v'])) {
    $slug = preg_replace('/[^a-z0-9-]/', '', strtolower((string) $_GET['v']));
    if (!isset($vendors[$slug])) { out(['ok' => false, 'message' => 'Unknown vendor.'], 404); }
    $c = read_cache($cacheDir, $slug);
    if (!is_fresh($c)) { $c = refresh($cacheDir, $vendors[$slug]); }
    out(['ok' => true] + public_view($c));
}

if (isset($_GET['wire'])) {
    $all = [];
    $warmed = 0;
    $slugs = array_keys($vendors);
    shuffle($slugs);
    foreach ($slugs as $slug) {
        $c = read_cache($cacheDir, $slug);
        if (!is_fresh($c) && $warmed < WIRE_WARM_PER_CALL) { $c = refresh($cacheDir, $vendors[$slug]); $warmed++; }
        if (!$c) { continue; }
        foreach (array_slice($c['items'], 0, 2) as $i) {
            $all[] = ['vendor' => $c['name'], 'slug' => $slug] + $i;
        }
    }
    usort($all, static fn($a, $b) => $b['ts'] <=> $a['ts']);
    $all = array_map(static function ($i) { unset($i['ts']); return $i; }, array_slice($all, 0, 24));
    out(['ok' => true, 'items' => $all]);
}

out(['ok' => false, 'message' => 'Use ?v=<vendor> or ?wire=1.'], 400);
