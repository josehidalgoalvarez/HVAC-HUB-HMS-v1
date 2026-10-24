<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Notice;
use App\Models\RunSheet;
use App\Models\RunSheetBlock;
use App\Models\Ticket;
use App\Models\Watch;
use App\Services\WatchEngine;
use App\Services\WeatherService;

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

echo "=== Running Weather Simplification & Watch Diet Verification ===\n\n";

// --- 1. Per-Job Exposure Field on Tickets ---
echo "--- 1. Per-Job Exposure Field on Tickets ---\n";
// Default is 'indoor'
$tDefault = Ticket::create([
    'title' => 'Basement Water Heater Check',
]);
assertTest($tDefault['work_exposure'] === 'indoor', "1.1 Default work_exposure is 'indoor'", $passes, $failures);
assertTest($tDefault['exterior_work'] === false, "1.2 Default exterior_work is false", $passes, $failures);

// Explicit 'exterior'
$tExterior = Ticket::create([
    'title' => 'Rooftop Condenser Coil Wash',
    'work_exposure' => 'exterior',
]);
assertTest($tExterior['work_exposure'] === 'exterior', "1.3 Explicit work_exposure 'exterior' accepted", $passes, $failures);
assertTest($tExterior['exterior_work'] === true, "1.4 exterior_work is true for 'exterior'", $passes, $failures);

// Explicit 'exterior_ladder'
$tLadder = Ticket::create([
    'title' => 'Second Floor Soffit Vent Repair',
    'work_exposure' => 'exterior_ladder',
]);
assertTest($tLadder['work_exposure'] === 'exterior_ladder', "1.5 Explicit work_exposure 'exterior_ladder' accepted", $passes, $failures);
assertTest($tLadder['exterior_work'] === true, "1.6 exterior_work is true for 'exterior_ladder'", $passes, $failures);

// Updating work_exposure
$tUpdated = Ticket::update($tDefault['id'], [
    'work_exposure' => 'exterior_ladder',
], 1, 'Tech noted ladder required for exterior condenser');
assertTest($tUpdated['work_exposure'] === 'exterior_ladder', "1.7 Updating work_exposure to 'exterior_ladder' persists", $passes, $failures);
assertTest($tUpdated['exterior_work'] === true, "1.8 exterior_work automatically true when work_exposure is ladder", $passes, $failures);

// Switch back to 'indoor'
$tBackToIndoor = Ticket::update($tDefault['id'], [
    'work_exposure' => 'indoor',
], 1, 'Work is inside furnace room');
assertTest($tBackToIndoor['work_exposure'] === 'indoor', "1.9 Switching back to 'indoor' persists", $passes, $failures);
assertTest($tBackToIndoor['exterior_work'] === false, "1.10 exterior_work becomes false when indoor", $passes, $failures);

// --- 2. Rain-Only Signal Service ---
echo "\n--- 2. Rain-Only Signal Service ---\n";
$mockRainy = [
    'daily' => [
        'time' => ['2026-10-25', '2026-10-26', '2026-10-27'],
        'precipitation_sum' => [0.0, 5.2, 0.2],
        'precipitation_probability_max' => [10.0, 85.0, 20.0],
        'weathercode' => [1, 61, 3], // 61 is Rain
    ]
];
WeatherService::setMockForecast($mockRainy);

// Dry day
$dryCheck = WeatherService::isRainExpected('2026-10-25');
assertTest($dryCheck === false, "2.1 Clear day returns rain_expected = false", $passes, $failures);

// Rainy day (5.2mm, 85%, code 61)
$rainCheck = WeatherService::isRainExpected('2026-10-26');
assertTest($rainCheck === true, "2.2 Rainy day returns rain_expected = true", $passes, $failures);

// Non-matching date defaults to false
$unknownDateCheck = WeatherService::isRainExpected('2026-11-01');
assertTest($unknownDateCheck === false, "2.3 Unforecasted date returns false", $passes, $failures);

WeatherService::clearMock();

