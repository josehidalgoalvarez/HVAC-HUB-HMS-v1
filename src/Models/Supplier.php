<?php

declare(strict_types=1);

namespace App\Models;

use App\Db;
use RuntimeException;

/**
 * Supplier Model
 * Manages supply house vendors, ordering phone contacts, and operating hours.
 */
class Supplier
{
    public static function findAll(): array
    {
        $sql = "SELECT s.*,
                       (SELECT COUNT(*) FROM part p WHERE p.preferred_supplier_id = s.id) AS supplied_parts_count
                FROM supplier s
                ORDER BY s.name ASC";

        return Db::fetchAll($sql);
    }

    public static function findById(int $id): ?array
    {
        $sql = "SELECT s.* FROM supplier s WHERE s.id = ? LIMIT 1";
        return Db::fetchOne($sql, [$id]);
    }

    public static function create(array $data): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new RuntimeException('Supplier name is required');
        }

        $contactName = $data['contact_name'] ?? null;
        $phone = $data['phone'] ?? null;
        $email = $data['email'] ?? null;
        $address = $data['address'] ?? null;
        $hours = $data['hours'] ?? null;
        $accountNumber = $data['account_number'] ?? null;

        Db::execute(
            'INSERT INTO supplier (name, contact_name, phone, email, address, hours, account_number, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [$name, $contactName, $phone, $email, $address, $hours, $accountNumber]
        );
        $id = (int) Db::lastInsertId();

        return self::findById($id) ?? [];
    }

    public static function update(int $id, array $data): array
    {
        $current = self::findById($id);
        if ($current === null) {
            throw new RuntimeException("Supplier #{$id} not found");
        }

        $fields = ['name', 'contact_name', 'phone', 'email', 'address', 'hours', 'account_number'];
        $updates = [];
        $params = [];

        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $updates[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }

        if (!empty($updates)) {
            $updates[] = "updated_at = CURRENT_TIMESTAMP";
            $params[] = $id;
            Db::execute('UPDATE supplier SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);
        }

        return self::findById($id) ?? [];
    }
}
