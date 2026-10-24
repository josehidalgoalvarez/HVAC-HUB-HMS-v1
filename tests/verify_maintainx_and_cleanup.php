<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Watch;
use App\Models\PartWorkflow;
use App\Services\WatchEngine;

$passes = 0;
$failures = 0;

function assertTest(bool $condition, string $message, int &$passes, int &$failures): void
{
    if ($condition) {
        echo "[PASS] {$message}\n";
        $passes++;
    } else {
        echo "[FAIL] {$message}\n";
        $failures++;
    }
}

echo "=== Running MaintainX Adoptions & Dead-Code Audit Verification Suite ===\n\n";

// 1. Dead Code Removal Check
echo "--- 1. Dead Code Cleanup Audit ---\n";
assertTest(!file_exists(__DIR__ . '/../components/PropertyCard.tsx'), '1.1 Duplicate components/PropertyCard.tsx is deleted', $passes, $failures);
assertTest(!file_exists(__DIR__ . '/../components/notices/DraftNoticeModal.tsx'), '1.2 Orphaned components/notices/DraftNoticeModal.tsx is deleted', $passes, $failures);
assertTest(!file_exists(__DIR__ . '/../components/notices/NoticePipelineView.tsx'), '1.3 Orphaned components/notices/NoticePipelineView.tsx is deleted', $passes, $failures);
assertTest(!is_dir(__DIR__ . '/../components/notices'), '1.4 Orphaned components/notices directory is deleted', $passes, $failures);

// 2. Database Columns Verification
echo "\n--- 2. Database Schema: external_id and minimum ---\n";
$bCols = Db::fetchAll("PRAGMA table_info('building')");
$bColNames = array_column($bCols, 'name');
assertTest(in_array('external_id', $bColNames, true), "2.1 'external_id' column exists in building table", $passes, $failures);

$uCols = Db::fetchAll("PRAGMA table_info('unit')");
$uColNames = array_column($uCols, 'name');
assertTest(in_array('external_id', $uColNames, true), "2.2 'external_id' column exists in unit table", $passes, $failures);

$aCols = Db::fetchAll("PRAGMA table_info('appliance')");
$aColNames = array_column($aCols, 'name');
assertTest(in_array('external_id', $aColNames, true), "2.3 'external_id' column exists in appliance table", $passes, $failures);

$psCols = Db::fetchAll("PRAGMA table_info('part_stockpile')");
$psColNames = array_column($psCols, 'name');
assertTest(in_array('minimum', $psColNames, true), "2.4 'minimum' column exists in part_stockpile table", $passes, $failures);

// 3. Verified Yardi External IDs Check
echo "\n--- 3. Yardi External IDs Integration Record ---\n";
$bd1719 = Db::fetchOne("SELECT external_id FROM building WHERE name = '1719 Bath Road'");
assertTest(($bd1719['external_id'] ?? '') === 'bd1719', "3.1 1719 Bath has external_id 'bd1719'", $passes, $failures);

$bd1737 = Db::fetchOne("SELECT external_id FROM building WHERE name = '1737 Bath Road'");
assertTest(($bd1737['external_id'] ?? '') === 'bd1737', "3.2 1737 Bath has external_id 'bd1737'", $passes, $failures);

$bd0505 = Db::fetchOne("SELECT external_id FROM building WHERE name = '505 Days Road'");
assertTest(($bd0505['external_id'] ?? '') === 'bd0505', "3.3 505 Days has external_id 'bd0505'", $passes, $failures);

$bd0511 = Db::fetchOne("SELECT external_id FROM building WHERE name = '511 Days Road'");
assertTest(($bd0511['external_id'] ?? '') === 'bd0511', "3.4 511 Days has external_id 'bd0511'", $passes, $failures);

$prin = Db::fetchOne("SELECT external_id FROM building WHERE name = '800 Princess St — annex'");
assertTest(($prin['external_id'] ?? '') === '800prin', "3.5 800 Princess Annex has external_id '800prin'", $passes, $failures);

$alfr378 = Db::fetchOne("SELECT external_id FROM building WHERE name = '378 Alfred Street'");
assertTest(($alfr378['external_id'] ?? '') === '378alfr,alfr378', "3.6 378 Alfred has external_id '378alfr,alfr378'", $passes, $failures);

$alfr394 = Db::fetchOne("SELECT external_id FROM building WHERE name = '394 Alfred Street'");
assertTest(($alfr394['external_id'] ?? '') === '394alfr,alfr394', "3.7 394 Alfred has external_id '394alfr,alfr394'", $passes, $failures);

$sante = Db::fetchOne("SELECT external_id FROM building WHERE name = 'Le Santé'");
assertTest(($sante['external_id'] ?? '') === '300skyf,sante', "3.8 Le Sante has external_id '300skyf,sante'", $passes, $failures);

$manitou = Db::fetchOne("SELECT external_id FROM building WHERE name = '77A Manitou Crescent'");
assertTest(($manitou['external_id'] ?? '') === 'mn77a', "3.9 77A Manitou has external_id 'mn77a'", $passes, $failures);

