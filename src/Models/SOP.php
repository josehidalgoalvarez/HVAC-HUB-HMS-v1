<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use InvalidArgumentException;
use RuntimeException;

/**
 * SOP Model
 * Manages procedure definitions (reference data) and timed checklist runs (insert-only).
 */
class SOP
{
    /**
     * Get all SOPs with their steps.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function findAll(): array
    {
        $rows = Db::fetchAll('SELECT * FROM `sop` ORDER BY category ASC, title ASC');
        $sops = [];
        foreach ($rows as $row) {
            $sops[] = self::hydrateSop($row);
        }
        return $sops;
    }

    /**
     * Find SOP by ID with steps.
     *
     * @return array<string, mixed>|null
     */
    public static function findById(string $id): ?array
    {
        $row = Db::fetchOne('SELECT * FROM `sop` WHERE id = ?', [$id]);
        if (!$row) {
            return null;
        }
        return self::hydrateSop($row);
    }

    /**
     * Hydrate SOP row and fetch steps.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function hydrateSop(array $row): array
    {
        $stepRows = Db::fetchAll(
            'SELECT * FROM `sop_step` WHERE sop_id = ? ORDER BY position ASC',
            [$row['id']]
        );

        $steps = [];
        foreach ($stepRows as $s) {
            $steps[] = [
                'id' => (int) $s['id'],
                'sop_id' => $s['sop_id'],
                'position' => (int) $s['position'],
                'instruction' => $s['instruction'],
                'est_minutes' => $s['est_minutes'] !== null ? (int) $s['est_minutes'] : null,
                'todo_verify' => (int) $s['todo_verify'],
            ];
        }

        return [
            'id' => $row['id'],
            'title' => $row['title'],
            'category' => $row['category'],
            'version' => (int) $row['version'],
            'required_tools' => json_decode((string) ($row['required_tools'] ?? '[]'), true) ?: [],
            'required_parts' => json_decode((string) ($row['required_parts'] ?? '[]'), true) ?: [],
            'access_requirements' => json_decode((string) ($row['access_requirements'] ?? '[]'), true) ?: [],
            'compliance_gates' => json_decode((string) ($row['compliance_gates'] ?? '[]'), true) ?: [],
            'weather_exposure' => $row['weather_exposure'] ?? null,
            'two_person' => $row['two_person'] !== null ? (bool) $row['two_person'] : null,
            'todo_verify' => (int) $row['todo_verify'],
            'source_note' => $row['source_note'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'steps' => $steps,
        ];
    }

    /**
     * Create an insert-only run record and per-step records.
     * Also appends sop_run_completed event to ticket timeline if ticket_id is provided.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public static function createRun(array $data): array
    {
        $sopId = trim((string) ($data['sop_id'] ?? ''));
        if ($sopId === '') {
            throw new InvalidArgumentException('sop_id is required');
        }

        $sop = self::findById($sopId);
        if (!$sop) {
            throw new RuntimeException("SOP not found: {$sopId}");
        }

        $technician = trim((string) ($data['technician'] ?? 'Jose (Tech)'));
        if ($technician === '') {
            $technician = 'Jose (Tech)';
        }

        $ticketId = !empty($data['ticket_id']) ? (int) $data['ticket_id'] : null;
        $startedAt = !empty($data['started_at']) ? (string) $data['started_at'] : date('Y-m-d H:i:s');
        $finishedAt = !empty($data['finished_at']) ? (string) $data['finished_at'] : date('Y-m-d H:i:s');
        $totalSeconds = isset($data['total_seconds']) ? (int) $data['total_seconds'] : 0;
        $notes = !empty($data['notes']) ? (string) $data['notes'] : null;
        $acknowledgedGates = isset($data['acknowledged_gates']) && is_array($data['acknowledged_gates'])
            ? $data['acknowledged_gates']
            : [];
        $weatherWarnings = isset($data['weather_warnings']) && is_array($data['weather_warnings'])
            ? $data['weather_warnings']
            : [];

        $now = gmdate('Y-m-d H:i:s');

        // Insert run
        $sqlRun = 'INSERT INTO `sop_run` '
            . '(`sop_id`, `sop_version`, `sop_title`, `ticket_id`, `technician`, `started_at`, `finished_at`, `total_seconds`, `notes`, `acknowledged_gates`, `weather_warnings`, `created_at`) '
            . 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        Db::execute($sqlRun, [
            $sop['id'],
            $sop['version'],
            $sop['title'],
            $ticketId,
            $technician,
            $startedAt,
            $finishedAt,
            $totalSeconds,
            $notes,
            json_encode($acknowledgedGates),
            json_encode($weatherWarnings),
            $now,
        ]);

        $runId = (int) Db::lastInsertId();

        // Insert run steps
        $steps = isset($data['steps']) && is_array($data['steps']) ? $data['steps'] : [];
        $savedSteps = [];

        foreach ($steps as $s) {
            $pos = (int) ($s['position'] ?? 1);
            $instruction = (string) ($s['instruction'] ?? '');
            $stepStartedAt = (string) ($s['started_at'] ?? $startedAt);
            $stepCompletedAt = (string) ($s['completed_at'] ?? $finishedAt);
            $durSeconds = (int) ($s['duration_seconds'] ?? 0);
            $stepNote = !empty($s['note']) ? (string) $s['note'] : null;
            $deviation = !empty($s['deviation']) ? 1 : 0;

            $sqlStep = 'INSERT INTO `sop_run_step` '
                . '(`run_id`, `position`, `instruction`, `started_at`, `completed_at`, `duration_seconds`, `note`, `deviation`) '
                . 'VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

            Db::execute($sqlStep, [
                $runId,
                $pos,
                $instruction,
                $stepStartedAt,
                $stepCompletedAt,
                $durSeconds,
                $stepNote,
                $deviation,
            ]);

            $stepId = (int) Db::lastInsertId();
            $savedSteps[] = [
                'id' => $stepId,
                'run_id' => $runId,
                'position' => $pos,
                'instruction' => $instruction,
                'started_at' => $stepStartedAt,
                'completed_at' => $stepCompletedAt,
                'duration_seconds' => $durSeconds,
                'note' => $stepNote,
                'deviation' => (bool) $deviation,
            ];
        }

        // If ticket_id is present, append timeline event
        if ($ticketId !== null) {
            $mins = ceil($totalSeconds / 60);
            $deviationsCount = count(array_filter($savedSteps, fn($s) => $s['deviation']));
            $timelineNote = "Completed timed SOP: {$sop['title']} ({$mins} min" . ($mins === 1 ? '' : 's') . ")";
            if ($deviationsCount > 0) {
                $timelineNote .= " with {$deviationsCount} deviation" . ($deviationsCount === 1 ? '' : 's') . '.';
            } else {
                $timelineNote .= '.';
            }
            if ($notes) {
                $timelineNote .= ' Note: ' . $notes;
            }

            TicketTimeline::append(
                $ticketId,
                TicketTimeline::EVENT_SOP_RUN_COMPLETED,
                $technician,
                $timelineNote,
                [
                    'run_id' => $runId,
                    'sop_id' => $sop['id'],
                    'sop_title' => $sop['title'],
                    'total_seconds' => $totalSeconds,
                    'duration_minutes' => $mins,
                    'steps_count' => count($savedSteps),
                    'deviations_count' => $deviationsCount,
                    'acknowledged_gates' => $acknowledgedGates,
                    'weather_warnings' => $weatherWarnings,
                ]
            );
        }

        return [
            'id' => $runId,
            'sop_id' => $sop['id'],
            'sop_version' => $sop['version'],
            'sop_title' => $sop['title'],
            'ticket_id' => $ticketId,
            'technician' => $technician,
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
            'total_seconds' => $totalSeconds,
            'notes' => $notes,
            'acknowledged_gates' => $acknowledgedGates,
            'weather_warnings' => $weatherWarnings,
            'steps' => $savedSteps,
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Get runs, optionally filtered by ticket_id or sop_id.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getRuns(?int $ticketId = null, ?string $sopId = null): array
    {
        $params = [];
        $where = [];

        if ($ticketId !== null) {
            $where[] = 'ticket_id = ?';
            $params[] = $ticketId;
        }
        if ($sopId !== null && $sopId !== '') {
            $where[] = 'sop_id = ?';
            $params[] = $sopId;
        }

        $sql = 'SELECT * FROM `sop_run` ';
        if (!empty($where)) {
            $sql .= 'WHERE ' . implode(' AND ', $where) . ' ';
        }
        $sql .= 'ORDER BY id DESC';

        $rows = Db::fetchAll($sql, $params);
        $runs = [];

        foreach ($rows as $r) {
            $stepRows = Db::fetchAll(
                'SELECT * FROM `sop_run_step` WHERE run_id = ? ORDER BY position ASC',
                [(int) $r['id']]
            );

            $steps = [];
            foreach ($stepRows as $s) {
                $steps[] = [
                    'id' => (int) $s['id'],
                    'run_id' => (int) $s['run_id'],
                    'position' => (int) $s['position'],
                    'instruction' => $s['instruction'],
                    'started_at' => $s['started_at'],
                    'completed_at' => $s['completed_at'],
                    'duration_seconds' => (int) $s['duration_seconds'],
                    'note' => $s['note'],
                    'deviation' => (bool) $s['deviation'],
                ];
            }

            $runs[] = [
                'id' => (int) $r['id'],
                'sop_id' => $r['sop_id'],
                'sop_version' => (int) $r['sop_version'],
                'sop_title' => $r['sop_title'],
                'ticket_id' => $r['ticket_id'] !== null ? (int) $r['ticket_id'] : null,
                'technician' => $r['technician'],
                'started_at' => $r['started_at'],
                'finished_at' => $r['finished_at'],
                'total_seconds' => (int) $r['total_seconds'],
                'notes' => $r['notes'],
                'acknowledged_gates' => json_decode((string) ($r['acknowledged_gates'] ?? '[]'), true) ?: [],
                'weather_warnings' => json_decode((string) ($r['weather_warnings'] ?? '[]'), true) ?: [],
                'created_at' => $r['created_at'],
                'steps' => $steps,
            ];
        }

        return $runs;
    }
}