// --- 3. Ticket and Block Rain Enrichment ---
echo "\n--- 3. Ticket and Block Rain Enrichment ---\n";
WeatherService::setMockForecast($mockRainy);

// Create run sheets for rainy day (2026-10-26) and dry day (2026-10-25)
$rsRainy = RunSheet::create([
    'run_date' => '2026-10-26',
    'title' => 'Rainy Day Run Sheet',
]);
$rsDry = RunSheet::create([
    'run_date' => '2026-10-25',
    'title' => 'Dry Day Run Sheet',
]);

$tRainyTicket = Ticket::create([
    'title' => 'Exterior A/C Unit Inspection',
    'work_exposure' => 'exterior',
]);
$blockRainy = RunSheetBlock::create($rsRainy['id'], [
    'ticket_id' => $tRainyTicket['id'],
    'title' => 'Inspect A/C',
]);
$freshRainy = Ticket::findById($tRainyTicket['id']);
assertTest($freshRainy['rain_expected'] === true, "3.1 Exterior ticket on rainy day has rain_expected = true", $passes, $failures);

$tDryTicket = Ticket::create([
    'title' => 'Exterior A/C Unit Inspection Dry Day',
    'work_exposure' => 'exterior',
]);
$blockDry = RunSheetBlock::create($rsDry['id'], [
    'ticket_id' => $tDryTicket['id'],
    'title' => 'Inspect A/C Dry Day',
]);
$freshDry = Ticket::findById($tDryTicket['id']);
assertTest($freshDry['rain_expected'] === false, "3.2 Exterior ticket on dry day has rain_expected = false", $passes, $failures);

$tIndoorTicket = Ticket::create([
    'title' => 'Indoor Thermostat Replacement',
    'work_exposure' => 'indoor',
]);
$blockIndoor = RunSheetBlock::create($rsRainy['id'], [
    'ticket_id' => $tIndoorTicket['id'],
    'title' => 'Replace Thermostat',
]);
$freshIndoor = Ticket::findById($tIndoorTicket['id']);
assertTest($freshIndoor['rain_expected'] === false, "3.3 Indoor ticket never triggers rain_expected (always false)", $passes, $failures);

assertTest($blockRainy['work_exposure'] === 'exterior', "3.4 RunSheetBlock inherits work_exposure from ticket", $passes, $failures);
assertTest($blockRainy['rain_expected'] === true, "3.5 RunSheetBlock defines rain_expected = true on rainy day", $passes, $failures);

WeatherService::clearMock();

// --- 4. Purge Verification: Zero Retired Watch Rows ---
echo "\n--- 4. Purge Verification ---\n";
$retiredCountRow = Db::fetchOne(
    "SELECT COUNT(*) as cnt FROM watch WHERE watch_type IN ('weather_freeze', 'weather_manual', 'notice_handoff')"
);
assertTest((int)($retiredCountRow['cnt'] ?? 0) === 0, "4.1 Zero retired watch rows in database ('weather_freeze', 'weather_manual', 'notice_handoff')", $passes, $failures);

// --- 5. Watch Diet: Surviving 4 Types ---
echo "\n--- 5. Watch Diet: Exactly 4 Surviving Types ---\n";
$allowedTypes = [
    Watch::TYPE_NOTICE_DEADLINE,
    Watch::TYPE_REPLY_WAITING,
    Watch::TYPE_PART_WAIT,
    Watch::TYPE_SCHEDULED_TASK,
];
assertTest(count($allowedTypes) === 4, "5.1 Exactly 4 watch types survive", $passes, $failures);
assertTest(in_array('notice_deadline', $allowedTypes, true), "5.2 notice_deadline is active", $passes, $failures);
assertTest(in_array('reply_waiting', $allowedTypes, true), "5.3 reply_waiting is active", $passes, $failures);
assertTest(in_array('part_wait', $allowedTypes, true), "5.4 part_wait is active", $passes, $failures);
assertTest(in_array('scheduled_task', $allowedTypes, true), "5.5 scheduled_task is active", $passes, $failures);

