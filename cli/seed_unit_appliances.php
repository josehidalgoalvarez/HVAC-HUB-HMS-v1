<?php

declare(strict_types=1);

/**
 * cli/seed_unit_appliances.php
 *
 * Seeds verified per-unit appliance rows for target units.
 *
 * Rules:
 * - Default mode is --dry-run. Pass --apply to persist changes.
 * - Entire seed runs in ONE transaction.
 * - Resolve building BY NAME (tokens, e.g. '1723' and 'Bath'), never by hardcoded building_id.
 * - Resolve unit BY building_id + unit_number.
 * - LOUD FAIL if any building or unit is not found or ambiguous.
 * - Idempotent by (building_id + unit_id + type) — skip existing rows without overwrite or duplication.
 * - Unit rows MUST have stockpile_id = NULL.
 * - No serial numbers, no invented models or specs.
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

use App\Db;

$options = getopt('', ['dry-run', 'apply', 'file:']);
$isApply = isset($options['apply']);
$filePath = $options['file'] ?? (__DIR__ . '/inventory_seed_unit_appliances_oct30.json');

echo "=== HVACHome Unit Appliances Seeder ===\n";
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
        $searchTokens = $item['building_search'] ?? [];
        $unitNumber = trim((string)($item['unit_number'] ?? ''));
        $type = trim((string)($item['type'] ?? ''));
        $name = trim((string)($item['name'] ?? $type));
        $brand = isset($item['brand']) && $item['brand'] !== null && $item['brand'] !== '' ? trim((string)$item['brand']) : null;
        $model = isset($item['model_number']) && $item['model_number'] !== null && $item['model_number'] !== '' ? trim((string)$item['model_number']) : null;
        $serial = isset($item['serial_number']) && $item['serial_number'] !== null && $item['serial_number'] !== '' ? trim((string)$item['serial_number']) : null;
        $room = isset($item['room']) && $item['room'] !== null && $item['room'] !== '' ? trim((string)$item['room']) : null;
        $status = trim((string)($item['status'] ?? 'operational'));
        $specsArray = isset($item['specs']) && is_array($item['specs']) ? $item['specs'] : [];
        $notes = isset($item['notes']) && $item['notes'] !== null ? trim((string)$item['notes']) : null;

        if (empty($searchTokens)) {
            throw new RuntimeException("Item #$idx missing building_search tokens");
        }
        if ($unitNumber === '') {
            throw new RuntimeException("Item #$idx missing unit_number");
        }
        if ($type === '') {
            throw new RuntimeException("Item #$idx missing appliance type");
        }

        // 1. Resolve building BY NAME (fail loud)
        $whereClauses = [];
        $params = [];
        foreach ($searchTokens as $token) {
            $whereClauses[] = "LOWER(name) LIKE ?";
            $params[] = '%' . strtolower(trim((string)$token)) . '%';
        }
        $buildingSql = "SELECT id, name FROM building WHERE " . implode(' AND ', $whereClauses);
        $buildings = Db::fetchAll($buildingSql, $params);

        if (count($buildings) === 0) {
            $tokenStr = implode(', ', $searchTokens);
            throw new RuntimeException("FATAL: Building not found matching tokens: [{$tokenStr}]");
        }
        if (count($buildings) > 1) {
            $tokenStr = implode(', ', $searchTokens);
            $foundNames = implode(', ', array_column($buildings, 'name'));
            throw new RuntimeException("FATAL: Ambiguous building match for [{$tokenStr}]: found " . count($buildings) . " ({$foundNames})");
        }

        $buildingId = (int)$buildings[0]['id'];
        $buildingName = $buildings[0]['name'];

        // 2. Resolve unit BY building_id + unit_number (fail loud)
        $units = Db::fetchAll("SELECT id, building_id, unit_number FROM unit WHERE building_id = ? AND unit_number = ?", [$buildingId, $unitNumber]);
        if (count($units) === 0) {
            throw new RuntimeException("FATAL: Unit '{$unitNumber}' not found in building '{$buildingName}' (id: {$buildingId})");
        }
        if (count($units) > 1) {
            throw new RuntimeException("FATAL: Ambiguous unit '{$unitNumber}' in building '{$buildingName}' (found " . count($units) . " rows)");
        }

        $unitId = (int)$units[0]['id'];

        // 3. Check idempotency: exists by (building_id + unit_id + type)
        $existing = Db::fetchOne(
            "SELECT id, name, type, brand, model_number, status FROM appliance WHERE building_id = ? AND unit_id = ? AND type = ?",
            [$buildingId, $unitId, $type]
        );

        if ($existing) {
            $report[] = [
                'action' => 'SKIPPED (already exists)',
                'building' => $buildingName,
                'building_id' => $buildingId,
                'unit_number' => $unitNumber,
                'unit_id' => $unitId,
                'type' => $type,
                'brand' => $existing['brand'],
                'model_number' => $existing['model_number'],
                'status' => $existing['status'],
                'appliance_id' => (int)$existing['id'],
            ];
            continue;
        }

        $propertyId = (string)$buildingId;
        $specsJson = json_encode($specsArray, JSON_UNESCAPED_SLASHES | JSON_FORCE_OBJECT);
        $locationStr = "{$buildingName} · Unit {$unitNumber}" . ($room ? " · {$room}" : "");

        if ($isApply) {
            Db::execute(
                "INSERT INTO appliance (property_id, building_id, unit_id, stockpile_id, name, brand, type, category, status, model_number, serial_number, room, unit_number, location, notes, specs, created_at, updated_at)
                 VALUES (?, ?, ?, NULL, ?, ?, ?, 'Kitchen', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $propertyId,
                    $buildingId,
                    $unitId,
                    $name,
                    $brand ?? '',
                    $type,
                    $status,
                    $model,
                    $serial,
                    $room,
                    $unitNumber,
                    $locationStr,
                    $notes,
                    $specsJson,
                    $now,
                    $now
                ]
            );
            $newAppId = (int)Db::lastInsertId();

            $report[] = [
                'action' => 'INSERTED',
                'building' => $buildingName,
                'building_id' => $buildingId,
                'unit_number' => $unitNumber,
                'unit_id' => $unitId,
                'type' => $type,
                'brand' => $brand,
                'model_number' => $model,
                'status' => $status,
                'appliance_id' => $newAppId,
            ];
        } else {
            $report[] = [
                'action' => 'WOULD_INSERT',
                'building' => $buildingName,
                'building_id' => $buildingId,
                'unit_number' => $unitNumber,
                'unit_id' => $unitId,
                'type' => $type,
                'brand' => $brand,
                'model_number' => $model,
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
    fwrite(STDERR, "Seeder failed: " . $e->getMessage() . "\n");
    exit(1);
}

echo "Summary of actions:\n";
foreach ($report as $r) {
    $idStr = isset($r['appliance_id']) ? " (ID #{$r['appliance_id']})" : "";
    $brandStr = $r['brand'] ? " [{$r['brand']}" . ($r['model_number'] ? " {$r['model_number']}" : "") . "]" : " [Brand: NULL]";
    echo "  - [{$r['action']}] {$r['building']} Unit {$r['unit_number']} (Unit ID {$r['unit_id']}): {$r['type']}{$brandStr} status: {$r['status']}{$idStr}\n";
}
echo "\nTotal items processed: " . count($report) . "\n";
