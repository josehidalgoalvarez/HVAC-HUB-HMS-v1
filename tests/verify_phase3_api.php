<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Job;
use App\Models\RunSheet;
use App\Models\RunSheetBlock;
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

echo "=== Running Phase 3 Field Logging & Job Close-Out Backend Tests ===\n\n";

// Ensure clean test database
$testDbPath = __DIR__ . '/phase3_test.sqlite';
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
Db::execute("INSERT INTO building (id, name, address) VALUES (1, 'Highland Towers', '500 Highland Ave')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '804')");

// Create linked ticket and run sheet block
$ticket = Ticket::create([
    'wo_number' => 'WO-FIELD-303',
    'title' => 'Heat pump fan motor failure',
    'building_id' => 1,
    'unit_id' => 1,
    'priority' => 'urgent',
    'status' => 'verified',
    'verified_scope' => 'Outdoor condenser fan motor seized, needs 1/3 HP motor and 10uF capacitor',
], 1);

$runSheet = RunSheet::create([
    'title' => 'Phase 3 Field Dispatch',
    'run_date' => date('Y-m-d'),
], 1);

$block = RunSheetBlock::create($runSheet['id'], [
    'ticket_id' => $ticket['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'title' => $ticket['title'],
    'estimated_minutes' => 45,
], 1);

echo "--- 1. Field Job Creation & Pre-filled Context ---\n";
$job = Job::create([
    'ticket_id' => $ticket['id'],
    'run_sheet_block_id' => $block['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'title' => $ticket['title'],
    'estimated_minutes' => 45,
], 1);

assertTest(!empty($job['id']), "1.1 Field job created with ID {$job['id']}", $passes, $failures);
assertTest($job['status'] === 'in_progress', "1.2 Job status is 'in_progress'", $passes, $failures);
assertTest((int)$job['ticket_id'] === (int)$ticket['id'], "1.3 Job links to Ticket #{$ticket['id']}", $passes, $failures);
assertTest((int)$job['run_sheet_block_id'] === (int)$block['id'], "1.4 Job links to Run Sheet Block #{$block['id']}", $passes, $failures);

// Check ticket automatically moved to in-progress
$refreshedTicket = Ticket::findById($ticket['id']);
assertTest($refreshedTicket['status'] === 'in-progress', "1.5 Linked ticket advanced from 'verified' to 'in-progress'", $passes, $failures);

echo "\n--- 2. Parts Used, Notes, and Photos Logging ---\n";

// Add Note
$note = Job::addNote($job['id'], 'Arrived at unit 804. Verified motor windings open circuit.', 1);
assertTest(!empty($note['id']), "2.1 Note appended with ID {$note['id']}", $passes, $failures);

// Add Part Used
$part = Job::addPartUsed($job['id'], 'Condenser Fan Motor 1/3 HP', 1.0, 'pcs', 'Replaced burnt OEM motor', 1);
assertTest(!empty($part['id']), "2.2 Part used recorded with ID {$part['id']}", $passes, $failures);

// Add Second Part Used
$part2 = Job::addPartUsed($job['id'], 'Capacitor 10uF 440V', 1.0, 'pcs', 'New run capacitor for motor', 1);
assertTest(!empty($part2['id']), "2.3 Second part used recorded with ID {$part2['id']}", $passes, $failures);

// Add Photo
$photo = Job::addPhoto($job['id'], '/uploads/job_motor_replacement.jpg', 245000, 'Installed fan motor and wired capacitor', 1);
assertTest(!empty($photo['id']), "2.4 Photo record attached with ID {$photo['id']}", $passes, $failures);

// Verify fetchById exposes parts, notes, and photos
$fetchedJob = Job::findById($job['id']);
assertTest(count($fetchedJob['parts_used']) === 2, "2.5 Job exposes exactly 2 parts used", $passes, $failures);
assertTest(count($fetchedJob['notes_list']) === 1, "2.6 Job exposes 1 technician note", $passes, $failures);
assertTest(count($fetchedJob['photos']) === 1, "2.7 Job exposes 1 photo attachment", $passes, $failures);

// Verify append-only corrections were logged for parts, notes, and photos
$corrections = Db::fetchAll("SELECT * FROM correction WHERE entity_type = 'job' AND entity_id = ? ORDER BY id ASC", [$job['id']]);
$fieldsLogged = array_column($corrections, 'field_name');
assertTest(in_array('status', $fieldsLogged, true), "2.8 Status recorded in job corrections", $passes, $failures);
assertTest(in_array('part_used', $fieldsLogged, true), "2.9 Parts used recorded in job corrections", $passes, $failures);
assertTest(in_array('note', $fieldsLogged, true), "2.10 Notes recorded in job corrections", $passes, $failures);
assertTest(in_array('photo', $fieldsLogged, true), "2.11 Photos recorded in job corrections", $passes, $failures);

echo "\n--- 3. Job Close-Out & Ticket State Progression (Ticket -> Done) ---\n";

// Close out the job
$closedJob = Job::close($job['id'], [
    'actual_minutes' => 55,
    'notes' => 'Tested heating cycle. Unit running at 1.8A, airflow and temperature split confirmed normal.',
], 1);

assertTest($closedJob['status'] === 'completed', "3.1 Job status updated to 'completed'", $passes, $failures);
assertTest((int)$closedJob['actual_minutes'] === 55, "3.2 Actual minutes recorded as 55m", $passes, $failures);
assertTest((int)$closedJob['variance_minutes'] === 10, "3.3 Variance minutes calculated as +10m (55m - 45m)", $passes, $failures);

// Acceptance Criterion: Linked ticket moves to 'done'
$closedTicket = Ticket::findById($ticket['id']);
assertTest($closedTicket['status'] === 'done', "3.4 Linked ticket successfully moved to 'done'", $passes, $failures);

// Acceptance Criterion: Correction rows written for the state change
$ticketCorrections = Db::fetchAll(
    "SELECT * FROM correction WHERE entity_type = 'ticket' AND entity_id = ? AND field_name = 'status' ORDER BY id DESC",
    [$ticket['id']]
);
assertTest(count($ticketCorrections) >= 2, "3.5 Ticket status changes captured in append-only correction table", $passes, $failures);
$latestTicketCorr = $ticketCorrections[0];
assertTest($latestTicketCorr['new_value'] === 'done', "3.6 Ticket correction record captures new_value = 'done'", $passes, $failures);
assertTest(!empty($latestTicketCorr['reason']), "3.7 Ticket correction reason captured: '{$latestTicketCorr['reason']}'", $passes, $failures);

// Verify linked Run Sheet Block was also marked completed with actual minutes
$closedBlock = RunSheetBlock::findById($block['id']);
assertTest($closedBlock['status'] === 'completed', "3.8 Linked run sheet block marked 'completed'", $passes, $failures);
assertTest((int)$closedBlock['actual_minutes'] === 55, "3.9 Linked run sheet block records actual minutes (55m)", $passes, $failures);

echo "\n--- 4. Batch Sync Processing (Offline Outbox Simulation) ---\n";

// Simulate 3 offline actions: note + photo + part used
$job2 = Job::create([
    'ticket_id' => null,
    'title' => 'Offline Preventive Maintenance',
    'building_id' => 1,
    'unit_id' => 1,
    'estimated_minutes' => 30,
], 1);

$mutations = [
    [
        'idempotency_key' => 'idem_offline_1',
        'type' => 'add_note',
        'job_id' => $job2['id'],
        'payload' => ['note_text' => 'Offline note logged in basement boiler room.'],
    ],
    [
        'idempotency_key' => 'idem_offline_2',
        'type' => 'add_photo',
        'job_id' => $job2['id'],
        'payload' => ['file_path' => '/uploads/boiler_gauge.jpg', 'caption' => 'System pressure 18 PSI'],
    ],
    [
        'idempotency_key' => 'idem_offline_3',
        'type' => 'add_part_used',
        'job_id' => $job2['id'],
        'payload' => ['part_name' => 'Pressure Relief Valve 30 PSI', 'quantity' => 1.0, 'unit' => 'pcs'],
    ],
];

// Execute batch sync logic
$jobController = new App\Controllers\JobController();
$serverRequestFactory = new Slim\Psr7\Factory\ServerRequestFactory();
$request = $serverRequestFactory->createServerRequest('POST', '/api/sync')
    ->withParsedBody(['mutations' => $mutations])
    ->withAttribute('user', ['id' => 1, 'role' => 'tech']);

$dummyResponse = (new Slim\Psr7\Factory\ResponseFactory())->createResponse();
$syncResponse = $jobController->batchSync($request, $dummyResponse);
$syncData = json_decode((string) $syncResponse->getBody(), true);

assertTest($syncData['data']['synced_count'] === 3, "4.1 Batch sync synced all 3 offline mutations", $passes, $failures);
assertTest(count($syncData['data']['failures']) === 0, "4.2 Zero sync failures", $passes, $failures);

$syncedJob = Job::findById($job2['id']);
assertTest(count($syncedJob['notes_list']) === 1, "4.3 Synced job has 1 note persisted", $passes, $failures);
assertTest(count($syncedJob['photos']) === 1, "4.4 Synced job has 1 photo persisted", $passes, $failures);
assertTest(count($syncedJob['parts_used']) === 1, "4.5 Synced job has 1 part used persisted", $passes, $failures);

echo "\n========================================\n";
echo "Phase 3 Backend Verification Summary:\n";
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

echo "All Phase 3 Backend Tests PASSED!\n";
exit(0);
