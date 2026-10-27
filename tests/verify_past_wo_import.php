<?php

declare(strict_types=1);

/**
 * Verification Suite for Past Work Order Context Importer
 *
 * Runs exclusively against a TEMPORARY SQLite database (never the dev DB).
 * Asserts:
 *   (a) a row with an already-existing wo_number is skipped, not duplicated
 *   (b) a row with an unknown unit fails without writing
 *   (c) an on_hold row imports as on_hold
 *   (d) description_verbatim is stored byte-identical
 *   (e) a child row with a missing parent imports unlinked and flagged
 *   (f) --dry-run writes nothing
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../cli/import_past_wos.php';

use App\Db;

$passes = [];
$failures = [];

function assertTest(bool $condition, string $assertionKey, string $description, array &$passes, array &$failures): void {
    if ($condition) {
        $passes[$assertionKey] = $description;
        echo "[PASS] ({$assertionKey}) {$description}\n";
    } else {
        $failures[$assertionKey] = $description;
        echo "[FAIL] ({$assertionKey}) {$description}\n";
    }
}

echo "=== Running Past Work Order Import Verification Suite ===\n\n";

// Create an isolated temporary SQLite database
$tempDbPath = sys_get_temp_dir() . '/hvachome_past_wo_test_' . bin2hex(random_bytes(8)) . '.sqlite';
if (file_exists($tempDbPath)) {
    unlink($tempDbPath);
}

try {
    $pdo = new PDO("sqlite:{$tempDbPath}", null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON;');

    // Initialize full schema
    Db::ensureSqliteSchema($pdo);

    // Seed test building and unit
    $pdo->exec("
        INSERT INTO building (id, name, address) VALUES (1, '1719 Bath Road', '1719 Bath Road, Kingston');
        INSERT INTO unit (id, building_id, unit_number) VALUES (10, 1, '273');
        INSERT INTO unit (id, building_id, unit_number) VALUES (11, 1, '101');
    ");

    // -------------------------------------------------------------
    // Assertion (f): --dry-run writes nothing
    // -------------------------------------------------------------
    $dryRunImporter = new PastWoImporter($pdo, true);
    $batchF = [
        [
            'wo_number' => 'WO-TEST-F01',
            'property' => '1719 Bath Road',
            'unit' => '273',
            'description_verbatim' => 'Test dry run verbatim text',
            'status' => 'closed',
        ],
    ];

    $summaryF = $dryRunImporter->importRows($batchF);
    $countAfterDryRun = (int) $pdo->query('SELECT COUNT(*) FROM ticket')->fetchColumn();
    $timelineCountAfterDryRun = (int) $pdo->query('SELECT COUNT(*) FROM ticket_timeline')->fetchColumn();

    assertTest(
        $summaryF['created'] === 1 && $countAfterDryRun === 0 && $timelineCountAfterDryRun === 0,
        'f',
        '--dry-run simulates creation but writes nothing to database (tickets: ' . $countAfterDryRun . ', timeline: ' . $timelineCountAfterDryRun . ')',
        $passes,
        $failures
    );

    // -------------------------------------------------------------
    // Assertion (d): description_verbatim is stored byte-identical
    // -------------------------------------------------------------
    $liveImporter = new PastWoImporter($pdo, false);
    $exactVerbatim = "Line 1: Special chars & quote: \"O'Reilly & Sons\" -- 100% verified.\nLine 2: unicode \u{00B0}C and tabs\t\tend.";
    $batchD = [
        [
            'wo_number' => 'WO-TEST-D01',
            'property' => '1719 Bath Road',
            'unit' => '273',
            'description_verbatim' => $exactVerbatim,
            'status' => 'closed',
        ],
    ];

    $summaryD = $liveImporter->importRows($batchD);
    $ticketD = $pdo->query("SELECT * FROM ticket WHERE wo_number = 'WO-TEST-D01'")->fetch();
    $isIdenticalVerbatim = ($ticketD !== false) && ($ticketD['verbatim_text'] === $exactVerbatim) && ($ticketD['description'] === $exactVerbatim);

    assertTest(
        $isIdenticalVerbatim,
        'd',
        'description_verbatim is stored byte-identical in verbatim_text and description',
        $passes,
        $failures
    );

    // -------------------------------------------------------------
    // Assertion (c): an on_hold row imports as on_hold
    // -------------------------------------------------------------
    $batchC = [
        [
            'wo_number' => 'WO-TEST-C01',
            'property' => '1719 Bath Road',
            'unit' => '101',
            'description_verbatim' => 'On hold waiting for compressor warranty approval',
            'status' => 'on_hold',
        ],
    ];

    $summaryC = $liveImporter->importRows($batchC);
    $ticketC = $pdo->query("SELECT status FROM ticket WHERE wo_number = 'WO-TEST-C01'")->fetch();
    $isOnHold = ($ticketC !== false) && ($ticketC['status'] === 'on-hold');

    assertTest(
        $isOnHold,
        'c',
        "an on_hold row imports strictly with status 'on-hold' (got: " . ($ticketC['status'] ?? 'null') . ')',
        $passes,
        $failures
    );

    // -------------------------------------------------------------
    // Assertion (a): a row with an already-existing wo_number is skipped, not duplicated
    // -------------------------------------------------------------
    $initialTotalTickets = (int) $pdo->query('SELECT COUNT(*) FROM ticket')->fetchColumn();
    $batchA = [
        [
            'wo_number' => 'WO-TEST-D01', // Already created above in test (d)
            'property' => '1719 Bath Road',
            'unit' => '273',
            'description_verbatim' => 'Duplicate attempt of WO-TEST-D01',
            'status' => 'closed',
        ],
    ];

    $summaryA = $liveImporter->importRows($batchA);
    $afterTotalTickets = (int) $pdo->query('SELECT COUNT(*) FROM ticket')->fetchColumn();
    $woDCount = (int) $pdo->query("SELECT COUNT(*) FROM ticket WHERE wo_number = 'WO-TEST-D01'")->fetchColumn();

    assertTest(
        $summaryA['skipped'] === 1 && $summaryA['created'] === 0 && $afterTotalTickets === $initialTotalTickets && $woDCount === 1,
        'a',
        'a row with an already-existing wo_number is skipped, not duplicated (skipped: ' . $summaryA['skipped'] . ', count: ' . $woDCount . ')',
        $passes,
        $failures
    );

    // -------------------------------------------------------------
    // Assertion (b): a row with an unknown unit fails without writing
    // -------------------------------------------------------------
    $initialTicketsB = (int) $pdo->query('SELECT COUNT(*) FROM ticket')->fetchColumn();
    $batchB = [
        [
            'wo_number' => 'WO-TEST-B01',
            'property' => '1719 Bath Road',
            'unit' => '9999-DOES-NOT-EXIST',
            'description_verbatim' => 'Non-existent unit repair',
            'status' => 'closed',
        ],
    ];

    $summaryB = $liveImporter->importRows($batchB);
    $afterTicketsB = (int) $pdo->query('SELECT COUNT(*) FROM ticket')->fetchColumn();
    $ticketBExists = (bool) $pdo->query("SELECT id FROM ticket WHERE wo_number = 'WO-TEST-B01'")->fetch();

    assertTest(
        $summaryB['failed'] === 1 && $afterTicketsB === $initialTicketsB && !$ticketBExists,
        'b',
        'a row with an unknown unit fails without writing (failed: ' . $summaryB['failed'] . ', row written: ' . ($ticketBExists ? 'yes' : 'no') . ')',
        $passes,
        $failures
    );

    // -------------------------------------------------------------
    // Assertion (e): a child row with a missing parent imports unlinked and flagged
    // -------------------------------------------------------------
    $batchE = [
        [
            'wo_number' => 'WO-TEST-E01',
            'property' => '1719 Bath Road',
            'unit' => '273',
            'description_verbatim' => 'Child ticket whose parent WO-999999 does not exist yet',
            'status' => 'closed',
            'parent_wo_number' => 'WO-999999',
        ],
    ];

    $summaryE = $liveImporter->importRows($batchE);
    $ticketE = $pdo->query("SELECT * FROM ticket WHERE wo_number = 'WO-TEST-E01'")->fetch();
    $timelineE = $pdo->query("SELECT * FROM ticket_timeline WHERE ticket_id = {$ticketE['id']}")->fetch();

    $isUnlinkedAndFlagged = ($ticketE !== false)
        && ($ticketE['parent_ticket_id'] === null)
        && ($summaryE['unlinked_parents'] === 1)
        && ($timelineE !== false)
        && str_contains($timelineE['note'], 'WO-999999');

    assertTest(
        $isUnlinkedAndFlagged,
        'e',
        'a child row with a missing parent imports unlinked and flagged (parent_ticket_id is null: ' . ($ticketE['parent_ticket_id'] === null ? 'yes' : 'no') . ', flagged: ' . $summaryE['unlinked_parents'] . ')',
        $passes,
        $failures
    );

} finally {
    if (file_exists($tempDbPath)) {
        unlink($tempDbPath);
    }
}

echo "\n============================================\n";
echo "Passes: " . count($passes) . " | Failures: " . count($failures) . "\n";
echo "Assertions verified: " . implode(', ', array_keys($passes)) . "\n";
echo "============================================\n";

exit(count($failures) > 0 ? 1 : 0);
