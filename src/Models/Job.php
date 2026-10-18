<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use RuntimeException;
use Throwable;

/**
 * Job Model
 * Represents a field execution session by a technician, capturing notes,
 * parts consumed, photo attachments, actual minutes, and close-out state transitions.
 */
class Job
{
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELED = 'canceled';

    /**
     * Find all jobs matching optional filters.
     */
    public static function findAll(array $filters = []): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['ticket_id'])) {
            $where[] = 'j.ticket_id = ?';
            $params[] = (int) $filters['ticket_id'];
        }

        if (!empty($filters['tech_id'])) {
            $where[] = 'j.tech_id = ?';
            $params[] = (int) $filters['tech_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = 'j.status = ?';
            $params[] = (string) $filters['status'];
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT j.*,
                       t.wo_number,
                       t.title AS ticket_title,
                       t.status AS ticket_status,
                       bldg.name AS building_name,
                       u.unit_number,
                       tech.name AS tech_name,
                       (SELECT COUNT(*) FROM job_part jp WHERE jp.job_id = j.id) AS parts_count,
                       (SELECT COUNT(*) FROM job_note jn WHERE jn.job_id = j.id) AS notes_count,
                       (SELECT COUNT(*) FROM photo p WHERE p.entity_type = 'job' AND p.entity_id = j.id) AS photos_count
                FROM job j
                LEFT JOIN ticket t ON j.ticket_id = t.id
                LEFT JOIN building bldg ON j.building_id = bldg.id
                LEFT JOIN unit u ON j.unit_id = u.id
                LEFT JOIN users tech ON j.tech_id = tech.id
                {$whereClause}
                ORDER BY j.created_at DESC, j.id DESC";

        try {
            $rows = Db::fetchAll($sql, $params);
        } catch (Throwable) {
            $rows = Db::fetchAll("SELECT * FROM job {$whereClause} ORDER BY created_at DESC, id DESC", $params);
        }

        return array_map([self::class, 'enrichJobSummary'], $rows);
    }

    /**
     * Find full job by ID with all sub-resources (parts, notes, photos, ticket).
     */
    public static function findById(int|string $id): ?array
    {
        $sql = "SELECT j.*,
                       t.wo_number,
                       t.title AS ticket_title,
                       t.status AS ticket_status,
                       t.priority AS ticket_priority,
                       bldg.name AS building_name,
                       bldg.address AS building_address,
                       u.unit_number,
                       tech.name AS tech_name
                FROM job j
                LEFT JOIN ticket t ON j.ticket_id = t.id
                LEFT JOIN building bldg ON j.building_id = bldg.id
                LEFT JOIN unit u ON j.unit_id = u.id
                LEFT JOIN users tech ON j.tech_id = tech.id
                WHERE j.id = ?
                LIMIT 1";

        try {
            $job = Db::fetchOne($sql, [(int) $id]);
        } catch (Throwable) {
            $job = Db::fetchOne('SELECT * FROM job WHERE id = ? LIMIT 1', [(int) $id]);
        }

        if ($job === null) {
            return null;
        }

        // Fetch parts used
        try {
            $job['parts_used'] = Db::fetchAll(
                'SELECT id, part_name, quantity, unit, notes, created_at FROM job_part WHERE job_id = ? ORDER BY id ASC',
                [(int) $id]
            );
        } catch (Throwable) {
            $job['parts_used'] = [];
        }

        // Fetch notes
        try {
            $job['notes_list'] = Db::fetchAll(
                "SELECT jn.id, jn.note_text, jn.created_at, u.name AS author_name
                 FROM job_note jn
                 LEFT JOIN users u ON jn.tech_id = u.id
                 WHERE jn.job_id = ?
                 ORDER BY jn.id ASC",
                [(int) $id]
            );
        } catch (Throwable) {
            $job['notes_list'] = [];
        }

        // Fetch photos
        try {
            $job['photos'] = Db::fetchAll(
                "SELECT id, file_path, file_size_bytes, caption, created_at
                 FROM photo
                 WHERE entity_type = 'job' AND entity_id = ?
                 ORDER BY id ASC",
                [(int) $id]
            );
        } catch (Throwable) {
            $job['photos'] = [];
        }

        // Variance calculation
        if ($job['actual_minutes'] !== null && $job['estimated_minutes'] !== null) {
            $job['variance_minutes'] = (int) $job['actual_minutes'] - (int) $job['estimated_minutes'];
        } else {
            $job['variance_minutes'] = null;
        }

        return $job;
    }

    /**
     * Create a new field job session.
     */
    public static function create(array $data, ?int $userId = null): array
    {
        $ticketId = !empty($data['ticket_id']) ? (int) $data['ticket_id'] : null;
        $blockId = !empty($data['run_sheet_block_id']) ? (int) $data['run_sheet_block_id'] : null;
        $buildingId = !empty($data['building_id']) ? (int) $data['building_id'] : null;
        $unitId = !empty($data['unit_id']) ? (int) $data['unit_id'] : null;
        $techId = !empty($data['tech_id']) ? (int) $data['tech_id'] : ($userId ?? 1);
        $title = trim((string) ($data['title'] ?? 'Field Job Session'));
        $status = (string) ($data['status'] ?? self::STATUS_IN_PROGRESS);
        $startTime = !empty($data['start_time']) ? (string) $data['start_time'] : date('Y-m-d H:i:s');
        $endTime = !empty($data['end_time']) ? (string) $data['end_time'] : null;
        $estimatedMinutes = !empty($data['estimated_minutes']) ? (int) $data['estimated_minutes'] : 45;
        $actualMinutes = isset($data['actual_minutes']) && $data['actual_minutes'] !== '' ? (int) $data['actual_minutes'] : null;
        $notes = isset($data['notes']) ? (string) $data['notes'] : null;

        // If ticketId is given but building/unit was not, resolve from ticket
        if ($ticketId && (!$buildingId || !$unitId)) {
            $tkt = Ticket::findById($ticketId);
            if ($tkt !== null) {
                $buildingId = $buildingId ?: ($tkt['building_id'] ?? null);
                $unitId = $unitId ?: ($tkt['unit_id'] ?? null);
                if (empty($data['title'])) {
                    $title = $tkt['title'];
                }
            }
        }

        $sql = "INSERT INTO job (
                    ticket_id, run_sheet_block_id, building_id, unit_id, tech_id,
                    title, status, start_time, end_time, estimated_minutes, actual_minutes, notes,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";

        Db::execute($sql, [
            $ticketId,
            $blockId,
            $buildingId,
            $unitId,
            $techId,
            $title,
            $status,
            $startTime,
            $endTime,
            $estimatedMinutes,
            $actualMinutes,
            $notes,
        ]);

        $newId = (int) Db::lastInsertId();

        Correction::record(
            'job',
            $newId,
            'status',
            null,
            $status,
            $userId,
            "Field job #{$newId} started"
        );

        // If ticket was in 'new' or 'verified' state, advance it to 'in-progress'
        if ($ticketId) {
            try {
                $ticket = Ticket::findById($ticketId);
                if ($ticket !== null && in_array($ticket['status'], [Ticket::STATE_NEW, Ticket::STATE_VERIFIED], true)) {
                    Ticket::update($ticketId, ['status' => Ticket::STATE_IN_PROGRESS], $userId, "Job #{$newId} started in field");
                }
            } catch (Throwable) {
                // Ignore if ticket update fails
            }
        }

        // If block is linked, mark in-progress
        if ($blockId) {
            try {
                RunSheetBlock::update($blockId, ['status' => RunSheetBlock::STATUS_IN_PROGRESS], $userId, "Job #{$newId} underway");
            } catch (Throwable) {
                // Ignore
            }
        }

        return self::findById($newId) ?? [];
    }

    /**
     * Update an existing job session.
     */
    public static function update(int|string $id, array $data, ?int $userId = null, ?string $reason = null): array
    {
        $existing = self::findById($id);
        if ($existing === null) {
            throw new RuntimeException("Job #{$id} not found");
        }

        $updatableFields = [
            'ticket_id',
            'run_sheet_block_id',
            'building_id',
            'unit_id',
            'tech_id',
            'title',
            'status',
            'start_time',
            'end_time',
            'estimated_minutes',
            'actual_minutes',
            'notes',
        ];

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
                    'job',
                    (int) $id,
                    $field,
                    $oldStr,
                    $newStr,
                    $userId,
                    $reason ?? "Updated {$field} on job #{$id}"
                );

                $fieldsToUpdate[] = "`{$field}` = ?";
                $params[] = $newVal;
            }
        }

        if (!empty($fieldsToUpdate)) {
            $fieldsToUpdate[] = '`updated_at` = CURRENT_TIMESTAMP';
            $sql = 'UPDATE job SET ' . implode(', ', $fieldsToUpdate) . ' WHERE id = ?';
            $params[] = (int) $id;
            Db::execute($sql, $params);
        }

        return self::findById($id) ?? [];
    }

    /**
     * Add a part used record to a job.
     */
    public static function addPartUsed(int|string $jobId, string $partName, float $quantity = 1.0, string $unit = 'pcs', ?string $notes = null, ?int $userId = null): array
    {
        $job = self::findById($jobId);
        if ($job === null) {
            throw new RuntimeException("Job #{$jobId} not found");
        }

        $sql = 'INSERT INTO job_part (job_id, part_name, quantity, unit, notes, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)';
        Db::execute($sql, [(int) $jobId, trim($partName), $quantity, trim($unit), $notes]);

        $partId = (int) Db::lastInsertId();

        Correction::record(
            'job',
            (int) $jobId,
            'part_used',
            null,
            "{$quantity} {$unit} of {$partName}",
            $userId,
            "Part consumed: {$partName}"
        );

        return [
            'id' => $partId,
            'job_id' => (int) $jobId,
            'part_name' => $partName,
            'quantity' => $quantity,
            'unit' => $unit,
            'notes' => $notes,
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Add a technician note to a job.
     */
    public static function addNote(int|string $jobId, string $noteText, ?int $userId = null): array
    {
        $job = self::findById($jobId);
        if ($job === null) {
            throw new RuntimeException("Job #{$jobId} not found");
        }

        $text = trim($noteText);
        $sql = 'INSERT INTO job_note (job_id, tech_id, note_text, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)';
        Db::execute($sql, [(int) $jobId, $userId, $text]);

        $noteId = (int) Db::lastInsertId();

        Correction::record(
            'job',
            (int) $jobId,
            'note',
            null,
            mb_substr($text, 0, 100),
            $userId,
            'Field note added'
        );

        return [
            'id' => $noteId,
            'job_id' => (int) $jobId,
            'tech_id' => $userId,
            'note_text' => $text,
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Attach a photo record to a job.
     */
    public static function addPhoto(int|string $jobId, string $filePath, int $fileSizeBytes = 0, ?string $caption = null, ?int $userId = null): array
    {
        $job = self::findById($jobId);
        if ($job === null) {
            throw new RuntimeException("Job #{$jobId} not found");
        }

        $sql = "INSERT INTO photo (entity_type, entity_id, file_path, url, file_size_bytes, mime_type, caption, taken_by_user_id, created_at)
                VALUES ('job', ?, ?, ?, ?, 'image/jpeg', ?, ?, CURRENT_TIMESTAMP)";
        Db::execute($sql, [(int) $jobId, $filePath, $filePath, $fileSizeBytes, $caption, $userId]);

        $photoId = (int) Db::lastInsertId();

        Correction::record(
            'job',
            (int) $jobId,
            'photo',
            null,
            $filePath,
            $userId,
            'Job photo uploaded: ' . ($caption ?? 'Field photo')
        );

        return [
            'id' => $photoId,
            'entity_type' => 'job',
            'entity_id' => (int) $jobId,
            'file_path' => $filePath,
            'file_size_bytes' => $fileSizeBytes,
            'caption' => $caption,
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Close out a job:
     * - Records actual minutes, notes, completion timestamp
     * - Records parts used & photos if included in close-out payload
     * - Sets job status = 'completed'
     * - Moves linked ticket to 'done' (which writes ticket correction row)
     * - Updates linked run sheet block to 'completed' with actual minutes
     * - Writes append-only correction rows for all changes.
     */
    public static function close(int|string $id, array $data, ?int $userId = null): array
    {
        $job = self::findById($id);
        if ($job === null) {
            throw new RuntimeException("Job #{$id} not found");
        }

        $actualMinutes = isset($data['actual_minutes']) && $data['actual_minutes'] !== '' ? (int) $data['actual_minutes'] : (int) ($job['estimated_minutes'] ?? 45);
        $closeNotes = isset($data['notes']) ? trim((string) $data['notes']) : null;
        $endTime = date('Y-m-d H:i:s');

        // 1. Process any parts included in close payload
        if (!empty($data['parts_used']) && is_array($data['parts_used'])) {
            foreach ($data['parts_used'] as $part) {
                if (is_array($part) && !empty($part['part_name'])) {
                    self::addPartUsed(
                        $id,
                        (string) $part['part_name'],
                        isset($part['quantity']) ? (float) $part['quantity'] : 1.0,
                        (string) ($part['unit'] ?? 'pcs'),
                        isset($part['notes']) ? (string) $part['notes'] : null,
                        $userId
                    );
                } elseif (is_string($part) && trim($part) !== '') {
                    self::addPartUsed($id, trim($part), 1.0, 'pcs', null, $userId);
                }
            }
        }

        // 2. Process any notes included in close payload
        if ($closeNotes !== null && $closeNotes !== '') {
            self::addNote($id, $closeNotes, $userId);
        }

        // 3. Process any photos attached
        if (!empty($data['photos']) && is_array($data['photos'])) {
            foreach ($data['photos'] as $photo) {
                if (is_array($photo) && !empty($photo['file_path'])) {
                    self::addPhoto(
                        $id,
                        (string) $photo['file_path'],
                        (int) ($photo['file_size_bytes'] ?? 0),
                        $photo['caption'] ?? null,
                        $userId
                    );
                } elseif (is_string($photo) && trim($photo) !== '') {
                    self::addPhoto($id, trim($photo), 0, 'Close-out photo', $userId);
                }
            }
        }

        // 4. Update the job itself to completed
        $updatedJob = self::update($id, [
            'status' => self::STATUS_COMPLETED,
            'actual_minutes' => $actualMinutes,
            'end_time' => $endTime,
            'notes' => $closeNotes ?: $job['notes'],
        ], $userId, "Job #{$id} closed out with actual minutes: {$actualMinutes}");

        // 5. Advance linked ticket to 'done' (per acceptance criterion 2)
        if (!empty($job['ticket_id'])) {
            try {
                Ticket::update(
                    $job['ticket_id'],
                    ['status' => Ticket::STATE_DONE],
                    $userId,
                    "Ticket marked done via field job #{$id} close-out"
                );
            } catch (Throwable) {
                // Ignore if already done or ticket missing
            }
        }

        // 6. Update linked run sheet block if present
        if (!empty($job['run_sheet_block_id'])) {
            try {
                RunSheetBlock::update(
                    $job['run_sheet_block_id'],
                    [
                        'status' => RunSheetBlock::STATUS_COMPLETED,
                        'actual_minutes' => $actualMinutes,
                        'end_time' => date('H:i'),
                    ],
                    $userId,
                    "Block marked completed via field job #{$id} close-out"
                );
            } catch (Throwable) {
                // Ignore if block missing
            }
        }

        return self::findById($id) ?? $updatedJob;
    }

    private static function enrichJobSummary(array $row): array
    {
        if ($row['actual_minutes'] !== null && $row['estimated_minutes'] !== null) {
            $row['variance_minutes'] = (int) $row['actual_minutes'] - (int) $row['estimated_minutes'];
        } else {
            $row['variance_minutes'] = null;
        }

        return $row;
    }
}
