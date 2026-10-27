<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\SOP;
use App\Models\TicketTimeline;

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

echo "=== Running SOP Library & Timed Checklist Runs Verification Suite ===\n\n";

$db = Db::get();

// -------------------------------------------------------------
// 1. Portfolio Unit Count Constraint (Strictly 1,289)
// -------------------------------------------------------------
echo "--- 1. Portfolio Unit Count Constraint ---\n";
$totalUnits = (int) $db->query("SELECT COUNT(*) FROM unit")->fetchColumn();
assertTest($totalUnits === 1289, "1.1 Total portfolio units count is EXACTLY 1,289 (got {$totalUnits})", $passes, $failures);

// -------------------------------------------------------------
// 2. SOP Schema & Seed Verification
// -------------------------------------------------------------
echo "\n--- 2. SOP Schema & Seed Shell Verification ---\n";

$sops = SOP::findAll();
assertTest(count($sops) >= 1, "2.1 SOP::findAll() returns at least 1 procedure", $passes, $failures);

$furnace = SOP::findById('sop-gas-furnace-service');
assertTest($furnace !== null, "2.2 Gas furnace service SOP exists in DB", $passes, $failures);

if ($furnace) {
    assertTest(
        $furnace['title'] === 'Gas furnace service (CSA B149.1-25 / TSSA)',
        "2.3 Gas furnace title matches CSA B149.1-25 / TSSA framing",
        $passes,
        $failures
    );
    assertTest(
        (int) $furnace['todo_verify'] === 1,
        "2.4 Gas furnace is explicitly marked todo_verify = 1 (SHELL)",
        $passes,
        $failures
    );
    assertTest(
        count($furnace['steps']) === 74,
        "2.5 Gas furnace has Jose's 74 procedure steps (migration 037)",
        $passes,
        $failures
    );

    // Verify compliance gates
    $gates = $furnace['compliance_gates'];
    $hasCsa = false;
    $hasTssa = false;
    foreach ($gates as $g) {
        if ($g['id'] === 'csa-b149-1-25') $hasCsa = true;
        if ($g['id'] === 'tssa-gas') $hasTssa = true;
    }
    assertTest($hasCsa && $hasTssa, "2.6 Compliance gates include CSA B149.1-25 and TSSA", $passes, $failures);
}

// -------------------------------------------------------------
// 3. Timed Checklist Run Execution & Step Recording
// -------------------------------------------------------------
echo "\n--- 3. Timed Checklist Run Execution ---\n";

// Pick a test ticket
$testTicket = $db->query("SELECT id FROM ticket LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$ticketId = $testTicket ? (int) $testTicket['id'] : null;

$runData = [
    'sop_id' => 'sop-gas-furnace-service',
    'ticket_id' => $ticketId,
    'technician' => 'Jose (Tech)',
    'started_at' => date('Y-m-d H:i:s', time() - 300),
    'finished_at' => date('Y-m-d H:i:s'),
    'total_seconds' => 300,
    'notes' => 'Completed annual furnace inspection & visual safety check',
    'acknowledged_gates' => ['csa-b149-1-25', 'tssa-gas'],
    'weather_warnings' => ['Indoor check ok'],
    'steps' => [
        [
            'position' => 1,
            'instruction' => 'TODO-verify: step 1 not yet provided',
            'started_at' => date('Y-m-d H:i:s', time() - 300),
            'completed_at' => date('Y-m-d H:i:s', time() - 200),
            'duration_seconds' => 100,
            'note' => 'Checked visual enclosure',
            'deviation' => 0,
        ],
        [
            'position' => 2,
            'instruction' => 'TODO-verify: step 2 not yet provided',
            'started_at' => date('Y-m-d H:i:s', time() - 200),
            'completed_at' => date('Y-m-d H:i:s', time() - 100),
            'duration_seconds' => 100,
            'note' => 'Gas shutoff accessible',
            'deviation' => 0,
        ],
        [
            'position' => 3,
            'instruction' => 'TODO-verify: step 3 not yet provided',
            'started_at' => date('Y-m-d H:i:s', time() - 100),
            'completed_at' => date('Y-m-d H:i:s'),
            'duration_seconds' => 100,
            'note' => 'Flame sensor cleaned',
            'deviation' => 1, // Deviation noted
        ],
    ],
];

$run = SOP::createRun($runData);
assertTest(!empty($run['id']), "3.1 SOP::createRun inserts run and returns run id", $passes, $failures);
assertTest(count($run['steps']) === 3, "3.2 SOP::createRun inserts 3 step records", $passes, $failures);

// -------------------------------------------------------------
// 4. Ticket Timeline Integration
// -------------------------------------------------------------
echo "\n--- 4. Ticket Timeline Event Integration ---\n";

if ($ticketId !== null) {
    $timeline = TicketTimeline::getForTicket($ticketId);
    $sopEvents = array_filter($timeline, fn($e) => $e['event_type'] === TicketTimeline::EVENT_SOP_RUN_COMPLETED);
    assertTest(count($sopEvents) > 0, "4.1 Timeline contains 'sop_run_completed' event", $passes, $failures);

    $lastEv = end($sopEvents);
    assertTest(
        str_contains($lastEv['note'] ?? '', 'Gas furnace service'),
        "4.2 Timeline event note mentions SOP title and duration",
        $passes,
        $failures
    );
    assertTest(
        isset($lastEv['metadata']['deviations_count']) && $lastEv['metadata']['deviations_count'] === 1,
        "4.3 Timeline event metadata records 1 deviation",
        $passes,
        $failures
    );
}

// -------------------------------------------------------------
// 5. Append-Only Safety Protection (No UPDATE or DELETE on sop_run)
// -------------------------------------------------------------
echo "\n--- 5. Append-Only Safety Enforcement ---\n";

$updateBlocked = false;
try {
    Db::execute("UPDATE sop_run SET notes = 'tampered' WHERE id = ?", [$run['id']]);
} catch (RuntimeException $e) {
    if (str_contains($e->getMessage(), 'Table is append-only')) {
        $updateBlocked = true;
    }
}
assertTest($updateBlocked, "5.1 Db::execute blocks UPDATE on sop_run table", $passes, $failures);

$deleteBlocked = false;
try {
    Db::execute("DELETE FROM sop_run WHERE id = ?", [$run['id']]);
} catch (RuntimeException $e) {
    if (str_contains($e->getMessage(), 'Table is append-only')) {
        $deleteBlocked = true;
    }
}
assertTest($deleteBlocked, "5.2 Db::execute blocks DELETE on sop_run table", $passes, $failures);

$stepUpdateBlocked = false;
try {
    Db::execute("UPDATE sop_run_step SET note = 'tampered' WHERE run_id = ?", [$run['id']]);
} catch (RuntimeException $e) {
    if (str_contains($e->getMessage(), 'Table is append-only')) {
        $stepUpdateBlocked = true;
    }
}
assertTest($stepUpdateBlocked, "5.3 Db::execute blocks UPDATE on sop_run_step table", $passes, $failures);

// -------------------------------------------------------------
// 6. Portfolio Integrity Check After Tests
// -------------------------------------------------------------
echo "\n--- 6. Final Portfolio Integrity Check ---\n";
$finalUnits = (int) $db->query("SELECT COUNT(*) FROM unit")->fetchColumn();
assertTest($finalUnits === 1289, "6.1 Total portfolio units remains EXACTLY 1,289", $passes, $failures);

echo "\n==========================================\n";
echo "SUMMARY: " . count($passes) . " PASSED, " . count($failures) . " FAILED\n";
echo "==========================================\n";

if (count($failures) > 0) {
    exit(1);
}
exit(0);
