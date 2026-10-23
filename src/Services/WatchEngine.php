<?php

declare(strict_types=1);

namespace App\Services;

use App\Db;
use App\Models\Correction;
use App\Models\Notice;
use App\Models\Ticket;
use App\Models\Watch;
use DateTimeImmutable;
use DateTimeInterface;
use Throwable;

/**
 * WatchEngine
 * Orchestrates proactive watch evaluations on a schedule (cron or on-demand).
 * Evaluates notice deadlines, waiting replies, part waits, and scheduled tasks,
 * respecting quiet hours (22:00–07:00) and active snooze windows.
 */
class WatchEngine
{
    public const DEFAULT_QUIET_START = 22; // 22:00 (10 PM)
    public const DEFAULT_QUIET_END = 7;    // 07:00 (7 AM)

    /**
     * Evaluate all active and eligible watches.
     */
    public static function evaluateAll(?DateTimeInterface $simulatedTime = null, array $options = []): array
    {
        $now = $simulatedTime ? DateTimeImmutable::createFromInterface($simulatedTime) : new DateTimeImmutable();
        $nowStr = $now->format('Y-m-d H:i:s');
        $currentHour = (int) $now->format('G');

        $quietStart = isset($options['quiet_start']) ? (int) $options['quiet_start'] : self::DEFAULT_QUIET_START;
        $quietEnd = isset($options['quiet_end']) ? (int) $options['quiet_end'] : self::DEFAULT_QUIET_END;
        $isQuietHours = ($currentHour >= $quietStart || $currentHour < $quietEnd);

        $allWatches = Watch::findAll();
        $evaluatedCount = 0;
        $triggeredCount = 0;
        $delayedCount = 0;
        $triggeredWatches = [];

        foreach ($allWatches as $watch) {
            $watchId = (int) $watch['id'];
            $state = $watch['state'] ?? 'active';

            // Resolved watches are permanently completed
            if ($state === 'resolved') {
                continue;
            }

            // Check snooze expiration
            if ($state === 'snoozed') {
                if (!empty($watch['snoozed_until']) && $nowStr < $watch['snoozed_until']) {
                    // Snooze still active -> skip evaluation completely!
                    continue;
                }
                // Snooze has expired -> wake up watch to active state
                Watch::update($watchId, ['state' => 'active'], null, 'Snooze period expired');
                $watch['state'] = 'active';
            }

            $evaluatedCount++;
            $triggerResult = self::evaluateSingleWatch($watch, $now, $options);

            if ($triggerResult['should_trigger']) {
                $triggeredCount++;
                $isDelayed = $isQuietHours;
                if ($isDelayed) {
                    $delayedCount++;
                }

                $updateData = [
                    'state' => 'triggered',
                    'last_evaluated_at' => $nowStr,
                    'last_triggered_at' => $nowStr,
                    'latest_trigger_reason' => $triggerResult['reason'],
                    'latest_trigger_data' => $triggerResult['data'],
                    'quiet_hours_delayed' => $isDelayed ? 1 : 0,
                ];

                $updated = Watch::update(
                    $watchId,
                    $updateData,
                    null,
                    "Triggered: {$triggerResult['reason']}"
                );

                $updated['batch_for_morning'] = $isDelayed;
                $triggeredWatches[] = $updated;
            } else {
                // If watch is active and condition cleared, update evaluation timestamp
                Watch::update(
                    $watchId,
                    ['last_evaluated_at' => $nowStr],
                    null,
                    'Routine evaluation: condition negative'
                );
            }
        }

        return [
            'evaluated_at' => $nowStr,
            'evaluated_count' => $evaluatedCount,
            'triggered_count' => $triggeredCount,
            'quiet_hours_active' => $isQuietHours,
            'quiet_hours_delayed_count' => $delayedCount,
            'triggered_watches' => $triggeredWatches,
            'message' => sprintf(
                'Evaluated %d watches: %d triggered (%d delayed for morning digest)',
                $evaluatedCount,
                $triggeredCount,
                $delayedCount
            )
        ];
    }

    /**
     * Evaluate an individual watch against its condition.
     */
    public static function evaluateSingleWatch(array $watch, DateTimeImmutable $now, array $options = []): array
    {
        $watchType = $watch['watch_type'] ?? '';

        return match ($watchType) {
            'notice_deadline' => self::evaluateNoticeDeadline($watch, $now),
            'reply_waiting' => self::evaluateReplyWaiting($watch, $now),
            'part_wait' => self::evaluatePartWait($watch, $now),
            'scheduled_task' => self::evaluateScheduledTask($watch, $now),
            default => ['should_trigger' => false, 'reason' => null, 'data' => []],
        };
    }

    /**
     * Part Wait: Fires when ticket status is 'pending_parts' or linked parts are awaiting delivery/pickup.
     */
    private static function evaluatePartWait(array $watch, DateTimeImmutable $now): array
    {
        $ticketId = !empty($watch['target_id']) ? (int) $watch['target_id'] : (int) ($watch['config']['ticket_id'] ?? 0);
        if ($ticketId <= 0) {
            return ['should_trigger' => false, 'reason' => 'No target ticket specified', 'data' => []];
        }

        $ticket = Ticket::findById($ticketId);
        if ($ticket === null) {
            return ['should_trigger' => false, 'reason' => "Ticket #{$ticketId} not found", 'data' => []];
        }

        if (in_array($ticket['status'] ?? '', ['resolved', 'closed', 'closed-elsewhere'], true)) {
            Watch::resolve((int)$watch['id'], null);
            return ['should_trigger' => false, 'reason' => "Ticket #{$ticketId} is {$ticket['status']}. Part wait resolved.", 'data' => $ticket];
        }

        $isPendingParts = (($ticket['status'] ?? '') === 'pending_parts');
        $partName = $watch['config']['part_name'] ?? 'required parts';

        if ($isPendingParts || !empty($watch['config']['part_name'])) {
            return [
                'should_trigger' => true,
                'reason' => sprintf('Ticket #%d waiting on parts: %s', $ticketId, $partName),
                'data' => [
                    'ticket_id' => $ticketId,
                    'status' => $ticket['status'],
                    'part_name' => $partName,
                    'wo_number' => $ticket['wo_number'] ?? null,
                ]
            ];
        }

        return ['should_trigger' => false, 'reason' => 'Ticket is not waiting on parts', 'data' => []];
    }

