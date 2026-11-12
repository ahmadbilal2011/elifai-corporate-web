<?php
/** Small JSON endpoints for the editor: Markdown preview and inline image upload. */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
require __DIR__ . '/../lib/markdown.php';

header('Content-Type: application/json; charset=utf-8');
if (!current_user()) { http_response_code(401); echo json_encode(['error' => 'Signed out. Reload the page.']); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
start_session();
if (!hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? ''))) { http_response_code(400); echo json_encode(['error' => 'Session expired. Reload the page.']); exit; }

$action = (string)($_POST['action'] ?? '');
if ($action === 'preview') {
    echo json_encode(['html' => markdown((string)($_POST['md'] ?? ''))]);
} elseif ($action === 'upload' && isset($_FILES['image'])) {
    try {
        echo json_encode(['url' => save_image_upload($_FILES['image'])]);
    } catch (RuntimeException $e) {
        http_response_code(422);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action.']);
}
