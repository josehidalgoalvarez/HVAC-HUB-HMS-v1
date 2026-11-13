<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use App\Services\WeatherService;
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
    public const STATE_ARCHIVED_BLOCKED = 'archived-blocked';
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
        } elseif (empty($filters['include_archived'])) {
            // By default, exclude archived-blocked and archived tickets from active listings
            $where[] = 't.status NOT IN (?, ?)';
            $params[] = self::STATE_ARCHIVED_BLOCKED;
            $params[] = 'archived';
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
                       u.renovated AS unit_renovated,
                       u.renovated_date AS unit_renovated_date,
                       u.move_in_date AS unit_move_in_date,
                       u.occupancy_status AS unit_occupancy_status,
                       u.vacant_since AS unit_vacant_since,
                       (SELECT COUNT(*) FROM ticket_visit tv WHERE tv.unit_id = t.unit_id AND tv.outcome = 'failed_access') AS unit_failed_visits_count,
                       tech.name AS assigned_tech_name,
                       (SELECT COUNT(*) FROM ticket c WHERE c.parent_ticket_id = t.id) AS children_count,
                       app.name AS appliance_name,
                       app.brand AS appliance_brand,
                       app.model_number AS appliance_model
                FROM ticket t
                LEFT JOIN building b ON t.building_id = b.id
                LEFT JOIN unit u ON t.unit_id = u.id
                LEFT JOIN users tech ON t.assigned_tech_id = tech.id
                LEFT JOIN appliance app ON t.appliance_id = app.id
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
                       u.renovated AS unit_renovated,
                       u.renovated_date AS unit_renovated_date,
                       u.move_in_date AS unit_move_in_date,
                       u.occupancy_status AS unit_occupancy_status,
                       u.vacant_since AS unit_vacant_since,
                       (SELECT COUNT(*) FROM ticket_visit tv WHERE tv.unit_id = t.unit_id AND tv.outcome = 'failed_access') AS unit_failed_visits_count,
                       tech.name AS assigned_tech_name,
                       app.name AS appliance_name,
                       app.brand AS appliance_brand,
                       app.model_number AS appliance_model
                FROM ticket t
                LEFT JOIN building b ON t.building_id = b.id
                LEFT JOIN unit u ON t.unit_id = u.id
                LEFT JOIN users tech ON t.assigned_tech_id = tech.id
                LEFT JOIN appliance app ON t.appliance_id = app.id
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

        try {
            $parent['timeline'] = TicketTimeline::getForTicket((int) $id);
            $parent['visits'] = TicketVisit::getForTicket((int) $id);
            $parent['parts'] = PartWorkflow::getPartsForTicket((int) $id);
            $parent['related_tickets'] = self::getRelated((int) $id);
        } catch (Throwable) {
            // Fallback
        }

        return $parent;
    }

    /**
     * Link two tickets as related (bidirectional, unordered pair).
     */
    public static function linkRelated(int $ticketId, int $relatedId, ?int $userId = null, ?string $reason = null): array
    {
        if ($ticketId <= 0 || $relatedId <= 0) {
            throw new RuntimeException('Invalid ticket ID');
        }
        if ($ticketId === $relatedId) {
            throw new RuntimeException('Cannot link a ticket to itself');
        }

        $t1 = self::findById($ticketId);
        if ($t1 === null) {
            throw new RuntimeException("Ticket #{$ticketId} not found");
        }
        $t2 = self::findById($relatedId);
        if ($t2 === null) {
            throw new RuntimeException("Related ticket #{$relatedId} not found");
        }

        $a = min($ticketId, $relatedId);
        $b = max($ticketId, $relatedId);

        $existing = Db::fetchOne(
            'SELECT id FROM ticket_relationship WHERE (ticket_id = ? AND related_ticket_id = ?) OR (ticket_id = ? AND related_ticket_id = ?) LIMIT 1',
            [$a, $b, $b, $a]
        );
        if ($existing !== null) {
            throw new RuntimeException("Tickets #{$ticketId} and #{$relatedId} are already linked");
        }

        $cleanReason = $reason !== null && trim($reason) !== '' ? trim($reason) : null;

        Db::execute(
            'INSERT INTO ticket_relationship (ticket_id, related_ticket_id, reason, created_by, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [$a, $b, $cleanReason, $userId]
        );
        $relId = (int) Db::lastInsertId();

        Correction::record(
            'ticket',
            $ticketId,
            'related_ticket',
            null,
            (string) $relatedId,
            $userId,
            $cleanReason ?? "Linked related ticket #{$relatedId}"
        );

        return [
            'id' => $relId,
            'ticket_id' => $a,
            'related_ticket_id' => $b,
            'reason' => $cleanReason,
            'created_by' => $userId,
        ];
    }

    /**
     * Unlink two related tickets (bidirectional).
     */
    public static function unlinkRelated(int $ticketId, int $relatedId, ?int $userId = null, ?string $reason = null): bool
    {
        if ($ticketId <= 0 || $relatedId <= 0) {
            throw new RuntimeException('Invalid ticket ID');
        }

        $t1 = self::findById($ticketId);
        if ($t1 === null) {
            throw new RuntimeException("Ticket #{$ticketId} not found");
        }

        $affected = Db::execute(
            'DELETE FROM ticket_relationship WHERE (ticket_id = ? AND related_ticket_id = ?) OR (ticket_id = ? AND related_ticket_id = ?)',
            [$ticketId, $relatedId, $relatedId, $ticketId]
        );
        if ($affected === 0) {
            throw new RuntimeException("Relationship between ticket #{$ticketId} and #{$relatedId} not found");
        }

        $cleanReason = $reason !== null && trim($reason) !== '' ? trim($reason) : "Unlinked related ticket #{$relatedId}";
        Correction::record(
            'ticket',
            $ticketId,
            'related_ticket',
            (string) $relatedId,
            null,
            $userId,
            $cleanReason
        );

        return true;
    }

    /**
     * Get all related tickets for a ticket in either direction (one hop only).
     */
    public static function getRelated(int $ticketId): array
    {
        $sql = "SELECT t.*,
                       b.name AS building_name,
                       u.unit_number AS unit_number,
                       tr.reason AS link_reason,
                       tr.created_at AS linked_at
                FROM ticket_relationship tr
                JOIN ticket t ON t.id = CASE
                    WHEN tr.ticket_id = ? THEN tr.related_ticket_id
                    ELSE tr.ticket_id
                END
                LEFT JOIN building b ON t.building_id = b.id
                LEFT JOIN unit u ON t.unit_id = u.id
                WHERE tr.ticket_id = ? OR tr.related_ticket_id = ?
                ORDER BY tr.id DESC";

        $rows = Db::fetchAll($sql, [$ticketId, $ticketId, $ticketId]);
        return array_map([self::class, 'enrichTicket'], $rows);
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
        $applianceId = !empty($data['appliance_id']) ? (int) $data['appliance_id'] : null;
        if ($applianceId !== null) {
            $appRow = Db::fetchOne('SELECT id, building_id, unit_id FROM appliance WHERE id = ?', [$applianceId]);
            if (!$appRow) {
                throw new RuntimeException("Appliance #{$applianceId} not found");
            }
        }
        $title = trim((string) ($data['title'] ?? 'Untitled Work Order'));
        $description = isset($data['description']) ? (string) $data['description'] : null;
        $verbatimText = isset($data['verbatim_text']) ? (string) $data['verbatim_text'] : null;
        $verifiedScope = isset($data['verified_scope']) ? (string) $data['verified_scope'] : null;
        $photoUrl = isset($data['photo_url']) ? (string) $data['photo_url'] : null;
        $status = (string) ($data['status'] ?? self::STATE_NEW);
        $priority = (string) ($data['priority'] ?? 'medium');
        $blockerReason = isset($data['blocked_reason'])
            ? (string) $data['blocked_reason']
            : (isset($data['blocker_reason']) ? (string) $data['blocker_reason'] : null);
        if ($blockerReason !== null && trim($blockerReason) === '') {
            $blockerReason = null;
        }

        // Hard validation: setting ticket to blocked requires a non-empty reason
        if ($status === self::STATE_BLOCKED && empty(trim((string) $blockerReason))) {
            throw new RuntimeException("A non-empty blocked_reason is required when status is 'blocked'");
        }
        $assignedTechId = !empty($data['assigned_tech_id']) ? (int) $data['assigned_tech_id'] : null;
        if ($assignedTechId !== null && !Db::fetchOne('SELECT id FROM users WHERE id = ?', [$assignedTechId])) {
            $assignedTechId = null;
        }

        $createdByUserId = $userId ?? (!empty($data['created_by_user_id']) ? (int) $data['created_by_user_id'] : null);
        if ($createdByUserId !== null && !Db::fetchOne('SELECT id FROM users WHERE id = ?', [$createdByUserId])) {
            $createdByUserId = null;
        }
        $lastSeenInYardi = !empty($data['last_seen_in_yardi']) ? (string) $data['last_seen_in_yardi'] : null;
        $exteriorWork = !empty($data['exterior_work']) ? 1 : 0;
        $workExposure = in_array($data['work_exposure'] ?? '', ['indoor', 'exterior', 'exterior_ladder'], true)
            ? (string) $data['work_exposure']
            : ($exteriorWork ? 'exterior' : 'indoor');
        if ($workExposure !== 'indoor') {
            $exteriorWork = 1;
        }
        $weatherNote = isset($data['weather_note']) ? (string) $data['weather_note'] : null;
        $noticeNeeded = !empty($data['notice_needed']) ? 1 : 0;
        $noticeSentAt = !empty($data['notice_sent_at']) ? (string) $data['notice_sent_at'] : null;
        $noticeConfirmedBy = !empty($data['notice_confirmed_by']) ? trim((string) $data['notice_confirmed_by']) : null;
        $closedByParty = !empty($data['closed_by_party']) ? trim((string) $data['closed_by_party']) : null;

        $sql = 'INSERT INTO ticket (
                    wo_number, parent_ticket_id, building_id, unit_id, appliance_id,
                    title, description, verbatim_text, verified_scope, photo_url,
                    status, priority, blocker_reason, blocked_reason, blocked_at, closed_by_party, last_seen_in_yardi,
                    created_by_user_id, assigned_tech_id, exterior_work, work_exposure, weather_note,
                    notice_needed, notice_sent_at, notice_confirmed_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';

        $blockedAt = ($status === self::STATE_BLOCKED) ? gmdate('Y-m-d H:i:s') : null;

        Db::execute($sql, [
            $woNumber,
            $parentTicketId,
            $buildingId,
            $unitId,
            $applianceId,
            $title,
            $description,
            $verbatimText,
            $verifiedScope,
            $photoUrl,
            $status,
            $priority,
            $blockerReason,
            $blockerReason,
            $blockedAt,
            $closedByParty,
            $lastSeenInYardi,
            $createdByUserId,
            $assignedTechId,
            $exteriorWork,
            $workExposure,
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

        // Support alias: blocked_reason -> blocker_reason
        if (array_key_exists('blocked_reason', $data) && !array_key_exists('blocker_reason', $data)) {
            $data['blocker_reason'] = $data['blocked_reason'];
        }
        if (array_key_exists('blocker_reason', $data) && !array_key_exists('blocked_reason', $data)) {
            $data['blocked_reason'] = $data['blocker_reason'];
        }

        $targetStatus = array_key_exists('status', $data) ? (string) $data['status'] : ($existing['status'] ?? self::STATE_NEW);
        $targetBlockerReason = array_key_exists('blocked_reason', $data)
            ? $data['blocked_reason']
            : (array_key_exists('blocker_reason', $data) ? $data['blocker_reason'] : ($existing['blocked_reason'] ?? $existing['blocker_reason'] ?? null));

        // Hard requirement: transition to blocked requires non-empty reason
        if ($targetStatus === self::STATE_BLOCKED && empty(trim((string) $targetBlockerReason))) {
            throw new RuntimeException("A non-empty blocked_reason is required when setting status to 'blocked'");
        }

        // Timeline note preservation: if moving AWAY from blocked, preserve previous reason in timeline
        $oldStatus = $existing['status'] ?? null;
        $oldBlockerReason = $existing['blocked_reason'] ?? $existing['blocker_reason'] ?? null;
        if ($oldStatus === self::STATE_BLOCKED && $targetStatus !== self::STATE_BLOCKED && !empty(trim((string) $oldBlockerReason))) {
            TicketTimeline::append(
                (int) $id,
                TicketTimeline::EVENT_NOTE,
                'Tech',
                "Ticket unblocked (moved to {$targetStatus}). Previous blocked reason: {$oldBlockerReason}",
                ['previous_status' => $oldStatus, 'new_status' => $targetStatus, 'previous_blocked_reason' => $oldBlockerReason]
            );
        }

        // Clock handling:
        // - Entering 'blocked' -> stamp blocked_at = now
        // - Leaving 'blocked' -> clear blocked_at = null (clock reset)
        if ($oldStatus !== self::STATE_BLOCKED && $targetStatus === self::STATE_BLOCKED) {
            $data['blocked_at'] = gmdate('Y-m-d H:i:s');
        } elseif ($oldStatus === self::STATE_BLOCKED && $targetStatus !== self::STATE_BLOCKED) {
            $data['blocked_at'] = null;
        }

        // Party handling:
        // - If moving away from 'closed-elsewhere', clear closed_by_party = null
        if ($oldStatus === self::STATE_CLOSED_ELSEWHERE && $targetStatus !== self::STATE_CLOSED_ELSEWHERE) {
            $data['closed_by_party'] = null;
        }

        $updatableFields = [
            'wo_number',
            'parent_ticket_id',
            'building_id',
            'unit_id',
            'appliance_id',
            'title',
            'description',
            'verbatim_text',
            'verified_scope',
            'photo_url',
            'status',
            'priority',
            'blocker_reason',
            'blocked_reason',
            'blocked_at',
            'closed_by_party',
            'last_seen_in_yardi',
            'assigned_tech_id',
            'work_exposure',
            'exterior_work',
            'weather_note',
            'notice_needed',
            'notice_sent_at',
            'notice_confirmed_by',
            'scheduled_at',
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
            if ($field === 'appliance_id') {
                if ($newVal === '' || $newVal === null || $newVal === 0 || $newVal === '0') {
                    $newVal = null;
                } else {
                    $appRow = Db::fetchOne('SELECT id FROM appliance WHERE id = ?', [(int) $newVal]);
                    if (!$appRow) {
                        throw new RuntimeException("Appliance #{$newVal} not found");
                    }
                    $newVal = (int) $newVal;
                }
            }
            if ($field === 'weather_note' && $newVal === '') {
                $newVal = null;
            }
            if ($field === 'work_exposure') {
                if (!in_array($newVal, ['indoor', 'exterior', 'exterior_ladder'], true)) {
                    $newVal = 'indoor';
                }
                if (!array_key_exists('exterior_work', $data)) {
                    $data['exterior_work'] = ($newVal !== 'indoor') ? 1 : 0;
                }
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
     * Prune a blocked ticket to unit history and transition to archived-blocked status.
     * Can be invoked manually or via automatic 30-day aging evaluation.
     *
     * Rules:
     * - Only blocked tickets can be pruned.
     * - Idempotent: already archived tickets are returned without duplicate timeline/history entry.
     * - In-flight safety: if parts are in 'arrived' state (undo window open), pruning is blocked until verified/installed.
     * - Additive copy: copies blocked reason, blocked date range, WO#, what was tried, parts used/ordered, notes.
     * - Ticket row and details are preserved in database; status moves to 'archived-blocked'.
     */
    public static function pruneToUnitHistory(int|string $id, string $actor = 'Jose (Tech)', ?int $userId = null, string $reason = 'Manual prune'): array
    {
        $ticket = self::findById($id);
        if ($ticket === null) {
            throw new RuntimeException("Ticket #{$id} not found");
        }

        // Idempotency: if already archived, return safely
        if ($ticket['status'] === self::STATE_ARCHIVED_BLOCKED) {
            return $ticket;
        }

        if ($ticket['status'] !== self::STATE_BLOCKED) {
            throw new RuntimeException("Cannot prune ticket #{$id}: ticket status is '{$ticket['status']}', not 'blocked'");
        }

        // In-flight safety check: check for any ticket_part in 'arrived' state (open undo window)
        $arrivedParts = Db::fetchAll(
            "SELECT id, part_name FROM ticket_part WHERE ticket_id = ? AND status = 'arrived'",
            [(int) $id]
        );
        if (!empty($arrivedParts)) {
            $names = implode(', ', array_column($arrivedParts, 'part_name'));
            throw new RuntimeException("Cannot prune ticket #{$id}: in-flight part arrival undo window is open for: {$names}");
        }

        $now = gmdate('Y-m-d H:i:s');
        $blockedAt = $ticket['blocked_at'] ?: $ticket['updated_at'] ?: $ticket['created_at'] ?: $now;
        $blockedReason = $ticket['blocked_reason'] ?: $ticket['blocker_reason'] ?: 'No blocked reason specified';
        $woNumber = $ticket['wo_number'] ?: 'Unnumbered';
        $unitNumber = $ticket['unit_number'] ?: ($ticket['unit_id'] ? "Unit #{$ticket['unit_id']}" : 'Building Level');

        // Gather "what was tried" from timeline and notes
        $timeline = Db::fetchAll(
            'SELECT event_type, actor, note, created_at FROM ticket_timeline WHERE ticket_id = ? ORDER BY id ASC',
            [(int) $id]
        );
        $whatWasTried = [];
        foreach ($timeline as $evt) {
            if (!empty($evt['note'])) {
                $whatWasTried[] = "[{$evt['created_at']}] {$evt['actor']} ({$evt['event_type']}): {$evt['note']}";
            }
        }
        if (!empty($ticket['verified_scope'])) {
            $whatWasTried[] = "[Scope] " . $ticket['verified_scope'];
        }
        if (!empty($ticket['verbatim_text'])) {
            $whatWasTried[] = "[Verbatim Request] " . $ticket['verbatim_text'];
        }

        // Gather parts used / ordered
        $ticketParts = Db::fetchAll(
            'SELECT part_name, part_number, supplier, quantity, status FROM ticket_part WHERE ticket_id = ?',
            [(int) $id]
        );
        $partsSummary = [];
        foreach ($ticketParts as $tp) {
            $partsSummary[] = "{$tp['quantity']}x {$tp['part_name']} ({$tp['status']}, supplier: {$tp['supplier']})";
        }

        // Unit visit failures if applicable
        $unitVisits = [];
        if (!empty($ticket['unit_id'])) {
            $visits = Db::fetchAll(
                'SELECT outcome, failure_reason, visited_at FROM ticket_visit WHERE ticket_id = ? OR unit_id = ? ORDER BY id DESC LIMIT 5',
                [(int) $id, (int) $ticket['unit_id']]
            );
            foreach ($visits as $v) {
                $unitVisits[] = "[Visit {$v['visited_at']}] {$v['outcome']}: " . ($v['failure_reason'] ?: 'No notes');
            }
        }

        $structuredPruneData = [
            'ticket_id' => (int) $id,
            'wo_number' => $woNumber,
            'unit_id' => $ticket['unit_id'],
            'unit_number' => $unitNumber,
            'building_id' => $ticket['building_id'],
            'blocked_reason' => $blockedReason,
            'blocked_since' => $blockedAt,
            'pruned_at' => $now,
            'date_range' => "{$blockedAt} → {$now}",
            'what_was_tried' => $whatWasTried,
            'parts_summary' => $partsSummary,
            'unit_visits' => $unitVisits,
            'prune_type' => $reason,
        ];

        // Format permanent unit history note
        $historyNote = "PRUNED TO UNIT HISTORY: WO {$woNumber} (Blocked: {$blockedReason})\n"
                     . "Dates: {$blockedAt} to {$now}\n"
                     . "What was tried: " . (!empty($whatWasTried) ? implode("; ", $whatWasTried) : 'None documented') . "\n"
                     . "Parts: " . (!empty($partsSummary) ? implode("; ", $partsSummary) : 'None') . "\n"
                     . "Ticket link: /tickets/{$id}";

        // Write permanent history entry to ticket timeline using EVENT_PRUNED_TO_HISTORY
        TicketTimeline::append(
            (int) $id,
            TicketTimeline::EVENT_PRUNED_TO_HISTORY,
            $actor,
            $historyNote,
            $structuredPruneData
        );

        // Record audit correction for the prune action
        Correction::record(
            'ticket',
            (int) $id,
            'status',
            self::STATE_BLOCKED,
            self::STATE_ARCHIVED_BLOCKED,
            $userId,
            "{$reason} - pruned to unit history"
        );

        // Transition ticket status to archived-blocked
        Db::execute(
            "UPDATE ticket SET status = ?, updated_at = ? WHERE id = ?",
            [self::STATE_ARCHIVED_BLOCKED, $now, (int) $id]
        );

        return self::findById($id) ?? [];
    }

    /**
     * Evaluate all blocked tickets for automatic 30-day aging.
     * Evaluates blocked tickets whose blocked_at is >= 30 days old.
     * Idempotent and safe to run on each ticket list load.
     */
    public static function evaluateAgingBlockedTickets(?int $simulatedDays = null): array
    {
        // 30 days in seconds
        $thresholdSeconds = 30 * 86400;

        $blockedTickets = Db::fetchAll(
            "SELECT id, blocked_at, created_at, updated_at FROM ticket WHERE status = ?",
            [self::STATE_BLOCKED]
        );

        $pruned = [];
        $skipped = [];
        $now = time();

        foreach ($blockedTickets as $bt) {
            $stampStr = $bt['blocked_at'] ?: $bt['created_at'];
            $stamp = $stampStr ? strtotime($stampStr) : $now;
            $ageSeconds = $now - $stamp;

            if ($simulatedDays !== null) {
                $ageSeconds += ($simulatedDays * 86400);
            }

            if ($ageSeconds >= $thresholdSeconds) {
                try {
                    $res = self::pruneToUnitHistory(
                        (int) $bt['id'],
                        'System (30-day aging)',
                        null,
                        'Automatic 30-day aging prune'
                    );
                    $pruned[] = (int) $bt['id'];
                } catch (Throwable $e) {
                    $skipped[] = [
                        'ticket_id' => (int) $bt['id'],
                        'reason' => $e->getMessage(),
                    ];
                }
            } else {
                $skipped[] = [
                    'ticket_id' => (int) $bt['id'],
                    'days_blocked' => round($ageSeconds / 86400, 1),
                ];
            }
        }

        return [
            'evaluated_count' => count($blockedTickets),
            'pruned_count' => count($pruned),
            'pruned_ticket_ids' => $pruned,
            'skipped' => $skipped,
        ];
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
        $exposure = $row['work_exposure'] ?? null;
        if (!in_array($exposure, ['indoor', 'exterior', 'exterior_ladder'], true)) {
            $exposure = !empty($row['exterior_work']) ? 'exterior' : 'indoor';
        }
        $row['work_exposure'] = $exposure;
        $rainExpected = false;
        if ($exposure === 'exterior' || $exposure === 'exterior_ladder') {
            $schedDate = !empty($row['scheduled_at']) ? substr((string) $row['scheduled_at'], 0, 10) : null;
            if (!$schedDate && !empty($row['id'])) {
                try {
                    $linkedBlock = Db::fetchOne(
                        "SELECT r.run_date FROM run_sheet_block b JOIN run_sheet r ON b.run_sheet_id = r.id WHERE b.ticket_id = ? AND r.status != 'archived' ORDER BY r.run_date DESC LIMIT 1",
                        [(int) $row['id']]
                    );
                    if (!empty($linkedBlock['run_date'])) {
                        $schedDate = substr((string) $linkedBlock['run_date'], 0, 10);
                    } else {
                        $linkedNotice = Db::fetchOne(
                            'SELECT entry_date, entry_start FROM notice WHERE ticket_id = ? ORDER BY id DESC LIMIT 1',
                            [(int) $row['id']]
                        );
                        if (!empty($linkedNotice['entry_date'])) {
                            $schedDate = substr((string) $linkedNotice['entry_date'], 0, 10);
                        } elseif (!empty($linkedNotice['entry_start'])) {
                            $schedDate = substr((string) $linkedNotice['entry_start'], 0, 10);
                        }
                    }
                } catch (Throwable) {
                    // Ignore DB lookup fallback
                }
            }
            if (!$schedDate) {
                $schedDate = date('Y-m-d');
            }
            $rainExpected = WeatherService::isRainExpected($schedDate);
        }
        $row['rain_expected'] = $rainExpected;
        $row['weather_note'] = $row['weather_note'] ?? null;
        $row['notice_needed'] = (bool) ($row['notice_needed'] ?? 0);
        $row['notice_sent_at'] = $row['notice_sent_at'] ?? null;
        $row['notice_confirmed_by'] = $row['notice_confirmed_by'] ?? null;

        if (!empty($row['unit_id'])) {
            $unitRenovated = isset($row['unit_renovated']) && $row['unit_renovated'] !== null ? (bool) $row['unit_renovated'] : null;
            $row['unit_renovated'] = $unitRenovated;
            $row['unit_occupancy_status'] = $row['unit_occupancy_status'] ?? 'unknown';

            $failedVisits = isset($row['unit_failed_visits_count'])
                ? (int) $row['unit_failed_visits_count']
                : (int) (Db::fetchOne("SELECT COUNT(*) as c FROM ticket_visit WHERE unit_id = ? AND outcome = 'failed_access'", [(int) $row['unit_id']])['c'] ?? 0);
            $hasRepeatProblem = ($failedVisits >= 2);

            $row['unit_failed_visits_count'] = $failedVisits;
            $row['has_repeat_access_problem'] = $hasRepeatProblem;
            $row['repeat_access_problem'] = $hasRepeatProblem;

            $row['unit'] = [
                'id' => (string) $row['unit_id'],
                'unitNumber' => $row['unit_number'] ?? '',
                'unit_number' => $row['unit_number'] ?? '',
                'renovated' => $unitRenovated,
                'renovatedDate' => $row['unit_renovated_date'] ?? null,
                'renovated_date' => $row['unit_renovated_date'] ?? null,
                'moveInDate' => $row['unit_move_in_date'] ?? null,
                'move_in_date' => $row['unit_move_in_date'] ?? null,
                'occupancyStatus' => $row['unit_occupancy_status'] ?? 'unknown',
                'occupancy_status' => $row['unit_occupancy_status'] ?? 'unknown',
                'vacantSince' => $row['unit_vacant_since'] ?? null,
                'vacant_since' => $row['unit_vacant_since'] ?? null,
                'failed_visits_count' => $failedVisits,
                'has_repeat_access_problem' => $hasRepeatProblem,
                'repeat_access_problem' => $hasRepeatProblem,
            ];
        }

        return $row;
    }
}
