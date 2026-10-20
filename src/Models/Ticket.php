<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use RuntimeException;
use Throwable;

/**
 * Ticket Model
 * Handles CRUD, state transitions, prioritization, parent-child hierarchies,
 * and read-only Yardi sightings.
 */
class Ticket
{
    /**
     * Allowed ticket states.
     */
    public const STATE_NEW = 'new';
    public const STATE_VERIFIED = 'verified';
    public const STATE_IN_PROGRESS = 'in-progress';
    public const STATE_BLOCKED = 'blocked';
    public const STATE_ON_HOLD = 'on-hold';
    public const STATE_DONE = 'done';
    public const STATE_CLOSED = 'closed';
    public const STATE_CLOSED_ELSEWHERE = 'closed-elsewhere';

    /**
     * Fetch all tickets with prioritized ordering:
     * 1. Safety first (priority = urgent)
     * 2. Closable today (status in in-progress, in_progress, verified)
     * 3. Rest
     */
    public static function findAll(array $filters = []): array
    {
        $where = [];
        $params = [];

        if (isset($filters['parent_ticket_id'])) {
            if ($filters['parent_ticket_id'] === null || $filters['parent_ticket_id'] === 'null') {
                $where[] = 't.parent_ticket_id IS NULL';
            } else {
                $where[] = 't.parent_ticket_id = ?';
                $params[] = (int) $filters['parent_ticket_id'];
            }
        }

        if (!empty($filters['building_id'])) {
            $where[] = 't.building_id = ?';
            $params[] = (int) $filters['building_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = 't.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['since'])) {
            $where[] = '(t.updated_at >= ? OR t.created_at >= ?)';
            $params[] = $filters['since'];
            $params[] = $filters['since'];
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        // Priority sort: Safety first (urgent) -> Closable today (in-progress/verified) -> Rest
        $sql = "SELECT t.*, 
                       b.name AS building_name, 
                       u.unit_number,
                       tech.name AS assigned_tech_name,
                       (SELECT COUNT(*) FROM ticket c WHERE c.parent_ticket_id = t.id) AS children_count
                FROM ticket t
                LEFT JOIN building b ON t.building_id = b.id
                LEFT JOIN unit u ON t.unit_id = u.id
                LEFT JOIN users tech ON t.assigned_tech_id = tech.id
                {$whereClause}
                ORDER BY 
                    CASE 
                        WHEN t.priority = 'urgent' THEN 1
                        WHEN t.status IN ('in-progress', 'in_progress', 'verified') THEN 2
                        ELSE 3
                    END ASC,
                    t.created_at DESC";

        try {
            $rows = Db::fetchAll($sql, $params);
        } catch (Throwable) {
            // Fallback for simple schema if joins fail
            $sqlSimple = "SELECT t.*, 
                                 (SELECT COUNT(*) FROM ticket c WHERE c.parent_ticket_id = t.id) AS children_count
                          FROM ticket t
                          {$whereClause}
                          ORDER BY 
                              CASE 
                                  WHEN t.priority = 'urgent' THEN 1
                                  WHEN t.status IN ('in-progress', 'in_progress', 'verified') THEN 2
                                  ELSE 3
                              END ASC,
                              t.created_at DESC";
            $rows = Db::fetchAll($sqlSimple, $params);
        }

        return array_map([self::class, 'enrichTicket'], $rows);
    }

    /**
     * Find a ticket by ID.
     */
    public static function findById(int|string $id): ?array
    {
        $sql = "SELECT t.*, 
                       b.name AS building_name, 
                       u.unit_number,
                       tech.name AS assigned_tech_name
                FROM ticket t
                LEFT JOIN building b ON t.building_id = b.id
                LEFT JOIN unit u ON t.unit_id = u.id
                LEFT JOIN users tech ON t.assigned_tech_id = tech.id
                WHERE t.id = ?
                LIMIT 1";

        try {
            $row = Db::fetchOne($sql, [(int) $id]);
        } catch (Throwable) {
            $row = Db::fetchOne('SELECT * FROM ticket WHERE id = ? LIMIT 1', [(int) $id]);
        }

        return $row !== null ? self::enrichTicket($row) : null;
    }

    /**
     * Find ticket with its children and rollup statistics.
     */
    public static function findWithChildren(int|string $id): ?array
    {
        $parent = self::findById($id);
        if ($parent === null) {
            return null;
        }

        // Fetch children tickets
        $childrenSql = "SELECT t.*, 
                               tech.name AS assigned_tech_name
                        FROM ticket t
                        LEFT JOIN users tech ON t.assigned_tech_id = tech.id
                        WHERE t.parent_ticket_id = ?
                        ORDER BY t.id ASC";

        try {
            $childrenRows = Db::fetchAll($childrenSql, [(int) $id]);
        } catch (Throwable) {
            $childrenRows = Db::fetchAll('SELECT * FROM ticket WHERE parent_ticket_id = ? ORDER BY id ASC', [(int) $id]);
        }

        $children = array_map([self::class, 'enrichTicket'], $childrenRows);

        // Compute rollup stats
        $statesCount = [];
        $doneCount = 0;
        $blockedCount = 0;
        $inProgressCount = 0;

        foreach ($children as $child) {
            $st = $child['status'];
            $statesCount[$st] = ($statesCount[$st] ?? 0) + 1;

            if (in_array($st, ['done', 'closed', 'resolved'], true)) {
                $doneCount++;
            } elseif (in_array($st, ['blocked', 'on-hold', 'on_hold'], true)) {
                $blockedCount++;
            } elseif (in_array($st, ['in-progress', 'in_progress'], true)) {
                $inProgressCount++;
            }
        }

        $parent['children'] = $children;
        $parent['children_count'] = count($children);
        $parent['rollup'] = [
            'total' => count($children),
            'done' => $doneCount,
            'blocked' => $blockedCount,
            'in_progress' => $inProgressCount,
            'states' => $statesCount,
        ];

        // Attached notice state lookup
        try {
            $noticeRow = Db::fetchOne(
                'SELECT id, ticket_id, status, entry_start, entry_end, serve_by_deadline, verified_at '
                . 'FROM notice WHERE ticket_id = ? ORDER BY id DESC LIMIT 1',
                [(int) $id]
            );
            if ($noticeRow !== null) {
                $gate = Notice::calculateGateStatus($noticeRow);
                $parent['notice'] = array_merge($noticeRow, $gate);
                $parent['notice_id'] = (int) $noticeRow['id'];
                $parent['notice_status'] = $noticeRow['status'];
                $parent['notice_gate_status'] = $gate['gate_status'];
                $parent['serve_by_deadline'] = $noticeRow['serve_by_deadline'];
            }
        } catch (Throwable) {
            // Notice query fallback
        }

        return $parent;
    }

    /**
     * Create a new ticket.
     * wo_number is NULLABLE.
     */
    public static function create(array $data, ?int $userId = null): array
    {
        $woNumber = !empty($data['wo_number']) ? trim((string) $data['wo_number']) : null;
        $parentTicketId = !empty($data['parent_ticket_id']) ? (int) $data['parent_ticket_id'] : null;
        $buildingId = (int) ($data['building_id'] ?? 1);
        $unitId = !empty($data['unit_id']) ? (int) $data['unit_id'] : null;
        $title = trim((string) ($data['title'] ?? 'Untitled Work Order'));
        $description = isset($data['description']) ? (string) $data['description'] : null;
        $verbatimText = isset($data['verbatim_text']) ? (string) $data['verbatim_text'] : null;
        $verifiedScope = isset($data['verified_scope']) ? (string) $data['verified_scope'] : null;
        $photoUrl = isset($data['photo_url']) ? (string) $data['photo_url'] : null;
        $status = (string) ($data['status'] ?? self::STATE_NEW);
        $priority = (string) ($data['priority'] ?? 'medium');
        $blockerReason = isset($data['blocker_reason']) ? (string) $data['blocker_reason'] : null;
        $assignedTechId = !empty($data['assigned_tech_id']) ? (int) $data['assigned_tech_id'] : null;
        $createdByUserId = $userId ?? (!empty($data['created_by_user_id']) ? (int) $data['created_by_user_id'] : null);
        $lastSeenInYardi = !empty($data['last_seen_in_yardi']) ? (string) $data['last_seen_in_yardi'] : null;
        $exteriorWork = !empty($data['exterior_work']) ? 1 : 0;
        $weatherNote = isset($data['weather_note']) ? (string) $data['weather_note'] : null;
        $noticeNeeded = !empty($data['notice_needed']) ? 1 : 0;
        $noticeSentAt = !empty($data['notice_sent_at']) ? (string) $data['notice_sent_at'] : null;
        $noticeConfirmedBy = !empty($data['notice_confirmed_by']) ? trim((string) $data['notice_confirmed_by']) : null;

        $sql = 'INSERT INTO ticket (
                    wo_number, parent_ticket_id, building_id, unit_id, 
                    title, description, verbatim_text, verified_scope, photo_url,
                    status, priority, blocker_reason, last_seen_in_yardi,
                    created_by_user_id, assigned_tech_id, exterior_work, weather_note,
                    notice_needed, notice_sent_at, notice_confirmed_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';

        Db::execute($sql, [
            $woNumber,
            $parentTicketId,
            $buildingId,
            $unitId,
            $title,
            $description,
            $verbatimText,
            $verifiedScope,
            $photoUrl,
            $status,
            $priority,
            $blockerReason,
            $lastSeenInYardi,
            $createdByUserId,
            $assignedTechId,
            $exteriorWork,
            $weatherNote,
            $noticeNeeded,
            $noticeSentAt,
            $noticeConfirmedBy,
        ]);

        $newId = (int) Db::lastInsertId();

        // Record initial creation in correction log for auditability
        Correction::record(
            'ticket',
            $newId,
            'status',
            null,
            $status,
            $createdByUserId,
            'Initial ticket creation'
        );

        if ($woNumber !== null) {
            Correction::record(
                'ticket',
                $newId,
                'wo_number',
                null,
                $woNumber,
                $createdByUserId,
                'Assigned WO Number on creation'
            );
        }

        return self::findById($newId) ?? [];
    }

    /**
     * Create a child ticket under an existing parent.
     */
    public static function createChild(int|string $parentId, array $data, ?int $userId = null): array
    {
        $parent = self::findById($parentId);
        if ($parent === null) {
            throw new RuntimeException("Parent ticket #{$parentId} not found");
        }

        $data['parent_ticket_id'] = (int) $parentId;
        if (empty($data['building_id'])) {
            $data['building_id'] = $parent['building_id'];
        }
        if (empty($data['unit_id']) && !empty($parent['unit_id'])) {
            $data['unit_id'] = $parent['unit_id'];
        }

        return self::create($data, $userId);
    }

    /**
     * Update an existing ticket with strict append-only audit trail.
     * EVERY modified field writes a row to the `correction` table.
     */
    public static function update(int|string $id, array $data, ?int $userId = null, ?string $reason = null): array
    {
        $existing = self::findById($id);
        if ($existing === null) {
            throw new RuntimeException("Ticket #{$id} not found");
        }

        $updatableFields = [
            'wo_number',
            'parent_ticket_id',
            'building_id',
            'unit_id',
            'title',
            'description',
            'verbatim_text',
            'verified_scope',
            'photo_url',
            'status',
            'priority',
            'blocker_reason',
            'last_seen_in_yardi',
            'assigned_tech_id',
            'exterior_work',
            'weather_note',
            'notice_needed',
            'notice_sent_at',
            'notice_confirmed_by',
        ];

        $fieldsToUpdate = [];
        $params = [];

        foreach ($updatableFields as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $oldVal = $existing[$field] ?? null;
            $newVal = $data[$field];

            // Normalize nulls and empty strings for string fields
            if ($field === 'wo_number' && $newVal === '') {
                $newVal = null;
            }
            if ($field === 'weather_note' && $newVal === '') {
                $newVal = null;
            }
            if ($field === 'exterior_work') {
                $newVal = !empty($newVal) ? 1 : 0;
            }
            if ($field === 'notice_needed') {
                $newVal = !empty($newVal) ? 1 : 0;
            }
            if ($field === 'notice_sent_at' && ($newVal === '' || $newVal === false)) {
                $newVal = null;
            }
            if ($field === 'notice_confirmed_by' && ($newVal === '' || $newVal === false)) {
                $newVal = null;
            }

            // Compare as strings
            $oldStr = $oldVal !== null ? (string) $oldVal : null;
            $newStr = $newVal !== null ? (string) $newVal : null;

            if ($oldStr !== $newStr) {
                // Record the correction entry (NO silent edits, ever)
                Correction::record(
                    'ticket',
                    (int) $id,
                    $field,
                    $oldStr,
                    $newStr,
                    $userId,
                    $reason ?? "Updated {$field}"
                );

                $fieldsToUpdate[] = "`{$field}` = ?";
                $params[] = $newVal;
            }
        }

        if (!empty($fieldsToUpdate)) {
            $fieldsToUpdate[] = '`updated_at` = CURRENT_TIMESTAMP';
            $sql = 'UPDATE ticket SET ' . implode(', ', $fieldsToUpdate) . ' WHERE id = ?';
            $params[] = (int) $id;

            Db::execute($sql, $params);
        }

        return self::findById($id) ?? [];
    }

    /**
     * Stamp Yardi sighting (READ-ONLY mirror).
     * Inserts row into `yardi_sightings` and updates `last_seen_in_yardi`.
     * NEVER auto-deletes, NEVER writes back to Yardi.
     */
    public static function recordSighting(int|string $id, array $sightingData): array
    {
        $ticket = self::findById($id);
        if ($ticket === null) {
            throw new RuntimeException("Ticket #{$id} not found");
        }

        $woNumber = $ticket['wo_number'] ?? ($sightingData['wo_number'] ?? 'UNKNOWN');
        $unitRaw = $sightingData['unit_raw'] ?? null;
        $description = $sightingData['description'] ?? null;
        $status = $sightingData['status'] ?? null;
        $sightedAt = $sightingData['sighted_at'] ?? date('Y-m-d H:i:s');
        $payload = isset($sightingData['payload']) ? json_encode($sightingData['payload']) : null;

        // Stamp sighting
        Db::execute(
            'INSERT INTO yardi_sightings (ticket_id, wo_number, unit_raw, description, status, sighted_at, payload, created_at) '
            . 'VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [
                (int) $id,
                $woNumber,
                $unitRaw,
                $description,
                $status,
                $sightedAt,
                $payload,
            ]
        );

        // Update ticket's last_seen_in_yardi
        self::update($id, [
            'last_seen_in_yardi' => $sightedAt,
        ], null, 'Yardi sighting stamped');

        return [
            'ticket_id' => (int) $id,
            'wo_number' => $woNumber,
            'sighted_at' => $sightedAt,
            'message' => 'Yardi sighting recorded successfully',
        ];
    }

