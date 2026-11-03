<?php
declare(strict_types=1);

/**
 * cli/seed_appliance_movements_nov02.php
 *
 * Dedicated seeder for appliance movement history into appliance_movement table.
 *
 * Rules:
 * - Reads cli/appliance_movements_seed_nov02.json
 * - Flags: --run (default is --dry-run)
 * - Append-only: never updates or deletes existing appliance_movement rows.
 * - Deduplication: checks for identical existing movement row
 *   (appliance_id, from_stockpile_id, from_unit_id, to_stockpile_id, to_unit_id, disposition, movement_date, notes)
 * - Never invents appliance_id, unit, stockpile, date, or disposition.
 * - Resolves units and buildings by name/label dynamically (never hardcodes raw ids alone).
 * - Microwave (candidate 4) is blocked by design (no appliance row exists).
 * - candidate 5 (stored appliances with no move evidence) is rejected.
 */

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Db.php';

use App\Db;

$isRun = in_array('--run', $argv, true);
$mode = $isRun ? 'RUN (LIVE APPLY)' : 'DRY-RUN (NO CHANGES)';

echo "=== Appliance Movement Seeder Nov 02, 2026 ===\n";
echo "Mode: $mode\n\n";

$jsonPath = __DIR__ . '/appliance_movements_seed_nov02.json';
if (!file_exists($jsonPath)) {
    echo "ERROR: Seed file not found: $jsonPath\n";
    exit(1);
}

$items = json_decode(file_get_contents($jsonPath), true);
if (!is_array($items)) {
    echo "ERROR: Invalid JSON in $jsonPath\n";
    exit(1);
}

// Pre-counts
$movCountBefore = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM appliance_movement")['cnt'] ?? 0);
$appCountBefore = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM appliance")['cnt'] ?? 0);
$tktCountBefore = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM ticket")['cnt'] ?? 0);

echo "Initial State: $movCountBefore movements, $appCountBefore appliances, $tktCountBefore tickets\n";
echo "--------------------------------------------------------------------------------\n";

$wouldCreate = 0;
$created = 0;
$skipped = 0;
$blocked = 0;

/**
 * Helper to resolve unit_id by building name search and unit number
 */
function resolveUnitId(string $buildingSearch, string $unitNumber): ?int {
    $sql = "SELECT u.id, u.unit_number, b.name as building_name 
            FROM unit u 
            JOIN building b ON u.building_id = b.id 
            WHERE b.name LIKE :bld AND u.unit_number = :unit 
            LIMIT 1";
    $row = Db::fetchOne($sql, [
        'bld' => '%' . trim($buildingSearch) . '%',
        'unit' => trim($unitNumber)
    ]);
    return $row ? (int) $row['id'] : null;
}

/**
 * Helper to resolve stockpile_id by name search
 */
function resolveStockpileId(string $nameSearch): ?int {
    $sql = "SELECT id, name FROM stockpile WHERE name LIKE :name LIMIT 1";
    $row = Db::fetchOne($sql, ['name' => '%' . trim($nameSearch) . '%']);
    return $row ? (int) $row['id'] : null;
}

