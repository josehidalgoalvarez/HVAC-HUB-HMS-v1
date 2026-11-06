<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Ticket;
use App\Models\TicketTimeline;
use App\Models\PartWorkflow;

echo "=== Verifying Blocked Work Orders Phase 2 (Aging & Prune to History) ===\n\n";

$dbPath = __DIR__ . '/test_blocked_phase2.sqlite';
if (file_exists($dbPath)) {
    unlink($dbPath);
}

putenv("DB_CONNECTION=sqlite");
putenv("DB_DATABASE={$dbPath}");

$pdo = new PDO("sqlite:{$dbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
Db::ensureSqliteSchema($pdo);

// Seed building and unit
$pdo->exec("INSERT INTO building (id, name, address) VALUES (1, 'Test Building', '123 Bath Rd')");
$pdo->exec("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '101')");

$passes = 0;
$failures = 0;

function assertCondition(bool $cond, string $msg, int &$passes, int &$failures): void {
    if ($cond) {
        echo "[PASS] {$msg}\n";
        $passes++;
    } else {
        echo "[FAIL] {$msg}\n";
        $failures++;
    }
}

// -------------------------------------------------------------
// Test 1: (a) blocked_at stamped on transition to blocked and cleared on unblock (clock reset)
// -------------------------------------------------------------
echo "\n--- Test 1: Clock stamping & reset ---\n";
$t1 = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Test Clock Stamping',
    'status' => 'new',
]);
assertCondition($t1['id'] > 0, "Created ticket #{$t1['id']}", $passes, $failures);
assertCondition(empty($t1['blocked_at']), "Initial ticket has null blocked_at", $passes, $failures);

// Block the ticket
$t1Blocked = Ticket::update($t1['id'], [
    'status' => 'blocked',
    'blocked_reason' => 'Tenant refused entry due to illness',
]);
assertCondition(!empty($t1Blocked['blocked_at']), "blocked_at is stamped when status moves to blocked: {$t1Blocked['blocked_at']}", $passes, $failures);

// Unblock the ticket
$t1Unblocked = Ticket::update($t1['id'], [
    'status' => 'in-progress',
]);
assertCondition(empty($t1Unblocked['blocked_at']), "blocked_at is cleared (NULL) when status leaves blocked (clock reset)", $passes, $failures);

// Block again (new 30 days clock)
$t1Reblocked = Ticket::update($t1['id'], [
    'status' => 'blocked',
    'blocked_reason' => 'Waiting for tenant payment confirmation',
]);
assertCondition(!empty($t1Reblocked['blocked_at']), "blocked_at is re-stamped with a fresh clock on second block", $passes, $failures);

// -------------------------------------------------------------
// Test 2: (b) Ticket blocked 29 days is NOT pruned by evaluation
// -------------------------------------------------------------
echo "\n--- Test 2: 29 days blocked is NOT pruned ---\n";
$t29 = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => '29 Days Blocked Ticket',
    'status' => 'blocked',
    'blocked_reason' => 'Special management hold',
]);
// Backdate blocked_at to 29 days ago
$date29DaysAgo = gmdate('Y-m-d H:i:s', time() - (29 * 86400));
Db::execute("UPDATE ticket SET blocked_at = ? WHERE id = ?", [$date29DaysAgo, $t29['id']]);

$evalResult = Ticket::evaluateAgingBlockedTickets();
$t29After = Ticket::findById($t29['id']);
assertCondition($t29After['status'] === 'blocked', "29 days blocked ticket remains in status 'blocked' (not pruned)", $passes, $failures);
assertCondition(!in_array((int)$t29['id'], $evalResult['pruned_ticket_ids']), "29 days blocked ticket not in pruned_ticket_ids", $passes, $failures);

// -------------------------------------------------------------
// Test 3: (c) Ticket blocked 30 days IS pruned + archived with full history fields
// -------------------------------------------------------------
echo "\n--- Test 3: 30 days blocked IS pruned + archived ---\n";
$t30 = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => '30 Days Blocked Ticket',
    'wo_number' => 'WO-77001',
    'status' => 'blocked',
    'blocked_reason' => 'Enbridge red tag shutoff pending management resolution',
    'verified_scope' => 'Checked piping pressure split; confirmed gas valve closed.',
]);
// Add timeline notes to simulate "what was tried"
TicketTimeline::append((int)$t30['id'], 'visit_logged', 'Jose (Tech)', 'Attempted diagnostic visit; gas shutoff red tag found.');