    /**
     * 1. Notice Deadline: Fires when a notice's serve-by passes without verification.
     */
    private static function evaluateNoticeDeadline(array $watch, DateTimeImmutable $now): array
    {
        $noticeId = !empty($watch['target_id']) ? (int) $watch['target_id'] : (int) ($watch['config']['notice_id'] ?? 0);
        if ($noticeId <= 0) {
            return ['should_trigger' => false, 'reason' => 'No target notice specified', 'data' => []];
        }

        $notice = Notice::findById($noticeId);
        if ($notice === null) {
            return ['should_trigger' => false, 'reason' => "Notice #{$noticeId} not found", 'data' => []];
        }

        // Verified notices legally clear the gate and never trigger a deadline alarm
        if (($notice['status'] ?? '') === 'verified') {
            return ['should_trigger' => false, 'reason' => 'Notice verified successfully', 'data' => $notice];
        }

        $deadlineStr = $notice['serve_by_deadline'] ?? null;
        if (empty($deadlineStr)) {
            return ['should_trigger' => false, 'reason' => 'No serve-by deadline set', 'data' => []];
        }

        $nowStr = $now->format('Y-m-d H:i:s');
        if ($nowStr >= $deadlineStr) {
            $unitStr = !empty($notice['unit_number']) ? "Unit {$notice['unit_number']}" : "Ticket #{$notice['ticket_id']}";
            return [
                'should_trigger' => true,
                'reason' => sprintf('Notice #%d for %s: serve-by deadline (%s) passed unverified', $noticeId, $unitStr, $deadlineStr),
                'data' => [
                    'notice_id' => $noticeId,
                    'status' => $notice['status'],
                    'serve_by_deadline' => $deadlineStr,
                    'entry_start' => $notice['entry_start'] ?? null,
                    'unit_number' => $notice['unit_number'] ?? null,
                ]
            ];
        }

        return ['should_trigger' => false, 'reason' => 'Deadline has not passed yet', 'data' => []];
    }


    /**
     * 3. Reply Waiting: Fires when a sent notice/message exceeds N hours without reply.
     */
    private static function evaluateReplyWaiting(array $watch, DateTimeImmutable $now): array
    {
        $noticeId = !empty($watch['target_id']) ? (int) $watch['target_id'] : (int) ($watch['config']['notice_id'] ?? 0);
        $hoursThreshold = isset($watch['config']['hours_threshold']) ? (int) $watch['config']['hours_threshold'] : 24;

        if ($noticeId <= 0) {
            return ['should_trigger' => false, 'reason' => 'No target notice specified', 'data' => []];
        }

        $notice = Notice::findById($noticeId);
        if ($notice === null) {
            return ['should_trigger' => false, 'reason' => "Notice #{$noticeId} not found", 'data' => []];
        }

        if (($notice['status'] ?? '') !== 'sent') {
            return ['should_trigger' => false, 'reason' => 'Notice is not in sent status', 'data' => []];
        }

        $sentAtStr = $notice['sent_at'] ?? $notice['updated_at'] ?? null;
        if (empty($sentAtStr)) {
            return ['should_trigger' => false, 'reason' => 'Notice missing sent timestamp', 'data' => []];
        }

        try {
            $sentAt = new DateTimeImmutable($sentAtStr);
        } catch (Throwable) {
            return ['should_trigger' => false, 'reason' => 'Invalid sent timestamp', 'data' => []];
        }

        $diffHours = ($now->getTimestamp() - $sentAt->getTimestamp()) / 3600.0;

        if ($diffHours >= $hoursThreshold) {
            return [
                'should_trigger' => true,
                'reason' => sprintf('Notice #%d sent %.1fh ago (exceeds %dh threshold) with no reply', $noticeId, $diffHours, $hoursThreshold),
                'data' => [
                    'notice_id' => $noticeId,
                    'sent_at' => $sentAtStr,
                    'hours_waiting' => round($diffHours, 1),
                    'hours_threshold' => $hoursThreshold,
                ]
            ];
        }

        return ['should_trigger' => false, 'reason' => 'Within reply threshold', 'data' => []];
    }

    /**
     * 4. Scheduled Task: Fires when a linked reminder/task is overdue.
     */
    private static function evaluateScheduledTask(array $watch, DateTimeImmutable $now): array
    {
        $config = $watch['config'] ?? [];
        $dueAtStr = $config['due_at'] ?? null;
        $title = $watch['title'] ?? 'Scheduled task';

        if (empty($dueAtStr)) {
            return ['should_trigger' => false, 'reason' => 'No due date specified', 'data' => []];
        }

        $nowStr = $now->format('Y-m-d H:i:s');
        if ($nowStr >= $dueAtStr) {
            return [
                'should_trigger' => true,
                'reason' => sprintf('Scheduled task "%s" is overdue (due %s)', $title, $dueAtStr),
                'data' => [
                    'title' => $title,
                    'due_at' => $dueAtStr,
                    'overdue_since' => $dueAtStr,
                ]
            ];
        }

        return ['should_trigger' => false, 'reason' => 'Task not yet due', 'data' => []];
    }
}
