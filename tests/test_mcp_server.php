<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Auth;
use App\Config;
use App\Db;
use App\Routes;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

$passes = 0;
$failures = 0;

function assertMcp(bool $condition, string $description, int &$p, int &$f): void
{
    if ($condition) {
        $p++;
        echo "[PASS] {$description}\n";
    } else {
        $f++;
        echo "[FAIL] {$description}\n";
    }
}

echo "=== Running MCP Server v1 Automated Test Suite ===\n\n";

// Initialize Slim app in test environment
Config::load();
$app = AppFactory::create();
Routes::register($app);

// Helper to dispatch request to app
function dispatchJsonRpc($app, ?string $token, array|string $body): array
{
    $factory = new ServerRequestFactory();
    $req = $factory->createServerRequest('POST', '/api/mcp')
        ->withHeader('Content-Type', 'application/json');

    if ($token !== null) {
        $req = $req->withHeader('Authorization', 'Bearer ' . $token);
    }

    $raw = is_array($body) ? json_encode($body) : $body;
    $req->getBody()->write($raw);

    $res = $app->handle($req);
    $statusCode = $res->getStatusCode();
    $resBody = (string) $res->getBody();
    $decoded = json_decode($resBody, true);

    return [
        'status' => $statusCode,
        'body' => $decoded,
        'raw' => $resBody,
    ];
}

// 1. Auth Tests: Missing token -> HTTP 401
$res1 = dispatchJsonRpc($app, null, ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list']);
assertMcp($res1['status'] === 401, '1.1 Missing Bearer token returns HTTP 401', $passes, $failures);

// 2. Auth Tests: Invalid token -> HTTP 401
$res2 = dispatchJsonRpc($app, 'invalid-bad-token-xyz', ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list']);
assertMcp($res2['status'] === 401, '1.2 Invalid Bearer token returns HTTP 401', $passes, $failures);

// Use valid test token
$validToken = 'test-tech-token';

// 3. Protocol Tests: initialize
$resInit = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 'init-1',
    'method' => 'initialize',
    'params' => [
        'protocolVersion' => '2024-11-05',
        'capabilities' => new \stdClass(),
        'clientInfo' => ['name' => 'test-client', 'version' => '1.0'],
    ],
]);
assertMcp($resInit['status'] === 200, '2.1 initialize returns HTTP 200', $passes, $failures);

// Assert RAW top-level JSON-RPC wire shape (no {data: ...} envelope)
assertMcp(
    isset($resInit['body']['jsonrpc']) && $resInit['body']['jsonrpc'] === '2.0' && !array_key_exists('data', $resInit['body']),
    '2.2 initialize returns raw JSON-RPC wire format without data wrapper',
    $passes,
    $failures
);

$serverInfo = $resInit['body']['result']['serverInfo'] ?? [];
assertMcp($serverInfo['name'] === 'hvachome-mcp-server', '2.3 initialize returns server name hvachome-mcp-server', $passes, $failures);

// 4. Protocol Tests: ping
$resPing = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 'ping-1',
    'method' => 'ping',
]);
assertMcp($resPing['status'] === 200, '2.4 ping returns HTTP 200', $passes, $failures);

// 5. Tools List: returns exactly the 7 tools
$resList = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 2,
    'method' => 'tools/list',
]);
assertMcp($resList['status'] === 200, '3.1 tools/list returns HTTP 200', $passes, $failures);
$tools = $resList['body']['result']['tools'] ?? [];
assertMcp(count($tools) === 7, '3.2 tools/list returns exactly 7 tools (got ' . count($tools) . ')', $passes, $failures);

$expectedToolNames = [
    'list_tickets',
    'get_ticket',
    'list_buildings',
    'get_unit_appliances',
    'search_parts',
    'get_stockpile',
    'get_counts',
];
$toolNames = array_column($tools, 'name');
sort($expectedToolNames);
sort($toolNames);
assertMcp($toolNames === $expectedToolNames, '3.3 All 7 expected tool names match exactly: ' . implode(', ', $expectedToolNames), $passes, $failures);