// Add a recorded part directly into ticket_part
Db::execute(
    "INSERT INTO ticket_part (ticket_id, building_id, unit_id, part_name, part_number, supplier, quantity, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ordered', CURRENT_TIMESTAMP)",
    [(int)$t30['id'], 1, 1, '1/2in Gas Regulator', 'REG-500', 'Wolseley', 1]
);

// Backdate blocked_at to 31 days ago
$date31DaysAgo = gmdate('Y-m-d H:i:s', time() - (31 * 86400));
Db::execute("UPDATE ticket SET status = 'blocked', blocked_at = ? WHERE id = ?", [$date31DaysAgo, $t30['id']]);

$evalResult30 = Ticket::evaluateAgingBlockedTickets();
assertCondition(in_array((int)$t30['id'], $evalResult30['pruned_ticket_ids']), "30+ days blocked ticket pruned automatically by aging evaluation", $passes, $failures);

$t30After = Ticket::findById($t30['id']);
assertCondition($t30After['status'] === 'archived-blocked', "Ticket status moved to 'archived-blocked'", $passes, $failures);

// Verify permanent history timeline entry
$timeline = Db::fetchAll("SELECT * FROM ticket_timeline WHERE ticket_id = ? ORDER BY id DESC", [$t30['id']]);
$pruneEvents = array_filter($timeline, fn($e) => $e['event_type'] === 'pruned_to_history');
assertCondition(count($pruneEvents) === 1, "Exactly one pruned_to_history timeline event created", $passes, $failures);

$pruneEvt = reset($pruneEvents);
$meta = json_decode($pruneEvt['metadata'] ?? '{}', true);

assertCondition(!empty($meta['blocked_reason']), "Prune metadata contains blocked_reason: {$meta['blocked_reason']}", $passes, $failures);
assertCondition(!empty($meta['date_range']), "Prune metadata contains date_range: {$meta['date_range']}", $passes, $failures);
assertCondition($meta['wo_number'] === 'WO-77001', "Prune metadata contains wo_number: {$meta['wo_number']}", $passes, $failures);
assertCondition(!empty($meta['what_was_tried']), "Prune metadata contains what_was_tried list", $passes, $failures);
assertCondition(!empty($meta['parts_summary']), "Prune metadata contains parts_summary", $passes, $failures);
assertCondition(strpos($pruneEvt['note'], '/tickets/' . $t30['id']) !== false, "Prune note contains link back to ticket: {$pruneEvt['note']}", $passes, $failures);

// -------------------------------------------------------------
// Test 4: (d) Manual prune before day 30 does the same copy + archive
// -------------------------------------------------------------
echo "\n--- Test 4: Manual prune before day 30 ---\n";
$tManual = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Manual Early Prune Ticket',
    'wo_number' => 'WO-77002',
    'status' => 'blocked',
    'blocked_reason' => 'Tenant vacated without forwarding address',
]);
assertCondition($tManual['status'] === 'blocked', "Manual test ticket is blocked", $passes, $failures);

$manualPruned = Ticket::pruneToUnitHistory($tManual['id'], 'Jose (Tech)', 1, 'Manual prune by technician');
assertCondition($manualPruned['status'] === 'archived-blocked', "Manual prune successfully transitioned ticket to 'archived-blocked'", $passes, $failures);

$manualTimeline = Db::fetchAll("SELECT * FROM ticket_timeline WHERE ticket_id = ? AND event_type = 'pruned_to_history'", [$tManual['id']]);
assertCondition(count($manualTimeline) === 1, "Manual prune wrote pruned_to_history timeline event", $passes, $failures);

