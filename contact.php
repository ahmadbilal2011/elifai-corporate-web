<?php
/**
 * Elifai — executive inquiry handler for cPanel (PHP 7.4+ / 8.x).
 *
 * Receives the contact form (AJAX or plain POST), validates it, applies
 * spam and rate-limit checks, and emails the enquiry to info@elifai.pk.
 * AJAX callers get JSON; plain form posts are redirected back to /#contact.
 */

declare(strict_types=1);

// ------------------------------------------------------------------ config
const MAIL_TO        = 'info@elifai.pk';
const MAIL_FROM      = 'no-reply@elifai.pk';   // must be a mailbox/domain hosted on this cPanel account (SPF/DKIM)
const MAIL_FROM_NAME = 'Elifai Website';
const ALLOWED_HOSTS  = ['elifai.pk', 'www.elifai.pk', 'localhost', '127.0.0.1'];
const MIN_FILL_SECS  = 3;        // humans take longer than this to fill the form
const RATE_LIMIT     = 5;        // max submissions per IP …
const RATE_WINDOW    = 3600;     // … per hour
// -------------------------------------------------------------------------

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$wantsJson = (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
          || (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch');

function respond(bool $ok, string $message, int $code = 200, array $errors = []): void
{
    global $wantsJson;
    http_response_code($code);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        $out = ['ok' => $ok, 'message' => $message];
        if ($errors) { $out['errors'] = $errors; }
        echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {
        header('Location: /?sent=' . ($ok ? '1' : '0') . '#contact', true, 303);
    }
    exit;
}

function clean_line(string $v, int $max): string
{
    $v = trim(preg_replace('/[\r\n\t]+/', ' ', $v) ?? '');
    $v = preg_replace('/[^\P{C}]/u', '', $v) ?? '';           // strip control chars
    return mb_substr($v, 0, $max, 'UTF-8');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Method not allowed.', 405);
}

// Same-origin check (Origin or Referer must be one of our hosts)
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($origin !== '') {
    $host = strtolower((string) parse_url($origin, PHP_URL_HOST));
    if (!in_array($host, ALLOWED_HOSTS, true)) {
        respond(false, 'Request origin not allowed.', 403);
    }
}

// Honeypot + timing trap: pretend success so bots learn nothing
$honeypot = (string) ($_POST['website'] ?? '');
$ts       = (int) ($_POST['ts'] ?? 0);
$elapsed  = $ts > 0 ? (int) floor((microtime(true) * 1000 - $ts) / 1000) : PHP_INT_MAX;
if ($honeypot !== '' || ($ts > 0 && $elapsed < MIN_FILL_SECS)) {
    respond(true, 'Thank you. Your enquiry has been sent.');
}

// Rate limit per IP using a small file in the system temp dir
$ip      = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rlFile  = rtrim(sys_get_temp_dir(), '/') . '/elifai_rl_' . hash('sha256', $ip) . '.json';
$now     = time();
$hits    = [];
if (is_file($rlFile)) {
    $hits = json_decode((string) @file_get_contents($rlFile), true) ?: [];
    $hits = array_values(array_filter($hits, static fn($t) => is_int($t) && $t > $now - RATE_WINDOW));
}
if (count($hits) >= RATE_LIMIT) {
    respond(false, 'Too many enquiries from this connection. Try again in an hour, or email info@elifai.pk directly.', 429);
}

// Collect + validate
$name    = clean_line((string) ($_POST['name'] ?? ''), 120);
$email   = clean_line((string) ($_POST['email'] ?? ''), 160);
$company = clean_line((string) ($_POST['company'] ?? ''), 160);
$phone   = clean_line((string) ($_POST['phone'] ?? ''), 40);
$topic   = clean_line((string) ($_POST['topic'] ?? ''), 60);
$region  = clean_line((string) ($_POST['region'] ?? ''), 60);
$message = trim(mb_substr((string) ($_POST['message'] ?? ''), 0, 5000, 'UTF-8'));
$consent = ($_POST['consent'] ?? '') === 'yes';

$topics  = ['Executive briefing', 'Proposal request', 'Managed services', 'AI for operations',
            'Cloud and Kubernetes', 'Red Hat / Ubuntu', 'Custom software', 'Careers', 'Something else'];
$regions = ['Pakistan', 'Saudi Arabia', 'UAE / other GCC', 'Europe / UK', 'Rest of world'];

$errors = [];
if (mb_strlen($name) < 2)                          { $errors['name'] = 'Enter your full name.'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL))    { $errors['email'] = 'Enter a valid email address.'; }
if (mb_strlen($message) < 20)                      { $errors['message'] = 'Add a little more detail, at least 20 characters.'; }
if (!$consent)                                     { $errors['consent'] = 'Tick the box so we can use these details to reply.'; }
if (!in_array($topic, $topics, true))              { $topic = 'Something else'; }
if (!in_array($region, $regions, true))            { $region = 'Rest of world'; }

if ($errors) {
    respond(false, 'Check the highlighted fields and try again.', 422, $errors);
}

// Build the email
$subject = sprintf('[elifai.pk] %s — %s (%s)', $topic, $name, $region);
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$body  = "New enquiry from elifai.pk\n";
$body .= str_repeat('-', 44) . "\n";
$body .= "Name:     {$name}\n";
$body .= "Email:    {$email}\n";
$body .= 'Company:  ' . ($company ?: '-') . "\n";
$body .= 'Phone:    ' . ($phone ?: '-') . "\n";
$body .= "Topic:    {$topic}\n";
$body .= "Region:   {$region}\n";
$body .= str_repeat('-', 44) . "\n\n";
$body .= $message . "\n\n";
$body .= str_repeat('-', 44) . "\n";
$body .= 'Sent ' . gmdate('Y-m-d H:i') . " UTC from {$ip}\n";
$body .= "Consent to reply: yes\n";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: =?UTF-8?B?' . base64_encode(MAIL_FROM_NAME) . '?= <' . MAIL_FROM . '>',
    'Reply-To: ' . $email,
    'X-Mailer: Elifai-Web',
];

// -f sets the envelope sender so SPF aligns on most cPanel hosts
$sent = @mail(MAIL_TO, $encodedSubject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);

if (!$sent) {
    error_log('[elifai contact] mail() failed for ' . $email);
    respond(false, 'The mail server did not accept the enquiry.', 502);
}

$hits[] = $now;
@file_put_contents($rlFile, json_encode($hits), LOCK_EX);

respond(true, 'Thank you. Your enquiry has been sent and we will reply within one business day.');