// 6. Tool Call: get_counts matches canonical schema
$resCounts = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 3,
    'method' => 'tools/call',
    'params' => [
        'name' => 'get_counts',
        'arguments' => new \stdClass(),
    ],
]);
assertMcp($resCounts['status'] === 200, '4.1 tools/call get_counts returns HTTP 200', $passes, $failures);
$countsContent = json_decode($resCounts['body']['result']['content'][0]['text'] ?? '{}', true);
$expectedKeys = [
    'tickets', 'timeline', 'corrections', 'parts', 'allocations',
    'equipment', 'appliances', 'movements', 'stockpiles', 'units',
    'default_sets', 'buildings', 'complexes'
];
$hasAllKeys = true;
foreach ($expectedKeys as $k) {
    if (!array_key_exists($k, $countsContent)) {
        $hasAllKeys = false;
        break;
    }
}
assertMcp($hasAllKeys, '4.2 get_counts returns all 13 canonical system count keys', $passes, $failures);
assertMcp($countsContent['complexes'] === 10, '4.3 get_counts uses canonical complexes table (got ' . ($countsContent['complexes'] ?? 'null') . ')', $passes, $failures);

// 7. Tool Call: list_tickets
$resTickets = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 4,
    'method' => 'tools/call',
    'params' => [
        'name' => 'list_tickets',
        'arguments' => ['limit' => 5],
    ],
]);
$tContent = json_decode($resTickets['body']['result']['content'][0]['text'] ?? '[]', true);
assertMcp(is_array($tContent) && count($tContent) > 0, '5.1 tools/call list_tickets returns array of tickets', $passes, $failures);

// 8. Tool Call: get_unit_appliances by label
$resUnitApp = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 5,
    'method' => 'tools/call',
    'params' => [
        'name' => 'get_unit_appliances',
        'arguments' => [
            'building' => '1723 Bath Road',
            'unit' => '266',
        ],
    ],
]);
$unitAppData = json_decode($resUnitApp['body']['result']['content'][0]['text'] ?? '{}', true);
assertMcp(!empty($unitAppData['unit']['unit_number']), '6.1 get_unit_appliances resolves unit 266 by label', $passes, $failures);

// 9. Tool Call: search_parts (exact model matching)
$resParts = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 6,
    'method' => 'tools/call',
    'params' => [
        'name' => 'search_parts',
        'arguments' => [
            'model' => 'FFCD2418US3A',
        ],
    ],
]);
$partsData = json_decode($resParts['body']['result']['content'][0]['text'] ?? '{}', true);
assertMcp(isset($partsData['verified_parts']) && isset($partsData['tbd_templates']), '7.1 search_parts returns verified_parts and tbd_templates', $passes, $failures);

// 10. Unknown tool name -> JSON-RPC error -32602
$resUnknown = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 7,
    'method' => 'tools/call',
    'params' => [
        'name' => 'non_existent_tool',
        'arguments' => new \stdClass(),
    ],
]);
$errorCode = $resUnknown['body']['error']['code'] ?? null;
assertMcp($errorCode === -32602, '8.1 Unknown tool name returns JSON-RPC error -32602', $passes, $failures);

// 11. Write-shaped tool rejection (no write tools exist)
$resWrite = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 8,
    'method' => 'tools/call',
    'params' => [
        'name' => 'create_ticket',
        'arguments' => ['title' => 'Sneak write'],
    ],
]);
assertMcp(($resWrite['body']['error']['code'] ?? null) === -32602, '8.2 Write-shaped tool call (create_ticket) is rejected with -32602', $passes, $failures);

echo "\n=========================================\n";
echo "MCP Test Results: {$passes} Passed, {$failures} Failed\n";
echo "=========================================\n";

if ($failures > 0) {
    exit(1);
}