    /**
     * Enrich a ticket row with calculated domain properties:
     * - `is_stale_yardi`: true only if last_seen_in_yardi is NOT NULL and >= 7 days old
     * - `yardi_warning`: message for stale tickets
     * - state mapping (status/state sync)
     */
    private static function enrichTicket(array $row): array
    {
        // Align state/status
        $status = $row['status'] ?? self::STATE_NEW;
        $row['status'] = $status;
        $row['state'] = $status;

        $lastSeen = $row['last_seen_in_yardi'] ?? null;

        // Null case is neutral: "not yet verified in Yardi" (no warning pill)
        // Stale warning ONLY triggers if last_seen_in_yardi is NOT null and >= 7 days ago
        $isStale = false;
        $warning = null;

        if ($lastSeen !== null && !empty($lastSeen)) {
            $timestamp = strtotime((string) $lastSeen);
            if ($timestamp !== false) {
                $daysAgo = (time() - $timestamp) / 86400;
                $isClosed = in_array($status, [self::STATE_CLOSED, self::STATE_CLOSED_ELSEWHERE, 'resolved'], true);

                if ($daysAgo >= 7 && !$isClosed) {
                    $isStale = true;
                    $warning = 'Possibly closed/reassigned (unseen in Yardi for ' . floor($daysAgo) . ' days)';
                }
            }
        }

        $row['is_stale_yardi'] = $isStale;
        $row['yardi_warning'] = $warning;
        $row['exterior_work'] = (bool) ($row['exterior_work'] ?? 0);
        $row['weather_note'] = $row['weather_note'] ?? null;
        $row['notice_needed'] = (bool) ($row['notice_needed'] ?? 0);
        $row['notice_sent_at'] = $row['notice_sent_at'] ?? null;
        $row['notice_confirmed_by'] = $row['notice_confirmed_by'] ?? null;

        return $row;
    }
}
