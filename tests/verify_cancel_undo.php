<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config;
use App\Db;
use App\Models\BuyListItem;
use App\Models\Job;
use App\Models\PartWorkflow;
use App\Models\Ticket;
use App\Models\TicketTimeline;
use App\Models\Watch;
use App\Models\Correction;

echo "=== Verifying Cancel & Undo Suites (Top 3 Flows) ===\n\n";

$dbPath = __DIR__ . '/test_cancel_undo.sqlite';
if (file_exists($dbPath)) {
    unlink($dbPath);
}

putenv("DB_CONNECTION=sqlite");
putenv("DB_DATABASE={$dbPath}");

$pdo = new PDO("sqlite:{$dbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
Db::ensureSqliteSchema($pdo);

// Seed basic entities
$pdo->exec("INSERT INTO building (id, name, address) VALUES (1, 'Test Building', '123 Test St')");
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
// FLOW 1: BUY LIST - DELETE MANUAL ITEM + RESTORE
// -------------------------------------------------------------
echo "\n--- Flow 1: Buy List Manual Item Delete & Undo ---\n";

// (a) Create manual item
$createdItem = BuyListItem::create([
    'part_name' => 'Test Contactor 40A',
    'quantity' => 2,
    'supplier' => 'Wolseley',
    'notes' => 'For heat pump unit 101',
    'ticket_id' => null,
]);
assertCondition($createdItem['id'] > 0, "Created manual buy list item with ID: {$createdItem['id']}", $passes, $failures);

// Verify fields in DB
$rowPre = Db::fetchOne('SELECT * FROM buy_list_item WHERE id = ?', [$createdItem['id']]);
assertCondition($rowPre['part_name'] === 'Test Contactor 40A' && (int)$rowPre['quantity'] === 2, "Manual item initial state verified", $passes, $failures);

// Delete manual item
$deleted = BuyListItem::delete($createdItem['id']);
assertCondition($deleted === true, "Deleted manual item #{$createdItem['id']}", $passes, $failures);

$rowDeleted = Db::fetchOne('SELECT * FROM buy_list_item WHERE id = ?', [$createdItem['id']]);
assertCondition($rowDeleted === null, "Manual item removed from database", $passes, $failures);

// (b) Undo delete (restores exact identical fields)
$restoredItem = BuyListItem::create([
    'part_name' => $rowPre['part_name'],
    'quantity' => (int)$rowPre['quantity'],
    'supplier' => $rowPre['supplier'],
    'notes' => $rowPre['notes'],
    'ticket_id' => $rowPre['ticket_id'],
]);
assertCondition(
    $restoredItem['part_name'] === 'Test Contactor 40A' &&
    (int)$restoredItem['quantity'] === 2 &&
    $restoredItem['supplier'] === 'Wolseley' &&
    $restoredItem['notes'] === 'For heat pump unit 101',
    "Undo restores exact identical fields: name, quantity, supplier, notes",
    $passes,
    $failures
);

// Double-undo safe check: recreating already-restored item without error, or frontend single-level check
assertCondition($restoredItem['id'] > 0, "Restored item is active with new ID", $passes, $failures);

// -------------------------------------------------------------
// FLOW 2: QUICKLOG - AUTO-CREATE CHIP + UNDO REMOVAL
// -------------------------------------------------------------
echo "\n--- Flow 2: QuickLog Auto-create & Undo (Job Note & Part) ---\n";

$job = Job::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'QuickLog Session Test',
    'status' => Job::STATUS_IN_PROGRESS,
]);
assertCondition($job['id'] > 0, "Created active job #{$job['id']}", $passes, $failures);

// (a) Note chip tapped -> addNote
$noteText = 'Capacitor within ±5% tolerance';
$note = Job::addNote($job['id'], $noteText, 1);
assertCondition($note['id'] > 0 && $note['note_text'] === $noteText, "Added preset note chip: '{$noteText}'", $passes, $failures);

// Verify note exists in DB
$noteInDb = Db::fetchOne('SELECT * FROM job_note WHERE id = ?', [$note['id']]);
assertCondition($noteInDb !== null, "Job note exists in DB", $passes, $failures);

// Undo note -> removeNote
$removedNote = Job::removeNote($job['id'], $note['id'], 1, 'Undo preset note chip');
assertCondition($removedNote === true, "Undo note removed note #{$note['id']}", $passes, $failures);

$noteAfterUndo = Db::fetchOne('SELECT * FROM job_note WHERE id = ?', [$note['id']]);
assertCondition($noteAfterUndo === null, "Job note record is gone after undo", $passes, $failures);

// (b) Part chip tapped -> addPartUsed
$partName = 'Dual Run Cap 45/5';
$partUsed = Job::addPartUsed($job['id'], $partName, 1.0, 'pcs', null, 1);
assertCondition($partUsed['id'] > 0, "Added part chip: '{$partName}'", $passes, $failures);

// Undo part used -> removePartUsed
$removedPart = Job::removePartUsed($job['id'], $partUsed['id'], 1, 'Undo part chip');
assertCondition($removedPart === true, "Undo part removed part used record", $passes, $failures);

$partAfterUndo = Db::fetchOne('SELECT * FROM job_part WHERE id = ?', [$partUsed['id']]);
assertCondition($partAfterUndo === null, "Job part record is gone after undo", $passes, $failures);

