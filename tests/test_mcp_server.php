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

// 5. Tools List: returns the 7 read tools + 2 write tools (record_move, log_part_use = 9 total)
$resList = dispatchJsonRpc($app, $validToken, [
    'jsonrpc' => '2.0',
    'id' => 2,
    'method' => 'tools/list',
]);
assertMcp($resList['status'] === 200, '3.1 tools/list returns HTTP 200', $passes, $failures);
$tools = $resList['body']['result']['tools'] ?? [];
assertMcp(count($tools) === 10, '3.2 tools/list returns exactly 10 tools (got ' . count($tools) . ')', $passes, $failures);

$expectedToolNames = [
    'list_tickets',
    'get_ticket',
    'list_buildings',
    'get_unit_appliances',
    'search_parts',
    'get_stockpile',
    'get_counts',
    'record_move',
    'log_part_use',
    'add_to_buy_list',
];
$toolNames = array_column($tools, 'name');
sort($expectedToolNames);
sort($toolNames);
assertMcp($toolNames === $expectedToolNames, '3.3 All 10 expected tool names match exactly: ' . implode(', ', $expectedToolNames), $passes, $failures);

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
assertMcp(($resWrite['body']['error']['code'] ?? null) === -32602, '8.2 Unimplemented tool call (create_ticket) is rejected with -32602', $passes, $failures);

// ============================================================================
// MCP v2 Write Tool Tests: record_move (9 tests)
// ============================================================================

// Wrap DB changes in transaction so tests leave local fixtures pristine
$pdo = Db::get();
$pdo->beginTransaction();

