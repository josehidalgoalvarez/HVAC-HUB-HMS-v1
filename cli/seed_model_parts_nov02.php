<?php
declare(strict_types=1);

/**
 * cli/seed_model_parts_nov02.php
 *
 * Seeds verified model parts into the Part catalog (part table).
 *
 * Requirements:
 * - Reads cli/model_parts_seed_nov02.json (exactly 5 verified parts)
 * - Supports --dry-run (default) and --run flags
 * - Resolves preferred_supplier_id for 'Dependable%' (Dependable Appliances)
 * - Existing-part rule: before seeding, checks findByPartNumber.
 *   - If exists: UPDATE compatible_models and preferred_supplier_id ONLY.
 *     Preserves existing quantity_on_hand, stockpile_id, unit_cost, and part_stockpile allocations.
 *   - If new: creates part with quantity_on_hand = 0, stockpile_id = NULL, min_quantity = 0.
 * - NEVER creates, modifies, or deletes any part_stockpile rows.
 * - 137 Amherst unit 137 switch (WB24T10025) is NOT in this seeder (unit-only exception in frontend).
 */

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';
require_once __DIR__ . '/../src/Models/Part.php';

use App\Db;
use App\Models\Part;

$isRun = in_array('--run', $argv, true);
$mode = $isRun ? 'RUN (LIVE APPLY)' : 'DRY-RUN (NO CHANGES)';

echo "=== Model Parts Seeder Nov 02, 2026 ===\n";
echo "Mode: $mode\n\n";

$jsonFile = __DIR__ . '/model_parts_seed_nov02.json';
if (!file_exists($jsonFile)) {
    echo "ERROR: Seed file not found: $jsonFile\n";
    exit(1);
}

$items = json_decode(file_get_contents($jsonFile), true);
if (!is_array($items) || count($items) !== 5) {
    echo "ERROR: Expected exactly 5 items in $jsonFile, got " . (is_array($items) ? count($items) : 0) . "\n";
    exit(1);
}

// 1. Resolve Dependable supplier ID
$supplier = Db::fetchOne("SELECT id, name FROM supplier WHERE name LIKE :name ORDER BY id ASC LIMIT 1", [
    'name' => '%Dependable%'
]);

if (!$supplier) {
    echo "ERROR: Could not resolve Dependable supplier (name LIKE '%Dependable%')\n";
    exit(1);
}

$supplierId = (int) $supplier['id'];
$supplierName = $supplier['name'];
echo "Resolved Supplier: [ID $supplierId] $supplierName\n\n";

// Count allocations before
$allocCountBefore = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM part_stockpile")['cnt'] ?? 0);
$partCountBefore = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM part")['cnt'] ?? 0);

echo "Initial State: $partCountBefore parts, $allocCountBefore part_stockpile allocations\n";
echo "--------------------------------------------------------------------------------\n";

$createdCount = 0;
$updatedCount = 0;
$results = [];

foreach ($items as $idx => $item) {
    $num = $idx + 1;
    $pn = trim($item['part_number']);
    $name = trim($item['name']);
    $category = trim($item['category']);
    $models = $item['compatible_models'] ?? [];
    $evidence = $item['evidence'] ?? '';
    $modelsJson = json_encode($models);

    echo "[$num/5] Part: $name (PN: $pn)\n";
    echo "       Category: $category | Models: " . implode(', ', $models) . "\n";

    // Check existing
    $existing = Part::findByPartNumber($pn);

    if ($existing) {
        $existingId = (int) $existing['id'];
        echo "       Status: EXISTS (ID: $existingId)\n";
        echo "       Existing Qty: {$existing['quantity_on_hand']}, Stockpile: " . ($existing['stockpile_id'] ?? 'NULL') . "\n";
        echo "       Action: UPDATE compatible_models & preferred_supplier_id only (preserve stock)\n";

        if ($isRun) {
            Db::execute(
                "UPDATE part SET compatible_models = :models, preferred_supplier_id = :supplier_id, updated_at = CURRENT_TIMESTAMP WHERE id = :id",
                [
                    'models' => $modelsJson,
                    'supplier_id' => $supplierId,
                    'id' => $existingId
                ]
            );
        }
        $updatedCount++;
        $results[] = [
            'part_number' => $pn,
            'name' => $name,
            'action' => 'UPDATE',
            'id' => $existingId,
            'models' => $models
        ];
    } else {
        echo "       Status: NEW\n";
        echo "       Action: INSERT with qty=0, stockpile=NULL, supplier_id=$supplierId\n";

        if ($isRun) {
            // Direct insert or Part::create with quantity_on_hand = 0, stockpile_id = null
            // Note: Direct insert ensures no side effects with part_stockpile
            $sql = "INSERT INTO part (name, part_number, category, description, quantity_on_hand, min_quantity, reorder_point, unit_cost, stockpile_id, compatible_models, preferred_supplier_id, is_reorder, created_at, updated_at)
                    VALUES (:name, :part_number, :category, :description, 0, 0, 0, 0, NULL, :compatible_models, :preferred_supplier_id, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
            Db::execute($sql, [
                'name' => $name,
                'part_number' => $pn,
                'category' => $category,
                'description' => $evidence,
                'compatible_models' => $modelsJson,
                'preferred_supplier_id' => $supplierId
            ]);
            $inserted = Part::findByPartNumber($pn);
            $newId = $inserted ? (int) $inserted['id'] : null;
            echo "       Created Part ID: $newId\n";
        }
        $createdCount++;
        $results[] = [
            'part_number' => $pn,
            'name' => $name,
            'action' => 'INSERT',
            'id' => 'NEW',
            'models' => $models
        ];
    }
    echo "\n";
}

echo "--------------------------------------------------------------------------------\n";
echo "Summary ($mode):\n";
echo "- Total Items Processed: 5\n";
echo "- Inserted (new): $createdCount\n";
echo "- Updated (existing): $updatedCount\n";

// Count allocations after
$allocCountAfter = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM part_stockpile")['cnt'] ?? 0);
$partCountAfter = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM part")['cnt'] ?? 0);

echo "\nState after execution:\n";
echo "- Parts count: $partCountBefore -> $partCountAfter (diff: " . ($partCountAfter - $partCountBefore) . ")\n";
echo "- Allocations count: $allocCountBefore -> $allocCountAfter (diff: " . ($allocCountAfter - $allocCountBefore) . ")\n";

if ($allocCountAfter !== $allocCountBefore) {
    echo "\nWARNING: part_stockpile count changed! This should NOT have happened.\n";
    exit(2);
}

echo "\nVerification passed: 0 allocations created/modified/deleted.\n";
if (!$isRun) {
    echo "Dry run complete. No database changes were made.\n";
} else {
    echo "Run complete. Database changes successfully applied.\n";
}
