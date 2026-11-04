<?php
/**
 * CLI Seeder for 692 McKay Warehouse Inventory (Nov 4 photos)
 * Usage:
 *   php cli/seed_692_mckay_warehouse_nov04.php [--dry-run] [--apply]
 */

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

$apply = in_array('--apply', $argv, true);
$dryRun = in_array('--dry-run', $argv, true) || !$apply;

echo "=== 692 McKay Warehouse Inventory Seeder ===\n";
echo "Mode: " . ($apply ? "APPLY (LIVE WRITE)" : "DRY RUN (NO WRITES)") . "\n\n";

$seedFile = __DIR__ . '/inventory_seed_692_mckay_nov04.json';
if (!file_exists($seedFile)) {
    echo "ERROR: Seed file not found at {$seedFile}\n";
    exit(1);
}

$seed = json_decode(file_get_contents($seedFile), true);
if (!$seed) {
    echo "ERROR: Failed to parse seed JSON\n";
    exit(1);
}

$pdo = App\Db::get();

// Step 0: Resolve Target Stockpile by name
$targetName = $seed['target_stockpile_name'] ?? '698 McKay St Warehouse';
$stmt = $pdo->prepare("SELECT id, name, location FROM stockpile WHERE name = ?");
$stmt->execute([$targetName]);
$stockpile = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$stockpile) {
    echo "ERROR: Target stockpile '{$targetName}' not found.\n";
    exit(1);
}

$stockpileId = (int) $stockpile['id'];
echo "Resolved Target Stockpile: ID {$stockpileId} ('{$stockpile['name']}')\n\n";

// Confirm-only checks
$broan = $pdo->query("SELECT ps.id, ps.quantity FROM part_stockpile ps JOIN part p ON ps.part_id = p.id WHERE ps.stockpile_id = {$stockpileId} AND p.name LIKE '%Broan%DX110%'")->fetch(PDO::FETCH_ASSOC);
$dc = $pdo->query("SELECT ps.id, ps.quantity FROM part_stockpile ps JOIN part p ON ps.part_id = p.id WHERE ps.stockpile_id = {$stockpileId} AND p.name LIKE '%Door closer%'")->fetch(PDO::FETCH_ASSOC);
$bc = $pdo->query("SELECT ps.id FROM part_stockpile ps JOIN part p ON ps.part_id = p.id WHERE ps.stockpile_id = {$stockpileId} AND (p.name LIKE '%BrassCraft%' OR p.name LIKE '%Dahl%')")->fetch(PDO::FETCH_ASSOC);
$rh = $pdo->query("SELECT ps.id FROM part_stockpile ps JOIN part p ON ps.part_id = p.id WHERE ps.stockpile_id = {$stockpileId} AND p.name LIKE '%Robe hook%'")->fetch(PDO::FETCH_ASSOC);

echo "Confirm-Only Checks:\n";
echo "  - Broan DX110 bath fan: " . ($broan ? "CONFIRMED present (alloc ID {$broan['id']})" : "MISSING") . "\n";
echo "  - Door closers: " . ($dc ? "CONFIRMED present (alloc ID {$dc['id']}, qty {$dc['quantity']}) — NOT totalled" : "MISSING") . "\n";
echo "  - BrassCraft / Dahl valves: " . ($bc ? "CONFIRMED present (alloc ID {$bc['id']})" : "MISSING") . "\n";
echo "  - Moen robe hooks: " . ($rh ? "CONFIRMED present (alloc ID {$rh['id']})" : "MISSING") . "\n\n";

// Catalog maps
$allPartsStmt = $pdo->query("SELECT id, name, part_number, category FROM part");
$catalogByName = [];
$catalogByPn = [];
while ($r = $allPartsStmt->fetch(PDO::FETCH_ASSOC)) {
    $catalogByName[strtolower(trim($r['name']))] = $r;
    if (!empty($r['part_number'])) {
        $catalogByPn[strtolower(trim($r['part_number']))] = $r;
    }
}

