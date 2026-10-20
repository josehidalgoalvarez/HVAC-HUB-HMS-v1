<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use RuntimeException;
use Throwable;

/**
 * Notice Model
 * Manages Notice-of-Entry tracking, 24-hour rule calculation, state progression,
 * and legal gate status.
 */
class Notice
{
    public const STATUS_DRAFTED = 'drafted';
    public const STATUS_HANDED_OFF = 'handed_off';
    public const STATUS_SENT = 'sent';
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_SERVED = 'served';
    public const STATUS_VERIFIED = 'verified';

    /**
     * Compute the 24-hour legal serve-by deadline.
     * Given entry start time (e.g. 11:00-13:00 Friday), deadline is 11:00 the previous day.
     */
    public static function computeServeByDeadline(string $entryStart): string
    {
        $timestamp = strtotime($entryStart);
        if ($timestamp === false) {
            throw new RuntimeException("Invalid entry start date/time: {$entryStart}");
        }
        // Exactly 24 hours (86,400 seconds) prior to the start of the window
        return date('Y-m-d H:i:s', $timestamp - 86400);
    }

    /**
     * Calculate gate status (green / amber / red).
     * Anchors 24-hour legal notice period strictly at sent_at.
     */
    public static function calculateGateStatus(array $notice, ?int $now = null): array
    {
        $status = $notice['status'] ?? self::STATUS_DRAFTED;
        $deadlineStr = $notice['serve_by_deadline'] ?? null;
        $verifiedAt = $notice['verified_at'] ?? null;
        $sentAt = $notice['sent_at'] ?? null;
        $currentTime = $now ?? time();

        // 1. Legacy verified status is always green / cleared
        if ($status === self::STATUS_VERIFIED) {
            return [
                'gate_status' => 'green',
                'is_cleared' => true,
                'reason' => 'Notice verified' . ($verifiedAt ? " on {$verifiedAt}" : '') . ' (Legally cleared for entry)',
            ];
        }

        // 2. Sent or Scheduled: 24h legal clock anchors strictly at sent_at
        if ($status === self::STATUS_SENT || $status === self::STATUS_SCHEDULED) {
            if (!empty($sentAt)) {
                $sentTimestamp = strtotime((string) $sentAt);
                $clearanceTime = $sentTimestamp + 86400; // 24 hours after sending

                // Check if scheduled entry_start is invalid (< 24h from sent_at)
                if (!empty($notice['entry_start'])) {
                    $entryStartTimestamp = strtotime((string) $notice['entry_start']);
                    if ($entryStartTimestamp !== false && $entryStartTimestamp < $clearanceTime) {
                        return [
                            'gate_status' => 'red',
                            'is_cleared' => false,
                            'reason' => "INVALID ENTRY WINDOW: Entry start ({$notice['entry_start']}) is less than 24h after notice was sent ({$sentAt}). Legal minimum is 24h.",
                        ];
                    }
                }

                if ($currentTime >= $clearanceTime) {
                    return [
                        'gate_status' => 'green',
                        'is_cleared' => true,
                        'reason' => $status === self::STATUS_SCHEDULED
                            ? "Job scheduled: 24h legal notice period elapsed (sent on {$sentAt}). Entry window legally cleared."
                            : "Notice sent on {$sentAt}. 24h legal notice period elapsed — legally cleared for entry.",
                    ];
                }

                $hoursLeft = max(1, (int) ceil(($clearanceTime - $currentTime) / 3600));
                return [
                    'gate_status' => 'amber',
                    'is_cleared' => false,
                    'reason' => "24h Legal clock running (sent on {$sentAt}). Entry window validates after 24h elapse (" . date('Y-m-d H:i', $clearanceTime) . ", ~{$hoursLeft}h remaining).",
                ];
            }

            return [
                'gate_status' => 'amber',
                'is_cleared' => false,
                'reason' => 'PENDING: 24h notice period has not started yet (missing sent_at timestamp).',
            ];
        }

        // 3. Handed Off: In possession of staff, awaiting send confirmation
        if ($status === self::STATUS_HANDED_OFF) {
            $toName = !empty($notice['handed_off_to']) ? " to {$notice['handed_off_to']}" : '';
            return [
                'gate_status' => 'amber',
                'is_cleared' => false,
                'reason' => "HANDED OFF{$toName}: Awaiting send confirmation. 24h legal clock starts when marked sent.",
            ];
        }

        // 4. Drafted / Legacy: check if serve-by deadline already expired without notice being sent
        if ($deadlineStr !== null) {
            $deadline = strtotime((string) $deadlineStr);
            if ($deadline !== false && $currentTime > $deadline) {
                return [
                    'gate_status' => 'red',
                    'is_cleared' => false,
                    'reason' => "OVERDUE: Serve-by deadline passed ({$deadlineStr}) without verification. Entry cannot legally proceed.",
                ];
            }
        }

        return [
            'gate_status' => 'amber',
            'is_cleared' => false,
            'reason' => $deadlineStr
                ? "PENDING: Serve-by deadline is {$deadlineStr}. Must be served & verified before entry window."
                : "PENDING: Notice drafted. Entry window pending.",
        ];
    }

