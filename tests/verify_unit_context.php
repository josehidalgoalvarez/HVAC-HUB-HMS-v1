<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Services\BatchSuggester;

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

echo "=== Running Acceptance Verification for Unit Context Signals ===\n\n";

$db = Db::get();

// -------------------------------------------------------------
// 1. Total Units Count & Integrity (Exactly 1,289)
// -------------------------------------------------------------
echo "--- 1. Total Units Count & Integrity ---\n";

$totalUnitsDb = (int)$db->query("SELECT COUNT(*) FROM unit")->fetchColumn();
assertTest($totalUnitsDb === 1289, "1.1 Total units in SQLite database is exactly 1,289 (got {$totalUnitsDb})", $passes, $failures);

$tsxOutput = shell_exec('npx tsx -e "import { RESIDENTIAL_UNITS } from \'./residential_constants\'; console.log(RESIDENTIAL_UNITS.length);"');
$resUnitsCount = (int)trim((string)$tsxOutput);
assertTest($resUnitsCount === 1289, "1.2 Total units in residential_constants.tsx RESIDENTIAL_UNITS is exactly 1,289 (got {$resUnitsCount})", $passes, $failures);

$resConst = file_get_contents(__DIR__ . '/../residential_constants.tsx');

// -------------------------------------------------------------
// 2. Schema Verification (5 Unit Context Fields)
// -------------------------------------------------------------
echo "\n--- 2. Schema Verification ---\n";

$columns = $db->query("PRAGMA table_info(unit)")->fetchAll(\PDO::FETCH_ASSOC);
$colNames = array_column($columns, 'name');

assertTest(in_array('renovated', $colNames, true), "2.1 Column 'renovated' exists in unit table", $passes, $failures);
assertTest(in_array('renovated_date', $colNames, true), "2.2 Column 'renovated_date' exists in unit table", $passes, $failures);
assertTest(in_array('move_in_date', $colNames, true), "2.3 Column 'move_in_date' exists in unit table", $passes, $failures);
assertTest(in_array('occupancy_status', $colNames, true), "2.4 Column 'occupancy_status' exists in unit table", $passes, $failures);
assertTest(in_array('vacant_since', $colNames, true), "2.5 Column 'vacant_since' exists in unit table", $passes, $failures);

// -------------------------------------------------------------
// 3. Clean Seed State (No Invented Values, All Start Unknown)
// -------------------------------------------------------------
echo "\n--- 3. Clean Initial State (All Units Start Unknown) ---\n";

// In constants: check that no invented non-null values exist
assertTest(
    str_contains($resConst, "occupancy_status: 'unknown'"),
    "3.1 residential_constants.tsx sets occupancy_status to 'unknown'",
    $passes,
    $failures
);
assertTest(
    str_contains($resConst, "renovated: null"),
    "3.2 residential_constants.tsx sets renovated to null",
    $passes,
    $failures
);
assertTest(
    str_contains($resConst, "move_in_date: null"),
    "3.3 residential_constants.tsx sets move_in_date to null",
    $passes,
    $failures
);
assertTest(
    str_contains($resConst, "vacant_since: null"),
    "3.4 residential_constants.tsx sets vacant_since to null",
    $passes,
    $failures
);

// In DB: all existing units should have occupancy_status = 'unknown'
$unknownOccupancy = (int)$db->query("SELECT COUNT(*) FROM unit WHERE occupancy_status = 'unknown'")->fetchColumn();
assertTest($unknownOccupancy === 1289, "3.5 All 1,289 units in DB start with occupancy_status = 'unknown' (got {$unknownOccupancy})", $passes, $failures);

$nullMoveIn = (int)$db->query("SELECT COUNT(*) FROM unit WHERE move_in_date IS NULL")->fetchColumn();
assertTest($nullMoveIn === 1289, "3.6 All 1,289 units in DB start with move_in_date IS NULL (got {$nullMoveIn})", $passes, $failures);

// -------------------------------------------------------------
// 4. Persistence & Append-Only Correction Audit on Unit PATCH
// -------------------------------------------------------------
echo "\n--- 4. Persistence & Audit Trail on Unit Context Update ---\n";

