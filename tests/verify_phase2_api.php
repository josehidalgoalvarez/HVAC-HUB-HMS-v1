<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Notice;
use App\Models\RunSheet;
use App\Models\RunSheetBlock;
use App\Models\Ticket;
use App\Services\BatchSuggester;
use App\Services\VehiclePlanner;

$passes = [];
$failures = [];

function assertTest(bool $condition, string $description, array &$passes, array &$failures): void {
    if ($condition) {
        $passes[] = $description;
        echo "[PASS] {$description}\n";
    } else {
        $failures[] = $description;
        echo "[FAIL] {$description}\n";
    }
}

echo "=== Running Phase 2 Day-Plan & Run Sheet Backend Tests ===\n\n";

// Ensure clean test database
$testDbPath = __DIR__ . '/phase2_test.sqlite';
if (file_exists($testDbPath)) {
    unlink($testDbPath);
}

$pdo = new PDO("sqlite:{$testDbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('PRAGMA foreign_keys = ON;');
Db::setPdo($pdo);
Db::ensureSqliteSchema($pdo);

// 1. Seed users, buildings, and units
Db::execute("INSERT INTO users (id, name, email, password_hash, role, api_token) VALUES (1, 'Tech Joe', 'joe@hvachome.local', 'hash', 'tech', 'test-tech-token')");

Db::execute("INSERT INTO building (id, name, address) VALUES (1, 'Oakridge Heights', '100 Oak St')");
Db::execute("INSERT INTO building (id, name, address) VALUES (2, 'Sunset Commons', '250 Sunset Blvd')");
Db::execute("INSERT INTO building (id, name, address) VALUES (3, 'Pine Valley Condos', '770 Pine Ave')");

Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '101')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (2, 1, '102')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (3, 2, '201')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (4, 2, '202')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (5, 3, '301')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (6, 3, '302')");

// 2. Seed 6 open tickets intentionally interleaved across 3 buildings
// Ticket order created: Site 1 -> Site 3 -> Site 2 -> Site 1 -> Site 3 -> Site 2
$t1 = Ticket::create([
    'wo_number' => 'WO-101',
    'title' => 'No heat in master bedroom',
    'building_id' => 1,
    'unit_id' => 1,
    'priority' => 'urgent',
    'verified_scope' => 'Zone valve stuck closed',
], 1);

$t2 = Ticket::create([
    'wo_number' => 'WO-301',
    'title' => 'Routine AC tune-up and filter replace',
    'building_id' => 3,
    'unit_id' => 5,
    'priority' => 'low',
    'verified_scope' => 'Clean coils and check filter',
], 1);

$t3 = Ticket::create([
    'wo_number' => 'WO-201',
    'title' => 'Water heater leaking from bottom',
    'building_id' => 2,
    'unit_id' => 3,
    'priority' => 'urgent',
    'verified_scope' => 'Drain and repair T&P valve',
], 1);

$t4 = Ticket::create([
    'wo_number' => 'WO-102',
    'title' => 'Thermostat clicking sound',
    'building_id' => 1,
    'unit_id' => 2,
    'priority' => 'medium',
    'verified_scope' => 'Inspect 24V transformer and wiring',
], 1);

$t5 = Ticket::create([
    'wo_number' => 'WO-302',
    'title' => 'Clean secondary drain line and replace contactor',
    'building_id' => 3,
    'unit_id' => 6,
    'priority' => 'medium',
    'verified_scope' => 'Needs ladder to reach loft attic, drain auger to clear clog, plus contactor part',
], 1);

$t6 = Ticket::create([
    'wo_number' => 'WO-202',
    'title' => 'Replace noisy blower fan',
    'building_id' => 2,
    'unit_id' => 4,
    'priority' => 'medium',
    'verified_scope' => 'Motor bearings worn out',
], 1);

echo "--- 1. Acceptance Criterion 1: Proximity Batch Ordering (5+ tickets, 3 sites) ---\n";
$allIds = [(int)$t1['id'], (int)$t2['id'], (int)$t3['id'], (int)$t4['id'], (int)$t5['id'], (int)$t6['id']];
$batch = BatchSuggester::suggest($allIds, '08:30');

assertTest(count($batch['blocks']) === 6, "1.1 Batch suggestion generated 6 blocks from 6 open tickets", $passes, $failures);
assertTest($batch['total_sites'] === 3, "1.2 Batch identified all 3 distinct sites/buildings", $passes, $failures);

