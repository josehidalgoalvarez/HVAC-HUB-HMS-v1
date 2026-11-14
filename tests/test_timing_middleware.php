<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Middleware\TimingMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

// Use an isolated in-memory SQLite database
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
Db::setPdo($pdo);
$pdo->exec('CREATE TABLE IF NOT EXISTS slow_request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    route TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    status_code INTEGER NULL,
    user_id INTEGER NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)');

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->add(new TimingMiddleware());
$app->addRoutingMiddleware();

$app->get('/api/test/{id}', function (Request $request, Response $response): Response {
    usleep(1050000); // ~1.05s >= 1000ms threshold
    $response->getBody()->write('slow ok');
    return $response->withStatus(200);
});

$app->get('/api/fast/{id}', function (Request $request, Response $response): Response {
    $response->getBody()->write('fast ok');
    return $response->withStatus(200);
});

$app->get('/api/boom/{id}', function (Request $request, Response $response): Response {
    usleep(1050000); // ~1.05s >= 1000ms threshold
    throw new \RuntimeException('Simulated failure');
});

$passes = 0;
$failures = 0;

function assertTiming(bool $cond, string $label, int &$passes, int &$failures): void
{
    if ($cond) {
        echo "  [PASS] {$label}\n";
        $passes++;
    } else {
        echo "  [FAIL] {$label}\n";
        $failures++;
    }
}

$factory = new ServerRequestFactory();

echo "--- TimingMiddleware Tests ---\n";

// (a) Slow route logs 1 row with route PATTERN (/api/test/{id}) and X-Response-Time >= 1000ms
$resSlow = $app->handle($factory->createServerRequest('GET', '/api/test/42'));
$headerSlow = $resSlow->getHeaderLine('X-Response-Time');
$msSlow = (int) rtrim($headerSlow, 'ms');
$rowsAfterSlow = Db::fetchAll('SELECT * FROM slow_request_log ORDER BY id ASC');
assertTiming(
    $resSlow->getStatusCode() === 200
    && preg_match('/^\d+ms$/', $headerSlow) === 1
    && $msSlow >= 1000
    && count($rowsAfterSlow) === 1
    && ($rowsAfterSlow[0]['route'] ?? '') === '/api/test/{id}'
    && (int) ($rowsAfterSlow[0]['status_code'] ?? 0) === 200,
    '1. Slow route logs 1 row with route pattern /api/test/{id} and X-Response-Time >= 1000ms',
    $passes,
    $failures
);

// (b) Fast route logs NOTHING and still carries X-Response-Time header
$resFast = $app->handle($factory->createServerRequest('GET', '/api/fast/99'));
$headerFast = $resFast->getHeaderLine('X-Response-Time');
$rowsAfterFast = Db::fetchAll('SELECT * FROM slow_request_log ORDER BY id ASC');
assertTiming(
    $resFast->getStatusCode() === 200
    && preg_match('/^\d+ms$/', $headerFast) === 1
    && count($rowsAfterFast) === 1,
    '2. Fast route logs nothing and still carries X-Response-Time header',
    $passes,
    $failures
);

// (c) Throwing route still logs status_code 500 via finally
$threw = false;
try {
    $app->handle($factory->createServerRequest('GET', '/api/boom/7'));
} catch (\RuntimeException $e) {
    $threw = true;
}
$rowsAfterBoom = Db::fetchAll('SELECT * FROM slow_request_log ORDER BY id DESC');
assertTiming(
    $threw === true
    && count($rowsAfterBoom) === 2
    && ($rowsAfterBoom[0]['route'] ?? '') === '/api/boom/{id}'
    && (int) ($rowsAfterBoom[0]['status_code'] ?? 0) === 500,
    '3. Throwing route still logs status_code 500 via finally',
    $passes,
    $failures
);

echo "\nTimingMiddleware Test Results: {$passes} Passed, {$failures} Failed\n";
exit($failures > 0 ? 1 : 0);
