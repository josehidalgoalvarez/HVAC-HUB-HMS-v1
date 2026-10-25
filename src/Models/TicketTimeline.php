<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use Throwable;

/**
 * TicketTimeline Model
 * APPEND-ONLY event stream for work order timeline events.
 * Provenance rule: events are never edited or deleted, only appended.
 */
class TicketTimeline
{
    public const EVENT_SUBMITTED = 'submitted';
    public const EVENT_VISIT_LOGGED = 'visit_logged';
    public const EVENT_APPLIANCE_IDENTIFIED = 'appliance_identified';
    public const EVENT_PART_NEEDED = 'part_needed';
    public const EVENT_PART_ORDERED = 'part_ordered';
    public const EVENT_PART_ARRIVED = 'part_arrived';
    public const EVENT_RETURN_VISIT = 'return_visit';
    public const EVENT_COMPLETED = 'completed';
    public const EVENT_SOP_RUN_COMPLETED = 'sop_run_completed';
    public const EVENT_NOTE = 'note';

    /**
     * Append a new event to a ticket's timeline.
     */
    public static function append(
        int $ticketId,
        string $eventType,
        string $actor = 'Tech',
        ?string $note = null,
        ?array $metadata = null
    ): array {
        $metaJson = $metadata !== null ? json_encode($metadata) : null;
        $now = gmdate('Y-m-d H:i:s');

        $sql = 'INSERT INTO `ticket_timeline` (`ticket_id`, `event_type`, `actor`, `note`, `metadata`, `created_at`) '
             . 'VALUES (?, ?, ?, ?, ?, ?)';

        Db::execute($sql, [
            $ticketId,
            $eventType,
            $actor,
            $note,
            $metaJson,
            $now,
        ]);

        $id = (int) Db::lastInsertId();

        return [
            'id' => $id,
            'ticket_id' => $ticketId,
            'event_type' => $eventType,
            'actor' => $actor,
            'note' => $note,
            'metadata' => $metadata,
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Get all timeline events for a ticket.
     * Maps existing ticket state / attributes onto the timeline if no explicit events exist yet.
     */
    public static function getForTicket(int $ticketId): array
    {
        $rows = Db::fetchAll(
            'SELECT id, ticket_id, event_type, actor, note, metadata, created_at '
            . 'FROM `ticket_timeline` '
            . 'WHERE ticket_id = ? '
            . 'ORDER BY created_at ASC, id ASC',
            [$ticketId]
        );

        $events = [];
        foreach ($rows as $r) {
            $meta = !empty($r['metadata']) ? json_decode($r['metadata'], true) : null;
            $events[] = [
                'id' => (int) $r['id'],
                'ticket_id' => (int) $r['ticket_id'],
                'event_type' => $r['event_type'],
                'actor' => $r['actor'],
                'note' => $r['note'],
                'metadata' => $meta,
                'created_at' => $r['created_at'],
            ];
        }

        // If no explicit events yet, synthesize baseline events from ticket data
        // so existing ticket states map onto timeline without losing history
        if (empty($events)) {
            $ticket = Db::fetchOne(
                'SELECT id, wo_number, title, description, verified_scope, status, photo_url, '
                . 'last_seen_in_yardi, created_at, updated_at '
                . 'FROM `ticket` WHERE id = ?',
                [$ticketId]
            );

            if ($ticket) {
                // 1. Submitted event
                $events[] = [
                    'id' => 1000000 + $ticketId,
                    'ticket_id' => $ticketId,
                    'event_type' => self::EVENT_SUBMITTED,
                    'actor' => 'Resident / Dispatch',
                    'note' => $ticket['description'] ?: $ticket['title'],
                    'metadata' => [
                        'wo_number' => $ticket['wo_number'],
                        'photo_url' => $ticket['photo_url'],
                    ],
                    'created_at' => $ticket['created_at'] ?: date('Y-m-d H:i:s'),
                ];

                // 2. Verified / Appliance identified
                if (!empty($ticket['verified_scope'])) {
                    $events[] = [
                        'id' => 2000000 + $ticketId,
                        'ticket_id' => $ticketId,
                        'event_type' => self::EVENT_APPLIANCE_IDENTIFIED,
                        'actor' => 'Jose (Tech)',
                        'note' => $ticket['verified_scope'],
                        'metadata' => [
                            'rating_plate_url' => $ticket['photo_url'],
                        ],
                        'created_at' => $ticket['created_at'] ?: date('Y-m-d H:i:s'),
                    ];
                }

                // 3. Completed if state is done / closed
                $st = strtolower($ticket['status'] ?? 'new');
                if (in_array($st, ['done', 'resolved', 'closed', 'closed-elsewhere'], true)) {
                    $events[] = [
                        'id' => 3000000 + $ticketId,
                        'ticket_id' => $ticketId,
                        'event_type' => self::EVENT_COMPLETED,
                        'actor' => 'Jose (Tech)',
                        'note' => 'Work order completed and verified.',
                        'metadata' => null,
                        'created_at' => $ticket['updated_at'] ?: date('Y-m-d H:i:s'),
                    ];
                }
            }
        }

        return $events;
    }
}
