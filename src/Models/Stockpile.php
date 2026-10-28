<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use RuntimeException;

/**
 * Stockpile Model
 * Manages physical storage locations (e.g. 511 Days Rd storage, 1719 Bath donors, van stockpiles).
 */
class Stockpile
{
    public static function findAll(): array
    {
        $sql = "SELECT sp.*,
                       b.name AS building_name,
                       (SELECT COUNT(DISTINCT ps.part_id) FROM part_stockpile ps WHERE ps.stockpile_id = sp.id AND ps.quantity > 0) AS distinct_parts_count,
                       (SELECT COALESCE(SUM(ps.quantity), 0) FROM part_stockpile ps WHERE ps.stockpile_id = sp.id) AS total_units_count
                FROM stockpile sp
                LEFT JOIN building b ON sp.building_id = b.id
                ORDER BY sp.name ASC";

        return Db::fetchAll($sql);
    }

    public static function findById(int $id): ?array
    {
        $sql = "SELECT sp.*,
                       b.name AS building_name
                FROM stockpile sp
                LEFT JOIN building b ON sp.building_id = b.id
                WHERE sp.id = ?
                LIMIT 1";

        return Db::fetchOne($sql, [$id]);
    }

    public static function create(array $data): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        $location = trim((string) ($data['location'] ?? ''));

        if ($name === '' || $location === '') {
            throw new RuntimeException('Stockpile name and location are required');
        }

        $buildingId = !empty($data['building_id']) ? (int) $data['building_id'] : null;
        $notes = $data['notes'] ?? null;

        Db::execute(
            'INSERT INTO stockpile (name, location, building_id, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [$name, $location, $buildingId, $notes]
        );
        $id = (int) Db::lastInsertId();

