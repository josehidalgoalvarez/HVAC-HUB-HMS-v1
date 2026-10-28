<?php

declare(strict_types=1);

/**
 * cli/seed_stored_appliances.php
 *
 * Seeds stored appliances at storage locations/stockpiles.
 *
 * Rules:
 * - Stockpile resolved by name match (case-insensitive), never by hardcoded ID.
 * - Loud failure if stockpile name is not found.
 * - Stored appliances must never become part rows (no writes to part or part_stockpile).
 * - Idempotent by natural key (stockpile + appliance name).
 * - Default mode is --dry-run. Pass --apply to persist changes.
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

use App\Db;

$options = getopt('', ['dry-run', 'apply', 'file:']);
$isApply = isset($options['apply']);
$filePath = $options['file'] ?? (__DIR__ . '/inventory_seed_stored_appliances_oct27.json');

echo "=== HVACHome Stored Appliances Seeder ===\n";
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
        $type = trim($item['type'] ?? 'Appliance');
        $status = trim($item['status'] ?? 'stored');
        $model = isset($item['model_number']) && $item['model_number'] !== '' ? $item['model_number'] : null;
        $serial = isset($item['serial_number']) && $item['serial_number'] !== '' ? $item['serial_number'] : null;
        $brand = trim($item['brand'] ?? 'Unknown');
        $notes = trim($item['notes'] ?? '');

        if ($spName === '') {
            throw new RuntimeException("Item #$idx missing stockpile_name");
        }
        if ($name === '') {
            throw new RuntimeException("Item #$idx missing appliance name");
        }

        // 1. Resolve stockpile BY NAME (fail loud)
        $spRow = Db::fetchOne("SELECT id, name, building_id, location FROM stockpile WHERE LOWER(name) = LOWER(?)", [$spName]);
        if (!$spRow) {
            throw new RuntimeException("FATAL: Stockpile not found by name: '{$spName}'");
        }
        $stockpileId = (int) $spRow['id'];
        $buildingId = $spRow['building_id'] !== null ? (int) $spRow['building_id'] : null;
        $locationStr = $spRow['location'] ?? $spRow['name'];

        // 2. Check idempotency: exists by stockpile_id + name
        $existing = Db::fetchOne(
            "SELECT id, name, status, stockpile_id FROM appliance WHERE stockpile_id = ? AND LOWER(name) = LOWER(?)",
            [$stockpileId, $name]
        );

        if ($existing) {
            $report[] = [
                'action' => 'SKIPPED (already exists)',
                'stockpile' => $spRow['name'],
                'stockpile_id' => $stockpileId,
                'name' => $name,
                'appliance_id' => (int) $existing['id'],
            ];
            continue;
        }

        $propertyId = $buildingId !== null ? "property-{$buildingId}" : "stockpile-{$stockpileId}";

        if ($isApply) {
            Db::execute(
                "INSERT INTO appliance (stockpile_id, property_id, building_id, unit_id, name, type, brand, model_number, serial_number, location, status, notes, created_at, updated_at)
                 VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$stockpileId, $propertyId, $buildingId, $name, $type, $brand, $model, $serial, $locationStr, $status, $notes, $now, $now]
            );
            $newAppId = (int) Db::lastInsertId();

            // Record initial movement (stored into stockpile)
            Db::execute(
                "INSERT INTO appliance_movement (appliance_id, from_stockpile_id, from_unit_id, to_stockpile_id, to_unit_id, disposition, movement_date, moved_by, notes, created_at)
                 VALUES (?, NULL, NULL, ?, NULL, 'stored', ?, 'Seed Import', ?, ?)",
                [$newAppId, $stockpileId, $now, "Initial verified seed: {$notes}", $now]
            );

            $report[] = [
                'action' => 'INSERTED',
                'stockpile' => $spRow['name'],
                'stockpile_id' => $stockpileId,
                'name' => $name,
                'appliance_id' => $newAppId,
            ];
        } else {
            $report[] = [
                'action' => 'WOULD_INSERT',
                'stockpile' => $spRow['name'],
                'stockpile_id' => $stockpileId,
                'name' => $name,
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
    fwrite(STDERR, "Seeder failed: " . $e->getMessage() . "\n");
    exit(1);
}

echo "Summary of actions:\n";
foreach ($report as $r) {
    echo "  - [{$r['action']}] {$r['stockpile']} (#{$r['stockpile_id']}): {$r['name']}" . (isset($r['appliance_id']) ? " (ID #{$r['appliance_id']})" : "") . "\n";
}
echo "\nTotal items processed: " . count($report) . "\n";