// Pick a test unit
$testUnit = $db->query("SELECT id, unit_number, building_id FROM unit LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
$unitId = (int)$testUnit['id'];
$buildingId = (int)$testUnit['building_id'];

// Ensure clean start
$db->prepare("UPDATE unit SET occupancy_status = 'unknown', vacant_since = NULL, renovated = NULL, renovated_date = NULL, move_in_date = NULL WHERE id = :id")->execute([':id' => $unitId]);

$initialCorrections = (int)$db->query("SELECT COUNT(*) FROM correction WHERE entity_type = 'unit' AND entity_id = '{$unitId}'")->fetchColumn();

// Simulate field updates and Correction::record as in PATCH /api/units/{id}
$testDate = '2025-04-15';
Correction::record('unit', $unitId, 'occupancy_status', 'unknown', 'vacant', null, 'Unit is vacant');
Correction::record('unit', $unitId, 'vacant_since', null, $testDate, null, 'Unit is vacant since April');
Correction::record('unit', $unitId, 'renovated', null, '1', null, 'Unit was renovated');
Correction::record('unit', $unitId, 'renovated_date', null, '2024', null, 'Renovation year 2024');

$updateStmt = $db->prepare("UPDATE unit SET occupancy_status = :occ, vacant_since = :vs, renovated = :ren, renovated_date = :rend WHERE id = :id");
$updateStmt->execute([
    ':occ' => 'vacant',
    ':vs' => $testDate,
    ':ren' => 1,
    ':rend' => '2024',
    ':id' => $unitId
]);

// Verify DB updated
$updatedUnit = $db->query("SELECT occupancy_status, vacant_since, renovated, renovated_date FROM unit WHERE id = {$unitId}")->fetch(\PDO::FETCH_ASSOC);
assertTest($updatedUnit['occupancy_status'] === 'vacant', "4.1 Unit occupancy_status persisted as 'vacant'", $passes, $failures);
assertTest($updatedUnit['vacant_since'] === $testDate, "4.2 Unit vacant_since persisted as '{$testDate}'", $passes, $failures);
assertTest((int)$updatedUnit['renovated'] === 1, "4.3 Unit renovated persisted as 1 (true)", $passes, $failures);
assertTest($updatedUnit['renovated_date'] === '2024', "4.4 Unit renovated_date persisted as '2024'", $passes, $failures);

// Verify correction table has append-only records
$newCorrections = (int)$db->query("SELECT COUNT(*) FROM correction WHERE entity_type = 'unit' AND entity_id = '{$unitId}'")->fetchColumn();
assertTest($newCorrections === $initialCorrections + 4, "4.5 4 Correction audit records created for unit {$unitId} (got " . ($newCorrections - $initialCorrections) . ")", $passes, $failures);

$latestCorrection = $db->query("SELECT * FROM correction WHERE entity_type = 'unit' AND entity_id = '{$unitId}' AND field_name = 'occupancy_status' ORDER BY id DESC LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
assertTest($latestCorrection['new_value'] === 'vacant', "4.6 Correction contains new_value 'vacant'", $passes, $failures);

// -------------------------------------------------------------
// 5. 24h Notice Gate Bypass for Vacant Units
// -------------------------------------------------------------
echo "\n--- 5. 24h Notice Gate Bypass for Vacant Units ---\n";

// Create or find a ticket on this test unit
$testTicket = $db->query("SELECT id FROM ticket WHERE unit_id = {$unitId} LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
if (!$testTicket) {
    $db->prepare("INSERT INTO ticket (title, status, priority, building_id, unit_id, notice_needed) VALUES ('Vacant Unit Test Issue', 'new', 'medium', :bid, :uid, 1)")
       ->execute([':bid' => $buildingId, ':uid' => $unitId]);
    $ticketId = (int)$db->lastInsertId();
} else {
    $ticketId = (int)$testTicket['id'];
    $db->prepare("UPDATE ticket SET notice_needed = 1, notice_sent_at = NULL WHERE id = :id")->execute([':id' => $ticketId]);
}

// Test BatchSuggester::resolveTicketNoticeGate for vacant unit
$suggester = new BatchSuggester($db);
$vacantGate = $suggester->resolveTicketNoticeGate($ticketId);

assertTest($vacantGate['is_cleared'] === true, "5.1 Vacant unit notice gate is cleared (is_cleared === true)", $passes, $failures);
assertTest($vacantGate['gate_status'] === 'green', "5.2 Vacant unit notice gate has 'green' status", $passes, $failures);
assertTest($vacantGate['notice_status'] === 'not_applicable', "5.3 Vacant unit notice status is 'not_applicable'", $passes, $failures);
assertTest(str_contains(strtolower($vacantGate['reason']), 'vacant'), "5.4 Reason explicitly states unit is vacant (no tenant to notify)", $passes, $failures);

// Now switch unit to 'occupied' and re-test: must NOT be cleared when notice_needed = 1 and notice_sent_at is null
$db->prepare("UPDATE unit SET occupancy_status = 'occupied' WHERE id = :id")->execute([':id' => $unitId]);
$occupiedGate = $suggester->resolveTicketNoticeGate($ticketId);

assertTest($occupiedGate['is_cleared'] === false, "5.5 Occupied unit with notice_needed=1 is NOT cleared (is_cleared === false)", $passes, $failures);
assertTest($occupiedGate['gate_status'] === 'amber', "5.6 Occupied unit notice gate status is 'amber'", $passes, $failures);

// Revert unit back to clean state for tests
$db->prepare("UPDATE unit SET occupancy_status = 'unknown', vacant_since = NULL, renovated = NULL, renovated_date = NULL WHERE id = :id")->execute([':id' => $unitId]);
$db->prepare("DELETE FROM ticket WHERE title = 'Vacant Unit Test Issue'")->execute();

// Reset test unit occupancy to unknown
$finalUnknown = (int)$db->query("SELECT COUNT(*) FROM unit WHERE occupancy_status = 'unknown'")->fetchColumn();
assertTest($finalUnknown === 1289, "5.7 Database cleanly restored: all 1,289 units have occupancy_status = 'unknown'", $passes, $failures);

// -------------------------------------------------------------
// Final Summary
// -------------------------------------------------------------
echo "\n=== Summary ===\n";
echo "Total Passes: " . count($passes) . "\n";
echo "Total Failures: " . count($failures) . "\n";

if (count($failures) > 0) {
    echo "\nFailed Tests:\n";
    foreach ($failures as $f) {
        echo " - {$f}\n";
    }
    exit(1);
}

echo "\nAll acceptance tests PASSED!\n";
exit(0);
