<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use App\Services\BatchSuggester;
use App\Services\VehiclePlanner;
use RuntimeException;
use Throwable;

/**
 * RunSheetBlock Model
 * Individual work unit on a technician's day-plan, linking to a ticket,
 * site, estimated vs actual minutes, notice legal gate status, and e-bike carry check.
 */
class RunSheetBlock
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_SKIPPED = 'skipped';

    /**
     * Find block by ID.
     */
    public static function findById(int|string $id): ?array
    {
        $sql = "SELECT b.*,
                       t.wo_number,
                       t.title AS ticket_title,
                       t.priority AS ticket_priority,
                       bldg.name AS building_name,
                       bldg.address AS building_address,
                       u.unit_number
                FROM run_sheet_block b
                LEFT JOIN ticket t ON b.ticket_id = t.id
                LEFT JOIN building bldg ON b.building_id = bldg.id
                LEFT JOIN unit u ON b.unit_id = u.id
                WHERE b.id = ?
                LIMIT 1";

        try {
            $row = Db::fetchOne($sql, [(int) $id]);
        } catch (Throwable) {
            $row = Db::fetchOne('SELECT * FROM run_sheet_block WHERE id = ? LIMIT 1', [(int) $id]);
        }

        return $row !== null ? self::enrichBlock($row) : null;
    }

    /**
     * Fetch all blocks for a run sheet, sorted by sort_order.
     */
    public static function findByRunSheet(int|string $runSheetId): array
    {
        $sql = "SELECT b.*,
                       t.wo_number,
                       t.title AS ticket_title,
                       t.priority AS ticket_priority,
                       bldg.name AS building_name,
                       bldg.address AS building_address,
                       u.unit_number
                FROM run_sheet_block b
                LEFT JOIN ticket t ON b.ticket_id = t.id
                LEFT JOIN building bldg ON b.building_id = bldg.id
                LEFT JOIN unit u ON b.unit_id = u.id
                WHERE b.run_sheet_id = ?
                ORDER BY b.sort_order ASC, b.id ASC";

        try {
            $rows = Db::fetchAll($sql, [(int) $runSheetId]);
        } catch (Throwable) {
            $rows = Db::fetchAll('SELECT * FROM run_sheet_block WHERE run_sheet_id = ? ORDER BY sort_order ASC', [(int) $runSheetId]);
        }

        return array_map([self::class, 'enrichBlock'], $rows);
    }

    /**
     * Create a new block on a run sheet.
     */
    public static function create(int|string $runSheetId, array $data, ?int $userId = null): array
    {
        $ticketId = !empty($data['ticket_id']) ? (int) $data['ticket_id'] : null;
        $buildingId = !empty($data['building_id']) ? (int) $data['building_id'] : null;
        $unitId = !empty($data['unit_id']) ? (int) $data['unit_id'] : null;
        $title = trim((string) ($data['title'] ?? 'Scheduled Task'));
        $notes = isset($data['notes']) ? (string) $data['notes'] : null;
        $sortOrder = isset($data['sort_order']) ? (int) $data['sort_order'] : self::getNextSortOrder((int) $runSheetId);
        $status = (string) ($data['status'] ?? self::STATUS_PENDING);
        $startTime = !empty($data['start_time']) ? (string) $data['start_time'] : null;
        $endTime = !empty($data['end_time']) ? (string) $data['end_time'] : null;
        $estimatedMinutes = !empty($data['estimated_minutes']) ? (int) $data['estimated_minutes'] : 45;
        $actualMinutes = isset($data['actual_minutes']) && $data['actual_minutes'] !== '' ? (int) $data['actual_minutes'] : null;

        // Normalize tools & parts into comma-separated strings or JSON for storage
        $tools = isset($data['required_tools']) ? (is_array($data['required_tools']) ? implode(', ', $data['required_tools']) : (string) $data['required_tools']) : null;
        $parts = isset($data['required_parts']) ? (is_array($data['required_parts']) ? implode(', ', $data['required_parts']) : (string) $data['required_parts']) : null;

        // Auto-fill building/unit from ticket if missing
        if ($ticketId && (!$buildingId || !$unitId)) {
            $t = Ticket::findById($ticketId);
            if ($t) {
                if (!$buildingId) {
                    $buildingId = !empty($t['building_id']) ? (int) $t['building_id'] : null;
                }
                if (!$unitId) {
                    $unitId = !empty($t['unit_id']) ? (int) $t['unit_id'] : null;
                }
                if ($title === 'Scheduled Task' && !empty($t['title'])) {
                    $title = $t['title'];
                }
                if (empty($tools)) {
                    $tools = implode(', ', BatchSuggester::inferToolsFromTicket($t));
                }
                if (empty($parts)) {
                    $parts = implode(', ', BatchSuggester::inferPartsFromTicket($t));
                }
            }
        }

        $sql = "INSERT INTO run_sheet_block (
                    run_sheet_id, ticket_id, building_id, unit_id,
                    title, notes, sort_order, status, start_time, end_time,
                    estimated_minutes, actual_minutes, required_tools, required_parts,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";

        Db::execute($sql, [
            (int) $runSheetId,
            $ticketId,
            $buildingId,
            $unitId,
            $title,
            $notes,
            $sortOrder,
            $status,
            $startTime,
            $endTime,
            $estimatedMinutes,
            $actualMinutes,
            $tools,
            $parts,
        ]);

        $newId = (int) Db::lastInsertId();

        Correction::record(
            'run_sheet_block',
            $newId,
            'status',
            null,
            $status,
            $userId,
            'Block added to run sheet'
        );

        return self::findById($newId) ?? [];
    }

    /**
     * Update a block (e.g. record actual_minutes, mark completed, change times).
     * Writes an append-only correction row for each changed field.
     */
    public static function update(int|string $id, array $data, ?int $userId = null, ?string $reason = null): array
    {
        $existing = self::findById($id);
        if ($existing === null) {
            throw new RuntimeException("Run sheet block #{$id} not found");
        }

        $updatableFields = [
            'ticket_id',
            'building_id',
            'unit_id',
            'title',
            'notes',
            'sort_order',
            'status',
            'start_time',
            'end_time',
            'estimated_minutes',
            'actual_minutes',
            'required_tools',
            'required_parts',
        ];

        // Format tools/parts if array
        if (isset($data['required_tools']) && is_array($data['required_tools'])) {
            $data['required_tools'] = implode(', ', $data['required_tools']);
        }
        if (isset($data['required_parts']) && is_array($data['required_parts'])) {
            $data['required_parts'] = implode(', ', $data['required_parts']);
        }

        $fieldsToUpdate = [];
        $params = [];

        foreach ($updatableFields as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $oldVal = $existing[$field] ?? null;
            $newVal = $data[$field];

            // Normalize comparison
            $oldStr = $oldVal !== null ? (string) $oldVal : null;
            $newStr = $newVal !== null ? (string) $newVal : null;

            if ($oldStr !== $newStr) {
                Correction::record(
                    'run_sheet_block',
                    (int) $id,
                    $field,
                    $oldStr,
                    $newStr,
                    $userId,
                    $reason ?? "Updated {$field} on block #{$id}"
                );

                $fieldsToUpdate[] = "`{$field}` = ?";
                $params[] = $newVal;
            }
        }

        if (!empty($fieldsToUpdate)) {
            $fieldsToUpdate[] = '`updated_at` = CURRENT_TIMESTAMP';
            $sql = 'UPDATE run_sheet_block SET ' . implode(', ', $fieldsToUpdate) . ' WHERE id = ?';
            $params[] = (int) $id;

            Db::execute($sql, $params);
        }

        return self::findById($id) ?? [];
    }

    /**
     * Delete a block from a run sheet and record audit.
     */
    public static function delete(int|string $id, ?int $userId = null, ?string $reason = null): bool
    {
        $existing = self::findById($id);
        if ($existing === null) {
            return false;
        }

        Correction::record(
            'run_sheet_block',
            (int) $id,
            'status',
            $existing['status'],
            'deleted',
            $userId,
            $reason ?? "Removed block from run sheet #{$existing['run_sheet_id']}"
        );

        Db::execute('DELETE FROM run_sheet_block WHERE id = ?', [(int) $id]);
        return true;
    }

    /**
     * Enrich raw database row with notice legal gate status and e-bike carry check.
     */
    public static function enrichBlock(array $row): array
    {
        // 1. Notice legal gate status
        $ticketId = !empty($row['ticket_id']) ? (int) $row['ticket_id'] : null;
        if ($ticketId) {
            $gate = BatchSuggester::resolveTicketNoticeGate($ticketId);
            $row['notice_id'] = $gate['notice_id'];
            $row['notice_status'] = $gate['notice_status'];
            $row['notice_gate_status'] = $gate['gate_status'];
            $row['notice_is_cleared'] = $gate['is_cleared'];
            $row['notice_gate_reason'] = $gate['reason'];
        } else {
            $row['notice_id'] = null;
            $row['notice_status'] = null;
            $row['notice_gate_status'] = 'green';
            $row['notice_is_cleared'] = true;
            $row['notice_gate_reason'] = 'Non-ticket site block (no notice required)';
        }

        // 2. E-bike carry check
        $tools = VehiclePlanner::normalizeList($row['required_tools'] ?? null);
        $parts = VehiclePlanner::normalizeList($row['required_parts'] ?? null);
        $carryCheck = VehiclePlanner::checkBlockCarry($tools, $parts);

        $row['required_tools_list'] = $tools;
        $row['required_parts_list'] = $parts;
        $row['exceeds_carry_capacity'] = $carryCheck['exceeds_carry_capacity'];
        $row['carry_warning'] = $carryCheck['warning'];
        $row['carry_reason'] = $carryCheck['reason'];
        $row['estimated_weight_lbs'] = $carryCheck['estimated_weight_lbs'];
        $row['bulky_items'] = $carryCheck['bulky_items'];

        // 3. Variance calculation (actual vs estimate)
        if ($row['actual_minutes'] !== null && $row['estimated_minutes'] !== null) {
            $row['variance_minutes'] = (int) $row['actual_minutes'] - (int) $row['estimated_minutes'];
        } else {
            $row['variance_minutes'] = null;
        }

        return $row;
    }

    private static function getNextSortOrder(int $runSheetId): int
    {
        $row = Db::fetchOne('SELECT MAX(sort_order) AS max_order FROM run_sheet_block WHERE run_sheet_id = ?', [$runSheetId]);
        return ($row !== null && isset($row['max_order'])) ? ((int) $row['max_order'] + 1) : 1;
    }
}
