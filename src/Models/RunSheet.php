<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use RuntimeException;
use Throwable;

/**
 * RunSheet Model
 * Day-plan container representing a technician's planned route and schedule for a date.
 */
class RunSheet
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_COMPLETED = 'completed';

    /**
     * Find all run sheets with optional filters.
     */
    public static function findAll(array $filters = []): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['tech_id'])) {
            $where[] = 'r.tech_id = ?';
            $params[] = (int) $filters['tech_id'];
        }

        if (!empty($filters['run_date'])) {
            $where[] = 'r.run_date = ?';
            $params[] = (string) $filters['run_date'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'r.status = ?';
            $params[] = (string) $filters['status'];
        }

        if (!empty($filters['since'])) {
            $where[] = '(r.updated_at >= ? OR r.created_at >= ?)';
            $params[] = (string) $filters['since'];
            $params[] = (string) $filters['since'];
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT r.*,
                       u.name AS tech_name,
                       (SELECT COUNT(*) FROM run_sheet_block b WHERE b.run_sheet_id = r.id) AS blocks_count,
                       (SELECT COUNT(*) FROM run_sheet_block b WHERE b.run_sheet_id = r.id AND b.status = 'completed') AS completed_blocks_count,
                       (SELECT SUM(estimated_minutes) FROM run_sheet_block b WHERE b.run_sheet_id = r.id) AS total_estimated_minutes,
                       (SELECT SUM(actual_minutes) FROM run_sheet_block b WHERE b.run_sheet_id = r.id) AS total_actual_minutes
                FROM run_sheet r
                LEFT JOIN users u ON r.tech_id = u.id
                {$whereClause}
                ORDER BY r.run_date DESC, r.id DESC";

        try {
            $rows = Db::fetchAll($sql, $params);
        } catch (Throwable) {
            $rows = Db::fetchAll("SELECT * FROM run_sheet {$whereClause} ORDER BY run_date DESC, id DESC", $params);
        }

        return $rows;
    }

    /**
     * Find run sheet by ID, including its ordered blocks and rollup summary.
     */
    public static function findById(int|string $id): ?array
    {
        $sql = "SELECT r.*,
                       u.name AS tech_name
                FROM run_sheet r
                LEFT JOIN users u ON r.tech_id = u.id
                WHERE r.id = ?
                LIMIT 1";

        try {
            $runSheet = Db::fetchOne($sql, [(int) $id]);
        } catch (Throwable) {
            $runSheet = Db::fetchOne('SELECT * FROM run_sheet WHERE id = ? LIMIT 1', [(int) $id]);
        }

        if ($runSheet === null) {
            return null;
        }

        if (empty($runSheet['title'])) {
            $runSheet['title'] = 'Day Plan — ' . ($runSheet['run_date'] ?? date('Y-m-d'));
        }

        // Fetch ordered blocks
        $blocks = RunSheetBlock::findByRunSheet($id);
        $runSheet['blocks'] = $blocks;

        // Rollup statistics
        $totalBlocks = count($blocks);
        $completedBlocks = 0;
        $totalEstMinutes = 0;
        $totalActMinutes = 0;
        $redGateCount = 0;
        $amberGateCount = 0;
        $greenGateCount = 0;
        $exceedsCapacityCount = 0;

        foreach ($blocks as $b) {
            if ($b['status'] === 'completed') {
                $completedBlocks++;
            }
            $totalEstMinutes += (int) ($b['estimated_minutes'] ?? 0);
            if ($b['actual_minutes'] !== null) {
                $totalActMinutes += (int) $b['actual_minutes'];
            }

            $gate = $b['notice_gate_status'] ?? 'green';
            if ($gate === 'red') {
                $redGateCount++;
            } elseif ($gate === 'amber') {
                $amberGateCount++;
            } else {
                $greenGateCount++;
            }

            if (!empty($b['exceeds_carry_capacity'])) {
                $exceedsCapacityCount++;
            }
        }

        $runSheet['rollup'] = [
            'total_blocks' => $totalBlocks,
            'completed_blocks' => $completedBlocks,
            'pending_blocks' => $totalBlocks - $completedBlocks,
            'progress_percentage' => $totalBlocks > 0 ? round(($completedBlocks / $totalBlocks) * 100) : 0,
            'total_estimated_minutes' => $totalEstMinutes,
            'total_actual_minutes' => $totalActMinutes,
            'variance_minutes' => $totalActMinutes > 0 ? ($totalActMinutes - $totalEstMinutes) : 0,
            'red_gate_count' => $redGateCount,
            'amber_gate_count' => $amberGateCount,
            'green_gate_count' => $greenGateCount,
            'exceeds_capacity_count' => $exceedsCapacityCount,
        ];

        return $runSheet;
    }

    /**
     * Create a new run sheet.
     */
    public static function create(array $data, ?int $userId = null): array
    {
        $techId = !empty($data['tech_id']) ? (int) $data['tech_id'] : ($userId ?? 1);
        $runDate = !empty($data['run_date']) ? (string) $data['run_date'] : (!empty($data['scheduled_date']) ? (string) $data['scheduled_date'] : date('Y-m-d'));
        $title = !empty($data['title']) ? trim((string) $data['title']) : "Day Plan — {$runDate}";
        $status = (string) ($data['status'] ?? self::STATUS_ACTIVE);
        $notes = isset($data['notes']) ? (string) $data['notes'] : null;
        $routeOrder = isset($data['route_order']) ? (is_array($data['route_order']) ? json_encode($data['route_order']) : (string) $data['route_order']) : null;

        $sql = "INSERT INTO run_sheet (
                    tech_id, title, run_date, status, route_order, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";

        Db::execute($sql, [
            $techId,
            $title,
            $runDate,
            $status,
            $routeOrder,
            $notes,
        ]);

        $newId = (int) Db::lastInsertId();

        Correction::record(
            'run_sheet',
            $newId,
            'status',
            null,
            $status,
            $userId,
            'Run sheet created for date ' . $runDate
        );

        // If blocks were provided in payload, create them in sequence
        if (!empty($data['blocks']) && is_array($data['blocks'])) {
            $order = 1;
            foreach ($data['blocks'] as $blockData) {
                if (is_array($blockData)) {
                    $blockData['sort_order'] = $blockData['sort_order'] ?? $order++;
                    RunSheetBlock::create($newId, $blockData, $userId);
                }
            }
        }

        return self::findById($newId) ?? [];
    }

    /**
     * Update run sheet metadata.
     */
    public static function update(int|string $id, array $data, ?int $userId = null, ?string $reason = null): array
    {
        $existing = self::findById($id);
        if ($existing === null) {
            throw new RuntimeException("Run sheet #{$id} not found");
        }

        $updatableFields = ['tech_id', 'title', 'run_date', 'status', 'route_order', 'notes'];
        $fieldsToUpdate = [];
        $params = [];

        foreach ($updatableFields as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $oldVal = $existing[$field] ?? null;
            $newVal = $data[$field];
            if (is_array($newVal)) {
                $newVal = json_encode($newVal);
            }

            $oldStr = $oldVal !== null ? (string) $oldVal : null;
            $newStr = $newVal !== null ? (string) $newVal : null;

            if ($oldStr !== $newStr) {
                Correction::record(
                    'run_sheet',
                    (int) $id,
                    $field,
                    $oldStr,
                    $newStr,
                    $userId,
                    $reason ?? "Updated {$field} on run sheet"
                );

                $fieldsToUpdate[] = "`{$field}` = ?";
                $params[] = $newVal;
            }
        }

        if (!empty($fieldsToUpdate)) {
            $fieldsToUpdate[] = '`updated_at` = CURRENT_TIMESTAMP';
            $sql = 'UPDATE run_sheet SET ' . implode(', ', $fieldsToUpdate) . ' WHERE id = ?';
            $params[] = (int) $id;

            Db::execute($sql, $params);
        }

        return self::findById($id) ?? [];
    }
}
