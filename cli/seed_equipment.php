<?php

declare(strict_types=1);

/**
 * cli/seed_equipment.php
 *
 * Seeds physical tools and equipment at storage locations/stockpiles.
 *
 * Rules:
 * - Stockpile resolved by name match (case-insensitive), never by hardcoded ID.
 * - Loud failure if stockpile name is not found.
 * - Equipment must never become part rows or appliance rows.
 * - Idempotent by natural key (stockpile + equipment name).
 * - Default mode is --dry-run. Pass --apply to persist changes.
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

use App\Db;

$options = getopt('', ['dry-run', 'apply', 'file:']);
$isApply = isset($options['apply']);
$filePath = $options['file'] ?? (__DIR__ . '/inventory_seed_equipment_oct28.json');

echo "=== HVACHome Equipment Seeder ===\n";
echo "Mode: " . ($isApply ? "APPLY (writes to database)" : "DRY RUN (no changes written)") . "\n";
echo "Batch file: $filePath\n\n";

if (!file_exists($filePath)) {
    fwrite(STDERR, "Error: Batch file not found: $filePath\n");
    exit(1);
}

$rawJson = file_get_contents($filePath);
$items = json_decode($rawJson, true);
if (!is_array($items)) {
    fwrite(STDERR, "Error: Invalid JSON format in batch file\n");
    exit(1);
}

$pdo = Db::get();
if ($isApply) {
    $pdo->beginTransaction();
}

$report = [];
$now = gmdate('Y-m-d H:i:s');

try {
    foreach ($items as $idx => $item) {
        $spName = trim($item['stockpile_name'] ?? '');
        $name = trim($item['name'] ?? '');
        $category = isset($item['category']) && trim((string)$item['category']) !== '' ? trim((string)$item['category']) : null;
        $status = trim((string)($item['status'] ?? 'unknown'));
        $notes = isset($item['notes']) && trim((string)$item['notes']) !== '' ? trim((string)$item['notes']) : null;

        if ($spName === '') {
            throw new RuntimeException("Item #$idx missing stockpile_name");
        }
        if ($name === '') {
            throw new RuntimeException("Item #$idx missing equipment name");
        }

        // 1. Resolve stockpile BY NAME (fail loud)
        $spRow = Db::fetchOne("SELECT id, name FROM stockpile WHERE LOWER(name) = LOWER(?)", [$spName]);
        if (!$spRow) {
            throw new RuntimeException("FATAL: Stockpile not found by name: '{$spName}'");
        }
        $stockpileId = (int) $spRow['id'];

        // 2. Check idempotency: exists by stockpile_id + name
        $existing = Db::fetchOne(
            "SELECT id, name, status, stockpile_id FROM equipment WHERE stockpile_id = ? AND LOWER(name) = LOWER(?)",
            [$stockpileId, $name]
        );

        if ($existing) {
            $report[] = [
                'action' => 'SKIPPED (already exists)',
                'stockpile' => $spRow['name'],
                'stockpile_id' => $stockpileId,
                'name' => $name,
                'equipment_id' => (int) $existing['id'],
                'status' => $existing['status'],
            ];
            continue;
        }

        if ($isApply) {
            Db::execute(
                "INSERT INTO equipment (name, category, stockpile_id, status, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$name, $category, $stockpileId, $status, $notes, $now, $now]
            );
            $newId = (int) Db::lastInsertId();

            $report[] = [
                'action' => 'INSERTED',
                'stockpile' => $spRow['name'],
                'stockpile_id' => $stockpileId,
                'name' => $name,
                'equipment_id' => $newId,
                'status' => $status,
            ];
        } else {
            $report[] = [
                'action' => 'WOULD_INSERT',
                'stockpile' => $spRow['name'],
                'stockpile_id' => $stockpileId,
                'name' => $name,
                'equipment_id' => 'TBD (dry-run)',
                'status' => $status,
            ];
        }
    }

    if ($isApply) {
        $pdo->commit();
    }
} catch (Throwable $e) {
    if ($isApply && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Seeder error: " . $e->getMessage() . "\n");
    exit(1);
}

// Summary Report
echo str_pad("ACTION", 26) . str_pad("STOCKPILE", 28) . str_pad("EQUIPMENT", 26) . "STATUS\n";
echo str_repeat("-", 88) . "\n";
$counts = ['INSERTED' => 0, 'WOULD_INSERT' => 0, 'SKIPPED (already exists)' => 0];
foreach ($report as $r) {
    $act = $r['action'];
    $counts[$act] = ($counts[$act] ?? 0) + 1;
    echo str_pad($act, 26) .
         str_pad($r['stockpile'] . " (#{$r['stockpile_id']})", 28) .
         str_pad($r['name'], 26) .
         $r['status'] . "\n";
}
echo str_repeat("-", 88) . "\n";
echo "Summary: " . json_encode($counts) . "\n";
echo "Done.\n";
