<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Ticket;

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

echo "=== Running Phase 1 Work-Order Domain Backend Tests ===\n\n";

// Ensure clean test database
$testDbPath = __DIR__ . '/phase1_test.sqlite';
if (file_exists($testDbPath)) {
    unlink($testDbPath);
}

$pdo = new PDO("sqlite:{$testDbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('PRAGMA foreign_keys = ON;');
Db::setPdo($pdo);
Db::ensureSqliteSchema($pdo);

// Seed building and tech user for test
Db::execute("INSERT INTO users (id, name, email, password_hash, role, api_token) VALUES (1, 'Tech Joe', 'joe@hvachome.local', 'hash', 'tech', 'test-tech-token')");
Db::execute("INSERT INTO building (id, name, address) VALUES (1, 'Oakridge Heights', '100 Oak St')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '402')");

// --- 1. Intake a ticket from a screenshot photo with verbatim_text & verified_scope (text) ---
echo "--- 1. Intake Verification ---\n";
$intakeData = [
    'wo_number' => 'WO-INTAKE-101',
    'building_id' => 1,
    'unit_id' => 1,
    'verbatim_text' => 'AC makes humming sound when blower kicks on, tenant says smells hot',
    'verified_scope' => 'Capacitor failing and blower motor bearings worn, replace blower assembly',
    'photo_url' => '/uploads/intake_screen_test.jpg',
    'priority' => 'high',
];

$intakedTicket = Ticket::create($intakeData, 1);

assertTest(!empty($intakedTicket['id']), "1.1 Intaked ticket created successfully with ID", $passes, $failures);
assertTest($intakedTicket['verbatim_text'] === $intakeData['verbatim_text'], "1.2 Verbatim text stored accurately as raw screenshot text", $passes, $failures);
assertTest($intakedTicket['verified_scope'] === $intakeData['verified_scope'], "1.3 Verified scope stored as human-confirmed job description text", $passes, $failures);
assertTest($intakedTicket['photo_url'] === '/uploads/intake_screen_test.jpg', "1.4 Screenshot photo URL linked", $passes, $failures);
assertTest($intakedTicket['status'] === 'new' || $intakedTicket['status'] === 'verified', "1.5 Initial intake state is valid", $passes, $failures);

// --- 2. Reproduce WO 19970 pattern: 1 parent -> 4 children, each with a different state ---
echo "\n--- 2. WO 19970 Parent-Child Pattern Verification ---\n";
$parentData = [
    'wo_number' => 'WO-19970',
    'building_id' => 1,
    'title' => 'Building 4 HVAC Major Overhaul',
    'description' => 'Four-zone compressor and heat pump replacement',
    'priority' => 'urgent',
    'status' => 'in-progress',
];
$parent = Ticket::create($parentData, 1);
$parentId = $parent['id'];

assertTest($parent['wo_number'] === 'WO-19970', "2.1 Parent ticket WO-19970 created", $passes, $failures);

// Create 4 children, each with an independent state
$child1 = Ticket::createChild($parentId, [
    'title' => 'Zone 1 Heat Pump Inspection',
    'status' => 'verified',
    'priority' => 'medium',
    'assigned_tech_id' => 1,
], 1);

$child2 = Ticket::createChild($parentId, [
    'title' => 'Zone 2 Blower Assembly Rebuild',
    'status' => 'in-progress',
    'priority' => 'high',
    'assigned_tech_id' => 1,
], 1);

$child3 = Ticket::createChild($parentId, [
    'title' => 'Zone 3 Condenser Coil Replacement',
    'status' => 'blocked',
    'blocker_reason' => 'Awaiting 3-ton evaporator coil delivery from Carrier',
    'priority' => 'high',
], 1);

$child4 = Ticket::createChild($parentId, [
    'title' => 'Zone 4 Thermostat Rewire',
    'status' => 'done',
    'priority' => 'low',
    'assigned_tech_id' => 1,
], 1);

assertTest($child1['status'] === 'verified', "2.2 Child 1 state is 'verified'", $passes, $failures);
assertTest($child2['status'] === 'in-progress', "2.3 Child 2 state is 'in-progress'", $passes, $failures);
assertTest($child3['status'] === 'blocked' && !empty($child3['blocker_reason']), "2.4 Child 3 state is 'blocked' with specific blocker reason", $passes, $failures);
assertTest($child4['status'] === 'done', "2.5 Child 4 state is 'done'", $passes, $failures);

// Verify parent rollup
$parentDetail = Ticket::findWithChildren($parentId);
assertTest(count($parentDetail['children']) === 4, "2.6 Parent ticket contains exactly 4 children", $passes, $failures);
assertTest($parentDetail['rollup']['total'] === 4, "2.7 Rollup total is 4", $passes, $failures);
assertTest($parentDetail['rollup']['done'] === 1, "2.8 Rollup done count is 1", $passes, $failures);
assertTest($parentDetail['rollup']['blocked'] === 1, "2.9 Rollup blocked count is 1", $passes, $failures);
assertTest($parentDetail['rollup']['in_progress'] === 1, "2.10 Rollup in_progress count is 1", $passes, $failures);

// --- 3. Edit any field -> correction log shows old -> new with who/when ---
echo "\n--- 3. Field Edit & Correction Audit Verification ---\n";
// Update priority, status, and title on child 1
$updatedChild1 = Ticket::update($child1['id'], [
    'priority' => 'urgent',
    'status' => 'in-progress',
    'title' => 'Zone 1 Heat Pump Emergency Diagnosis',
], 1, 'Tenant reported no heat overnight');

$corrections = Correction::getForEntity('ticket', $child1['id']);
assertTest(count($corrections) >= 3, "3.1 At least 3 correction entries recorded for the 3 edited fields", $passes, $failures);

$fieldsLogged = array_column($corrections, 'field_name');
assertTest(in_array('priority', $fieldsLogged, true), "3.2 'priority' modification recorded in correction log", $passes, $failures);
assertTest(in_array('status', $fieldsLogged, true), "3.3 'status' modification recorded in correction log", $passes, $failures);
assertTest(in_array('title', $fieldsLogged, true), "3.4 'title' modification recorded in correction log", $passes, $failures);

$priorityCorrection = array_filter($corrections, fn($c) => $c['field_name'] === 'priority')[0] ?? null;
assertTest($priorityCorrection !== null && $priorityCorrection['old_value'] === 'medium' && $priorityCorrection['new_value'] === 'urgent', "3.5 Old value ('medium') and new value ('urgent') accurately captured", $passes, $failures);
assertTest(!empty($priorityCorrection['created_at']), "3.6 Timestamp is recorded on correction", $passes, $failures);
assertTest((int)$priorityCorrection['changed_by_user_id'] === 1, "3.7 Changed by user ID is recorded", $passes, $failures);

// --- 4. A ticket with no WO number saves and links to one later ---
echo "\n--- 4. Unnumbered Ticket & Later Linking Verification ---\n";
$unassignedTicket = Ticket::create([
    'wo_number' => null,
    'building_id' => 1,
    'title' => 'Emergency Water Leak Under Air Handler',
    'status' => 'in-progress',
    'priority' => 'urgent',
], 1);

assertTest($unassignedTicket['wo_number'] === null, "4.1 Unnumbered ticket successfully created with wo_number NULL", $passes, $failures);

// Later link work order number
$linkedTicket = Ticket::update($unassignedTicket['id'], [
    'wo_number' => 'WO-99881',
], 1, 'Assigned WO number received from dispatch');

assertTest($linkedTicket['wo_number'] === 'WO-99881', "4.2 Ticket updated with linked WO number", $passes, $failures);

$unassignedCorrections = Correction::getForEntity('ticket', $unassignedTicket['id']);
$woCorrection = array_filter($unassignedCorrections, fn($c) => $c['field_name'] === 'wo_number')[0] ?? null;
assertTest($woCorrection !== null && $woCorrection['old_value'] === null && $woCorrection['new_value'] === 'WO-99881', "4.3 WO number link recorded in correction log from null -> WO-99881", $passes, $failures);

// --- 5. Yardi Sightings & 7-day Staleness Detection ---
echo "\n--- 5. Yardi Sightings & 7-day Staleness Verification ---\n";
// 5.1 Fresh ticket has last_seen_in_yardi = null -> neutral status (NOT stale!)
$freshTicket = Ticket::create([
    'wo_number' => 'WO-YARDI-FRESH',
    'building_id' => 1,
    'title' => 'Fresh Yardi Work Order',
    'status' => 'new',
], 1);
assertTest($freshTicket['last_seen_in_yardi'] === null, "5.1 Fresh ticket has null last_seen_in_yardi", $passes, $failures);
assertTest($freshTicket['is_stale_yardi'] === false, "5.2 Null last_seen_in_yardi is neutral (is_stale_yardi is FALSE)", $passes, $failures);
assertTest($freshTicket['yardi_warning'] === null, "5.3 Null last_seen_in_yardi has no warning pill", $passes, $failures);

// 5.2 Stamp sighting
$sightingResult = Ticket::recordSighting($freshTicket['id'], [
    'unit_raw' => '402',
    'description' => 'Routine filter check',
    'status' => 'Open in Yardi',
]);
assertTest($sightingResult['message'] === 'Yardi sighting recorded successfully', "5.4 Yardi sighting stamped successfully", $passes, $failures);

$sightedTicket = Ticket::findById($freshTicket['id']);
assertTest($sightedTicket['last_seen_in_yardi'] !== null, "5.5 Ticket last_seen_in_yardi updated after sighting", $passes, $failures);
assertTest($sightedTicket['is_stale_yardi'] === false, "5.6 Just-sighted ticket is NOT stale", $passes, $failures);

// 5.3 Stale ticket: last_seen_in_yardi is 8 days ago
$eightDaysAgo = date('Y-m-d H:i:s', time() - (8 * 86400));
$staleTicket = Ticket::create([
    'wo_number' => 'WO-YARDI-STALE',
    'building_id' => 1,
    'title' => 'Old Unseen Ticket',
    'status' => 'in-progress',
    'last_seen_in_yardi' => $eightDaysAgo,
], 1);

assertTest($staleTicket['is_stale_yardi'] === true, "5.7 Ticket unseen for 8 days flags is_stale_yardi = TRUE", $passes, $failures);
assertTest(!empty($staleTicket['yardi_warning']), "5.8 Warning message populated: '{$staleTicket['yardi_warning']}'", $passes, $failures);

// 5.4 Ensure ticket is never deleted and history intact
assertTest(Ticket::findById($staleTicket['id']) !== null, "5.9 Stale ticket is retained with full data (never auto-deleted)", $passes, $failures);

// --- 6. Prioritization Ordering Verification ---
echo "\n--- 6. Prioritized Ordering Verification ---\n";
// Create tickets in different priorities/states:
// - Safety first: urgent priority
// - Closable today: in-progress or verified (non-urgent)
// - Rest: new, blocked, done, closed
$tRest = Ticket::create(['title' => 'T-Rest', 'priority' => 'low', 'status' => 'new'], 1);
$tSafety = Ticket::create(['title' => 'T-Safety', 'priority' => 'urgent', 'status' => 'new'], 1);
$tClosable = Ticket::create(['title' => 'T-Closable', 'priority' => 'medium', 'status' => 'in-progress'], 1);

$allTickets = Ticket::findAll();
// The first ticket should be urgent (safety)
$firstTicket = $allTickets[0];
assertTest($firstTicket['priority'] === 'urgent', "6.1 Prioritized ordering returns Safety (urgent) first", $passes, $failures);

echo "\n=========================================\n";
echo "Total Passes: " . count($passes) . "\n";
echo "Total Failures: " . count($failures) . "\n";

if (count($failures) > 0) {
    exit(1);
}
echo "ALL PHASE 1 BACKEND ACCEPTANCE TESTS PASSED!\n";
exit(0);
