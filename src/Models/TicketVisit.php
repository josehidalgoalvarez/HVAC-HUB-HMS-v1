<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use RuntimeException;
use Throwable;

/**
 * TicketVisit Model
 * Records field visits on tickets with outcomes, failure reasons, and notice state snapshots.
 * Derives unit and building failed access metrics (repeat access problem flags).
 */
class TicketVisit
{
    public const OUTCOME_COMPLETED = 'completed';
    public const OUTCOME_PARTIAL = 'partial';
    public const OUTCOME_FAILED_ACCESS = 'failed_access';

    public const REASON_TENANT_ABSENT = 'tenant_absent';
    public const REASON_NO_ANSWER = 'no_answer';
    public const REASON_REFUSED_ENTRY = 'refused_entry';
    public const REASON_KEY_LOCK_ISSUE = 'key_or_lock_issue';
    public const REASON_ACCESS_BLOCKED = 'access_blocked';
    public const REASON_UNSAFE = 'unsafe';
    public const REASON_OTHER = 'other';

    /**
     * Log a visit for a ticket, snapshotting notice state.
     */
    public static function logVisit(int $ticketId, array $data, ?int $userId = null): array
    {
        $ticket = Db::fetchOne(
            'SELECT id, building_id, unit_id, status, notice_needed, notice_sent_at, notice_confirmed_by '
            . 'FROM `ticket` WHERE id = ?',
            [$ticketId]
        );

        if (!$ticket) {
            throw new RuntimeException("Ticket #{$ticketId} not found");
        }

        $outcome = strtolower(trim((string) ($data['outcome'] ?? self::OUTCOME_COMPLETED)));
        if (!in_array($outcome, [self::OUTCOME_COMPLETED, self::OUTCOME_PARTIAL, self::OUTCOME_FAILED_ACCESS], true)) {
            $outcome = self::OUTCOME_COMPLETED;
        }

        $failureReason = null;
        if ($outcome === self::OUTCOME_FAILED_ACCESS) {
            $failureReason = strtolower(trim((string) ($data['failure_reason'] ?? $data['failed_reason'] ?? self::REASON_TENANT_ABSENT)));
            $allowedReasons = [
                self::REASON_TENANT_ABSENT,
                self::REASON_NO_ANSWER,
                self::REASON_REFUSED_ENTRY,
                self::REASON_KEY_LOCK_ISSUE,
                self::REASON_ACCESS_BLOCKED,
                self::REASON_UNSAFE,
                self::REASON_OTHER,
            ];
            if (!in_array($failureReason, $allowedReasons, true)) {
                $failureReason = self::REASON_OTHER;
            }
        }

        $notes = !empty($data['notes']) ? trim((string) $data['notes']) : null;
        $visitedAt = !empty($data['visited_at']) ? trim((string) $data['visited_at']) : date('Y-m-d H:i:s');
        $techName = !empty($data['tech_name']) ? trim((string) $data['tech_name']) : 'Jose (Tech)';

        $buildingId = !empty($data['building_id']) ? (int) $data['building_id'] : (int) $ticket['building_id'];
        $unitId = !empty($data['unit_id']) ? (int) $data['unit_id'] : (!empty($ticket['unit_id']) ? (int) $ticket['unit_id'] : null);

        // Snapshot ticket notice state at this moment (allow data override if explicitly passed)
        $noticeNeededSnap = isset($data['notice_needed'])
            ? (!empty($data['notice_needed']) ? 1 : 0)
            : (!empty($ticket['notice_needed']) ? 1 : 0);
        $noticeSentAtSnap = array_key_exists('notice_sent_at', $data)
            ? ($data['notice_sent_at'] ?: null)
            : ($ticket['notice_sent_at'] ?: null);
        $noticeConfirmedBySnap = array_key_exists('notice_confirmed_by', $data)
            ? ($data['notice_confirmed_by'] ?: null)
            : ($ticket['notice_confirmed_by'] ?: null);

        // OUR MISS rule: a failed visit where notice was needed but NOT sent must display as OUR miss, not the tenant's!
        $isOurMiss = 0;
        if ($outcome === self::OUTCOME_FAILED_ACCESS && $noticeNeededSnap === 1 && empty($noticeSentAtSnap)) {
            $isOurMiss = 1;
        }

        $sql = 'INSERT INTO `ticket_visit` ('
             . '`ticket_id`, `building_id`, `unit_id`, `tech_id`, `tech_name`, `visited_at`, '
             . '`outcome`, `failure_reason`, `notes`, `notice_needed_snapshot`, `notice_sent_at_snapshot`, '
             . '`notice_confirmed_by_snapshot`, `is_our_miss`, `created_at`'
             . ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))';

        Db::execute($sql, [
            $ticketId,
            $buildingId,
            $unitId,
            $userId,
            $techName,
            $visitedAt,
            $outcome,
            $failureReason,
            $notes,
            $noticeNeededSnap,
            $noticeSentAtSnap,
            $noticeConfirmedBySnap,
            $isOurMiss,
        ]);

        $visitId = (int) Db::lastInsertId();

        // Append to ticket timeline
        if ($outcome === self::OUTCOME_COMPLETED) {
            TicketTimeline::append(
                $ticketId,
                TicketTimeline::EVENT_COMPLETED,
                $techName,
                $notes ?: 'Visit completed successfully.',
                ['visit_id' => $visitId, 'outcome' => 'completed', 'visited_at' => $visitedAt]
            );

            // Transition ticket to done if not already closed
            Db::execute(
                "UPDATE `ticket` SET status = 'done', updated_at = datetime('now') WHERE id = ? AND status NOT IN ('closed', 'closed-elsewhere')",
                [$ticketId]
            );
        } elseif ($outcome === self::OUTCOME_PARTIAL) {
            TicketTimeline::append(
                $ticketId,
                TicketTimeline::EVENT_RETURN_VISIT,
                $techName,
                $notes ?: 'Partial visit completed. Follow-up visit required.',
                ['visit_id' => $visitId, 'outcome' => 'partial', 'visited_at' => $visitedAt]
            );
        } else { // failed_access
            $reasonText = match ($failureReason) {
                self::REASON_TENANT_ABSENT => 'Tenant absent',
                self::REASON_NO_ANSWER => 'No answer at door',
                self::REASON_REFUSED_ENTRY => 'Tenant refused entry',
                self::REASON_KEY_LOCK_ISSUE => 'Key / lock problem',
                self::REASON_ACCESS_BLOCKED => 'Access physically blocked',
                self::REASON_UNSAFE => 'Unsafe conditions',
                default => 'Other access issue',
            };

            $timelineNote = $isOurMiss
                ? "[OUR MISS] Notice required but not sent prior to visit — {$reasonText}"
                : "Failed access: {$reasonText}";

            if ($notes) {
                $timelineNote .= " ({$notes})";
            }

            TicketTimeline::append(
                $ticketId,
                TicketTimeline::EVENT_VISIT_LOGGED,
                $techName,
                $timelineNote,
                [
                    'visit_id' => $visitId,
                    'outcome' => 'failed_access',
                    'failure_reason' => $failureReason,
                    'is_our_miss' => (bool) $isOurMiss,
                    'visited_at' => $visitedAt,
                ]
            );
        }

        return self::findById($visitId);
    }

    public static function findById(int $id): ?array
    {
        $v = Db::fetchOne('SELECT * FROM `ticket_visit` WHERE id = ?', [$id]);
        if (!$v) {
            return null;
        }

        return self::formatVisit($v);
    }

    public static function getForTicket(int $ticketId): array
    {
        $rows = Db::fetchAll(
            'SELECT * FROM `ticket_visit` WHERE ticket_id = ? ORDER BY visited_at DESC, id DESC',
            [$ticketId]
        );

        return array_map([self::class, 'formatVisit'], $rows);
    }

    /**
     * Get derived failed visits metrics and visit history for a specific unit.
     * Return-for-parts visits, planned multi-visit jobs, and weather postponements
     * are logged with outcomes other than 'failed_access' and NEVER count.
     */
    public static function getMetricsForUnit(int $unitId): array
    {
        $visits = Db::fetchAll(
            'SELECT tv.*, t.wo_number, t.title as ticket_title '
            . 'FROM `ticket_visit` tv '
            . 'LEFT JOIN `ticket` t ON tv.ticket_id = t.id '
            . 'WHERE tv.unit_id = ? '
            . 'ORDER BY tv.visited_at DESC, tv.id DESC',
            [$unitId]
        );

        $totalFailed = 0;
        $last90DaysFailed = 0;
        $lastFailure = null;

        $ninetyDaysAgo = date('Y-m-d H:i:s', strtotime('-90 days'));

        foreach ($visits as $v) {
            if ($v['outcome'] === self::OUTCOME_FAILED_ACCESS) {
                $totalFailed++;

                if ($v['visited_at'] >= $ninetyDaysAgo) {
                    $last90DaysFailed++;
                }

                if ($lastFailure === null) {
                    $lastFailure = [
                        'visited_at' => $v['visited_at'],
                        'failure_reason' => $v['failure_reason'],
                        'is_our_miss' => (bool) $v['is_our_miss'],
                        'notes' => $v['notes'],
                    ];
                }
            }
        }

        return [
            'unit_id' => $unitId,
            'total_failed_visits' => $totalFailed,
            'last_90_days_failed_visits' => $last90DaysFailed,
            'repeat_access_problem' => ($totalFailed >= 2),
            'last_failure' => $lastFailure,
            'visits' => array_map([self::class, 'formatVisit'], $visits),
        ];
    }

    /**
     * Get per-building failed visit counts.
     */
    public static function getBuildingFailedVisitCounts(): array
    {
        $rows = Db::fetchAll(
            'SELECT building_id, COUNT(*) as failed_count '
            . 'FROM `ticket_visit` '
            . "WHERE outcome = 'failed_access' "
            . 'GROUP BY building_id'
        );

        $counts = [];
        foreach ($rows as $r) {
            $counts[(int) $r['building_id']] = (int) $r['failed_count'];
        }

        return $counts;
    }

    public static function getUnitSummary(int $unitId): array
    {
        $res = self::getMetricsForUnit($unitId);
        $res['failed_visits_count'] = $res['total_failed_visits'];
        $res['last_90_days_count'] = $res['last_90_days_failed_visits'];
        return $res;
    }

    public static function getBuildingFailedVisits(): array
    {
        $counts = self::getBuildingFailedVisitCounts();
        $list = [];
        foreach ($counts as $bldId => $cnt) {
            $list[] = [
                'building_id' => $bldId,
                'failed_visits_count' => $cnt,
            ];
        }
        return $list;
    }

    private static function formatVisit(array $v): array
    {
        return [
            'id' => (int) $v['id'],
            'ticket_id' => (int) $v['ticket_id'],
            'building_id' => (int) $v['building_id'],
            'unit_id' => !empty($v['unit_id']) ? (int) $v['unit_id'] : null,
            'tech_id' => !empty($v['tech_id']) ? (int) $v['tech_id'] : null,
            'tech_name' => $v['tech_name'] ?? 'Jose',
            'visited_at' => $v['visited_at'],
            'outcome' => $v['outcome'],
            'failure_reason' => $v['failure_reason'],
            'notes' => $v['notes'],
            'notice_needed_snapshot' => (bool) $v['notice_needed_snapshot'],
            'notice_sent_at_snapshot' => $v['notice_sent_at_snapshot'],
            'notice_confirmed_by_snapshot' => $v['notice_confirmed_by_snapshot'],
            'is_our_miss' => (bool) $v['is_our_miss'],
            'created_at' => $v['created_at'],
            'ticket_wo_number' => $v['wo_number'] ?? null,
            'ticket_title' => $v['ticket_title'] ?? null,
        ];
    }
}