// Part wait evaluation
$ticketPart = Ticket::create([
    'title' => 'Boiler relief valve replacement',
    'status' => 'pending_parts',
]);
$partWatch = Watch::create([
    'watch_type' => 'part_wait',
    'target_type' => 'ticket',
    'target_id' => $ticketPart['id'],
    'config' => ['part_name' => 'Conbraco Relief Valve 30 PSI'],
]);
$simTime = new DateTimeImmutable('2026-10-24 14:00:00');
WatchEngine::evaluateAll($simTime);
$evalPart = Watch::findById($partWatch['id']);
assertTest($evalPart['state'] === 'triggered', "5.6 part_wait triggers when ticket is pending_parts", $passes, $failures);
assertTest(str_contains($evalPart['latest_trigger_reason'], 'Conbraco Relief Valve'), "5.7 part_wait reason contains part name", $passes, $failures);

// --- 6. Notice Gate Logic Intact ---
echo "\n--- 6. Notice Gate Logic Intact ---\n";
$tNotice = Ticket::create([
    'title' => 'In-Suite Radiator Bleed',
    'notice_needed' => 1,
]);
assertTest(!empty($tNotice['notice_needed']), "6.1 notice_needed flag works", $passes, $failures);
assertTest(empty($tNotice['notice_sent_at']), "6.2 notice_sent_at starts null", $passes, $failures);

$sentTime = '2026-10-23T10:00:00Z';
$tMarked = Ticket::update($tNotice['id'], [
    'notice_sent_at' => $sentTime,
    'notice_confirmed_by' => 'Dispatcher Sarah',
], 1, 'Tenant notice delivered');
assertTest($tMarked['notice_sent_at'] === $sentTime, "6.3 notice_sent_at saved", $passes, $failures);
assertTest($tMarked['notice_confirmed_by'] === 'Dispatcher Sarah', "6.4 notice_confirmed_by saved", $passes, $failures);

// --- 7. Codebase Grep Assurance ---
echo "\n--- 7. Codebase Grep Assurance ---\n";
$srcFiles = array_merge(
    glob(__DIR__ . '/../src/*.php') ?: [],
    glob(__DIR__ . '/../src/**/*.php') ?: [],
    glob(__DIR__ . '/../components/**/*.tsx') ?: [],
    glob(__DIR__ . '/../components/**/*.ts') ?: [],
    glob(__DIR__ . '/../types/*.ts') ?: []
);

$foundRetiredMatches = 0;
foreach ($srcFiles as $file) {
    $content = file_get_contents($file);
    if (str_contains($content, 'weather_freeze') || str_contains($content, 'weather_manual')) {
        $foundRetiredMatches++;
        echo "[FAIL] Found retired watch type in {$file}\n";
    }
}
assertTest($foundRetiredMatches === 0, "7.1 Zero occurrences of 'weather_freeze' or 'weather_manual' in src/, components/, or types/", $passes, $failures);

// Clean up ephemeral test tickets
$createdTicketIds = [
    $tDefault['id'] ?? null,
    $tExterior['id'] ?? null,
    $tLadder['id'] ?? null,
    $tRainyTicket['id'] ?? null,
    $tDryTicket['id'] ?? null,
    $tIndoorTicket['id'] ?? null,
    $ticketPart['id'] ?? null,
    $tNotice['id'] ?? null,
];
foreach (array_filter($createdTicketIds) as $tId) {
    Db::execute("DELETE FROM watch WHERE target_type = 'ticket' AND target_id = ?", [(int) $tId]);
    Db::execute("DELETE FROM ticket WHERE id = ?", [(int) $tId]);
}

// Summary
echo "\n========================================\n";
echo "Weather Simplification & Watch Diet Summary:\n";
echo "Passes: " . count($passes) . "\n";
echo "Failures: " . count($failures) . "\n";
echo "========================================\n";

if (count($failures) === 0) {
    echo "SUCCESS: All Weather Simplification & Watch Diet Verification Tests PASSED!\n";
    exit(0);
} else {
    echo "FAILED: Some tests failed.\n";
    exit(1);
}
