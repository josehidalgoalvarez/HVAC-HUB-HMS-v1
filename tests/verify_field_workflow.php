<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\TicketTimeline;
use App\Models\TicketVisit;
use App\Models\PartWorkflow;
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

echo "=== Running Field Workflow Verification Suite ===\n\n";

$db = Db::get();

// -------------------------------------------------------------
// 1. Portfolio Unit Count Constraint (Exactly 1,289)
// -------------------------------------------------------------
echo "--- 1. Portfolio Unit Count Constraint ---\n";

$totalUnits = (int)$db->query("SELECT COUNT(*) FROM unit")->fetchColumn();
assertTest($totalUnits === 1289, "1.1 Total portfolio units count is EXACTLY 1,289 (got {$totalUnits})", $passes, $failures);

// -------------------------------------------------------------
// 2. Ticket Timeline (Append-Only Events)
// -------------------------------------------------------------
echo "\n--- 2. Ticket Timeline & Append-Only Safety ---\n";

// Pick an existing non-anchored ticket for test
$testTicket = $db->query("SELECT id, building_id, unit_id, status FROM ticket WHERE wo_number NOT IN ('WO-19970', 'WO-20061', 'WO-19255', 'WO-20316') LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$ticketId = (int)$testTicket['id'];
$origStatus = $testTicket['status'];

// Append various timeline events
$t1 = TicketTimeline::append(
    $ticketId,
    TicketTimeline::EVENT_SUBMITTED,
    'Dispatch',
    'Tenant reported no heat in master bedroom',
    ['source' => 'tenant_portal']
);
assertTest(!empty($t1['id']) && $t1['event_type'] === 'submitted', "2.1 TicketTimeline::append creates 'submitted' event", $passes, $failures);

$t2 = TicketTimeline::append(
    $ticketId,
    TicketTimeline::EVENT_APPLIANCE_IDENTIFIED,
    'Jose (Tech)',
    'Identified Carrier Rooftop Heat Pump',
    [
        'photo_url' => 'https://example.com/carrier-photo.jpg',
        'rating_plate_url' => 'https://example.com/carrier-plate.jpg',
        'manual_url' => 'https://carrier.com/manual-48fc.pdf',
    ]
);
assertTest(!empty($t2['id']) && $t2['event_type'] === 'appliance_identified', "2.2 TicketTimeline::append creates 'appliance_identified' event with photo/plate/manual", $passes, $failures);

// Verify append-only safety on ticket_timeline: Db::assertAppendOnlySafe blocks UPDATE and DELETE
$updateBlocked = false;
try {
    Db::execute("UPDATE `ticket_timeline` SET actor = 'Hacker' WHERE id = ?", [$t1['id']]);
} catch (RuntimeException $e) {
    $updateBlocked = true;
}
assertTest($updateBlocked, "2.3 UPDATE statement on ticket_timeline is BLOCKED by Db::assertAppendOnlySafe", $passes, $failures);

$deleteBlocked = false;
try {
    Db::execute("DELETE FROM `ticket_timeline` WHERE id = ?", [$t1['id']]);
} catch (RuntimeException $e) {
    $deleteBlocked = true;
}
assertTest($deleteBlocked, "2.4 DELETE statement on ticket_timeline is BLOCKED by Db::assertAppendOnlySafe", $passes, $failures);

// Retrieve timeline events for ticket
$events = TicketTimeline::getForTicket($ticketId);
assertTest(count($events) >= 2, "2.5 TicketTimeline::getForTicket returns append-only events list", $passes, $failures);

// -------------------------------------------------------------
// 3. Visit Logging + Outcomes & OUR Miss Logic
// -------------------------------------------------------------
echo "\n--- 3. Visit Logging, Notice Snapshots & OUR Miss Logic ---\n";

// Case A: Failed access where notice was needed but NOT sent -> MUST be OUR miss!
$v1 = TicketVisit::logVisit($ticketId, [
    'unit_id' => $testTicket['unit_id'],
    'building_id' => $testTicket['building_id'],
    'tech_name' => 'Jose (Tech)',
    'outcome' => TicketVisit::OUTCOME_FAILED_ACCESS,
    'failed_reason' => TicketVisit::REASON_TENANT_ABSENT,
    'notes' => 'Knocked 3 times, tenant not home.',
    'notice_needed' => 1,
    'notice_sent_at' => null, // Notice NOT sent!
    'notice_confirmed_by' => null,
]);
assertTest($v1['outcome'] === 'failed_access', "3.1 Visit logged with outcome 'failed_access'", $passes, $failures);
assertTest(!empty($v1['is_our_miss']), "3.2 Failed visit without notice sent derives is_our_miss = true (OUR miss, not tenant's)", $passes, $failures);

// Case B: Failed access where notice WAS sent -> NOT our miss (tenant refusal/absence)
$v2 = TicketVisit::logVisit($ticketId, [
    'unit_id' => $testTicket['unit_id'],
    'building_id' => $testTicket['building_id'],
    'tech_name' => 'Jose (Tech)',
    'outcome' => TicketVisit::OUTCOME_FAILED_ACCESS,
    'failed_reason' => TicketVisit::REASON_REFUSED_ENTRY,
    'notes' => 'Tenant refused entry despite 24h notice served yesterday.',
    'notice_needed' => 1,
    'notice_sent_at' => '2026-10-21 10:00:00',
    'notice_confirmed_by' => 'Front Desk',
]);
assertTest($v2['outcome'] === 'failed_access', "3.3 Visit logged with outcome 'failed_access'", $passes, $failures);
assertTest(empty($v2['is_our_miss']), "3.4 Failed visit with valid 24h notice sent derives is_our_miss = false", $passes, $failures);

// Case C: Return-for-parts, planned multi-visit, or weather postponement -> NEVER failed_access
$v3 = TicketVisit::logVisit($ticketId, [
    'unit_id' => $testTicket['unit_id'],
    'building_id' => $testTicket['building_id'],
    'tech_name' => 'Jose (Tech)',
    'outcome' => TicketVisit::OUTCOME_PARTIAL,
    'notes' => 'Diagnosed faulty capacitor. Leaving unit safely secured while waiting for parts from Dependable.',
]);
assertTest($v3['outcome'] === 'partial', "3.5 Return-for-parts logged with outcome 'partial'", $passes, $failures);

// -------------------------------------------------------------
// 4. Failed Visits Per Unit & Repeat Access Flag (Derived)
// -------------------------------------------------------------
echo "\n--- 4. Derived Failed Visits & Repeat Access Problem Flag ---\n";

// Create or pick a clean test unit for isolated counting
$cleanUnit = $db->query("SELECT id, building_id FROM unit WHERE id NOT IN (SELECT unit_id FROM ticket_visit WHERE unit_id IS NOT NULL) LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$cleanUnitId = (int)$cleanUnit['id'];
$cleanBuildingId = (int)$cleanUnit['building_id'];

$summary0 = TicketVisit::getUnitSummary($cleanUnitId);
assertTest($summary0['failed_visits_count'] === 0, "4.1 Initial unit has 0 failed visits", $passes, $failures);
assertTest($summary0['repeat_access_problem'] === false, "4.2 Initial unit does NOT have repeat access problem", $passes, $failures);

// Log 1 failed visit
TicketVisit::logVisit($ticketId, [
    'unit_id' => $cleanUnitId,
    'building_id' => $cleanBuildingId,
    'tech_name' => 'Jose (Tech)',
    'outcome' => TicketVisit::OUTCOME_FAILED_ACCESS,
    'failed_reason' => TicketVisit::REASON_NO_ANSWER,
    'notes' => 'Attempt #1 - No answer',
]);

$summary1 = TicketVisit::getUnitSummary($cleanUnitId);
assertTest($summary1['failed_visits_count'] === 1, "4.3 Unit with 1 failure has failed_visits_count = 1", $passes, $failures);
assertTest($summary1['repeat_access_problem'] === false, "4.4 Unit with 1 failure does NOT have repeat access flag (< 2)", $passes, $failures);

// Log 2nd failed visit -> MUST trigger Repeat access problem flag (>= 2)
TicketVisit::logVisit($ticketId, [
    'unit_id' => $cleanUnitId,
    'building_id' => $cleanBuildingId,
    'tech_name' => 'Jose (Tech)',
    'outcome' => TicketVisit::OUTCOME_FAILED_ACCESS,
    'failed_reason' => TicketVisit::REASON_KEY_LOCK_ISSUE,
    'notes' => 'Attempt #2 - Master key jammed in deadbolt',
]);

$summary2 = TicketVisit::getUnitSummary($cleanUnitId);
assertTest($summary2['failed_visits_count'] === 2, "4.5 Unit with 2 failures has failed_visits_count = 2", $passes, $failures);
assertTest($summary2['repeat_access_problem'] === true, "4.6 Unit with 2 failures TRIGGERS repeat_access_problem = true", $passes, $failures);
assertTest($summary2['last_90_days_count'] === 2, "4.7 last_90_days_count is 2", $passes, $failures);

// Building failed-visits count aggregation
$bldCounts = TicketVisit::getBuildingFailedVisits();
$bldHit = null;
foreach ($bldCounts as $bc) {
    if ((int)$bc['building_id'] === $cleanBuildingId) {
        $bldHit = $bc;
        break;
    }
}
assertTest($bldHit !== null && (int)$bldHit['failed_visits_count'] >= 2, "4.8 Building failed visits aggregates unit failures (count >= 2)", $passes, $failures);

// -------------------------------------------------------------
// 5. Parts Rework: Ordering & Auto-Watch Creation
// -------------------------------------------------------------
echo "\n--- 5. Parts Ordering, Auto-Watch Creation & Arrival ---\n";

// Order part for ticket
$orderedPart = PartWorkflow::orderPart($ticketId, [
    'part_name' => 'Run Capacitor 45/5 MFD 440V',
    'part_number' => 'CAP-45-5-440',
    'supplier' => 'Dependable',
    'order_ref' => 'DEP-2026-9912',
    'quantity' => 1,
    'unit_cost' => 28.50,
    'appliance_type' => 'heat_pump',
    'ordered_by' => 'Jose (Tech)',
]);

assertTest(!empty($orderedPart['id']), "5.1 PartWorkflow::orderPart creates ticket_part record", $passes, $failures);
assertTest($orderedPart['status'] === 'ordered', "5.2 Ordered part has status 'ordered'", $passes, $failures);
assertTest(!empty($orderedPart['watch_id']), "5.3 Ordering part AUTO-CREATES a watch_id", $passes, $failures);

// Verify watch is active with watch_type 'part_wait'
$watch = $db->query("SELECT * FROM `watch` WHERE id = " . (int)$orderedPart['watch_id'])->fetch(PDO::FETCH_ASSOC);
assertTest($watch && $watch['watch_type'] === 'part_wait' && $watch['state'] === 'active', "5.4 Created watch has watch_type 'part_wait' and state 'active'", $passes, $failures);

// Marking part arrived
$arrivedPart = PartWorkflow::markPartArrived((int)$orderedPart['id'], 'Jose (Tech)');
assertTest($arrivedPart['status'] === 'arrived', "5.5 Part marked arrived has status 'arrived'", $passes, $failures);

// Verify watch was resolved
$watchAfter = $db->query("SELECT * FROM `watch` WHERE id = " . (int)$orderedPart['watch_id'])->fetch(PDO::FETCH_ASSOC);
assertTest($watchAfter && $watchAfter['state'] === 'resolved', "5.6 Marking part arrived RESOLVES the part_wait watch", $passes, $failures);

// -------------------------------------------------------------
// 6. Vacancy Parts Sourcing (Harvest-First) & Stock Transfer
// -------------------------------------------------------------
echo "\n--- 6. Vacancy Parts Sourcing & Stock Transfer ---\n";

// Ensure we have a vacant unit with an appliance for test
$vacantUnit = $db->query("SELECT id, building_id, unit_number FROM unit WHERE occupancy_status = 'vacant' LIMIT 1")->fetch(PDO::FETCH_ASSOC);

if (!$vacantUnit) {
    // Mark one unit vacant for test
    $pickUnit = $db->query("SELECT id FROM unit LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    $db->query("UPDATE unit SET occupancy_status = 'vacant' WHERE id = " . (int)$pickUnit['id']);
    $vacantUnit = $db->query("SELECT id, building_id, unit_number FROM unit WHERE id = " . (int)$pickUnit['id'])->fetch(PDO::FETCH_ASSOC);
}

$vacantUnitId = (int)$vacantUnit['id'];

// Check or ensure an appliance is attached to this vacant unit
$vacantAppliance = $db->query("SELECT id, name FROM appliance WHERE unit_id = {$vacantUnitId} LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$vacantAppliance) {
    $propId = 'prop-' . $vacantUnit['building_id'];
    Db::execute(
        "INSERT INTO appliance (unit_id, building_id, property_id, name, brand, type, category, model_number, status, created_at, updated_at) "
        . "VALUES (?, ?, ?, 'Frigidaire Top Freezer Refrigerator', 'Frigidaire', 'refrigerator', 'kitchen', 'FFTR1835VS', 'operational', datetime('now'), datetime('now'))",
        [$vacantUnitId, (int)$vacantUnit['building_id'], $propId]
    );
    $vacantAppliance = $db->query("SELECT id, name FROM appliance WHERE unit_id = {$vacantUnitId} LIMIT 1")->fetch(PDO::FETCH_ASSOC);
}

$applianceId = (int)$vacantAppliance['id'];

// Search harvest candidates
$candidates = PartWorkflow::searchHarvestCandidates('Frigidaire');
assertTest(count($candidates) >= 1, "6.1 Vacant unit appliance found in searchHarvestCandidates", $passes, $failures);

$foundCandidate = null;
foreach ($candidates as $c) {
    if ((int)$c['appliance_id'] === $applianceId) {
        $foundCandidate = $c;
        break;
    }
}
assertTest($foundCandidate !== null, "6.2 Vacant unit appliance returned with correct appliance_id", $passes, $failures);
assertTest($foundCandidate && $foundCandidate['occupancy_label'] === 'Vacant unit', "6.3 Harvest candidate labeled 'Vacant unit'", $passes, $failures);
assertTest($foundCandidate && $foundCandidate['harvest_first_rank'] === 1, "6.4 Harvest candidate has harvest_first_rank = 1 (ranked before buy-new)", $passes, $failures);

// Ensure occupied units are NOT returned
$occupiedAppliance = $db->query("
    SELECT a.id 
    FROM appliance a 
    JOIN unit u ON a.unit_id = u.id 
    WHERE u.occupancy_status != 'vacant' 
    LIMIT 1
")->fetch(PDO::FETCH_ASSOC);

if ($occupiedAppliance) {
    $occupiedId = (int)$occupiedAppliance['id'];
    $allCandidates = PartWorkflow::searchHarvestCandidates();
    $occupiedInCandidates = false;
    foreach ($allCandidates as $ac) {
        if ((int)$ac['appliance_id'] === $occupiedId) {
            $occupiedInCandidates = true;
            break;
        }
    }
    assertTest(!$occupiedInCandidates, "6.5 Occupied unit appliances are EXCLUDED from harvest candidates", $passes, $failures);
}

// Perform stock transfer from vacant unit to stockpile
$transferResult = PartWorkflow::transferVacantAppliance([
    'appliance_id' => $applianceId,
    'destination_type' => 'stockpile',
    'transferred_by' => 'Jose (Tech)',
    'notes' => 'Harvested refrigerator for central shop backup',
    'ticket_id' => $ticketId,
]);

assertTest(!empty($transferResult['transfer_id']), "6.6 Stock transfer recorded in stock_transfer table", $passes, $failures);

// Verify appliance location changed to Stockpile
$appAfter = $db->query("SELECT location, unit_id FROM appliance WHERE id = {$applianceId}")->fetch(PDO::FETCH_ASSOC);
assertTest($appAfter['location'] === 'Stockpile' && $appAfter['unit_id'] === null, "6.7 Appliance location updated to Stockpile and unit_id cleared", $passes, $failures);

// Verify append-only correction logged for provenance
$correction = $db->query("
    SELECT * FROM `correction` 
    WHERE entity_type = 'appliance' AND entity_id = {$applianceId} 
    ORDER BY id DESC LIMIT 1
")->fetch(PDO::FETCH_ASSOC);
assertTest($correction !== false && str_contains($correction['reason'], 'Harvest stock transfer'), "6.8 Append-only correction recorded for provenance", $passes, $failures);

// Final Unit Count Verification
$finalUnits = (int)$db->query("SELECT COUNT(*) FROM unit")->fetchColumn();
assertTest($finalUnits === 1289, "7.1 Portfolio unit count remains EXACTLY 1,289 (got {$finalUnits})", $passes, $failures);

// Clean up: restore test ticket status
Db::execute("UPDATE ticket SET status = ? WHERE id = ?", [$origStatus, $ticketId]);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n============================================\n";
echo "Passes: " . count($passes) . " | Failures: " . count($failures) . "\n";
echo "============================================\n";

if (count($failures) > 0) {
    echo "\nFailed Tests:\n";
    foreach ($failures as $f) {
        echo " - {$f}\n";
    }
    exit(1);
}

echo "\nALL TESTS PASSED SUCCESSFULLY!\n";
exit(0);
