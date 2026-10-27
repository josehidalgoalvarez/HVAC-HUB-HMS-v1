<?php

declare(strict_types=1);

/**
 * Past Work Order Batch Context Importer
 *
 * Reads a JSON batch of past work orders and imports them into HVACHome as context.
 *
 * Modes:
 *   --dry-run (default): Simulates import, resolves entities, reports row-by-row actions, writes nothing.
 *   --run              : Executes import and writes records and timeline events.
 *
 * Usage:
 *   php cli/import_past_wos.php <path-to-batch.json> [--dry-run | --run]
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Ticket;
use App\Models\TicketTimeline;

class PastWoImporter
{
    private PDO $pdo;
    private bool $isDryRun;

    public function __construct(PDO $pdo, bool $isDryRun = true)
    {
        $this->pdo = $pdo;
        $this->isDryRun = $isDryRun;
    }

    /**
     * Run import for a batch JSON file.
     * Returns summary array.
     */
    public function importFile(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new InvalidArgumentException("Batch file not found: {$filePath}");
        }

        $raw = file_get_contents($filePath);
        $data = json_decode($raw, true);

        if (!is_array($data)) {
            throw new InvalidArgumentException("Batch file must contain a JSON array of work orders.");
        }

        return $this->importRows($data);
    }

    /**
     * Import an array of past work order records.
     */
    public function importRows(array $rows): array
    {
        $summary = [
            'mode' => $this->isDryRun ? 'dry-run' : 'run',
            'total_rows' => count($rows),
            'created' => 0,
            'skipped' => 0,
            'failed' => 0,
            'unlinked_parents' => 0,
            'details' => [],
        ];

        foreach ($rows as $index => $row) {
            $rowNum = $index + 1;
            $res = $this->processRow($row, $rowNum);
            $summary['details'][] = $res;

            if ($res['status'] === 'skipped') {
                $summary['skipped']++;
            } elseif ($res['status'] === 'failed') {
                $summary['failed']++;
            } elseif ($res['status'] === 'created') {
                $summary['created']++;
                if (!empty($res['unlinked_parent'])) {
                    $summary['unlinked_parents']++;
                }
            }
        }

        return $summary;
    }

    /**
     * Process an individual row.
     */
    private function processRow(array $row, int $rowNum): array
    {
        $woNumber = isset($row['wo_number']) ? trim((string) $row['wo_number']) : '';
        if ($woNumber === '') {
            return [
                'row' => $rowNum,
                'wo_number' => null,
                'status' => 'failed',
                'reason' => 'Missing required wo_number',
            ];
        }

        $property = isset($row['property']) ? trim((string) $row['property']) : '';
        $unitLabel = isset($row['unit']) ? trim((string) $row['unit']) : '';

        if (!isset($row['description_verbatim']) || $row['description_verbatim'] === null) {
            return [
                'row' => $rowNum,
                'wo_number' => $woNumber,
                'status' => 'failed',
                'reason' => 'Missing required description_verbatim',
            ];
        }
        $verbatimText = (string) $row['description_verbatim'];

        // 1. Check deduplication on wo_number (or external_id / seed id)
        $existingTicket = $this->findExistingTicket($woNumber);

        if ($existingTicket !== null) {
            return [
                'row' => $rowNum,
                'wo_number' => $woNumber,
                'status' => 'skipped',
                'reason' => "Work order {$woNumber} already exists (ticket ID {$existingTicket['id']})",
            ];
        }

        // 2. Resolve property
        $building = $this->resolveBuilding($property);
        if ($building === null) {
            return [
                'row' => $rowNum,
                'wo_number' => $woNumber,
                'status' => 'failed',
                'reason' => "Unknown property '{$property}' - could not resolve to verified building roster",
            ];
        }

        // 3. Resolve unit within building
        $unit = $this->resolveUnit((int) $building['id'], $unitLabel);
        if ($unit === null) {
            return [
                'row' => $rowNum,
                'wo_number' => $woNumber,
                'status' => 'failed',
                'reason' => "Unknown unit '{$unitLabel}' in building '{$building['name']}' (ID: {$building['id']})",
            ];
        }

        // 4. Map status
        $rawStatus = isset($row['status']) ? strtolower(trim((string) $row['status'])) : 'closed';
        $status = $this->mapStatus($rawStatus);

        // 5. Map priority
        $rawPriority = isset($row['priority']) ? strtolower(trim((string) $row['priority'])) : 'medium';
        $priority = in_array($rawPriority, ['low', 'medium', 'high', 'urgent'], true) ? $rawPriority : 'medium';

        // 6. Check parent work order
        $parentWoNumber = !empty($row['parent_wo_number']) ? trim((string) $row['parent_wo_number']) : null;
        $parentTicketId = null;
        $unlinkedParent = false;

        if ($parentWoNumber !== null) {
            $parentTicket = $this->findExistingTicket($parentWoNumber);

            if ($parentTicket !== null) {
                $parentTicketId = (int) $parentTicket['id'];
            } else {
                $unlinkedParent = true;
            }
        }

        // Title generation (use first line or truncated verbatim)
        $firstLine = strtok($verbatimText, "\r\n") ?: $verbatimText;
        $title = mb_substr(trim($firstLine), 0, 150);
        if ($title === '') {
            $title = "Past Work Order {$woNumber}";
        }

        $openedDate = !empty($row['opened_date']) ? (string) $row['opened_date'] : null;
        $createdAt = $openedDate ?: gmdate('Y-m-d H:i:s');
        $updatedAt = $createdAt;

        if ($this->isDryRun) {
            return [
                'row' => $rowNum,
                'wo_number' => $woNumber,
                'status' => 'created',
                'building_id' => (int) $building['id'],
                'unit_id' => (int) $unit['id'],
                'ticket_status' => $status,
                'parent_ticket_id' => $parentTicketId,
                'unlinked_parent' => $unlinkedParent,
                'unlinked_parent_wo' => $unlinkedParent ? $parentWoNumber : null,
                'note' => '[DRY-RUN] Would create ticket and import timeline event',
            ];
        }

        // Execute DB write
        $insertSql = 'INSERT INTO ticket (
            wo_number, parent_ticket_id, building_id, unit_id,
            title, description, verbatim_text, status, priority,
            last_seen_in_yardi, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        $insertStmt = $this->pdo->prepare($insertSql);
        $insertStmt->execute([
            $woNumber,
            $parentTicketId,
            (int) $building['id'],
            (int) $unit['id'],
            $title,
            $verbatimText,
            $verbatimText,
            $status,
            $priority,
            $openedDate,
            $createdAt,
            $updatedAt,
        ]);

        $ticketId = (int) $this->pdo->lastInsertId();

        // Append timeline event for past work order import
        $timelineNote = "Imported as past-work-order context from Yardi (WO {$woNumber})";
        if ($unlinkedParent) {
            $timelineNote .= " [Parent WO {$parentWoNumber} not yet in database; imported unlinked]";
        }

        $meta = [
            'wo_number' => $woNumber,
            'source' => 'yardi_past_import',
            'raw_status' => $rawStatus,
            'imported_at' => gmdate('Y-m-d H:i:s'),
            'opened_date' => $openedDate,
            'scheduled_date' => $row['scheduled_date'] ?? null,
            'parent_wo_number' => $parentWoNumber,
            'unlinked_parent' => $unlinkedParent,
        ];

        $now = gmdate('Y-m-d H:i:s');
        $timelineStmt = $this->pdo->prepare(
            'INSERT INTO ticket_timeline (ticket_id, event_type, actor, note, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $timelineStmt->execute([
            $ticketId,
            'note',
            'Importer',
            $timelineNote,
            json_encode($meta),
            $now,
        ]);

        return [
            'row' => $rowNum,
            'wo_number' => $woNumber,
            'status' => 'created',
            'ticket_id' => $ticketId,
            'building_id' => (int) $building['id'],
            'unit_id' => (int) $unit['id'],
            'ticket_status' => $status,
            'parent_ticket_id' => $parentTicketId,
            'unlinked_parent' => $unlinkedParent,
            'unlinked_parent_wo' => $unlinkedParent ? $parentWoNumber : null,
        ];
    }

    /**
     * Find existing ticket by wo_number, external_id, or canonical seed ticket id.
     */
    private function findExistingTicket(string $woNumber): ?array
    {
        // 1. Direct match on wo_number
        $stmt = $this->pdo->prepare('SELECT id, wo_number FROM ticket WHERE wo_number = ? LIMIT 1');
        $stmt->execute([$woNumber]);
        $t = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($t) {
            return $t;
        }

        // 2. Canonical seed ticket mapping for tickets where wo_number is NULL
        // E.g. WO-SEED-2, WO-SEED-3, WO-SEED-4, WO-SEED-5, WO-SEED-6, WO-SEED-10
        if (preg_match('/^WO-SEED-(\d+)$/', $woNumber, $m)) {
            $ticketId = (int) $m[1];
            $stmt = $this->pdo->prepare('SELECT id, wo_number FROM ticket WHERE id = ? LIMIT 1');
            $stmt->execute([$ticketId]);
            $t = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($t) {
                return $t;
            }
        }

        return null;
    }

    /**
     * Map raw status from Yardi to HVACHome status.
     */
    private function mapStatus(string $rawStatus): string
    {
        $normalized = str_replace(['-', ' '], '_', $rawStatus);

        return match ($normalized) {
            'on_hold' => 'on-hold',
            'closed', 'done', 'completed', 'resolved' => 'closed',
            'in_progress' => 'in-progress',
            'blocked' => 'blocked',
            'verified' => 'verified',
            'pending_parts' => 'pending_parts',
            default => 'new',
        };
    }

    /**
     * Resolve building by name, external_id, aliases, or yardi_codes.
     */
    private function resolveBuilding(string $identifier): ?array
    {
        if ($identifier === '') {
            return null;
        }

        // Direct ID match
        if (is_numeric($identifier)) {
            $stmt = $this->pdo->prepare('SELECT id, name FROM building WHERE id = ? LIMIT 1');
            $stmt->execute([(int) $identifier]);
            $b = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($b) {
                return $b;
            }
        }

        // Exact match on external_id or name
        $stmt = $this->pdo->prepare(
            'SELECT id, name FROM building WHERE external_id = ? OR name = ? LIMIT 1'
        );
        $stmt->execute([$identifier, $identifier]);
        $b = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($b) {
            return $b;
        }

        // Case-insensitive match on name or external_id
        $stmt = $this->pdo->prepare(
            'SELECT id, name FROM building WHERE LOWER(external_id) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1'
        );
        $stmt->execute([$identifier, $identifier]);
        $b = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($b) {
            return $b;
        }

        // Search in comma-separated codes / aliases
        $all = $this->pdo->query('SELECT id, name, external_id, external_ids, aliases, yardi_codes FROM building')->fetchAll(PDO::FETCH_ASSOC);
        $cleanSearch = strtolower($identifier);

        foreach ($all as $item) {
            $candidates = [];
            foreach (['external_id', 'external_ids', 'aliases', 'yardi_codes'] as $col) {
                if (!empty($item[$col])) {
                    $parts = explode(',', (string) $item[$col]);
                    foreach ($parts as $p) {
                        $candidates[] = strtolower(trim($p));
                    }
                }
            }
            if (in_array($cleanSearch, $candidates, true)) {
                return ['id' => (int) $item['id'], 'name' => $item['name']];
            }
        }

        return null;
    }

    /**
     * Resolve unit by building_id and unit_number / label.
     */
    private function resolveUnit(int $buildingId, string $unitLabel): ?array
    {
        if ($unitLabel === '') {
            return null;
        }

        // Exact match
        $stmt = $this->pdo->prepare('SELECT id, unit_number FROM unit WHERE building_id = ? AND unit_number = ? LIMIT 1');
        $stmt->execute([$buildingId, $unitLabel]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($u) {
            return $u;
        }

        // Case-insensitive match
        $stmt = $this->pdo->prepare('SELECT id, unit_number FROM unit WHERE building_id = ? AND LOWER(unit_number) = LOWER(?) LIMIT 1');
        $stmt->execute([$buildingId, $unitLabel]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($u) {
            return $u;
        }

        // Match with leading zeroes stripped or added (e.g., '01' vs '1')
        $trimmed = ltrim($unitLabel, '0');
        if ($trimmed !== '' && $trimmed !== $unitLabel) {
            $stmt = $this->pdo->prepare('SELECT id, unit_number FROM unit WHERE building_id = ? AND (unit_number = ? OR unit_number = ?) LIMIT 1');
            $stmt->execute([$buildingId, $trimmed, $unitLabel]);
            $u = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($u) {
                return $u;
            }
        }

        return null;
    }
}

// -------------------------------------------------------------
// CLI Execution Entrypoint
// -------------------------------------------------------------
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    $args = array_slice($argv, 1);
    if (empty($args)) {
        echo "Usage: php cli/import_past_wos.php <batch_json_file> [--dry-run | --run]\n";
        exit(1);
    }

    $filePath = null;
    $isDryRun = true; // default: dry-run

    foreach ($args as $arg) {
        if ($arg === '--run') {
            $isDryRun = false;
        } elseif ($arg === '--dry-run') {
            $isDryRun = true;
        } elseif (!str_starts_with($arg, '--') && $filePath === null) {
            $filePath = $arg;
        }
    }

    if ($filePath === null) {
        echo "Error: Path to JSON batch file is required.\n";
        exit(1);
    }

    try {
        $pdo = Db::get();
        $importer = new PastWoImporter($pdo, $isDryRun);

        $modeLabel = $isDryRun ? 'DRY-RUN (no changes will be written)' : 'LIVE-RUN (writing to database)';
        echo "=== Past Work Order Context Importer ===\n";
        echo "Mode: {$modeLabel}\n";
        echo "File: {$filePath}\n\n";

        $summary = $importer->importFile($filePath);

        echo "--- Per-Row Results ---\n";
        foreach ($summary['details'] as $d) {
            $wo = $d['wo_number'] ?? 'NO_WO';
            $status = strtoupper($d['status']);
            $msg = $d['reason'] ?? ($d['note'] ?? '');
            if (!empty($d['unlinked_parent'])) {
                $msg .= " [UNLINKED PARENT WO {$d['unlinked_parent_wo']}]";
            }
            echo sprintf("Row %-4d | %-16s | %-7s | %s\n", $d['row'], $wo, $status, $msg);
        }

        echo "\n--- Summary ---\n";
        echo "Total Rows:       {$summary['total_rows']}\n";
        echo "Created:          {$summary['created']}\n";
        echo "Skipped:          {$summary['skipped']}\n";
        echo "Failed:           {$summary['failed']}\n";
        echo "Unlinked Parents: {$summary['unlinked_parents']}\n";
        echo "================\n";

        exit($summary['failed'] > 0 ? 2 : 0);
    } catch (Throwable $e) {
        fwrite(STDERR, "[ERROR] " . $e->getMessage() . "\n");
        exit(1);
    }
}
