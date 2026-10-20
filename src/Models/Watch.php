<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use DateTimeImmutable;
use DateTimeInterface;
use RuntimeException;
use Throwable;

/**
 * Watch Model
 * Handles proactive risk watches (notice deadlines, freeze weather, reply waiting, scheduled tasks),
 * snooze intervals, quiet-hours batching, and append-only state auditing.
 */
class Watch
{
    /**
     * Find all watches with optional filters.
     */
    public static function findAll(array $filters = []): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['state'])) {
            $where[] = 'state = ?';
            $params[] = $filters['state'];
        }

        if (!empty($filters['watch_type'])) {
            $where[] = 'watch_type = ?';
            $params[] = $filters['watch_type'];
        }

        if (!empty($filters['target_type'])) {
            $where[] = 'target_type = ?';
            $params[] = $filters['target_type'];
        }

        if (!empty($filters['target_id'])) {
            $where[] = 'target_id = ?';
            $params[] = (int) $filters['target_id'];
        }

        if (isset($filters['user_id'])) {
            $where[] = 'user_id = ?';
            $params[] = (int) $filters['user_id'];
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "SELECT * FROM watch {$whereClause} ORDER BY created_at DESC";

        $watches = Db::fetchAll($sql, $params);
        foreach ($watches as &$w) {
            self::hydrateWatch($w);
        }

        return $watches;
    }

    /**
     * Find single watch by ID.
     */
    public static function findById(int $id): ?array
    {
        $sql = 'SELECT * FROM watch WHERE id = ? LIMIT 1';
        $w = Db::fetchOne($sql, [$id]);
        if ($w === null) {
            return null;
        }

        self::hydrateWatch($w);
        return $w;
    }

    /**
     * Create a new watch.
     */
    public static function create(array $data): array
    {
        $watchType = trim((string) ($data['watch_type'] ?? ''));
        if ($watchType === '') {
            throw new RuntimeException('watch_type is required');
        }

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            $title = self::generateDefaultTitle($watchType, $data);
        }

        $userId = !empty($data['user_id']) ? (int) $data['user_id'] : null;
        $description = $data['description'] ?? null;
        $targetType = $data['target_type'] ?? self::inferTargetType($watchType);
        $targetId = !empty($data['target_id']) ? (int) $data['target_id'] : null;
        $state = $data['state'] ?? 'active';

        $config = $data['config'] ?? [];
        if (is_array($config)) {
            $config = json_encode($config, JSON_UNESCAPED_SLASHES);
        }

        Db::execute(
            'INSERT INTO watch (
                user_id, watch_type, title, description, target_type, target_id,
                state, config, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [
                $userId,
                $watchType,
                $title,
                $description,
                $targetType,
                $targetId,
                $state,
                $config,
            ]
        );

        $id = (int) Db::lastInsertId();
        return self::findById($id) ?? [];
    }

    /**
     * Modify watch fields and audit state transitions.
     */
    public static function update(int $id, array $data, ?int $userId = null, ?string $reason = null): array
    {
        $current = self::findById($id);
        if ($current === null) {
            throw new RuntimeException("Watch #{$id} not found");
        }

        $allowedFields = [
            'title', 'description', 'state', 'config', 'snoozed_until',
            'last_evaluated_at', 'last_triggered_at', 'acknowledged_at',
            'resolved_at', 'latest_trigger_reason', 'latest_trigger_data',
            'quiet_hours_delayed'
        ];

        $updates = [];
        $params = [];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $val = $data[$field];
                if ($field === 'config' && is_array($val)) {
                    $val = json_encode($val, JSON_UNESCAPED_SLASHES);
                }
                if ($field === 'latest_trigger_data' && is_array($val)) {
                    $val = json_encode($val, JSON_UNESCAPED_SLASHES);
                }

                $updates[] = "{$field} = ?";
                $params[] = $val;

                $oldVal = $current[$field] ?? null;
                if (is_array($oldVal)) {
                    $oldVal = json_encode($oldVal, JSON_UNESCAPED_SLASHES);
                }

                if ((string) $oldVal !== (string) $val) {
                    Correction::record('watch', $id, $field, (string) $oldVal, (string) $val, $userId, $reason);
                }
            }
        }

        if (!empty($updates)) {
            $updates[] = 'updated_at = CURRENT_TIMESTAMP';
            $params[] = $id;
            Db::execute('UPDATE watch SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);
        }

        return self::findById($id) ?? [];
    }

    /**
     * Snooze a watch for 1h, 4h, until tomorrow morning 08:00, or a specific timestamp.
     */
    public static function snooze(int $id, string $duration = '1h', ?int $userId = null, ?DateTimeInterface $refTime = null): array
    {
        $ref = $refTime ? DateTimeImmutable::createFromInterface($refTime) : new DateTimeImmutable();
        $durationKey = strtolower(trim($duration));

        switch ($durationKey) {
            case '1h':
            case '1 hour':
                $snoozedUntil = $ref->modify('+1 hour')->format('Y-m-d H:i:s');
                break;
            case '4h':
            case '4 hours':
                $snoozedUntil = $ref->modify('+4 hours')->format('Y-m-d H:i:s');
                break;
            case 'tomorrow':
            case 'tomorrow morning':
            case 'until tomorrow':
                $snoozedUntil = $ref->modify('+1 day')->format('Y-m-d 08:00:00');
                break;
            default:
                try {
                    $custom = new DateTimeImmutable($duration);
                    $snoozedUntil = $custom->format('Y-m-d H:i:s');
                } catch (Throwable) {
                    $snoozedUntil = $ref->modify('+1 hour')->format('Y-m-d H:i:s');
                }
                break;
        }

        return self::update(
            $id,
            [
                'state' => 'snoozed',
                'snoozed_until' => $snoozedUntil,
            ],
            $userId,
            "Snoozed until {$snoozedUntil} ({$duration})"
        );
    }

    /**
     * Acknowledge a triggered watch (removes it from the active daily digest).
     */
    public static function acknowledge(int $id, ?int $userId = null): array
    {
        $now = date('Y-m-d H:i:s');
        return self::update(
            $id,
            [
                'state' => 'acknowledged',
                'acknowledged_at' => $now,
            ],
            $userId,
            'Acknowledged by technician'
        );
    }

    /**
     * Resolve a watch permanently.
     */
    public static function resolve(int $id, ?int $userId = null): array
    {
        $now = date('Y-m-d H:i:s');
        return self::update(
            $id,
            [
                'state' => 'resolved',
                'resolved_at' => $now,
            ],
            $userId,
            'Watch resolved'
        );
    }

    /**
     * Reactivate a snoozed or acknowledged watch.
     */
    public static function reactivate(int $id, ?int $userId = null): array
    {
        return self::update(
            $id,
            [
                'state' => 'active',
                'snoozed_until' => null,
            ],
            $userId,
            'Watch reactivated'
        );
    }

    /**
     * Delete a watch.
     */
    public static function delete(int $id): bool
    {
        $watch = self::findById($id);
        if ($watch === null) {
            return false;
        }

        Db::execute('DELETE FROM watch WHERE id = ?', [$id]);
        return true;
    }

    /**
     * Get the proactive daily digest.
     * Returns today's triggered watches, deduped so each appears exactly once.
     * Snoozed and resolved watches are silenced until their snooze expires.
     */
    public static function getDigest(?DateTimeInterface $currentTime = null, array $options = []): array
    {
        $ref = $currentTime ? DateTimeImmutable::createFromInterface($currentTime) : new DateTimeImmutable();
        $nowStr = $ref->format('Y-m-d H:i:s');
        $currentHour = (int) $ref->format('G'); // 0-23

        // Quiet hours default 22:00 to 07:00
        $quietStart = isset($options['quiet_start']) ? (int) $options['quiet_start'] : 22;
        $quietEnd = isset($options['quiet_end']) ? (int) $options['quiet_end'] : 7;
        $isQuietHours = ($currentHour >= $quietStart || $currentHour < $quietEnd);

        // Fetch triggered and active watches
        $allWatches = self::findAll();

        $immediateItems = [];
        $morningBatchItems = [];
        $snoozedItems = [];
        $seenWatchIds = [];

        foreach ($allWatches as $w) {
            $id = (int) $w['id'];
            if (isset($seenWatchIds[$id])) {
                continue;
            }

            // If snoozed, check if snooze has expired
            if ($w['state'] === 'snoozed' && !empty($w['snoozed_until'])) {
                if ($nowStr < $w['snoozed_until']) {
                    // Snooze is currently active -> silence from digest!
                    $snoozedItems[] = $w;
                    $seenWatchIds[$id] = true;
                    continue;
                }
                // Snooze expired: eligible for digest if it was triggered
            }

            // Only triggered watches appear in the proactive alert digest
            if ($w['state'] === 'triggered') {
                $seenWatchIds[$id] = true;

                // Check quiet hours batching
                if (!empty($w['quiet_hours_delayed']) && $isQuietHours) {
                    $w['batched_for_morning'] = true;
                    $w['batch_message'] = 'Batched during quiet hours — scheduled for 07:00 morning digest';
                    $morningBatchItems[] = $w;
                } else {
                    $w['batched_for_morning'] = false;
                    $immediateItems[] = $w;
                }
            }
        }

        // During daytime, morning batch items are surfaced directly in the active digest
        if (!$isQuietHours && !empty($morningBatchItems)) {
            $immediateItems = array_merge($immediateItems, $morningBatchItems);
            $morningBatchItems = [];
        }

        return [
            'date' => $ref->format('Y-m-d'),
            'current_time' => $nowStr,
            'is_quiet_hours' => $isQuietHours,
            'items' => $immediateItems,
            'total_active_alerts' => count($immediateItems),
            'morning_batch' => $morningBatchItems,
            'morning_batch_count' => count($morningBatchItems),
            'snoozed_count' => count($snoozedItems),
        ];
    }

    /**
     * Internal helper to hydrate JSON and types.
     */
    private static function hydrateWatch(array &$w): void
    {
        $w['id'] = (int) $w['id'];
        $w['user_id'] = !empty($w['user_id']) ? (int) $w['user_id'] : null;
        $w['target_id'] = !empty($w['target_id']) ? (int) $w['target_id'] : null;
        $w['quiet_hours_delayed'] = (bool) ($w['quiet_hours_delayed'] ?? 0);

        if (!empty($w['config']) && is_string($w['config'])) {
            $decoded = json_decode($w['config'], true);
            $w['config'] = is_array($decoded) ? $decoded : [];
        } elseif (empty($w['config'])) {
            $w['config'] = [];
        }

        if (!empty($w['latest_trigger_data']) && is_string($w['latest_trigger_data'])) {
            $decoded = json_decode($w['latest_trigger_data'], true);
            $w['latest_trigger_data'] = is_array($decoded) ? $decoded : [];
        } elseif (empty($w['latest_trigger_data'])) {
            $w['latest_trigger_data'] = [];
        }

        // Dynamic helper property for UI
        $now = date('Y-m-d H:i:s');
        $w['is_snoozed_active'] = ($w['state'] === 'snoozed' && !empty($w['snoozed_until']) && $now < $w['snoozed_until']);
    }

    private static function inferTargetType(string $watchType): string
    {
        return match ($watchType) {
            'notice_deadline' => 'notice',
            'notice_handoff' => 'notice',
            'reply_waiting' => 'notice',
            'weather_freeze' => 'weather',
            'scheduled_task' => 'task',
            default => 'system',
        };
    }

    private static function generateDefaultTitle(string $watchType, array $data): string
    {
        $targetId = $data['target_id'] ?? '';
        return match ($watchType) {
            'notice_deadline' => "Notice #{$targetId} Serve-By Deadline Watch",
            'notice_handoff' => "Notice #{$targetId} Handoff Alert",
            'reply_waiting' => "Notice #{$targetId} Reply-Waiting Watch",
            'weather_freeze' => 'Regional Freeze Weather Watch',
            'scheduled_task' => 'Scheduled Task Overdue Watch',
            default => 'Proactive System Watch',
        };
    }
}