        return self::findById($id) ?? [];
    }

    /**
     * Get all parts allocated to this stockpile with part details and location-specific thresholds.
     */
    public static function getParts(int $stockpileId): array
    {
        $sql = "SELECT ps.id AS allocation_id,
                       ps.stockpile_id,
                       ps.part_id,
                       ps.quantity,
                       ps.minimum,
                       ps.status,
                       ps.location_notes,
                       ps.updated_at AS allocation_updated_at,
                       p.name AS part_name,
                       p.part_number,
                       p.category,
                       p.description,
                       p.unit_cost,
                       p.quantity_on_hand AS total_quantity_on_hand,
                       p.reorder_point,
                       p.compatible_models,
                       sp.name AS stockpile_name,
                       sp.location AS stockpile_location,
                       sp.building_id
                FROM part_stockpile ps
                JOIN part p ON ps.part_id = p.id
                JOIN stockpile sp ON ps.stockpile_id = sp.id
                WHERE ps.stockpile_id = ?
                ORDER BY p.name ASC";

        $rows = Db::fetchAll($sql, [$stockpileId]);

        foreach ($rows as &$row) {
            $row['allocation_id'] = (int) $row['allocation_id'];
            $row['stockpile_id'] = (int) $row['stockpile_id'];
            $row['part_id'] = (int) $row['part_id'];
            $row['quantity'] = (int) ($row['quantity'] ?? 0);
            $row['minimum'] = (int) ($row['minimum'] ?? 1);
            $row['unit_cost'] = isset($row['unit_cost']) ? (float) $row['unit_cost'] : null;
            $row['total_quantity_on_hand'] = (int) ($row['total_quantity_on_hand'] ?? 0);
            $row['reorder_point'] = (int) ($row['reorder_point'] ?? 1);
            $row['is_below_minimum'] = ($row['status'] !== 'placeholder' && $row['quantity'] < $row['minimum']);

            if (!empty($row['compatible_models']) && is_string($row['compatible_models'])) {
                $decoded = json_decode($row['compatible_models'], true);
                $row['compatible_models'] = is_array($decoded) ? $decoded : [];
            } else {
                $row['compatible_models'] = [];
            }
        }

        return $rows;
    }

    /**
     * Get stored appliances at a specific stockpile.
     */
    public static function getAppliances(int $stockpileId): array
    {
        $sql = "SELECT a.*,
                       sp.name AS stockpile_name,
                       sp.location AS stockpile_location
                FROM appliance a
                LEFT JOIN stockpile sp ON a.stockpile_id = sp.id
                WHERE a.stockpile_id = ?
                ORDER BY a.id ASC";

        $rows = Db::fetchAll($sql, [$stockpileId]);

        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['stockpile_id'] = $row['stockpile_id'] !== null ? (int) $row['stockpile_id'] : null;
            $row['building_id'] = $row['building_id'] !== null ? (int) $row['building_id'] : null;
            $row['unit_id'] = $row['unit_id'] !== null ? (int) $row['unit_id'] : null;
        }

        return $rows;
    }

    /**
     * Record an appliance movement and update appliance location/status.
     */
    public static function moveAppliance(int $applianceId, array $data, ?int $userId = null): array
    {
        $appliance = Db::fetchOne("SELECT * FROM appliance WHERE id = ?", [$applianceId]);
        if (!$appliance) {
            throw new \RuntimeException("Appliance #{$applianceId} not found");
        }

        $fromStockpileId = $appliance['stockpile_id'] !== null ? (int) $appliance['stockpile_id'] : null;
        $fromUnitId = $appliance['unit_id'] !== null ? (int) $appliance['unit_id'] : null;

        $toStockpileId = isset($data['to_stockpile_id']) && $data['to_stockpile_id'] !== '' ? (int) $data['to_stockpile_id'] : null;
        $toUnitId = isset($data['to_unit_id']) && $data['to_unit_id'] !== '' ? (int) $data['to_unit_id'] : null;
        $toBuildingId = isset($data['to_building_id']) && $data['to_building_id'] !== '' ? (int) $data['to_building_id'] : null;
        $disposition = trim((string) ($data['disposition'] ?? 'installed')); // 'stored', 'installed', 'harvested', 'disposed'
        $movedBy = trim((string) ($data['moved_by'] ?? 'Tech'));
        $ticketId = isset($data['ticket_id']) && $data['ticket_id'] !== '' ? (int) $data['ticket_id'] : null;
        $notes = trim((string) ($data['notes'] ?? ''));
        $now = gmdate('Y-m-d H:i:s');

        // Execute inside transaction if not already in one
        $pdo = Db::get();
        $mustCommit = false;
        if (!$pdo->inTransaction()) {
            $pdo->beginTransaction();
            $mustCommit = true;
        }

        try {
            // 1. Insert movement record
            Db::execute(
                "INSERT INTO appliance_movement (appliance_id, from_stockpile_id, from_unit_id, to_stockpile_id, to_unit_id, disposition, movement_date, ticket_id, moved_by, notes, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$applianceId, $fromStockpileId, $fromUnitId, $toStockpileId, $toUnitId, $disposition, $now, $ticketId, $movedBy, $notes, $now]
            );
            $movementId = (int) Db::lastInsertId();

            // 2. Update appliance record
            if ($disposition === 'installed' && $toUnitId) {
                // If installing into a unit, look up building_id from unit if not provided
                if (!$toBuildingId) {
                    $uRow = Db::fetchOne("SELECT building_id FROM unit WHERE id = ?", [$toUnitId]);
                    $toBuildingId = $uRow ? (int) $uRow['building_id'] : $appliance['building_id'];
                }
                Db::execute(
                    "UPDATE appliance
                     SET stockpile_id = NULL, unit_id = ?, building_id = ?, status = 'operational', location = ?, updated_at = ?
                     WHERE id = ?",
                    [$toUnitId, $toBuildingId, "Unit {$toUnitId}", $now, $applianceId]
                );
            } elseif ($disposition === 'stored') {
                Db::execute(
                    "UPDATE appliance
                     SET stockpile_id = ?, unit_id = NULL, status = 'stored', location = 'Stockpile', updated_at = ?
                     WHERE id = ?",
                    [$toStockpileId, $now, $applianceId]
                );
            } elseif ($disposition === 'harvested') {
                Db::execute(
                    "UPDATE appliance
                     SET status = 'donor', updated_at = ?
                     WHERE id = ?",
                    [$now, $applianceId]
                );
            } elseif ($disposition === 'disposed') {
                Db::execute(
                    "UPDATE appliance
                     SET stockpile_id = NULL, unit_id = NULL, status = 'disposed', location = 'Disposed', updated_at = ?
                     WHERE id = ?",
                    [$now, $applianceId]
                );
            }

            // 3. Append-only correction audit
            \App\Models\Correction::record(
                'appliance',
                $applianceId,
                'location',
                $fromStockpileId ? "Stockpile #{$fromStockpileId}" : ($fromUnitId ? "Unit #{$fromUnitId}" : 'Unknown'),
                $toStockpileId ? "Stockpile #{$toStockpileId}" : ($toUnitId ? "Unit #{$toUnitId}" : $disposition),
                $userId,
                "Appliance movement ({$disposition}): {$notes}"
            );

            if ($mustCommit) {
                $pdo->commit();
            }

            return [
                'movement_id' => $movementId,
                'appliance_id' => $applianceId,
                'disposition' => $disposition,
                'from_stockpile_id' => $fromStockpileId,
                'to_stockpile_id' => $toStockpileId,
                'to_unit_id' => $toUnitId,
                'movement_date' => $now,
            ];
        } catch (\Throwable $e) {
            if ($mustCommit && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Get movements history for an appliance.
     */
    public static function getApplianceMovements(int $applianceId): array
    {
        $sql = "SELECT am.*,
                       sp_from.name AS from_stockpile_name,
                       sp_to.name AS to_stockpile_name,
                       u_to.unit_number AS to_unit_number,
                       b_to.name AS to_building_name
                FROM appliance_movement am
                LEFT JOIN stockpile sp_from ON am.from_stockpile_id = sp_from.id
                LEFT JOIN stockpile sp_to ON am.to_stockpile_id = sp_to.id
                LEFT JOIN unit u_to ON am.to_unit_id = u_to.id
                LEFT JOIN building b_to ON u_to.building_id = b_to.id
                WHERE am.appliance_id = ?
                ORDER BY am.id DESC";

        return Db::fetchAll($sql, [$applianceId]);
    }
}
