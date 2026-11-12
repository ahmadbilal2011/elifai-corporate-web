<?php
/** Served as /sitemap.xml (see .htaccess). Lists the static pages plus every published article and course. */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
$x = function ($s) { return htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8'); };
$home = gmdate('Y-m-d', (int)@filemtime(__DIR__ . '/index.html') ?: time());
$urls = [
    ['/', $home, 'weekly', '1.0'],
    ['/ar/', $home, 'monthly', '0.9'],
    ['/insights/', null, 'weekly', '0.8'],
    ['/learning/', null, 'weekly', '0.8'],
    ['/privacy', $home, 'yearly', '0.3'],
];
foreach (published_articles() as $a) $urls[] = ['/insights/' . $a['slug'], iso_date($a['updated_at']), 'monthly', '0.7'];
foreach (published_courses() as $c) $urls[] = ['/learning/' . $c['slug'], iso_date($c['updated_at']), 'monthly', '0.7'];

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as [$path, $mod, $freq, $prio]) {
    echo '  <url><loc>' . $x(SITE_URL . $path) . '</loc>' . ($mod ? '<lastmod>' . $x($mod) . '</lastmod>' : '')
        . '<changefreq>' . $freq . '</changefreq><priority>' . $prio . '</priority></url>' . "\n";
}
echo '</urlset>' . "\n";
