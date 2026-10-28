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
}
