<?php

declare(strict_types=1);

/**
 * cli/import_inventory.php
 *
 * Imports verified inventory batch into the parts catalog and stockpile allocations.
 *
 * Placeholder Convention:
 * - Status: 'placeholder' for TBD rows (free text in part_stockpile.status).
 * - Quantity: 0 in part_stockpile and part (not counted; displayed as TBD in UI, never a real number or 0 count).
 * - Location Notes: prefixed with 'PLACEHOLDER — to count'.
 * - Counted rows: status 'available', quantity > 0.
 *
 * Rules:
 * - Stockpile resolved by name match (case-insensitive), never by hardcoded ID.
 * - Stored appliances must never become part rows (rejected by appliance guard).
 * - Default mode is --dry-run (safe, writes nothing). Pass --apply to persist.
 * - Idempotent by natural key (stockpile + part name).
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

use App\Db;

$options = getopt('', ['dry-run', 'apply', 'file:']);
$isApply = isset($options['apply']);
$filePath = $options['file'] ?? (__DIR__ . '/inventory_seed_oct27.json');

echo "=== HVACHome Inventory Importer ===\n";
echo "Mode: " . ($isApply ? "APPLY (writes to database)" : "DRY RUN (no changes written)") . "\n";
echo "Batch file: $filePath\n\n";

if (!file_exists($filePath)) {
    fwrite(STDERR, "Error: Batch file not found: $filePath\n");
    exit(1);
}

$rawJson = file_get_contents($filePath);
$batch = json_decode($rawJson, true);
if (!is_array($batch)) {
    fwrite(STDERR, "Error: Invalid JSON format in batch file\n");
    exit(1);
}

// Parse batch format: supports either plain array of items or object with {"stockpiles": [...], "items": [...]}
$stockpileDefinitions = [];
$items = [];
if (isset($batch['items']) && is_array($batch['items'])) {
    $items = $batch['items'];
    if (isset($batch['stockpiles']) && is_array($batch['stockpiles'])) {
        $stockpileDefinitions = $batch['stockpiles'];
    }
} else {
    $items = $batch;
}

// 1. Process stockpile definitions (idempotent: create if absent, reuse if exists)
$stockpileReport = [];
$pdo = Db::get();
if ($isApply) {
    $pdo->beginTransaction();
}

try {
    foreach ($stockpileDefinitions as $spDef) {
        $spName = trim($spDef['name'] ?? '');
        $spLocation = trim($spDef['location'] ?? '');
        $spNotes = trim($spDef['notes'] ?? '');
        $spBuildingId = isset($spDef['building_id']) ? (int) $spDef['building_id'] : null;

        if ($spName === '') {
            throw new RuntimeException("Stockpile definition must have a non-empty name");
        }

        $existing = Db::fetchOne("SELECT id, name, location FROM stockpile WHERE LOWER(name) = LOWER(?)", [$spName]);
        if ($existing) {
            $stockpileReport[] = [
                'action' => 'REUSED (already exists)',
                'name' => $existing['name'],
                'id' => (int) $existing['id'],
            ];
        } else {
            if ($isApply) {
                Db::execute(
                    "INSERT INTO stockpile (name, location, building_id, notes, created_at, updated_at)
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    [$spName, $spLocation, $spBuildingId, $spNotes]
                );
                $newId = (int) Db::lastInsertId();
                $stockpileReport[] = [
                    'action' => 'CREATED',
                    'name' => $spName,
                    'id' => $newId,
                ];
            } else {
                $stockpileReport[] = [
                    'action' => 'WOULD_CREATE',
                    'name' => $spName,
                    'id' => 'TBD (new)',
                ];
            }
        }
    }

    // 2. Load all stockpiles for dynamic case-insensitive name resolution
    $stockpiles = Db::fetchAll("SELECT id, name, location FROM stockpile");
    if (empty($stockpiles) && empty($stockpileDefinitions)) {
        throw new RuntimeException("No stockpile records found in database");
    }

    // If dry-run and new stockpiles would be created, inject them into $stockpiles list for resolution
    if (!$isApply) {
        foreach ($stockpileDefinitions as $spDef) {
            $spName = trim($spDef['name'] ?? '');
            $alreadyInList = false;
            foreach ($stockpiles as $sp) {
                if (strtolower($sp['name']) === strtolower($spName)) {
                    $alreadyInList = true;
                    break;
                }
            }
            if (!$alreadyInList) {
                $stockpiles[] = [
                    'id' => 9999, // placeholder for dry-run
                    'name' => $spName,
                    'location' => trim($spDef['location'] ?? ''),
                ];
            }
        }
    }

    function resolveStockpile(string $matchStr, array $stockpiles): array
    {
        $needle = strtolower(trim($matchStr));
        $matches = [];

        // Exact name match first
        foreach ($stockpiles as $sp) {
            if (strtolower($sp['name']) === $needle) {
                return $sp;
            }
        }

        // Substring name match
        foreach ($stockpiles as $sp) {
            if (str_contains(strtolower($sp['name']), $needle) || str_contains($needle, strtolower($sp['name']))) {
                $matches[] = $sp;
            }
        }

        // Fallback: match by key tokens (e.g. "McKay", "511", "Sea Can N", "Can N")
        if (empty($matches)) {
            if (preg_match('/(?:sea\s+)?can\s+(\d+)/i', $needle, $m)) {
                $targetCanNum = $m[1];
                foreach ($stockpiles as $sp) {
                    if (preg_match('/(?:sea\s+)?can\s+' . preg_quote($targetCanNum, '/') . '\b/i', $sp['name'])) {
                        $matches[] = $sp;
                    }
                }
            } elseif (str_contains($needle, 'mckay')) {
                foreach ($stockpiles as $sp) {
                    // Must match warehouse/office, not sea containers unless explicitly specified
                    if (str_contains(strtolower($sp['name']), 'mckay') && !str_contains(strtolower($sp['name']), 'sea container') && !str_contains(strtolower($sp['name']), 'sea can')) {
                        $matches[] = $sp;
                    }
                }
            } elseif (str_contains($needle, '511')) {
                foreach ($stockpiles as $sp) {
                    if (str_contains(strtolower($sp['name']), '511')) {
                        $matches[] = $sp;
                    }
                }
            }
        }

        if (count($matches) === 1) {
            return $matches[0];
        }

        if (count($matches) > 1) {
            throw new RuntimeException("Ambiguous stockpile resolution for '$matchStr': multiple matches found (" . implode(', ', array_column($matches, 'name')) . ")");
        }

        throw new RuntimeException("Zero stockpiles matched for '$matchStr'");
    }

    // 3. Process batch items
    $results = [
        'total_rows' => count($items),
        'by_stockpile' => [],
    ];
    foreach ($items as $idx => $row) {
        $name = trim($row['name'] ?? '');
        $category = trim($row['category'] ?? '');
        $status = trim($row['status'] ?? 'placeholder');
        $rawQty = $row['quantity'] ?? null;
        $qty = ($rawQty !== null && $rawQty !== '') ? (int) $rawQty : 0;
        $notes = trim($row['location_notes'] ?? '');
        $matchStr = trim($row['stockpile_match'] ?? '');
        $unit = $row['unit'] ?? null;
        $purpose = $row['purpose'] ?? 'spare';

        // Appliance guard: reject any item that is an appliance
        $applianceKeywords = ['stove', 'range', 'refrigerator', 'fridge', 'dishwasher', 'water heater'];
        foreach ($applianceKeywords as $kw) {
            if (str_contains(strtolower($name), $kw) && !str_contains(strtolower($name), 'switch') && !str_contains(strtolower($name), 'parts') && !str_contains(strtolower($name), 'panel')) {
                throw new RuntimeException("Row $idx ('$name') flagged as appliance: stored appliances must never become part rows!");
            }
        }

        // Resolve stockpile by name
        $stockpile = resolveStockpile($matchStr, $stockpiles);
        $stockpileId = (int) $stockpile['id'];
        $stockpileName = $stockpile['name'];

        if (!isset($results['by_stockpile'][$stockpileName])) {
            $results['by_stockpile'][$stockpileName] = [
                'stockpile_id' => $stockpileId,
                'would_insert' => 0,
                'would_skip' => 0,
                'inserted' => 0,
                'skipped' => 0,
                'details' => [],
            ];
        }

        // Check if part exists globally by name
        $existingPart = Db::fetchOne("SELECT id, name, quantity_on_hand FROM part WHERE LOWER(name) = LOWER(?)", [$name]);
        $partId = null;

        if ($existingPart) {
            $partId = (int) $existingPart['id'];
        }

        // Check if allocation already exists in this stockpile
        $existingAlloc = null;
        if ($partId !== null) {
            $existingAlloc = Db::fetchOne("SELECT id, quantity, status FROM part_stockpile WHERE part_id = ? AND stockpile_id = ?", [$partId, $stockpileId]);
        }

        if ($existingAlloc) {
            // Idempotent skip
            $results['by_stockpile'][$stockpileName]['would_skip']++;
            if ($isApply) {
                $results['by_stockpile'][$stockpileName]['skipped']++;
            }
            $results['by_stockpile'][$stockpileName]['details'][] = [
                'action' => 'SKIP (already exists)',
                'name' => $name,
                'status' => $existingAlloc['status'],
                'quantity' => $existingAlloc['quantity'],
            ];
            continue;
        }

        // Needs insert
        $results['by_stockpile'][$stockpileName]['would_insert']++;
        if ($isApply) {
            if (!$partId) {
                // Insert part row
                Db::execute(
                    "INSERT INTO part (name, category, description, quantity_on_hand, min_quantity, reorder_point, stockpile_id, is_reorder, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    [$name, $category, $notes, $qty, 1, 1, $stockpileId, ($status !== 'placeholder' && $qty <= 1 ? 1 : 0)]
                );
                $partId = (int) Db::lastInsertId();
            }

            // Insert part_stockpile allocation row
            Db::execute(
                "INSERT INTO part_stockpile (part_id, stockpile_id, quantity, status, location_notes, minimum, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                [$partId, $stockpileId, $qty, $status, $notes, 1]
            );

            $results['by_stockpile'][$stockpileName]['inserted']++;
        }

        $results['by_stockpile'][$stockpileName]['details'][] = [
            'action' => $isApply ? 'INSERTED' : 'WOULD_INSERT',
            'name' => $name,
            'status' => $status,
            'quantity' => ($status === 'placeholder' ? 'TBD' : $qty),
            'notes' => $notes,
        ];
    }

    if ($isApply) {
        $pdo->commit();
    }
} catch (Throwable $e) {
    if ($isApply && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "\n[FATAL ERROR] Import aborted: " . $e->getMessage() . "\n");
    exit(1);
}

// 4. Print report
if (!empty($stockpileReport)) {
    echo "--- Stockpile Definitions ---\n";
    foreach ($stockpileReport as $rep) {
        printf("  [%s] %s (ID: %s)\n", $rep['action'], $rep['name'], (string)$rep['id']);
    }
    echo "\n";
}

echo "--- Items Summary ---\n";
printf("%-30s | %-12s | %-12s | %-12s\n", "Stockpile Name", "Resolved ID", "Inserted", "Skipped");
echo str_repeat("-", 75) . "\n";

foreach ($results['by_stockpile'] as $spName => $stats) {
    $inserted = $isApply ? $stats['inserted'] : $stats['would_insert'];
    $skipped = $isApply ? $stats['skipped'] : $stats['would_skip'];
    printf("%-30s | %-12d | %-12d | %-12d\n", $spName, $stats['stockpile_id'], $inserted, $skipped);
}

echo "\nDetailed Items Breakdown:\n";
foreach ($results['by_stockpile'] as $spName => $stats) {
    echo "\nStockpile: $spName\n";
    foreach ($stats['details'] as $item) {
        printf("  [%s] %-45s (Status: %s, Qty: %s)\n", $item['action'], $item['name'], $item['status'], (string)$item['quantity']);
    }
}

echo "\nDone!\n";