// -------------------------------------------------------------
// Test 5: (e) Idempotency — evaluating twice changes nothing the second time
// -------------------------------------------------------------
echo "\n--- Test 5: Idempotency ---\n";
$evalTwice1 = Ticket::evaluateAgingBlockedTickets();
$evalTwice2 = Ticket::evaluateAgingBlockedTickets();
assertCondition($evalTwice1['pruned_count'] === 0 && $evalTwice2['pruned_count'] === 0, "Repeated aging evaluations prune zero additional tickets", $passes, $failures);

$manualAgain = Ticket::pruneToUnitHistory($tManual['id'], 'Jose (Tech)');
assertCondition($manualAgain['status'] === 'archived-blocked', "Re-pruning already archived ticket is idempotent safe return", $passes, $failures);
$manualTimelineAfter = Db::fetchAll("SELECT * FROM ticket_timeline WHERE ticket_id = ? AND event_type = 'pruned_to_history'", [$tManual['id']]);
assertCondition(count($manualTimelineAfter) === 1, "No duplicate history entries written on second prune", $passes, $failures);

// -------------------------------------------------------------
// Test 6: (f) Archived ticket exclusion and retrieval
// -------------------------------------------------------------
echo "\n--- Test 6: Archived exclusion and searchability ---\n";
$activeList = Ticket::findAll();
$activeIds = array_column($activeList, 'id');
assertCondition(!in_array((int)$t30['id'], $activeIds), "Archived ticket #{$t30['id']} is excluded from active tickets list", $passes, $failures);
assertCondition(!in_array((int)$tManual['id'], $activeIds), "Archived ticket #{$tManual['id']} is excluded from active tickets list", $passes, $failures);

// Search retrieval
$searchResult = Ticket::findAll(['status' => 'archived-blocked']);
$searchIds = array_column($searchResult, 'id');
assertCondition(in_array((int)$t30['id'], $searchIds) && in_array((int)$tManual['id'], $searchIds), "Archived tickets are fully retrievable when querying status = archived-blocked", $passes, $failures);

// -------------------------------------------------------------
// Test 7: (g) ZERO rows deleted — row count identical pre and post
// -------------------------------------------------------------
echo "\n--- Test 7: Zero rows deleted ---\n";
$allTicketsCount = count(Db::fetchAll("SELECT id FROM ticket"));
assertCondition($allTicketsCount === 4, "Total ticket rows in database is preserved (all 4 created tickets exist)", $passes, $failures);

// -------------------------------------------------------------
// Test 8: (h) Non-blocked ticket is never pruned
// -------------------------------------------------------------
echo "\n--- Test 8: Non-blocked ticket guard ---\n";
$tNonBlocked = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Open In-Progress Ticket',
    'status' => 'in-progress',
]);
try {
    Ticket::pruneToUnitHistory($tNonBlocked['id']);
    assertCondition(false, "Non-blocked ticket must throw exception on prune", $passes, $failures);
} catch (\RuntimeException $e) {
    assertCondition(true, "Non-blocked ticket safely blocked from prune: " . $e->getMessage(), $passes, $failures);
}

// -------------------------------------------------------------
// Test 9: In-flight safety: part in 'arrived' state blocks prune
// -------------------------------------------------------------
echo "\n--- Test 9: In-flight part arrival blocks prune ---\n";
$tInFlight = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'In-Flight Part Ticket',
    'status' => 'blocked',
    'blocked_reason' => 'Waiting for installation appointment',
]);
$inFlightPart = PartWorkflow::orderPart((int)$tInFlight['id'], [
    'part_name' => 'Capacitor 45/5',
    'supplier' => 'Wolseley',
], 1);
PartWorkflow::markPartArrived((int)$inFlightPart['id']);

try {
    Ticket::pruneToUnitHistory($tInFlight['id']);
    assertCondition(false, "In-flight arrived part must reject prune", $passes, $failures);
} catch (\RuntimeException $e) {
    assertCondition(true, "In-flight arrived part safely blocks prune with explanation: " . $e->getMessage(), $passes, $failures);
}

// Clean up
if (file_exists($dbPath)) {
    unlink($dbPath);
}

echo "\n=== Blocked Phase 2 Results: {$passes} passed, {$failures} failed ===\n";
if ($failures > 0) {
    exit(1);
}
exit(0);
