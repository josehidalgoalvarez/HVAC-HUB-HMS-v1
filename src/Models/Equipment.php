<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use InvalidArgumentException;
use RuntimeException;

/**
 * Equipment Model
 * Manages physical equipment and tools (key machine, ladders, vacuum, saws, telehandler, etc.)
 * belonging to stockpiles or unassigned.
 */
class Equipment
{
    public const VALID_STATUSES = ['available', 'needs_service', 'out_of_service', 'unknown'];

    /**
     * List equipment filtered by stockpile_id, ordered by name ASC.
     */
    public static function findByStockpile(int $stockpileId): array
    {
        $sql = "SELECT e.*, sp.name AS stockpile_name
                FROM equipment e
                LEFT JOIN stockpile sp ON e.stockpile_id = sp.id
                WHERE e.stockpile_id = ?
                ORDER BY e.name ASC, e.id ASC";

        $rows = Db::fetchAll($sql, [$stockpileId]);
        return array_map([self::class, 'formatRow'], $rows);
    }

    /**
     * Find a single equipment record by ID.
     */
    public static function findById(int $id): ?array
    {
        $sql = "SELECT e.*, sp.name AS stockpile_name
                FROM equipment e
                LEFT JOIN stockpile sp ON e.stockpile_id = sp.id
                WHERE e.id = ?
                LIMIT 1";

        $row = Db::fetchOne($sql, [$id]);
        return $row ? self::formatRow($row) : null;
    }

    /**
     * Create an equipment record.
     * Validates:
     * - name: required, non-empty
     * - status: must be one of ['available', 'needs_service', 'out_of_service', 'unknown']
     * - stockpile_id: optional (null if unassigned), but if provided must exist in stockpile table
     */
    public static function create(array $data): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Equipment name is required');
        }

        $status = trim((string) ($data['status'] ?? 'unknown'));
        if (!in_array($status, self::VALID_STATUSES, true)) {
            throw new InvalidArgumentException(
                "Invalid status '{$status}'. Must be one of: " . implode(', ', self::VALID_STATUSES)
            );
        }

        $stockpileId = null;
        if (isset($data['stockpile_id']) && $data['stockpile_id'] !== '' && $data['stockpile_id'] !== null) {
            $rawSpId = (int) $data['stockpile_id'];
            if ($rawSpId <= 0) {
                throw new InvalidArgumentException('Invalid stockpile_id');
            }

            // Verify stockpile exists (loud fail)
            $sp = Db::fetchOne("SELECT id FROM stockpile WHERE id = ?", [$rawSpId]);
            if (!$sp) {
                throw new InvalidArgumentException("Stockpile #{$rawSpId} does not exist");
            }
            $stockpileId = $rawSpId;
        }

        $category = isset($data['category']) && trim((string) $data['category']) !== ''
            ? trim((string) $data['category'])
            : null;

        $notes = isset($data['notes']) && trim((string) $data['notes']) !== ''
            ? trim((string) $data['notes'])
            : null;

        $now = gmdate('Y-m-d H:i:s');
        Db::execute(
            "INSERT INTO equipment (name, category, stockpile_id, status, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [$name, $category, $stockpileId, $status, $notes, $now, $now]
        );

        $newId = (int) Db::lastInsertId();
        $created = self::findById($newId);
        if (!$created) {
            throw new RuntimeException("Failed to retrieve created equipment #{$newId}");
        }

        return $created;
    }

    /**
     * Update an equipment record (status and/or notes, name, category, stockpile_id).
     * Returns updated record if found, or null if not found.
     */
    public static function update(int $id, array $data): ?array
    {
        $existing = self::findById($id);
        if (!$existing) {
            return null;
        }

        $fields = [];
        $params = [];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                throw new InvalidArgumentException('Equipment name cannot be empty');
            }
            $fields[] = 'name = ?';
            $params[] = $name;
        }

        if (array_key_exists('status', $data)) {
            $status = trim((string) $data['status']);
            if (!in_array($status, self::VALID_STATUSES, true)) {
                throw new InvalidArgumentException(
                    "Invalid status '{$status}'. Must be one of: " . implode(', ', self::VALID_STATUSES)
                );
            }
            $fields[] = 'status = ?';
            $params[] = $status;
        }

        if (array_key_exists('category', $data)) {
            $category = $data['category'] !== null && trim((string) $data['category']) !== ''
                ? trim((string) $data['category'])
                : null;
            $fields[] = 'category = ?';
            $params[] = $category;
        }

        if (array_key_exists('notes', $data)) {
            $notes = $data['notes'] !== null && trim((string) $data['notes']) !== ''
                ? trim((string) $data['notes'])
                : null;
            $fields[] = 'notes = ?';
            $params[] = $notes;
        }

        if (array_key_exists('stockpile_id', $data)) {
            if ($data['stockpile_id'] === null || $data['stockpile_id'] === '') {
                $fields[] = 'stockpile_id = NULL';
            } else {
                $rawSpId = (int) $data['stockpile_id'];
                if ($rawSpId <= 0) {
                    throw new InvalidArgumentException('Invalid stockpile_id');
                }
                $sp = Db::fetchOne("SELECT id FROM stockpile WHERE id = ?", [$rawSpId]);
                if (!$sp) {
                    throw new InvalidArgumentException("Stockpile #{$rawSpId} does not exist");
                }
                $fields[] = 'stockpile_id = ?';
                $params[] = $rawSpId;
            }
        }

        if (empty($fields)) {
            return $existing;
        }

        $now = gmdate('Y-m-d H:i:s');
        $fields[] = 'updated_at = ?';
        $params[] = $now;
        $params[] = $id;

        $sql = "UPDATE equipment SET " . implode(', ', $fields) . " WHERE id = ?";
        Db::execute($sql, $params);

        return self::findById($id);
    }

    /**
     * Delete an equipment record by ID.
     * Returns true if deleted, false if not found.
     */
    public static function delete(int $id): bool
    {
        $existing = self::findById($id);
        if (!$existing) {
            return false;
        }

        Db::execute("DELETE FROM equipment WHERE id = ?", [$id]);
        return true;
    }

    /**
     * Helper to format database row into strongly typed domain array.
     */
    private static function formatRow(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'category' => $row['category'] !== null ? (string) $row['category'] : null,
            'stockpile_id' => $row['stockpile_id'] !== null ? (int) $row['stockpile_id'] : null,
            'stockpile_name' => $row['stockpile_name'] ?? null,
            'status' => (string) $row['status'],
            'notes' => $row['notes'] !== null ? (string) $row['notes'] : null,
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ];
    }
}
