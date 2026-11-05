<?php
/**
 * CLI Seeder for 265 Ontario + 511 Days Rd Storage (Nov 4 report)
 * Usage:
 *   php cli/seed_265_511_storage_nov04.php [--dry-run] [--apply]
 */

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

$apply = in_array('--apply', $argv, true);
$dryRun = in_array('--dry-run', $argv, true) || !$apply;

echo "=== 265 Ontario + 511 Days Rd Storage Seeder ===\n";
echo "Mode: " . ($apply ? "APPLY (LIVE WRITE)" : "DRY RUN (NO WRITES)") . "\n\n";

$seedFile = __DIR__ . '/inventory_seed_265_511_nov04.json';
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

// Step 0: Resolve Target Stockpiles by name
$targets = [
    'upstairs' => $seed['section_a_target'],
    'basement' => $seed['section_b_target'],
    'sp511' => $seed['section_c_target']
];

$stockpiles = [];
foreach ($targets as $key => $name) {
    $stmt = $pdo->prepare("SELECT id, name, location, notes FROM stockpile WHERE name = ?");
    $stmt->execute([$name]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($rows) !== 1) {
        echo "ERROR: Stockpile target '{$name}' not found uniquely (found " . count($rows) . ")\n";
        exit(1);
    }
    $stockpiles[$key] = $rows[0];
    echo "Resolved {$key}: ID {$rows[0]['id']} ('{$rows[0]['name']}')\n";
}
echo "\n";

$now = gmdate('Y-m-d H:i:s');
$upstairsId = (int)$stockpiles['upstairs']['id'];
$basementId = (int)$stockpiles['basement']['id'];
$sp511Id = (int)$stockpiles['sp511']['id'];

if ($apply) {
    $pdo->beginTransaction();
}

$partInsert = $pdo->prepare("INSERT INTO part (name, part_number, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
$allocInsert = $pdo->prepare("INSERT INTO part_stockpile (part_id, stockpile_id, quantity, status, location_notes, minimum, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
$eqInsert = $pdo->prepare("INSERT INTO equipment (stockpile_id, name, category, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
$notesUpdate = $pdo->prepare("UPDATE stockpile SET notes = ?, updated_at = ? WHERE id = ?");

// Catalog maps
$allPartsStmt = $pdo->query("SELECT id, name, part_number, category FROM part");
$catalogByName = [];
while ($r = $allPartsStmt->fetch(PDO::FETCH_ASSOC)) {
    $catalogByName[strtolower(trim($r['name']))] = $r;
}

$partsCreated = 0;
$allocsCreated = 0;
$eqCreated = 0;
$allocsSkipped = 0;

// Section A: 265 Upstairs Parts
foreach ($seed['section_a_parts'] as $p) {
    $pName = trim($p['name']);
    $pCat = $p['category'];
    $qty = $p['quantity'];
    $status = $p['status'];
    $notes = $p['location_notes'];
    $min = $p['minimum'] ?? 1;

    if ($apply) {
        $partInsert->execute([$pName, null, $pCat, $notes, $now, $now]);
        $partId = (int)$pdo->lastInsertId();
        $allocInsert->execute([$partId, $upstairsId, $qty, $status, $notes, $min, $now, $now]);
    }
    $partsCreated++;
    $allocsCreated++;
}

// Section A: 265 Upstairs Equipment
foreach ($seed['section_a_equipment'] as $e) {
    $eName = trim($e['name']);
    if ($apply) {
        $eqInsert->execute([$upstairsId, $eName, $e['category'], $e['status'], $e['notes'], $now, $now]);
    }
    $eqCreated++;
}

// Section A: Notes append
if (!empty($seed['section_a_notes_append'])) {
    $newNotes = ($stockpiles['upstairs']['notes'] ?? '') . $seed['section_a_notes_append'];
    if ($apply) {
        $notesUpdate->execute([$newNotes, $now, $upstairsId]);
    }
    echo "Section A: Appended facilities notes to 265 Upstairs.\n";
}

// Section B: Notes append (NO stock rows)
if (!empty($seed['section_b_notes_append'])) {
    $newNotes = ($stockpiles['basement']['notes'] ?? '') . $seed['section_b_notes_append'];
    if ($apply) {
        $notesUpdate->execute([$newNotes, $now, $basementId]);
    }
    echo "Section B: Appended room/junk notes to 265 Basement (NO stock rows).\n";
}

// Section C: 511 Days Rd (Check duplicates against existing 511 allocations)
$stmt511Names = $pdo->prepare("SELECT p.name FROM part_stockpile ps JOIN part p ON ps.part_id = p.id WHERE ps.stockpile_id = ?");
$stmt511Names->execute([$sp511Id]);
$sp511PartNames = [];
while ($pRow = $stmt511Names->fetch(PDO::FETCH_ASSOC)) {
    $sp511PartNames[] = strtolower(trim($pRow['name']));
}

foreach ($seed['section_c_parts'] as $p) {
    $pName = trim($p['name']);
    $matchExisting = trim($p['match_existing'] ?? '');
    
    $isDuplicate = false;
    foreach ($sp511PartNames as $existingName) {
        if (strtolower($existingName) === strtolower($pName) ||
            ($matchExisting && strtolower($existingName) === strtolower($matchExisting)) ||
            (strpos($existingName, strtolower($pName)) !== false) ||
            ($matchExisting && strpos($existingName, strtolower($matchExisting)) !== false)) {
            $isDuplicate = true;
            break;
        }
    }

    if ($isDuplicate) {
        $allocsSkipped++;
        echo "Section C: Skipped duplicate '{$pName}' (already exists at 511 Days Rd Storage)\n";
    } else {
        if ($apply) {
            $partInsert->execute([$pName, null, $p['category'], $p['location_notes'], $now, $now]);
            $partId = (int)$pdo->lastInsertId();
            $allocInsert->execute([$partId, $sp511Id, $p['quantity'], $p['status'], $p['location_notes'], $p['minimum'] ?? 1, $now, $now]);
        }
        $partsCreated++;
        $allocsCreated++;
    }
}

if ($apply) {
    $pdo->commit();
}

echo "\nSummary of Operations:\n";
echo "  - Parts Created: {$partsCreated}\n";
echo "  - Allocations Created: {$allocsCreated}\n";
echo "  - Equipment Created: {$eqCreated}\n";
echo "  - Allocations Skipped (duplicates): {$allocsSkipped}\n";
echo "Done.\n";
