<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config;
use App\Db;
use App\Models\Ticket;
use App\Models\TicketTimeline;
use App\Models\Correction;

echo "=== Verifying Phase 1 Blocked Work Orders Logic ===\n\n";

$dbPath = __DIR__ . '/test_blocked_logic.sqlite';
if (file_exists($dbPath)) {
    unlink($dbPath);
}

putenv("DB_CONNECTION=sqlite");
putenv("DB_DATABASE={$dbPath}");

$pdo = new PDO("sqlite:{$dbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
Db::ensureSqliteSchema($pdo);

// Seed a dummy building and unit
$pdo->exec("INSERT INTO building (id, name, address) VALUES (1, 'Test Building', '123 Main St')");
$pdo->exec("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '101')");

$passes = 0;
$failures = 0;

function assertCondition(bool $cond, string $msg, &$passes, &$failures): void {
    if ($cond) {
        echo "[PASS] {$msg}\n";
        $passes++;
    } else {
        echo "[FAIL] {$msg}\n";
        $failures++;
    }
}

// Test 1: Ticket creation with blocked status and empty reason MUST fail
try {
    Ticket::create([
        'building_id' => 1,
        'unit_id' => 1,
        'title' => 'Blocked WO without reason',
        'status' => 'blocked',
        'blocked_reason' => ''
    ]);
    assertCondition(false, "Creation with empty blocked_reason should throw exception", $passes, $failures);
} catch (\Throwable $e) {
    assertCondition(true, "Creation with empty blocked_reason successfully rejected: " . $e->getMessage(), $passes, $failures);
}

// Test 2: Ticket creation with valid blocked reason succeeds
$ticket = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Blocked WO with reason',
    'status' => 'blocked',
    'blocked_reason' => 'Management rent hold; Enbridge gas shutoff risk'
]);
assertCondition($ticket['status'] === 'blocked', "Ticket created with status 'blocked'", $passes, $failures);
assertCondition($ticket['blocker_reason'] === 'Management rent hold; Enbridge gas shutoff risk', "Ticket saved reason in blocker_reason", $passes, $failures);
assertCondition(($ticket['blocked_reason'] ?? $ticket['blocker_reason']) === 'Management rent hold; Enbridge gas shutoff risk', "Ticket returns blocked_reason", $passes, $failures);

// Test 3: Updating ticket to blocked without reason MUST fail
$ticket2 = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Open WO',
    'status' => 'new'
]);
try {
    Ticket::update($ticket2['id'], [
        'status' => 'blocked',
        'blocked_reason' => ''
    ]);
    assertCondition(false, "Update to blocked with empty reason should fail", $passes, $failures);
} catch (\Throwable $e) {
    assertCondition(true, "Update to blocked with empty reason successfully rejected: " . $e->getMessage(), $passes, $failures);
}

// Test 4: Updating ticket to blocked with valid reason succeeds
$updatedTicket = Ticket::update($ticket2['id'], [
    'status' => 'blocked',
    'blocked_reason' => 'Awaiting owner approval for capital expense'
]);
assertCondition($updatedTicket['status'] === 'blocked', "Ticket updated to blocked", $passes, $failures);
assertCondition(($updatedTicket['blocked_reason'] ?? $updatedTicket['blocker_reason']) === 'Awaiting owner approval for capital expense', "Blocked reason saved", $passes, $failures);

// Test 5: Unblocking ticket preserves reason in timeline
$unblocked = Ticket::update($ticket2['id'], [
    'status' => 'in-progress'
]);
assertCondition($unblocked['status'] === 'in-progress', "Ticket unblocked to in-progress", $passes, $failures);
$timeline = TicketTimeline::getForTicket((int)$ticket2['id']);
$timelinePreserved = false;
foreach ($timeline as $event) {
    if (str_contains($event['note'] ?? '', 'Awaiting owner approval for capital expense')) {
        $timelinePreserved = true;
        break;
    }
}
assertCondition($timelinePreserved, "Unblocking preserved blocker reason in timeline history", $passes, $failures);

// Test 6: Verify on-hold vs blocked are distinct statuses
$ticket3 = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'On Hold WO',
    'status' => 'on-hold'
]);
assertCondition($ticket3['status'] === 'on-hold', "On-hold status created without requiring blocked_reason", $passes, $failures);
assertCondition($ticket3['status'] !== $ticket['status'], "On-hold ('on-hold') is distinct from blocked ('blocked')", $passes, $failures);

echo "\nSummary: {$passes} passed, {$failures} failed\n";
if ($failures > 0) {
    exit(1);
}

unlink($dbPath);
echo "All blocked work order backend tests passed!\n";
