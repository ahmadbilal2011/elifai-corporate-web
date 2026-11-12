<?php
/** Loads the starter articles and courses (lib/seed.json) into an empty database. */
declare(strict_types=1);

function seed_content(PDO $pdo): void
{
    $data = json_decode((string)@file_get_contents(__DIR__ . '/seed.json'), true);
    if (!is_array($data)) return;
    $pdo->beginTransaction();
    $a = $pdo->prepare('INSERT OR IGNORE INTO articles (slug, title, summary, category, body_md, sources_md, status, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
    foreach ($data['articles'] ?? [] as $x) {
        $ts = $x['date'] . ' 08:00:00';
        $a->execute([$x['slug'], $x['title'], $x['summary'], $x['category'], $x['body'], $x['sources'] ?? '', 'published', $ts, $ts, $ts]);
    }
    $c = $pdo->prepare('INSERT OR IGNORE INTO courses (slug, title, summary, track, level, duration, status, sort, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $l = $pdo->prepare('INSERT INTO lessons (course_id, sort, kind, title, url, note) VALUES (?,?,?,?,?,?)');
    $ts = now();
    foreach ($data['courses'] ?? [] as $x) {
        $c->execute([$x['slug'], $x['title'], $x['summary'], $x['track'], $x['level'], $x['duration'], 'published', (int)$x['sort'], $ts, $ts, $ts]);
        $id = (int)$pdo->lastInsertId();
        if (!$id) continue;
        foreach ($x['lessons'] as $k => $ls) $l->execute([$id, $k, $ls['kind'], $ls['title'], $ls['url'], $ls['note'] ?? '']);
    }
    $pdo->commit();
}