// Check that tickets from the same building are contiguous (clustered)
$blockBuildings = array_map(fn($b) => $b['building_id'], $batch['blocks']);
$seenBuildings = [];
$transitions = 0;
$prevBldg = null;
foreach ($blockBuildings as $bldg) {
    if ($bldg !== $prevBldg) {
        $transitions++;
        $seenBuildings[] = $bldg;
    }
    $prevBldg = $bldg;
}
assertTest($transitions === 3, "1.3 Blocks are clustered by site: exactly 3 contiguous building groups (no zigzagging back to earlier site)", $passes, $failures);
assertTest($blockBuildings !== [1, 3, 2, 1, 3, 2], "1.4 Blocks are ordered by site proximity, NOT ticket creation order [1,3,2,1,3,2]", $passes, $failures);

// Verify travel buffer between site transitions
$transitBuffers = array_map(fn($b) => $b['travel_buffer_before_minutes'], $batch['blocks']);
assertTest($transitBuffers[0] === 0, "1.5 First block has 0 transit buffer", $passes, $failures);
assertTest($batch['estimated_travel_minutes'] > 0, "1.6 Total travel minutes calculated: {$batch['estimated_travel_minutes']}m", $passes, $failures);

echo "\n--- 2. Acceptance Criterion 2: Notice Gate Status (Green / Amber / Red) ---\n";