    /**
     * Get gate status by notice ID.
     */
    public static function getGateStatus(int|string $id): array
    {
        $notice = self::findById($id);
        if ($notice === null) {
            throw new \RuntimeException("Notice #{$id} not found");
        }
        return self::calculateGateStatus($notice);
    }

    /**
     * Fetch all notices with enriched building, unit, ticket and gate status.
     */
    public static function findAll(array $filters = []): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['ticket_id'])) {
            $where[] = 'n.ticket_id = ?';
            $params[] = (int) $filters['ticket_id'];
        }

        if (!empty($filters['building_id'])) {
            $where[] = 'n.building_id = ?';
            $params[] = (int) $filters['building_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'n.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['since'])) {
            $where[] = '(n.updated_at >= ? OR n.created_at >= ?)';
            $params[] = $filters['since'];
            $params[] = $filters['since'];
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT n.*,
                       b.name AS building_name,
                       u.unit_number,
                       t.wo_number,
                       t.title AS ticket_title,
                       creator.name AS created_by_name,
                       verifier.name AS verified_by_name
                FROM notice n
                LEFT JOIN building b ON n.building_id = b.id
                LEFT JOIN unit u ON n.unit_id = u.id
                LEFT JOIN ticket t ON n.ticket_id = t.id
                LEFT JOIN users creator ON n.created_by = creator.id
                LEFT JOIN users verifier ON n.verified_by_user_id = verifier.id
                {$whereClause}
                ORDER BY 
                    CASE 
                        WHEN n.status = 'verified' THEN 3
                        WHEN n.serve_by_deadline IS NOT NULL AND datetime(n.serve_by_deadline) < datetime('now') THEN 1
                        ELSE 2
                    END ASC,
                    n.serve_by_deadline ASC,
                    n.created_at DESC";

        try {
            $rows = Db::fetchAll($sql, $params);
        } catch (Throwable) {
            // Fallback for simple schema
            $rows = Db::fetchAll("SELECT * FROM notice {$whereClause} ORDER BY id DESC", $params);
        }

        return array_map([self::class, 'enrichNotice'], $rows);
    }

    /**
     * Find notice by ID.
     */
    public static function findById(int|string $id): ?array
    {
        $sql = "SELECT n.*,
                       b.name AS building_name,
                       u.unit_number,
                       t.wo_number,
                       t.title AS ticket_title,
                       creator.name AS created_by_name,
                       verifier.name AS verified_by_name
                FROM notice n
                LEFT JOIN building b ON n.building_id = b.id
                LEFT JOIN unit u ON n.unit_id = u.id
                LEFT JOIN ticket t ON n.ticket_id = t.id
                LEFT JOIN users creator ON n.created_by = creator.id
                LEFT JOIN users verifier ON n.verified_by_user_id = verifier.id
                WHERE n.id = ?
                LIMIT 1";

        try {
            $row = Db::fetchOne($sql, [(int) $id]);
        } catch (Throwable) {
            $row = Db::fetchOne('SELECT * FROM notice WHERE id = ? LIMIT 1', [(int) $id]);
        }

        return $row !== null ? self::enrichNotice($row) : null;
    }

    /**
     * Find notice for a specific ticket.
     */
    public static function findByTicketId(int|string $ticketId): ?array
    {
        $rows = self::findAll(['ticket_id' => (int) $ticketId]);
        return $rows[0] ?? null;
    }

    /**
     * Create a new notice of entry.
     * Computes the 24h serve-by deadline automatically.
     */
    public static function create(array $data, ?int $userId = null): array
    {
        $ticketId = !empty($data['ticket_id']) ? (int) $data['ticket_id'] : null;
        $buildingId = (int) ($data['building_id'] ?? 1);
        $unitId = !empty($data['unit_id']) ? (int) $data['unit_id'] : null;
        $title = trim((string) ($data['title'] ?? 'Notice of Entry'));
        $content = isset($data['content']) ? trim((string) $data['content']) : '';
        $noticeType = (string) ($data['notice_type'] ?? 'entry');
        $status = self::STATUS_DRAFTED;
        $createdBy = $userId ?? (!empty($data['created_by']) ? (int) $data['created_by'] : 1);

        // Entry window and 24-hour serve-by deadline
        $entryStart = !empty($data['entry_start']) ? date('Y-m-d H:i:s', strtotime((string) $data['entry_start'])) : null;
        $entryEnd = !empty($data['entry_end']) ? date('Y-m-d H:i:s', strtotime((string) $data['entry_end'])) : null;
        
        if ($entryStart && empty($entryEnd)) {
            // Default 2-hour window if end not specified
            $entryEnd = date('Y-m-d H:i:s', strtotime($entryStart) + 7200);
        }

        $serveByDeadline = null;
        if ($entryStart) {
            $serveByDeadline = self::computeServeByDeadline($entryStart);
        } elseif (!empty($data['serve_by_deadline'])) {
            $serveByDeadline = date('Y-m-d H:i:s', strtotime((string) $data['serve_by_deadline']));
        }

        $entryDate = $entryStart ? date('Y-m-d', strtotime($entryStart)) : ($data['entry_date'] ?? null);
        $draftedAt = date('Y-m-d H:i:s');
        $handedOffAt = !empty($data['handed_off_at']) ? (string) $data['handed_off_at'] : null;
        $scheduledAt = !empty($data['scheduled_at']) ? (string) $data['scheduled_at'] : null;
        $handedOffTo = !empty($data['handed_off_to']) ? trim((string) $data['handed_off_to']) : null;

        $sql = "INSERT INTO notice (
                    ticket_id, building_id, unit_id, title, content,
                    notice_type, status, entry_date, entry_start, entry_end,
                    serve_by_deadline, drafted_at, handed_off_at, scheduled_at,
                    handed_off_to, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";

        Db::execute($sql, [
            $ticketId,
            $buildingId,
            $unitId,
            $title,
            $content,
            $noticeType,
            $status,
            $entryDate,
            $entryStart,
            $entryEnd,
            $serveByDeadline,
            $draftedAt,
            $handedOffAt,
            $scheduledAt,
            $handedOffTo,
            $createdBy,
        ]);

        $newId = (int) Db::lastInsertId();

        // Record creation in correction log
        Correction::record(
            'notice',
            $newId,
            'status',
            null,
            $status,
            $createdBy,
            'Notice drafted'
        );

        if ($serveByDeadline) {
            Correction::record(
                'notice',
                $newId,
                'serve_by_deadline',
                null,
                $serveByDeadline,
                $createdBy,
                'Calculated 24h serve-by deadline'
            );
        }

        return self::findById($newId) ?? [];
    }

    /**
     * Update notice and advance state progression.
     * Records an append-only correction row for every changed field.
     */
    public static function update(int|string $id, array $data, ?int $userId = null, ?string $reason = null): array
    {
        $existing = self::findById($id);
        if ($existing === null) {
            throw new RuntimeException("Notice #{$id} not found");
        }

        $updatableFields = [
            'ticket_id',
            'building_id',
            'unit_id',
            'title',
            'content',
            'notice_type',
            'status',
            'entry_date',
            'entry_start',
            'entry_end',
            'serve_by_deadline',
            'drafted_at',
            'handed_off_at',
            'scheduled_at',
            'handed_off_to',
            'sent_at',
            'served_at',
            'verified_at',
            'served_method',
            'verified_by_user_id',
        ];

        // Automatic state timestamping & watch handling on transition
        if (!empty($data['status']) && $data['status'] !== $existing['status']) {
            $newStatus = $data['status'];
            $now = date('Y-m-d H:i:s');

            if ($newStatus === self::STATUS_HANDED_OFF) {
                if (empty($data['handed_off_at']) && empty($existing['handed_off_at'])) {
                    $data['handed_off_at'] = $now;
                }
                $handedOffTo = !empty($data['handed_off_to'])
                    ? trim((string) $data['handed_off_to'])
                    : (!empty($existing['handed_off_to']) ? $existing['handed_off_to'] : 'Property Management');

                // Raise active watch for handoff
                try {
                    Watch::create([
                        'user_id' => $userId,
                        'watch_type' => 'notice_handoff',
                        'title' => "Notice #{$id} handed off to {$handedOffTo} (pending send)",
                        'description' => "Notice #{$id} was handed off to {$handedOffTo}. Awaiting sent confirmation to start 24h legal clock.",
                        'target_type' => 'notice',
                        'target_id' => (int) $id,
                        'state' => 'triggered',
                        'config' => [
                            'notice_id' => (int) $id,
                            'handed_off_to' => $handedOffTo,
                            'handed_off_at' => $data['handed_off_at'] ?? $now,
                        ],
                        'latest_trigger_reason' => "Handed off to {$handedOffTo} — awaiting sent status",
                        'latest_trigger_data' => [
                            'notice_id' => (int) $id,
                            'handed_off_to' => $handedOffTo,
                        ],
                    ]);
                } catch (\Throwable $e) {}
            } elseif ($newStatus === self::STATUS_SENT) {
                if (empty($data['sent_at']) && empty($existing['sent_at'])) {
                    $data['sent_at'] = $now;
                }
                // Clear and resolve any active notice_handoff watches
                try {
                    $handoffWatches = Watch::findAll([
                        'target_type' => 'notice',
                        'target_id' => (int) $id,
                        'watch_type' => 'notice_handoff',
                    ]);
                    foreach ($handoffWatches as $hw) {
                        if (($hw['state'] ?? '') !== 'resolved') {
                            Watch::resolve((int) $hw['id'], $userId);
                        }
                    }
                } catch (\Throwable $e) {}
            } elseif ($newStatus === self::STATUS_SCHEDULED) {
                if (empty($data['scheduled_at']) && empty($existing['scheduled_at'])) {
                    $data['scheduled_at'] = $now;
                }
                // Clear any lingering handoff watches
                try {
                    $handoffWatches = Watch::findAll([
                        'target_type' => 'notice',
                        'target_id' => (int) $id,
                        'watch_type' => 'notice_handoff',
                    ]);
                    foreach ($handoffWatches as $hw) {
                        if (($hw['state'] ?? '') !== 'resolved') {
                            Watch::resolve((int) $hw['id'], $userId);
                        }
                    }
                } catch (\Throwable $e) {}
            } elseif ($newStatus === self::STATUS_SERVED && empty($data['served_at'])) {
                $data['served_at'] = $now;
                if (empty($existing['sent_at']) && empty($data['sent_at'])) {
                    $data['sent_at'] = $now;
                }
            } elseif ($newStatus === self::STATUS_VERIFIED && empty($data['verified_at'])) {
                $data['verified_at'] = $now;
                if ($userId) {
                    $data['verified_by_user_id'] = $userId;
                }
            }
        }

        // Recompute deadline if entry_start changes
        if (!empty($data['entry_start']) && $data['entry_start'] !== $existing['entry_start']) {
            $data['serve_by_deadline'] = self::computeServeByDeadline($data['entry_start']);
            if (empty($data['entry_date'])) {
                $data['entry_date'] = date('Y-m-d', strtotime($data['entry_start']));
            }
        }

        $fieldsToUpdate = [];
        $params = [];

        foreach ($updatableFields as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $oldVal = $existing[$field] ?? null;
            $newVal = $data[$field];

            $oldStr = $oldVal !== null ? (string) $oldVal : null;
            $newStr = $newVal !== null ? (string) $newVal : null;

            if ($oldStr !== $newStr) {
                Correction::record(
                    'notice',
                    (int) $id,
                    $field,
                    $oldStr,
                    $newStr,
                    $userId,
                    $reason ?? "Updated {$field} on notice"
                );

                $fieldsToUpdate[] = "`{$field}` = ?";
                $params[] = $newVal;
            }
        }

        if (!empty($fieldsToUpdate)) {
            $fieldsToUpdate[] = '`updated_at` = CURRENT_TIMESTAMP';
            $sql = 'UPDATE notice SET ' . implode(', ', $fieldsToUpdate) . ' WHERE id = ?';
            $params[] = (int) $id;

            Db::execute($sql, $params);
        }

        return self::findById($id) ?? [];
    }

    /**
     * Enrich notice record with calculated gate properties.
     */
    private static function enrichNotice(array $row): array
    {
        $gate = self::calculateGateStatus($row);
        $row['gate_status'] = $gate['gate_status'];
        $row['is_cleared'] = $gate['is_cleared'];
        $row['gate_reason'] = $gate['reason'];

        return $row;
    }
}