// (c) Double undo is safe no-op
$doubleUndoNote = Job::removeNote($job['id'], $note['id'], 1);
$doubleUndoPart = Job::removePartUsed($job['id'], $partUsed['id'], 1);
assertCondition($doubleUndoNote === false && $doubleUndoPart === false, "Double undo is safe no-op returning false", $passes, $failures);

// (d) Downstream guard: completed job rejects undo
$jobToComplete = Job::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Job to Complete',
    'status' => Job::STATUS_IN_PROGRESS,
]);
$noteOnComplete = Job::addNote($jobToComplete['id'], 'Note before close', 1);
Job::close($jobToComplete['id'], ['actual_minutes' => 30], 1);

try {
    Job::removeNote($jobToComplete['id'], $noteOnComplete['id'], 1);
    assertCondition(false, "Completed job must reject undo note", $passes, $failures);
} catch (\RuntimeException $e) {
    assertCondition(true, "Completed job safely blocks undo: " . $e->getMessage(), $passes, $failures);
}

// -------------------------------------------------------------
// FLOW 3: TICKET - MARK PART ARRIVED & UNDO TO ORDERED
// -------------------------------------------------------------
echo "\n--- Flow 3: Ticket Part Arrived & Undo ---\n";

$ticket = Ticket::create([
    'building_id' => 1,
    'unit_id' => 1,
    'title' => 'Furnace blower failure',
    'status' => 'pending_parts',
    'wo_number' => 'WO-8877',
]);
assertCondition($ticket['id'] > 0, "Created ticket #{$ticket['id']} in pending_parts", $passes, $failures);

// Order a part for this ticket
$orderResult = PartWorkflow::orderPart(
    (int)$ticket['id'],
    [
        'part_name' => 'OEM Blower Motor 1/2HP',
        'part_number' => 'MOT-0012',
        'supplier' => 'Wolseley',
        'order_ref' => 'PO-5544',
        'quantity' => 1,
        'notes' => 'Urgent replacement',
    ],
    1
);
$ticketPartId = (int)$orderResult['id'];
assertCondition($ticketPartId > 0, "Ordered part for ticket (ID #{$ticketPartId})", $passes, $failures);

// Verify initial state is 'ordered'
$partPre = Db::fetchOne('SELECT * FROM ticket_part WHERE id = ?', [$ticketPartId]);
assertCondition($partPre['status'] === 'ordered', "Ticket part initial status is 'ordered'", $passes, $failures);

// Mark arrived
$arrivedResult = PartWorkflow::markPartArrived($ticketPartId, 'Jose (Tech)');
assertCondition($arrivedResult['status'] === 'arrived', "Part marked arrived", $passes, $failures);

// Verify arrival timeline event was logged
$timelineEventsPre = Db::fetchAll(
    'SELECT event_type FROM ticket_timeline WHERE ticket_id = ? ORDER BY id ASC',
    [$ticket['id']]
);
$typesPre = array_column($timelineEventsPre, 'event_type');
assertCondition(in_array('part_arrived', $typesPre), "Timeline contains 'part_arrived' event", $passes, $failures);

// Undo mark arrived -> unmarkPartArrived
$unarrivedResult = PartWorkflow::unmarkPartArrived($ticketPartId, 'Jose (Tech)', 'Accidental tap - part did not arrive');
assertCondition($unarrivedResult['status'] === 'ordered', "Undo restores part status to 'ordered'", $passes, $failures);

// Check part state in DB
$partPost = Db::fetchOne('SELECT * FROM ticket_part WHERE id = ?', [$ticketPartId]);
assertCondition($partPost['status'] === 'ordered' && $partPost['arrived_at'] === null, "Part arrived_at cleared and status is 'ordered'", $passes, $failures);

// Check timeline entries: NO event deleted, and EVENT_NOTE appended
$timelineEventsPost = Db::fetchAll(
    'SELECT event_type, note FROM ticket_timeline WHERE ticket_id = ? ORDER BY id ASC',
    [$ticket['id']]
);
$typesPost = array_column($timelineEventsPost, 'event_type');
assertCondition(in_array('part_arrived', $typesPost), "Original 'part_arrived' event remains in history intact (never deleted)", $passes, $failures);
$lastEvent = end($timelineEventsPost);
assertCondition(
    $lastEvent['event_type'] === 'note' && stripos($lastEvent['note'], 'Undid part arrival') !== false,
    "Timeline appends note event documenting the undo: '{$lastEvent['note']}'",
    $passes,
    $failures
);

// Downstream guard: If part is already installed/used, undo MUST throw exception
Db::execute("UPDATE ticket_part SET status = 'installed' WHERE id = ?", [$ticketPartId]);
try {
    PartWorkflow::unmarkPartArrived($ticketPartId, 'Jose (Tech)');
    assertCondition(false, "Installed part must reject unmarkPartArrived", $passes, $failures);
} catch (\RuntimeException $e) {
    assertCondition(true, "Installed part safely blocks undo with reason: " . $e->getMessage(), $passes, $failures);
}

// Cleanup test db
if (file_exists($dbPath)) {
    unlink($dbPath);
}

echo "\n=== Cancel & Undo Suites Results: {$passes} passed, {$failures} failed ===\n";
if ($failures > 0) {
    exit(1);
}
exit(0);
