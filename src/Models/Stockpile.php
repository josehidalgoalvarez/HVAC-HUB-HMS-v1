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
}
