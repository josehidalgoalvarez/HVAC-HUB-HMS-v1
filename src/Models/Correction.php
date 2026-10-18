<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use Throwable;

/**
 * Correction Model
 * APPEND-ONLY audit trail for all entity field modifications.
 * Strictly INSERT queries only. No UPDATE. No DELETE.
 */
class Correction
{
    /**
     * Record a field correction.
     * Enforces append-only: executes INSERT INTO correction only.
     */
    public static function record(
        string $entityType,
        int|string $entityId,
        string $fieldName,
        ?string $oldValue,
        ?string $newValue,
        ?int $userId = null,
        ?string $reason = null
    ): int {
        // Skip recording if old and new are identical
        if ($oldValue === $newValue) {
            return 0;
        }

        $sql = 'INSERT INTO `correction` (`entity_type`, `entity_id`, `field_name`, `old_value`, `new_value`, `changed_by_user_id`, `reason`, `created_at`) '
             . 'VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))';

        // Check if database driver is MySQL for NOW() vs datetime("now")
        try {
            Db::execute(
                'INSERT INTO `correction` (`entity_type`, `entity_id`, `field_name`, `old_value`, `new_value`, `changed_by_user_id`, `reason`, `created_at`) '
                . 'VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [
                    $entityType,
                    (int) $entityId,
                    $fieldName,
                    $oldValue !== null ? (string) $oldValue : null,
                    $newValue !== null ? (string) $newValue : null,
                    $userId,
                    $reason,
                ]
            );
            return (int) Db::lastInsertId();
        } catch (Throwable $e) {
            // Fallback for drivers that don't accept CURRENT_TIMESTAMP directly in VALUES
            Db::execute(
                'INSERT INTO `correction` (`entity_type`, `entity_id`, `field_name`, `old_value`, `new_value`, `changed_by_user_id`, `reason`) '
                . 'VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    $entityType,
                    (int) $entityId,
                    $fieldName,
                    $oldValue !== null ? (string) $oldValue : null,
                    $newValue !== null ? (string) $newValue : null,
                    $userId,
                    $reason,
                ]
            );
            return (int) Db::lastInsertId();
        }
    }

    /**
     * Fetch all correction audit entries for a given entity.
     * Sorted newest first.
     */
    public static function getForEntity(string $entityType, int|string $entityId): array
    {
        $sql = 'SELECT c.id, c.entity_type, c.entity_id, c.field_name, c.old_value, c.new_value, '
             . 'c.changed_by_user_id, c.reason, c.created_at, u.name AS changed_by_name '
             . 'FROM `correction` c '
             . 'LEFT JOIN `users` u ON c.changed_by_user_id = u.id '
             . 'WHERE c.entity_type = ? AND c.entity_id = ? '
             . 'ORDER BY c.created_at DESC, c.id DESC';

        try {
            return Db::fetchAll($sql, [$entityType, (int) $entityId]);
        } catch (Throwable) {
            // Fallback without join if users table does not exist
            return Db::fetchAll(
                'SELECT id, entity_type, entity_id, field_name, old_value, new_value, changed_by_user_id, reason, created_at '
                . 'FROM `correction` WHERE entity_type = ? AND entity_id = ? ORDER BY id DESC',
                [$entityType, (int) $entityId]
            );
        }
    }

    /**
     * Fetch all correction audit entries for a given entity (alias for getForEntity).
     */
    public static function findByEntity(string $entityType, int|string $entityId): array
    {
        return self::getForEntity($entityType, $entityId);
    }
}