foreach ($items as $idx => $item) {
    $cid = $item['candidate_id'] ?? "item_$idx";
    $desc = $item['description'] ?? 'Unnamed candidate';
    echo "[$cid] $desc\n";

    if (($item['status'] ?? '') === 'blocked') {
        echo "  STATUS: BLOCKED\n";
        echo "  Reason: " . ($item['block_reason'] ?? 'No proof') . "\n\n";
        $blocked++;
        continue;
    }

    // Attempt to resolve appliance_id
    $appMatch = $item['appliance_match'] ?? [];
    $applianceId = null;

    if (!empty($appMatch['id'])) {
        // Direct ID check
        $row = Db::fetchOne("SELECT * FROM appliance WHERE id = ?", [(int) $appMatch['id']]);
        if ($row) {
            // Verify model if specified
            if (empty($appMatch['model']) || stripos((string)$row['model_number'], $appMatch['model']) !== false) {
                $applianceId = (int) $row['id'];
            }
        }
    }

    if (!$applianceId && !empty($appMatch['model'])) {
        $row = Db::fetchOne("SELECT * FROM appliance WHERE model_number LIKE ?", ['%' . trim($appMatch['model']) . '%']);
        if ($row) {
            $applianceId = (int) $row['id'];
        }
    }

    if (!$applianceId && !empty($appMatch['notes_query'])) {
        $row = Db::fetchOne("SELECT * FROM appliance WHERE notes LIKE ?", ['%' . trim($appMatch['notes_query']) . '%']);
        if ($row) {
            $applianceId = (int) $row['id'];
        }
    }

    if (!$applianceId) {
        echo "  STATUS: BLOCKED (Appliance proof failed)\n";
        echo "  Reason: No live appliance row verified matching criteria: " . json_encode($appMatch) . "\n\n";
        $blocked++;
        continue;
    }

    echo "  Appliance Verified: ID #$applianceId\n";

    // Resolve From
    $fromUnitId = null;
    $fromStockpileId = null;
    if (!empty($item['from'])) {
        if ($item['from']['type'] === 'unit') {
            $fromUnitId = resolveUnitId($item['from']['building'], $item['from']['unit_number']);
            if (!$fromUnitId) {
                echo "  STATUS: BLOCKED (From-unit resolution failed for {$item['from']['building']} unit {$item['from']['unit_number']})\n\n";
                $blocked++;
                continue;
            }
            echo "  From Unit: [ID $fromUnitId] {$item['from']['building']} Unit {$item['from']['unit_number']}\n";
        } elseif ($item['from']['type'] === 'stockpile' && !empty($item['from']['name'])) {
            $fromStockpileId = resolveStockpileId($item['from']['name']);
            if (!$fromStockpileId) {
                echo "  STATUS: BLOCKED (From-stockpile resolution failed for {$item['from']['name']})\n\n";
                $blocked++;
                continue;
            }
            echo "  From Stockpile: [ID $fromStockpileId] {$item['from']['name']}\n";
        }
    }

    // Resolve To
    $toUnitId = null;
    $toStockpileId = null;
    if (!empty($item['to'])) {
        if ($item['to']['type'] === 'unit') {
            $toUnitId = resolveUnitId($item['to']['building'], $item['to']['unit_number']);
            if (!$toUnitId) {
                echo "  STATUS: BLOCKED (To-unit resolution failed for {$item['to']['building']} unit {$item['to']['unit_number']})\n\n";
                $blocked++;
                continue;
            }
            echo "  To Unit: [ID $toUnitId] {$item['to']['building']} Unit {$item['to']['unit_number']}\n";
        } elseif ($item['to']['type'] === 'stockpile' && !empty($item['to']['name'])) {
            $toStockpileId = resolveStockpileId($item['to']['name']);
            if (!$toStockpileId) {
                echo "  STATUS: BLOCKED (To-stockpile resolution failed for {$item['to']['name']})\n\n";
                $blocked++;
                continue;
            }
            echo "  To Stockpile: [ID $toStockpileId] {$item['to']['name']}\n";
        }
    }

    $disposition = trim((string)($item['disposition'] ?? 'stored'));
    $movementDate = trim((string)($item['movement_date'] ?? date('Y-m-d H:i:s')));
    $movedBy = trim((string)($item['moved_by'] ?? 'Tech'));
    $ticketId = !empty($item['ticket_id']) ? (int) $item['ticket_id'] : null;
    $notes = trim((string)($item['notes'] ?? ''));

    // Check duplicate
    $existing = Db::fetchOne(
        "SELECT id FROM appliance_movement 
         WHERE appliance_id = :app_id 
           AND disposition = :disp 
           AND ((from_unit_id IS NULL AND :from_u IS NULL) OR from_unit_id = :from_u)
           AND ((to_unit_id IS NULL AND :to_u IS NULL) OR to_unit_id = :to_u)
           AND ((from_stockpile_id IS NULL AND :from_sp IS NULL) OR from_stockpile_id = :from_sp)
           AND ((to_stockpile_id IS NULL AND :to_sp IS NULL) OR to_stockpile_id = :to_sp)
           AND notes = :notes",
        [
            'app_id' => $applianceId,
            'disp' => $disposition,
            'from_u' => $fromUnitId,
            'to_u' => $toUnitId,
            'from_sp' => $fromStockpileId,
            'to_sp' => $toStockpileId,
            'notes' => $notes
        ]
    );

    if ($existing) {
        echo "  STATUS: SKIPPED (Already exists as Movement ID #{$existing['id']})\n\n";
        $skipped++;
        continue;
    }

    if ($isRun) {
        Db::execute(
            "INSERT INTO appliance_movement 
             (appliance_id, from_stockpile_id, from_unit_id, to_stockpile_id, to_unit_id, disposition, movement_date, ticket_id, moved_by, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            [
                $applianceId,
                $fromStockpileId,
                $fromUnitId,
                $toStockpileId,
                $toUnitId,
                $disposition,
                $movementDate,
                $ticketId,
                $movedBy,
                $notes
            ]
        );
        $newMovId = (int) Db::lastInsertId();
        echo "  STATUS: CREATED (Movement ID #$newMovId)\n\n";
        $created++;
    } else {
        echo "  STATUS: WOULD_CREATE (Dry Run)\n\n";
        $wouldCreate++;
    }
}

echo "--------------------------------------------------------------------------------\n";
echo "Summary ($mode):\n";
echo "- Total Candidates in Batch: " . count($items) . "\n";
echo "- Blocked: $blocked\n";
echo "- Skipped (Already Exists): $skipped\n";
if ($isRun) {
    echo "- Created: $created\n";
} else {
    echo "- Would Create: $wouldCreate\n";
}

$movCountAfter = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM appliance_movement")['cnt'] ?? 0);
$appCountAfter = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM appliance")['cnt'] ?? 0);
$tktCountAfter = (int) (Db::fetchOne("SELECT COUNT(*) as cnt FROM ticket")['cnt'] ?? 0);

echo "\nVerification of Database Table Counts:\n";
echo "- Movements: $movCountBefore -> $movCountAfter (diff: " . ($movCountAfter - $movCountBefore) . ")\n";
echo "- Appliances: $appCountBefore -> $appCountAfter (diff: " . ($appCountAfter - $appCountBefore) . ")\n";
echo "- Tickets: $tktCountBefore -> $tktCountAfter (diff: " . ($tktCountAfter - $tktCountBefore) . ")\n";

if ($appCountAfter !== $appCountBefore || $tktCountAfter !== $tktCountBefore) {
    echo "\nERROR: appliance or ticket count changed unexpectedly!\n";
    exit(2);
}

echo "\nScript completed successfully.\n";
