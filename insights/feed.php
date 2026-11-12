<?php
/** /insights/feed.json (latest three, used by the home page) and /insights/feed.xml (RSS). */
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

$format = ($_GET['format'] ?? 'json') === 'rss' ? 'rss' : 'json';

if ($format === 'json') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    echo json_encode(array_map(function ($a) {
        return ['title' => $a['title'], 'url' => '/insights/' . $a['slug'], 'summary' => $a['summary'],
            'category' => $a['category'] ?: 'Insight', 'minutes' => read_minutes($a['body_md']), 'date' => iso_date($a['published_at'])];
    }, published_articles(3)), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

header('Content-Type: application/rss+xml; charset=utf-8');
$x = function ($s) { return htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8'); };
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<rss version="2.0"><channel>
<title>Elifai Insights</title>
<link><?= SITE_URL ?>/insights/</link>
<description>Practical guides for Saudi and Gulf technology leaders.</description>
<language>en</language>
<?php foreach (published_articles(20) as $a): ?>
<item>
  <title><?= $x($a['title']) ?></title>
  <link><?= SITE_URL ?>/insights/<?= $x($a['slug']) ?></link>
  <guid><?= SITE_URL ?>/insights/<?= $x($a['slug']) ?></guid>
  <pubDate><?= $x(gmdate(DATE_RSS, strtotime($a['published_at'] . ' UTC'))) ?></pubDate>
  <description><?= $x($a['summary']) ?></description>
</item>
<?php endforeach; ?>
</channel></rss>