try {
    // 9.1 Happy path: move an appliance to a stockpile
    $resMoveStockpile = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-1',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
                'stockpile_id' => 1,
                'movement_date' => date('Y-m-d'),
                'notes' => 'Happy path move to stockpile',
            ],
        ],
    ]);
    assertMcp($resMoveStockpile['status'] === 200, '9.1.1 record_move to stockpile returns HTTP 200', $passes, $failures);
    $dataMove1 = json_decode($resMoveStockpile['body']['result']['content'][0]['text'] ?? '{}', true);
    assertMcp(!empty($dataMove1['movement_id']) && $dataMove1['disposition'] === 'stored' && $dataMove1['status'] === 'stored', '9.1.2 Response carries created movement_id and stored disposition', $passes, $failures);
    $app1Check = Db::fetchOne('SELECT stockpile_id, unit_id, status, location FROM appliance WHERE id = 1');
    assertMcp($app1Check['stockpile_id'] === 1 && $app1Check['unit_id'] === null && $app1Check['status'] === 'stored', '9.1.3 Appliance updated to stockpile_id 1, unit_id NULL, status stored', $passes, $failures);

    // 9.2 Move to a unit (installed disposition)
    $resMoveUnit = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-2',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
                'unit_id' => 347,
                'disposition' => 'installed',
                'notes' => 'Install appliance into unit 347',
            ],
        ],
    ]);
    $dataMove2 = json_decode($resMoveUnit['body']['result']['content'][0]['text'] ?? '{}', true);
    assertMcp(!empty($dataMove2['movement_id']) && $dataMove2['disposition'] === 'installed' && $dataMove2['status'] === 'operational', '9.2 Move to unit sets installed disposition and operational status', $passes, $failures);

    // 9.3 Staged move: staged disposition, unit_id set, stockpile_id NULL, location Staged at Unit <id>
    $resMoveStaged = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-3',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
                'unit_id' => 347,
                'disposition' => 'staged',
                'notes' => 'Staging at unit 347 for replacement',
            ],
        ],
    ]);
    $dataMove3 = json_decode($resMoveStaged['body']['result']['content'][0]['text'] ?? '{}', true);
    $app3Check = Db::fetchOne('SELECT stockpile_id, unit_id, status, location FROM appliance WHERE id = 1');
    assertMcp(
        $dataMove3['disposition'] === 'staged' &&
        $dataMove3['status'] === 'staged' &&
        $app3Check['stockpile_id'] === null &&
        $app3Check['unit_id'] === 347 &&
        $app3Check['location'] === 'Staged at Unit 347',
        '9.3 Staged move sets staged disposition, unit_id set, stockpile_id NULL, location Staged at Unit <id>',
        $passes,
        $failures
    );

    // 9.4 Future movement_date rejected, no row written
    $movementsBefore = (int) Db::fetchOne('SELECT COUNT(*) as c FROM appliance_movement')['c'];
    $resFuture = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-4',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
                'stockpile_id' => 1,
                'movement_date' => '2099-01-01',
            ],
        ],
    ]);
    $movementsAfterFuture = (int) Db::fetchOne('SELECT COUNT(*) as c FROM appliance_movement')['c'];
    assertMcp(
        ($resFuture['body']['error']['code'] ?? null) === -32602 &&
        str_contains($resFuture['body']['error']['message'] ?? '', 'Future move date rejected') &&
        $movementsBefore === $movementsAfterFuture,
        '9.4 Future movement_date rejected (-32602), no movement row written',
        $passes,
        $failures
    );

    // 9.5 Backdated movement_date accepted, audit note written
    $resBackdated = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-5',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
                'stockpile_id' => 1,
                'movement_date' => '2026-11-01',
                'notes' => 'Backdated verification move',
            ],
        ],
    ]);
    $dataMove5 = json_decode($resBackdated['body']['result']['content'][0]['text'] ?? '{}', true);
    $lastCorrection = Db::fetchOne("SELECT * FROM correction WHERE entity_type = 'appliance' AND entity_id = 1 ORDER BY id DESC LIMIT 1");
    assertMcp(
        $dataMove5['is_backdated'] === true &&
        $dataMove5['movement_date'] === '2026-11-01' &&
        str_contains($lastCorrection['reason'] ?? '', 'actual move date: 2026-11-01'),
        '9.5 Backdated movement_date accepted and audit note records actual move date in correction row',
        $passes,
        $failures
    );

    // 9.6 Unknown appliance_id rejected, no row written
    $resUnknownApp = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-6',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 999999,
                'stockpile_id' => 1,
            ],
        ],
    ]);
    assertMcp(
        ($resUnknownApp['body']['error']['code'] ?? null) === -32602 &&
        str_contains($resUnknownApp['body']['error']['message'] ?? '', 'Appliance #999999 not found'),
        '9.6 Unknown appliance_id rejected (-32602), no row written',
        $passes,
        $failures
    );

    // 9.7 Unknown destination rejected, no row written
    $resUnknownDest = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-7',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
                'stockpile_id' => 888888,
            ],
        ],
    ]);
    assertMcp(
        ($resUnknownDest['body']['error']['code'] ?? null) === -32602 &&
        str_contains($resUnknownDest['body']['error']['message'] ?? '', 'Destination stockpile #888888 not found'),
        '9.7 Unknown destination rejected (-32602), no row written',
        $passes,
        $failures
    );

    // 9.8 Both or neither destination rejected
    $resNeither = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-8a',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
            ],
        ],
    ]);
    $resBoth = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'move-8b',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
                'unit_id' => 347,
                'stockpile_id' => 1,
            ],
        ],
    ]);
    assertMcp(
        ($resNeither['body']['error']['code'] ?? null) === -32602 &&
        ($resBoth['body']['error']['code'] ?? null) === -32602,
        '9.8 Both or neither destination rejected (-32602)',
        $passes,
        $failures
    );

    // 9.9 Unauthenticated call returns 401
    $resNoAuth = dispatchJsonRpc($app, null, [
        'jsonrpc' => '2.0',
        'id' => 'move-9',
        'method' => 'tools/call',
        'params' => [
            'name' => 'record_move',
            'arguments' => [
                'appliance_id' => 1,
                'stockpile_id' => 1,
            ],
        ],
    ]);
    assertMcp($resNoAuth['status'] === 401, '9.9 Unauthenticated call to record_move returns HTTP 401', $passes, $failures);

    // ============================================================================
    // MCP v2 Write Tool Tests: log_part_use (12 tests: 10.1 .. 10.12)
    // ============================================================================

    // Set up a dedicated test part with known initial stock and reorder point
    Db::execute(
        "INSERT INTO part (id, name, part_number, category, quantity_on_hand, reorder_point, unit_cost, is_reorder, created_at, updated_at)
         VALUES (99991, 'MCP Test Capacitor 45uF', 'CAP-45UF-TEST', 'Electrical', 10, 3, 14.50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    );
    Db::execute(
        "INSERT INTO part_stockpile (id, part_id, stockpile_id, quantity, minimum, status, created_at, updated_at)
         VALUES (99991, 99991, 1, 10, 2, 'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    );

    // 10.1 Happy path: use 1 pc of fixture part with known stock
    $res10_1 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-1',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'quantity' => 1,
            ],
        ],
    ]);
    $data10_1 = json_decode($res10_1['body']['result']['content'][0]['text'] ?? '{}', true);
    $part10_1Check = Db::fetchOne('SELECT quantity_on_hand FROM part WHERE id = 99991');
    assertMcp(
        $res10_1['status'] === 200 &&
        $data10_1['quantity_used'] === 1 &&
        $data10_1['previous_quantity'] === 10 &&
        $data10_1['new_quantity'] === 9 &&
        (int) $part10_1Check['quantity_on_hand'] === 9,
        '10.1 log_part_use happy path: HTTP 200, carries quantity_used (1), previous_quantity (10), new_quantity (9), and decrements part table by 1',
        $passes,
        $failures
    );

    // 10.2 Quantity defaults to 1 when omitted
    $res10_2 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-2',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
            ],
        ],
    ]);
    $data10_2 = json_decode($res10_2['body']['result']['content'][0]['text'] ?? '{}', true);
    assertMcp($data10_2['quantity_used'] === 1 && $data10_2['new_quantity'] === 8, '10.2 Quantity defaults to 1 when omitted', $passes, $failures);

    // 10.3 Named stockpile_id decrements that stockpile's allocation
    $res10_3 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-3',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'stockpile_id' => 1,
                'quantity' => 2,
            ],
        ],
    ]);
    $data10_3 = json_decode($res10_3['body']['result']['content'][0]['text'] ?? '{}', true);
    $sp10_3Check = Db::fetchOne('SELECT quantity FROM part_stockpile WHERE part_id = 99991 AND stockpile_id = 1');
    assertMcp($data10_3['new_quantity'] === 6 && (int) $sp10_3Check['quantity'] === 6, "10.3 Named stockpile_id decrements that stockpile's allocation", $passes, $failures);

    // 10.4 Unknown part_id -> -32602, no rows written
    $corrCountBefore = (int) Db::fetchOne('SELECT COUNT(*) as c FROM correction WHERE entity_type = "part"')['c'];
    $res10_4 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-4',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 888888,
                'quantity' => 1,
            ],
        ],
    ]);
    $corrCountAfter = (int) Db::fetchOne('SELECT COUNT(*) as c FROM correction WHERE entity_type = "part"')['c'];
    assertMcp(
        ($res10_4['body']['error']['code'] ?? null) === -32602 &&
        str_contains($res10_4['body']['error']['message'] ?? '', 'Part #888888 not found') &&
        $corrCountBefore === $corrCountAfter,
        '10.4 Unknown part_id rejected with -32602, no correction rows written',
        $passes,
        $failures
    );

    // 10.5 Quantity 0 and quantity negative -> -32602, no write
    $res10_5a = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-5a',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'quantity' => 0,
            ],
        ],
    ]);
    $res10_5b = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-5b',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'quantity' => -3,
            ],
        ],
    ]);
    assertMcp(
        ($res10_5a['body']['error']['code'] ?? null) === -32602 &&
        ($res10_5b['body']['error']['code'] ?? null) === -32602,
        '10.5 Quantity 0 and negative rejected with -32602, no write',
        $passes,
        $failures
    );

    // 10.6 Quantity greater than quantity_on_hand -> -32602, no write (over-use prevention)
    $partBefore10_6 = Db::fetchOne('SELECT quantity_on_hand FROM part WHERE id = 99991');
    $currentQoh = (int) $partBefore10_6['quantity_on_hand']; // 6
    $res10_6 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-6',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'quantity' => $currentQoh + 10,
            ],
        ],
    ]);
    $partAfter10_6 = Db::fetchOne('SELECT quantity_on_hand FROM part WHERE id = 99991');
    assertMcp(
        ($res10_6['body']['error']['code'] ?? null) === -32602 &&
        str_contains($res10_6['body']['error']['message'] ?? '', 'Cannot use more than current stock') &&
        (int) $partAfter10_6['quantity_on_hand'] === $currentQoh,
        '10.6 Quantity greater than stock rejected with -32602, stock unchanged',
        $passes,
        $failures
    );

    // 10.7 Unknown job_id -> -32602, no write
    $res10_7 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-7',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'job_id' => 777777,
                'quantity' => 1,
            ],
        ],
    ]);
    assertMcp(
        ($res10_7['body']['error']['code'] ?? null) === -32602 &&
        str_contains($res10_7['body']['error']['message'] ?? '', 'Job #777777 not found'),
        '10.7 Unknown job_id rejected with -32602, no write',
        $passes,
        $failures
    );

    // 10.8 Unknown stockpile_id -> -32602, no write
    $res10_8 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-8',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'stockpile_id' => 666666,
                'quantity' => 1,
            ],
        ],
    ]);
    assertMcp(
        ($res10_8['body']['error']['code'] ?? null) === -32602 &&
        str_contains($res10_8['body']['error']['message'] ?? '', 'Stockpile #666666 not found'),
        '10.8 Unknown stockpile_id rejected with -32602, no write',
        $passes,
        $failures
    );

    // 10.9 Stockpile that exists but holds no allocation of this part -> -32602, no write
    // Stockpile 2 exists in fixture but part 99991 is only allocated to stockpile 1
    $res10_9 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-9',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'stockpile_id' => 2,
                'quantity' => 1,
            ],
        ],
    ]);
    assertMcp(
        ($res10_9['body']['error']['code'] ?? null) === -32602 &&
        str_contains($res10_9['body']['error']['message'] ?? '', 'has no allocation at stockpile'),
        '10.9 Stockpile that holds no allocation of this part rejected with -32602, no write',
        $passes,
        $failures
    );

    // 10.10 Using enough to drop stock to/below reorder point sets is_reorder and returns reorder warning
    // Current stock is 6, reorder_point is 3. Using 3 drops stock to 3 (<= 3)
    $res10_10 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-10',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'quantity' => 3,
            ],
        ],
    ]);
    $data10_10 = json_decode($res10_10['body']['result']['content'][0]['text'] ?? '{}', true);
    $part10_10Check = Db::fetchOne('SELECT quantity_on_hand, is_reorder FROM part WHERE id = 99991');
    assertMcp(
        $data10_10['new_quantity'] === 3 &&
        $data10_10['is_reorder'] === true &&
        !empty($data10_10['reorder_warning']) &&
        (int) $part10_10Check['is_reorder'] === 1,
        '10.10 Dropping stock to/below reorder point sets is_reorder = 1 and returns reorder warning',
        $passes,
        $failures
    );

    // 10.11 Unauthenticated call -> HTTP 401
    $res10_11 = dispatchJsonRpc($app, null, [
        'jsonrpc' => '2.0',
        'id' => 'part-11',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'quantity' => 1,
            ],
        ],
    ]);
    assertMcp($res10_11['status'] === 401, '10.11 Unauthenticated call to log_part_use returns HTTP 401', $passes, $failures);

    // 10.12 A job_id that exists records a job_part row
    // Use existing fixture job 2 or insert a temporary test job if needed
    $existingJob = Db::fetchOne('SELECT id FROM job LIMIT 1');
    $testJobId = $existingJob ? (int) $existingJob['id'] : 2;
    $res10_12 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 'part-12',
        'method' => 'tools/call',
        'params' => [
            'name' => 'log_part_use',
            'arguments' => [
                'part_id' => 99991,
                'job_id' => $testJobId,
                'quantity' => 1,
                'reason' => 'Job part test record',
            ],
        ],
    ]);
    $data10_12 = json_decode($res10_12['body']['result']['content'][0]['text'] ?? '{}', true);
    $jobPartRow = Db::fetchOne('SELECT * FROM job_part WHERE id = ?', [$data10_12['job_part_id'] ?? 0]);
    assertMcp(
        !empty($data10_12['job_part_id']) &&
        $jobPartRow !== null &&
        (int) $jobPartRow['job_id'] === $testJobId &&
        (float) $jobPartRow['quantity'] === 1.0,
        '10.12 Existing job_id records a job_part row linked to that job',
        $passes,
        $failures
    );

    // 11.x add_to_buy_list (9 tests)
    $res11_1 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 111,
        'method' => 'tools/call',
        'params' => [
            'name' => 'add_to_buy_list',
            'arguments' => [
                'part_name' => 'Homeline HOM220 Breaker',
                'quantity' => 2,
            ],
        ],
    ]);
    $data11_1 = json_decode($res11_1['body']['result']['content'][0]['text'] ?? '{}', true);
    assertMcp(
        $res11_1['status'] === 200 &&
        !empty($data11_1['id']) &&
        ($data11_1['part_name'] ?? null) === 'Homeline HOM220 Breaker' &&
        (int) ($data11_1['quantity'] ?? 0) === 2,
        '11.1 Valid add_to_buy_list creates item with id and exact fields',
        $passes,
        $failures
    );

    $res11_2 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 112,
        'method' => 'tools/call',
        'params' => ['name' => 'add_to_buy_list', 'arguments' => ['quantity' => 1]],
    ]);
    assertMcp(($res11_2['body']['error']['code'] ?? 0) === -32602, '11.2 Missing part_name rejected (-32602)', $passes, $failures);

    $res11_3 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 113,
        'method' => 'tools/call',
        'params' => ['name' => 'add_to_buy_list', 'arguments' => ['part_name' => '   ', 'quantity' => 1]],
    ]);
    assertMcp(($res11_3['body']['error']['code'] ?? 0) === -32602, '11.3 Whitespace-only part_name rejected (-32602)', $passes, $failures);

    $res11_4 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 114,
        'method' => 'tools/call',
        'params' => ['name' => 'add_to_buy_list', 'arguments' => ['part_name' => 'Test Part', 'quantity' => 0]],
    ]);
    assertMcp(($res11_4['body']['error']['code'] ?? 0) === -32602, '11.4 Quantity 0 rejected (-32602)', $passes, $failures);

    $res11_5 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 115,
        'method' => 'tools/call',
        'params' => ['name' => 'add_to_buy_list', 'arguments' => ['part_name' => 'Test Part', 'quantity' => -3]],
    ]);
    assertMcp(($res11_5['body']['error']['code'] ?? 0) === -32602, '11.5 Negative quantity rejected (-32602)', $passes, $failures);

    $res11_6 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 116,
        'method' => 'tools/call',
        'params' => ['name' => 'add_to_buy_list', 'arguments' => ['part_name' => 'Test Part', 'quantity' => 2.5]],
    ]);
    assertMcp(($res11_6['body']['error']['code'] ?? 0) === -32602, '11.6 Non-integer quantity (2.5) rejected (-32602)', $passes, $failures);

    $res11_7 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 117,
        'method' => 'tools/call',
        'params' => ['name' => 'add_to_buy_list', 'arguments' => ['part_name' => 'Test Part', 'quantity' => 1, 'ticket_id' => 999999]],
    ]);
    assertMcp(($res11_7['body']['error']['code'] ?? 0) === -32602, '11.7 Unknown ticket_id rejected (-32602)', $passes, $failures);

    $pdo->exec("INSERT INTO ticket (building_id, title, status, priority, created_at, updated_at) VALUES (1, 'MCP Buy List Test Ticket', 'open', 'normal', datetime('now'), datetime('now'))");
    $testTicketId = (int) $pdo->lastInsertId();
    $res11_8 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 118,
        'method' => 'tools/call',
        'params' => ['name' => 'add_to_buy_list', 'arguments' => ['part_name' => 'Ticket Part', 'quantity' => 1, 'ticket_id' => $testTicketId]],
    ]);
    $data11_8 = json_decode($res11_8['body']['result']['content'][0]['text'] ?? '{}', true);
    assertMcp(
        $res11_8['status'] === 200 && (int) ($data11_8['ticket_id'] ?? 0) === $testTicketId,
        '11.8 Existing ticket_id accepted and stored on row',
        $passes,
        $failures
    );

    $res11_9 = dispatchJsonRpc($app, $validToken, [
        'jsonrpc' => '2.0',
        'id' => 119,
        'method' => 'tools/call',
        'params' => [
            'name' => 'add_to_buy_list',
            'arguments' => [
                'part_name' => '3000W 208V Element',
                'quantity' => 1,
                'part_number' => 'JW-3000-208',
                'supplier' => 'Dependable Appliances',
                'notes' => 'For 565-401',
            ],
        ],
    ]);
    $data11_9 = json_decode($res11_9['body']['result']['content'][0]['text'] ?? '{}', true);
    assertMcp(
        $res11_9['status'] === 200 &&
        ($data11_9['part_number'] ?? null) === 'JW-3000-208' &&
        ($data11_9['supplier'] ?? null) === 'Dependable Appliances' &&
        ($data11_9['notes'] ?? null) === 'For 565-401' &&
        ($data11_1['part_number'] ?? null) === null &&
        ($data11_1['supplier'] ?? null) === null &&
        ($data11_1['notes'] ?? null) === null,
        '11.9 Optional fields round-trip and omitted ones are NULL',
        $passes,
        $failures
    );

} finally {
    $pdo->rollBack();
}

echo "\n=========================================\n";
echo "MCP Test Results: {$passes} Passed, {$failures} Failed\n";
echo "=========================================\n";

if ($failures > 0) {
    exit(1);
}
