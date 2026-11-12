<?php
/**
 * Small, safe Markdown renderer for articles written in the admin panel.
 *
 * Supports: # ## ### headings, paragraphs, - and 1. lists, > quotes,
 * ``` code blocks, `code`, **bold**, *italic*, [links](https://...),
 * ![images](/uploads/...), --- rules, and tables written as raw HTML
 * (<table> ... </table>, wrapped so they scroll on phones).
 *
 * Everything else is escaped, so text typed into the editor can never run
 * scripts. Raw HTML is only accepted for a short list of harmless tags.
 */
declare(strict_types=1);

function md_inline(string $s): string
{
    $s = htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    // code spans first, protected from other rules
    $codes = [];
    $s = preg_replace_callback('/`([^`]+)`/', function ($m) use (&$codes) {
        $codes[] = '<code>' . $m[1] . '</code>';
        return "\x01" . (count($codes) - 1) . "\x01";
    }, $s) ?? $s;
    // images
    $s = preg_replace_callback('/!\[([^\]]*)\]\(([^)\s]+)\)/', function ($m) {
        $url = safe_url(html_entity_decode($m[2], ENT_QUOTES));
        if ($url === '') return $m[0];
        return '<img src="' . htmlspecialchars($url, ENT_QUOTES) . '" alt="' . $m[1] . '" loading="lazy" decoding="async">';
    }, $s) ?? $s;
    // links
    $s = preg_replace_callback('/\[([^\]]+)\]\(([^)\s]+)\)/', function ($m) {
        $url = safe_url(html_entity_decode($m[2], ENT_QUOTES));
        if ($url === '') return $m[1];
        $ext = preg_match('~^https?://~i', $url) && stripos($url, SITE_URL) !== 0;
        return '<a href="' . htmlspecialchars($url, ENT_QUOTES) . '"' . ($ext ? ' target="_blank" rel="noopener"' : '') . '>' . $m[1] . '</a>';
    }, $s) ?? $s;
    $s = preg_replace('/\*\*(.+?)\*\*/s', '<b>$1</b>', $s) ?? $s;
    $s = preg_replace('/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/s', '<em>$1</em>', $s) ?? $s;
    $s = preg_replace_callback("/\x01(\d+)\x01/", function ($m) use ($codes) { return $codes[(int)$m[1]]; }, $s) ?? $s;
    return $s;
}

/** Keeps only simple table markup from a raw HTML block. */
function md_table_html(string $html): string
{
    $allowed = '<table><thead><tbody><tr><th><td><caption><b><strong><em><i><a><code><br>';
    $clean = strip_tags($html, $allowed);
    // drop every attribute except scope/colspan/rowspan on cells and href on links
    $clean = preg_replace_callback('/<(\w+)([^>]*)>/', function ($m) {
        $tag = strtolower($m[1]);
        $keep = '';
        if (in_array($tag, ['th', 'td'], true) && preg_match_all('/\b(scope|colspan|rowspan)="([\w-]+)"/i', $m[2], $mm, PREG_SET_ORDER)) {
            foreach ($mm as $a) $keep .= ' ' . strtolower($a[1]) . '="' . $a[2] . '"';
        }
        if ($tag === 'a' && preg_match('/href="([^"]+)"/i', $m[2], $hm)) {
            $u = safe_url(html_entity_decode($hm[1], ENT_QUOTES));
            if ($u) $keep .= ' href="' . htmlspecialchars($u, ENT_QUOTES) . '" target="_blank" rel="noopener"';
        }
        return '<' . $tag . $keep . '>';
    }, $clean) ?? '';
    return '<div class="table-scroll">' . $clean . '</div>';
}

function markdown(string $md): string
{
    $lines = preg_split('/\r\n|\r|\n/', $md) ?: [];
    $out = [];
    $para = [];
    $list = null; // ['ul'|'ol', items[]]
    $quote = [];
    $n = count($lines);

    $flushPara = function () use (&$para, &$out) {
        if ($para) { $out[] = '<p>' . md_inline(implode(' ', $para)) . '</p>'; $para = []; }
    };
    $flushList = function () use (&$list, &$out) {
        if ($list) {
            $out[] = '<' . $list[0] . '>' . implode('', array_map(function ($i) { return '<li>' . md_inline($i) . '</li>'; }, $list[1])) . '</' . $list[0] . '>';
            $list = null;
        }
    };
    $flushQuote = function () use (&$quote, &$out) {
        if ($quote) { $out[] = '<blockquote><p>' . md_inline(implode(' ', $quote)) . '</p></blockquote>'; $quote = []; }
    };
    $flushAll = function () use ($flushPara, $flushList, $flushQuote) { $flushPara(); $flushList(); $flushQuote(); };

    for ($i = 0; $i < $n; $i++) {
        $line = $lines[$i];
        $t = trim($line);

        if (strpos($t, '```') === 0) {
            $flushAll();
            $lang = preg_replace('/[^\w-]/', '', substr($t, 3));
            $code = [];
            for ($i++; $i < $n && strpos(trim($lines[$i]), '```') !== 0; $i++) $code[] = $lines[$i];
            $out[] = '<pre' . ($lang ? ' data-lang="' . h($lang) . '"' : '') . '><code>' . htmlspecialchars(implode("\n", $code), ENT_QUOTES, 'UTF-8') . '</code></pre>';
            continue;
        }
        if (stripos($t, '<table') === 0) {
            $flushAll();
            $buf = [];
            for (; $i < $n; $i++) { $buf[] = $lines[$i]; if (stripos($lines[$i], '</table>') !== false) break; }
            $out[] = md_table_html(implode("\n", $buf));
            continue;
        }
        if ($t === '') { $flushAll(); continue; }
        if (preg_match('/^(#{1,4})\s+(.+)$/', $t, $m)) {
            $flushAll();
            $lv = max(2, strlen($m[1])); // # and ## become h2: the page title is the only h1
            $id = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($m[2])) ?? '', '-');
            $out[] = "<h$lv id=\"" . h($id) . "\">" . md_inline($m[2]) . "</h$lv>";
            continue;
        }
        if (preg_match('/^(-{3,}|\*{3,})$/', $t)) { $flushAll(); $out[] = '<hr>'; continue; }
        if (preg_match('/^>\s?(.*)$/', $t, $m)) { $flushPara(); $flushList(); $quote[] = $m[1]; continue; }
        if (preg_match('/^[-*+]\s+(.+)$/', $t, $m)) {
            $flushPara(); $flushQuote();
            if (!$list || $list[0] !== 'ul') { $flushList(); $list = ['ul', []]; }
            $list[1][] = $m[1];
            continue;
        }
        if (preg_match('/^\d+[.)]\s+(.+)$/', $t, $m)) {
            $flushPara(); $flushQuote();
            if (!$list || $list[0] !== 'ol') { $flushList(); $list = ['ol', []]; }
            $list[1][] = $m[1];
            continue;
        }
        if ($list && preg_match('/^\s{2,}\S/', $line)) { // continuation of a list item
            $list[1][count($list[1]) - 1] .= ' ' . $t;
            continue;
        }
        $flushList(); $flushQuote();
        $para[] = $t;
    }
    $flushAll();
    return implode("\n", $out);
}
