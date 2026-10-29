<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use InvalidArgumentException;
use RuntimeException;

/**
 * BuyListItem Model
 * Manages manual items added to the Buy List.
 * Persisted globally on the server so all devices see the shared operational buy list.
 */
class BuyListItem
{
    /**
     * List all manual buy list items, newest first.
     */
    public static function findAll(): array
    {
        $sql = "SELECT id, part_name, quantity, part_number, supplier, notes, ticket_id, created_at, updated_at
                FROM buy_list_item
                ORDER BY created_at DESC, id DESC";

        $rows = Db::fetchAll($sql);
        return array_map([self::class, 'formatRow'], $rows);
    }

    /**
     * Find a single manual buy item by ID.
     */
    public static function findById(int $id): ?array
    {
        $sql = "SELECT id, part_name, quantity, part_number, supplier, notes, ticket_id, created_at, updated_at
                FROM buy_list_item
                WHERE id = ?
                LIMIT 1";

        $row = Db::fetchOne($sql, [$id]);
        return $row ? self::formatRow($row) : null;
    }

    /**
     * Create a new manual buy item.
     * Validates:
     * - part_name: required, non-empty
     * - quantity: required, positive integer (> 0)
     * - ticket_id: optional, but if provided must reference an existing ticket
     */
    public static function create(array $data): array
    {
        $partName = trim((string) ($data['part_name'] ?? ''));
        if ($partName === '') {
            throw new InvalidArgumentException('Part name is required');
        }

        if (!isset($data['quantity']) || $data['quantity'] === '' || $data['quantity'] === null) {
            throw new InvalidArgumentException('Quantity is required');
        }

        $rawQty = $data['quantity'];
        if (!is_numeric($rawQty) || (int) $rawQty <= 0) {
            throw new InvalidArgumentException('Quantity must be greater than zero');
        }
        $quantity = (int) $rawQty;

        $partNumber = isset($data['part_number']) && trim((string) $data['part_number']) !== ''
            ? trim((string) $data['part_number'])
            : null;

        $supplier = isset($data['supplier']) && trim((string) $data['supplier']) !== ''
            ? trim((string) $data['supplier'])
            : null;

        $notes = isset($data['notes']) && trim((string) $data['notes']) !== ''
            ? trim((string) $data['notes'])
            : null;

        $ticketId = null;
        if (isset($data['ticket_id']) && $data['ticket_id'] !== '' && $data['ticket_id'] !== null) {
            $rawTicketId = (int) $data['ticket_id'];
            if ($rawTicketId <= 0) {
                throw new InvalidArgumentException('Invalid ticket ID');
            }

            // Verify ticket exists
            $ticket = Db::fetchOne("SELECT id FROM ticket WHERE id = ?", [$rawTicketId]);
            if (!$ticket) {
                throw new InvalidArgumentException("Ticket #{$rawTicketId} does not exist");
            }
            $ticketId = $rawTicketId;
        }

        $now = gmdate('Y-m-d H:i:s');
        Db::execute(
            "INSERT INTO buy_list_item (part_name, quantity, part_number, supplier, notes, ticket_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [$partName, $quantity, $partNumber, $supplier, $notes, $ticketId, $now, $now]
        );

        $newId = (int) Db::lastInsertId();
        $created = self::findById($newId);
        if (!$created) {
            throw new RuntimeException("Failed to retrieve created buy list item #{$newId}");
        }

        return $created;
    }

    /**
     * Delete a manual buy item by ID.
     * Returns true if deleted, false if not found.
     */
    public static function delete(int $id): bool
    {
        $existing = self::findById($id);
        if (!$existing) {
            return false;
        }

        Db::execute("DELETE FROM buy_list_item WHERE id = ?", [$id]);
        return true;
    }

    /**
     * Helper to format database row into strongly typed domain array.
     */
    private static function formatRow(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'part_name' => (string) $row['part_name'],
            'quantity' => (int) $row['quantity'],
            'part_number' => $row['part_number'] !== null ? (string) $row['part_number'] : null,
            'supplier' => $row['supplier'] !== null ? (string) $row['supplier'] : null,
            'notes' => $row['notes'] !== null ? (string) $row['notes'] : null,
            'ticket_id' => $row['ticket_id'] !== null ? (int) $row['ticket_id'] : null,
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ];
    }
}