// 4. Low-Stock Watch Signal
echo "\n--- 4. Low-Stock Watch Signal & Evaluation ---\n";
// Set part 3 at stockpile 1: quantity = 1, minimum = 3 -> below minimum
Db::execute("UPDATE part_stockpile SET quantity = 1, minimum = 3 WHERE part_id = 3 AND stockpile_id = 1");

$watch = Watch::create([
    'watch_type' => 'low_stock',
    'title' => 'Test Part 3 Low Stock',
    'target_id' => 3,
    'config' => ['stockpile_id' => 1],
]);
assertTest(!empty($watch['id']), "4.1 Successfully created 'low_stock' watch #{$watch['id']}", $passes, $failures);
assertTest($watch['watch_type'] === 'low_stock', "4.2 Watch type is 'low_stock'", $passes, $failures);
assertTest($watch['target_type'] === 'part', "4.3 Inferred target_type is 'part'", $passes, $failures);

$eval = WatchEngine::evaluateSingleWatch($watch, new DateTimeImmutable('now'));
assertTest($eval['should_trigger'] === true, "4.4 WatchEngine evaluates low-stock as should_trigger = true", $passes, $failures);
assertTest(str_contains($eval['reason'] ?? '', 'Low Stock'), "4.5 Trigger reason notes low stock condition", $passes, $failures);

// If quantity meets minimum, should NOT trigger
Db::execute("UPDATE part_stockpile SET quantity = 5, minimum = 3 WHERE part_id = 3 AND stockpile_id = 1");
$eval2 = WatchEngine::evaluateSingleWatch($watch, new DateTimeImmutable('now'));
assertTest($eval2['should_trigger'] === false, "4.6 Watch does not trigger when quantity >= minimum", $passes, $failures);
// Restore to 1 for low stock display
Db::execute("UPDATE part_stockpile SET quantity = 1, minimum = 3 WHERE part_id = 3 AND stockpile_id = 1");

// 5. Generalized Stock Transfers
echo "\n--- 5. Generalized Stock Transfers Between Stockpiles ---\n";
// Ensure part 3 has stock at stockpile 1 and row at stockpile 2
Db::execute("UPDATE part_stockpile SET quantity = 10 WHERE part_id = 3 AND stockpile_id = 1");
Db::execute("DELETE FROM part_stockpile WHERE part_id = 3 AND stockpile_id = 2");
Db::execute("INSERT INTO part_stockpile (part_id, stockpile_id, quantity, minimum, status, created_at, updated_at) VALUES (3, 2, 1, 1, 'available', datetime('now'), datetime('now'))");

$res = PartWorkflow::transferStock([
    'source_type' => 'stockpile',
    'source_stockpile_id' => 1,
    'destination_type' => 'stockpile',
    'destination_stockpile_id' => 2,
    'part_id' => 3,
    'quantity' => 3,
    'transferred_by' => 'Jose (Tech)',
    'notes' => 'Testing stockpile-to-stockpile transfer',
]);

assertTest(!empty($res['transfer_id']), "5.1 Transfer executed and transfer_id returned", $passes, $failures);

$sRow = Db::fetchOne("SELECT quantity FROM part_stockpile WHERE part_id = 3 AND stockpile_id = 1");
assertTest((int)$sRow['quantity'] === 7, "5.2 Source stockpile decremented by 3 (10 -> 7)", $passes, $failures);

$dRow = Db::fetchOne("SELECT quantity FROM part_stockpile WHERE part_id = 3 AND stockpile_id = 2");
assertTest((int)$dRow['quantity'] === 4, "5.3 Destination stockpile incremented by 3 (1 -> 4)", $passes, $failures);

$st = Db::fetchOne("SELECT * FROM stock_transfer WHERE id = ?", [$res['transfer_id']]);
assertTest($st && $st['source_type'] === 'stockpile' && $st['destination_type'] === 'stockpile', "5.4 stock_transfer record created with source_type='stockpile' and destination_type='stockpile'", $passes, $failures);

$corr = Db::fetchOne("SELECT * FROM correction WHERE entity_type = 'part' AND entity_id = 3 ORDER BY id DESC LIMIT 1");
assertTest($corr && str_contains($corr['reason'], 'Stock transfer between stockpiles'), "5.5 Append-only correction audit recorded for provenance", $passes, $failures);

// 6. Portfolio Unit Count Constraint
echo "\n--- 6. Portfolio Unit Count Constraint ---\n";
$totalUnits = (int) Db::fetchOne("SELECT COUNT(*) as cnt FROM unit")['cnt'];
assertTest($totalUnits === 1289, "6.1 Portfolio unit count is strictly 1,289 (got {$totalUnits})", $passes, $failures);

echo "\n============================================\n";
echo "Passes: {$passes} | Failures: {$failures}\n";
echo "============================================\n";

if ($failures > 0) {
    exit(1);
}