// Notice for t1: VERIFIED (should show green)
$noticeVerified = Notice::create([
    'ticket_id' => $t1['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'title' => '24h Notice for Master Bedroom Heat',
    'entry_start' => '2026-10-24 10:00:00',
    'entry_end' => '2026-10-24 12:00:00',
], 1);
Notice::update($noticeVerified['id'], ['status' => 'verified'], 1);

// Notice for t3: DRAFTED with FUTURE entry window (should show amber - unverified)
// Use relative date (+2 days) so test fixture never expires against current date
$futureDate = date('Y-m-d', strtotime('+2 days'));
$noticePending = Notice::create([
    'ticket_id' => $t3['id'],
    'building_id' => 2,
    'unit_id' => 3,
    'title' => '24h Notice for Water Heater Leak',
    'entry_start' => "{$futureDate} 14:00:00",
    'entry_end' => "{$futureDate} 16:00:00",
], 1);

// Notice for t4: DRAFTED with PAST deadline (should show red - overdue)
$noticeOverdue = Notice::create([
    'ticket_id' => $t4['id'],
    'building_id' => 1,
    'unit_id' => 2,
    'title' => '24h Notice for Thermostat Clicking',
    'entry_start' => '2026-10-19 09:00:00',
    'entry_end' => '2026-10-19 11:00:00',
], 1);
// Force past deadline into DB
Db::execute("UPDATE notice SET serve_by_deadline = '2026-10-17 09:00:00' WHERE id = ?", [$noticeOverdue['id']]);

// Re-run batch to inspect notice gate statuses
$batchWithNotices = BatchSuggester::suggest($allIds, '08:30');
$blocksByTicket = [];
foreach ($batchWithNotices['blocks'] as $blk) {
    $blocksByTicket[$blk['ticket_id']] = $blk;
}

assertTest($blocksByTicket[$t1['id']]['notice_gate_status'] === 'green', "2.1 Ticket with verified notice displays GREEN gate status", $passes, $failures);
assertTest($blocksByTicket[$t1['id']]['notice_is_cleared'] === true, "2.2 Green block is cleared for entry", $passes, $failures);

assertTest($blocksByTicket[$t3['id']]['notice_gate_status'] === 'amber', "2.3 Ticket with unverified notice (before deadline) displays AMBER gate status", $passes, $failures);
assertTest($blocksByTicket[$t3['id']]['notice_is_cleared'] === false, "2.4 Amber block is not yet cleared", $passes, $failures);

assertTest($blocksByTicket[$t4['id']]['notice_gate_status'] === 'red', "2.5 Ticket with unverified notice past deadline displays RED overdue gate status", $passes, $failures);
assertTest($blocksByTicket[$t4['id']]['notice_is_cleared'] === false, "2.6 Red block is legally blocked", $passes, $failures);

echo "\n--- 3. Acceptance Criterion 3: E-Bike Carry Capacity Checker ---\n";

// Test 3.1: Standard light load
$lightCheck = VehiclePlanner::checkBlockCarry(['Multimeter', 'Hand Tools'], ['Air Filter']);
assertTest($lightCheck['exceeds_carry_capacity'] === false, "3.1 Light load (hand tools + multimeter) is within e-bike capacity", $passes, $failures);
assertTest($lightCheck['warning'] === null, "3.2 No warning for standard load", $passes, $failures);

// Test 3.2: The exact spec condition: auger + ladder + parts
$heavyCombo = VehiclePlanner::checkBlockCarry(['Ladder', 'Drain Auger'], ['Dual Run Capacitor']);
assertTest($heavyCombo['exceeds_carry_capacity'] === true, "3.3 Combination of auger + ladder + parts exceeds e-bike carry capacity", $passes, $failures);
assertTest($heavyCombo['warning'] === 'exceeds carry capacity — split or reschedule', "3.4 Warning matches exact string: 'exceeds carry capacity — split or reschedule'", $passes, $failures);

// Test 3.3: Inferred from Ticket 5 scope text ("ladder to reach loft attic, drain auger to clear clog, plus contactor part")
assertTest($blocksByTicket[$t5['id']]['exceeds_carry_capacity'] === true, "3.5 Ticket 5 block automatically flagged with exceeds_carry_capacity = true", $passes, $failures);
assertTest($blocksByTicket[$t5['id']]['carry_warning'] === 'exceeds carry capacity — split or reschedule', "3.6 Ticket 5 carry_warning matches 'exceeds carry capacity — split or reschedule'", $passes, $failures);

echo "\n--- 4. Acceptance Criterion 4: Run Sheet Creation & Closing Block Records Actual vs Estimate ---\n";

// Create run sheet for today
$sheet = RunSheet::create([
    'title' => '2026-10-19 Metro Tech Day Plan',
    'scheduled_date' => '2026-10-19',
    'technician_id' => 1,
    'notes' => 'Route through Oakridge, Pine Valley, and Sunset Commons',
    'blocks' => $batchWithNotices['blocks'],
], 1);

assertTest(!empty($sheet['id']), "4.1 Run sheet created with ID {$sheet['id']}", $passes, $failures);
assertTest(count($sheet['blocks']) === 6, "4.2 Run sheet contains all 6 created blocks", $passes, $failures);

$firstBlock = $sheet['blocks'][0];
$firstBlockId = $firstBlock['id'];
$estMins = (int)$firstBlock['estimated_minutes'];

// Close block and record actual minutes
$updatedBlock = RunSheetBlock::update($firstBlockId, [
    'status' => RunSheetBlock::STATUS_COMPLETED,
    'actual_minutes' => $estMins + 15,
], 1, 'Completed zone valve swap and purged air from loop');

assertTest($updatedBlock['status'] === 'completed', "4.3 Block status updated to 'completed'", $passes, $failures);
assertTest((int)$updatedBlock['actual_minutes'] === $estMins + 15, "4.4 Block records actual minutes ({$updatedBlock['actual_minutes']}m vs {$estMins}m est)", $passes, $failures);
assertTest((int)$updatedBlock['variance_minutes'] === 15, "4.5 Block calculates variance (+15m) for field logging", $passes, $failures);

// Verify append-only correction audit log
$corrections = Db::fetchAll(
    "SELECT * FROM correction WHERE entity_type = 'run_sheet_block' AND entity_id = ? ORDER BY id DESC",
    [$firstBlockId]
);
assertTest(count($corrections) >= 2, "4.6 Append-only correction rows created for block status & actual_minutes changes", $passes, $failures);
$correctedFields = array_column($corrections, 'field_name');
assertTest(in_array('status', $correctedFields, true), "4.7 Status change audit logged in correction table", $passes, $failures);
assertTest(in_array('actual_minutes', $correctedFields, true), "4.8 Actual minutes change audit logged in correction table", $passes, $failures);

// Verify run sheet rollup metrics update
$refetchedSheet = RunSheet::findById($sheet['id']);
assertTest((int)$refetchedSheet['rollup']['completed_blocks'] === 1, "4.9 Rollup reflects 1 completed block", $passes, $failures);
assertTest((int)$refetchedSheet['rollup']['total_actual_minutes'] === $estMins + 15, "4.10 Rollup reflects actual minutes logged", $passes, $failures);

// --- 5. Summary ---
echo "\n========================================\n";
echo "Phase 2 Backend Verification Summary:\n";
echo "Passes: " . count($passes) . "\n";
echo "Failures: " . count($failures) . "\n";
echo "========================================\n";

if (count($failures) > 0) {
    echo "FAILED TESTS:\n";
    foreach ($failures as $f) {
        echo "  - {$f}\n";
    }
    exit(1);
}

echo "All Phase 2 Backend Tests PASSED!\n";
exit(0);