$existingAllocsStmt = $pdo->prepare("SELECT part_id, id FROM part_stockpile WHERE stockpile_id = ?");
$existingAllocsStmt->execute([$stockpileId]);
$stockpileAllocPartIds = [];
while ($ar = $existingAllocsStmt->fetch(PDO::FETCH_ASSOC)) {
    $stockpileAllocPartIds[(int)$ar['part_id']] = (int)$ar['id'];
}

$existingEqStmt = $pdo->prepare("SELECT id, name FROM equipment WHERE stockpile_id = ?");
$existingEqStmt->execute([$stockpileId]);
$stockpileEqByName = [];
while ($er = $existingEqStmt->fetch(PDO::FETCH_ASSOC)) {
    $stockpileEqByName[strtolower(trim($er['name']))] = (int)$er['id'];
}

$allSeedParts = array_merge($seed['parts_printed'] ?? [], $seed['parts_tbd'] ?? []);
$now = gmdate('Y-m-d H:i:s');

$partsCreated = 0;
$partsReused = 0;
$allocsCreated = 0;
$allocsSkipped = 0;

if ($apply) {
    $pdo->beginTransaction();
}

$partInsert = $pdo->prepare("INSERT INTO part (name, part_number, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
$allocInsert = $pdo->prepare("INSERT INTO part_stockpile (part_id, stockpile_id, quantity, status, location_notes, minimum, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

foreach ($allSeedParts as $p) {
    $pName = trim($p['name']);
    $pPn = !empty($p['part_number']) ? trim($p['part_number']) : null;
    $pCat = $p['category'];
    $qty = $p['quantity'];
    $status = $p['status'];
    $notes = $p['location_notes'];
    $min = $p['minimum'] ?? 1;

    $matched = null;
    if ($pPn && isset($catalogByPn[strtolower($pPn)])) {
        $matched = $catalogByPn[strtolower($pPn)];
    } elseif (isset($catalogByName[strtolower($pName)])) {
        $matched = $catalogByName[strtolower($pName)];
    }

    if ($matched) {
        $partId = (int)$matched['id'];
        $partsReused++;
    } else {
        if ($apply) {
            $partInsert->execute([$pName, $pPn, $pCat, $notes, $now, $now]);
            $partId = (int)$pdo->lastInsertId();
            $catalogByName[strtolower($pName)] = ['id' => $partId, 'name' => $pName];
            if ($pPn) $catalogByPn[strtolower($pPn)] = ['id' => $partId, 'name' => $pName];
        } else {
            $partId = -1;
        }
        $partsCreated++;
    }

    if ($partId > 0 && isset($stockpileAllocPartIds[$partId])) {
        $allocsSkipped++;
    } else {
        if ($apply) {
            $allocInsert->execute([$partId, $stockpileId, $qty, $status, $notes, $min, $now, $now]);
            $allocId = (int)$pdo->lastInsertId();
            $stockpileAllocPartIds[$partId] = $allocId;
        }
        $allocsCreated++;
    }
}

// Equipment
$eqCreated = 0;
$eqSkipped = 0;
$eqInsert = $pdo->prepare("INSERT INTO equipment (stockpile_id, name, category, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");

foreach ($seed['equipment'] as $e) {
    $eName = trim($e['name']);
    if (isset($stockpileEqByName[strtolower($eName)])) {
        $eqSkipped++;
    } else {
        if ($apply) {
            $eqInsert->execute([$stockpileId, $eName, $e['category'], $e['status'], $e['notes'], $now, $now]);
            $eqId = (int)$pdo->lastInsertId();
            $stockpileEqByName[strtolower($eName)] = $eqId;
        }
        $eqCreated++;
    }
}

if ($apply) {
    $pdo->commit();
}

echo "Seeder Results:\n";
echo "  - Parts Created: {$partsCreated}\n";
echo "  - Parts Reused: {$partsReused}\n";
echo "  - Allocations Created: {$allocsCreated}\n";
echo "  - Allocations Skipped (duplicates): {$allocsSkipped}\n";
echo "  - Equipment Created: {$eqCreated}\n";
echo "  - Equipment Skipped (duplicates): {$eqSkipped}\n";
echo "Done.\n";
