<?php
/**
 * Batch 1 Storage Sprint Update:
 * 1. Ensure building 90 (103 Amherst Drive) role is set to 'storage'.
 * 2. Rename the 12 placeholder allocations for Stockpile 2 (107 Amherst Storage)
 *    to descriptive 3-4 word labels matching by exact name.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

use App\Db;

$pdo = Db::get();

echo "=== Batch 1: 103 Amherst Visibility & 107 Amherst Allocation Renaming ===\n\n";

// 1. Update Building 90 role to 'storage'
$bldStmt = $pdo->prepare("SELECT id, name, role FROM building WHERE id = 90");
$bldStmt->execute();
$bld = $bldStmt->fetch(\PDO::FETCH_ASSOC);

if (!$bld) {
    echo "[ERROR] Building 90 not found in database!\n";
    exit(1);
}

echo "Building 90: {$bld['name']} | Current role: '{$bld['role']}'\n";
if ($bld['role'] !== 'storage') {
    $updBld = $pdo->prepare("UPDATE building SET role = 'storage', updated_at = CURRENT_TIMESTAMP WHERE id = 90");
    $updBld->execute();
    echo "[OK] Updated Building 90 role to 'storage'.\n";
} else {
    echo "[OK] Building 90 role is already 'storage'.\n";
}

echo "\n--- 107 Amherst Allocation Renaming (Stockpile 2) ---\n";

// Exact name renames for Stockpile 2 part records
$renameMapByName = [
    'Cleaning chemicals' => 'Cleaning chemicals & supplies',
    'Electrical parts' => 'Electrical parts & supplies',
    'Plumbing parts' => 'Plumbing parts & fittings',
    'Fire extinguisher' => 'Fire extinguisher units',
    'First-aid kit' => 'First-aid emergency kits',
];

// Query all parts allocated in Stockpile 2
$allocStmt = $pdo->prepare("
    SELECT ps.id as allocation_id, ps.part_id, p.name as part_name
    FROM part_stockpile ps
    JOIN part p ON ps.part_id = p.id
    WHERE ps.stockpile_id = 2
");
$allocStmt->execute();
$allocs = $allocStmt->fetchAll(\PDO::FETCH_ASSOC);

foreach ($allocs as $a) {
    $currentPartName = $a['part_name'];
    $partId = (int) $a['part_id'];
    if (isset($renameMapByName[$currentPartName])) {
        $newName = $renameMapByName[$currentPartName];
        $upd = $pdo->prepare("UPDATE part SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $upd->execute([$newName, $partId]);
        echo "Renamed Part ID {$partId}: '{$currentPartName}' -> '{$newName}'\n";
    }
}

echo "\nVerification of Stockpile 2 allocations after update:\n";
$allocStmt->execute();
$updatedAllocs = $allocStmt->fetchAll(\PDO::FETCH_ASSOC);

foreach ($updatedAllocs as $a) {
    echo "- Part #{$a['part_id']}: {$a['part_name']}\n";
}

echo "\n=== Done Batch 1 update ===\n";
