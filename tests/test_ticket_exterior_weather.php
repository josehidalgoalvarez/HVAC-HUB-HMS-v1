<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Ticket;
use App\Models\Watch;
use App\Services\WatchEngine;

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

echo "=== Running Batch B: Ticket Exterior Work & Manual Weather Watch Tests ===\n\n";

// Set up isolated SQLite test database
$testDbPath = __DIR__ . '/ticket_weather_test.sqlite';
if (file_exists($testDbPath)) {
    unlink($testDbPath);
}

$pdo = new PDO("sqlite:{$testDbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('PRAGMA foreign_keys = ON;');
Db::setPdo($pdo);
Db::ensureSqliteSchema($pdo);

// Seed base records
Db::execute("INSERT INTO users (id, name, email, password_hash, role, api_token) VALUES (1, 'Lead Tech Jose', 'jose@hvachome.local', 'hash', 'tech', 'test-tech-token')");
Db::execute("INSERT INTO building (id, name, address) VALUES (1, '100 Days Rd', '100 Days Rd')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '204')");

// --- 1. Schema & Migration 010 Verification ---
echo "--- 1. Schema & Migration 010 Verification ---\n";
$cols = Db::fetchAll("PRAGMA table_info(ticket)");
$colNames = array_column($cols, 'name');
assertTest(in_array('exterior_work', $colNames, true), 'Migration 010: ticket table has exterior_work column', $passes, $failures);
assertTest(in_array('weather_note', $colNames, true), 'Migration 010: ticket table has weather_note column', $passes, $failures);

// Verify migration file exists and is valid SQL
$migFile = __DIR__ . '/../migrations/010_ticket_exterior_weather.sql';
assertTest(file_exists($migFile), 'migrations/010_ticket_exterior_weather.sql exists', $passes, $failures);
$migSql = file_get_contents($migFile);
assertTest(str_contains($migSql, 'exterior_work') && str_contains($migSql, 'weather_note'), 'Migration 010 adds exterior_work and weather_note', $passes, $failures);

// --- 2. Ticket Model CRUD with Exterior Work & Weather Note ---
echo "\n--- 2. Ticket Model CRUD ---\n";
$ticket = Ticket::create([
    'wo_number' => 'WO-EXT-101',
    'title' => 'Rooftop Condenser Fan Motor Replacement',
    'building_id' => 1,
    'unit_id' => 1,
    'priority' => 'high',
    'verified_scope' => 'Outdoor rooftop job requiring dry weather window.',
    'exterior_work' => 1,
    'weather_note' => 'might rain Wed–Thu; ideal: Mon–Tue',
], 1);

assertTest(!empty($ticket['id']), 'Ticket created with ID #' . ($ticket['id'] ?? 'none'), $passes, $failures);
assertTest($ticket['exterior_work'] === true, 'Ticket exterior_work is boolean true', $passes, $failures);
assertTest($ticket['weather_note'] === 'might rain Wed–Thu; ideal: Mon–Tue', 'Ticket weather_note stored accurately', $passes, $failures);

$fetched = Ticket::findById($ticket['id']);
assertTest($fetched['exterior_work'] === true, 'Fetched ticket has exterior_work = true', $passes, $failures);
assertTest($fetched['weather_note'] === 'might rain Wed–Thu; ideal: Mon–Tue', 'Fetched ticket has weather_note', $passes, $failures);

// --- 3. Audit Correction Logging for Exterior Work & Weather Note ---
echo "\n--- 3. Audit Corrections on Update ---\n";
$updated = Ticket::update($ticket['id'], [
    'weather_note' => 'Dry window: Fri afternoon confirmed',
], 1, 'Updated weather outlook after checking forecast');

assertTest($updated['weather_note'] === 'Dry window: Fri afternoon confirmed', 'weather_note updated successfully', $passes, $failures);

$corrections = Db::fetchAll("SELECT * FROM correction WHERE entity_type = 'ticket' AND entity_id = ? AND field_name = 'weather_note'", [$ticket['id']]);
assertTest(count($corrections) >= 1, 'Correction logged for weather_note update', $passes, $failures);
$lastCorrection = end($corrections);
assertTest($lastCorrection['old_value'] === 'might rain Wed–Thu; ideal: Mon–Tue', 'Correction records old weather_note', $passes, $failures);
assertTest($lastCorrection['new_value'] === 'Dry window: Fri afternoon confirmed', 'Correction records new weather_note', $passes, $failures);

// --- 4. Watch Model: weather_manual Type, Target Type & Title ---
echo "\n--- 4. Watch Model: weather_manual Type ---\n";
assertTest(Watch::TYPE_WEATHER_MANUAL === 'weather_manual', 'Watch::TYPE_WEATHER_MANUAL constant defined', $passes, $failures);

$watch = Watch::create([
    'watch_type' => 'weather_manual',
    'description' => 'Dry window: Fri afternoon confirmed',
    'target_type' => 'ticket',
    'target_id' => $ticket['id'],
    'state' => 'triggered',
    'config' => [
        'ticket_id' => $ticket['id'],
        'wo_number' => $ticket['wo_number'],
        'weather_note' => 'Dry window: Fri afternoon confirmed',
    ],
]);

assertTest(!empty($watch['id']), 'weather_manual watch created with ID #' . ($watch['id'] ?? 'none'), $passes, $failures);
assertTest($watch['watch_type'] === 'weather_manual', 'Watch watch_type is weather_manual', $passes, $failures);
assertTest($watch['target_type'] === 'ticket', 'Watch target_type is ticket', $passes, $failures);
assertTest($watch['target_id'] === (int) $ticket['id'], 'Watch target_id matches ticket ID', $passes, $failures);
assertTest($watch['state'] === 'triggered', 'Watch state is triggered (active alert)', $passes, $failures);

// Default title test
$watchDefaultTitle = Watch::create([
    'watch_type' => 'weather_manual',
    'target_id' => $ticket['id'],
]);
assertTest(str_contains($watchDefaultTitle['title'], "Ticket #{$ticket['id']} Weather Outlook Watch"), 'Default title generated for weather_manual watch', $passes, $failures);

// --- 5. WatchEngine: Evaluate Manual Weather Watch ---
echo "\n--- 5. WatchEngine: Evaluate Manual Weather Watch ---\n";
$now = new DateTimeImmutable('2026-10-20 14:00:00');

// While exterior_work is true and weather_note non-empty: should_trigger = true
$evalResult = WatchEngine::evaluateSingleWatch($watch, $now);
assertTest($evalResult['should_trigger'] === true, 'WatchEngine triggers when exterior_work is true with weather_note', $passes, $failures);
assertTest(str_contains($evalResult['reason'], 'Dry window: Fri afternoon confirmed'), 'Reason includes weather outlook note', $passes, $failures);

// Toggling exterior_work off: WatchEngine auto-resolves watch
Ticket::update($ticket['id'], ['exterior_work' => 0], 1, 'Toggled off exterior work');
$evalToggledOff = WatchEngine::evaluateSingleWatch($watch, $now);
assertTest($evalToggledOff['should_trigger'] === false, 'WatchEngine does not trigger when exterior_work is 0', $passes, $failures);

$watchAfterDismiss = Watch::findById($watch['id']);
assertTest($watchAfterDismiss['state'] === 'resolved', 'Watch state resolved automatically on evaluation after exterior work turned off', $passes, $failures);

// --- 6. Automated Freeze Watch Untouched ---
echo "\n--- 6. Automated Freeze Watch Untouched ---\n";
assertTest(Watch::TYPE_WEATHER_FREEZE === 'weather_freeze', 'Watch::TYPE_WEATHER_FREEZE untouched', $passes, $failures);
$freezeWatch = Watch::create([
    'watch_type' => 'weather_freeze',
    'title' => 'Regional Freeze Weather Watch',
    'config' => [
        'lat' => 44.23,
        'lon' => -76.48,
        'threshold_temp_c' => 0.0,
    ],
]);
assertTest($freezeWatch['watch_type'] === 'weather_freeze', 'weather_freeze watch created and untouched', $passes, $failures);
assertTest($freezeWatch['target_type'] === 'weather', 'weather_freeze target_type remains weather', $passes, $failures);

// --- 7. Backwards Compatibility with Existing Tickets ---
echo "\n--- 7. Backwards Compatibility with Existing Tickets ---\n";
Db::execute("INSERT INTO ticket (id, building_id, title, status, priority) VALUES (999, 1, 'Legacy Indoor Radiator Leak', 'new', 'medium')");
$legacyTicket = Ticket::findById(999);
assertTest($legacyTicket !== null, 'Legacy ticket loads successfully', $passes, $failures);
assertTest($legacyTicket['exterior_work'] === false, 'Legacy ticket defaults exterior_work to false', $passes, $failures);
assertTest($legacyTicket['weather_note'] === null, 'Legacy ticket defaults weather_note to null', $passes, $failures);

// Clean up test database
if (file_exists($testDbPath)) {
    unlink($testDbPath);
}

// Summary
echo "\n============================================\n";
echo sprintf("Results: %d passed, %d failed\n", count($passes), count($failures));
echo "============================================\n";

if (!empty($failures)) {
    exit(1);
}
exit(0);
