<?php

declare(strict_types=1);

namespace App;

use PDO;
use PDOException;
use RuntimeException;

/**
 * PDO database wrapper enforcing prepared statements and append-only constraints.
 */
class Db
{
    private static ?PDO $pdo = null;

    public static function get(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $host = (string) Config::get('db.host', '127.0.0.1');
        $port = (int) Config::get('db.port', 3306);
        $database = (string) Config::get('db.database', 'hvachome');
        $username = (string) Config::get('db.username', 'root');
        $password = (string) Config::get('db.password', '');
        $charset = (string) Config::get('db.charset', 'utf8mb4');

        $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        try {
            self::$pdo = new PDO($dsn, $username, $password, $options);
        } catch (PDOException $e) {
            throw new RuntimeException("Database connection failed: " . $e->getMessage(), (int) $e->getCode(), $e);
        }

        return self::$pdo;
    }

    /**
     * Set a custom PDO instance (useful for testing or SQLite test harness).
     */
    public static function setPdo(?PDO $pdo): void
    {
        self::$pdo = $pdo;
    }

    /**
     * Guardrail against modifying or deleting from append-only tables.
     */
    public static function assertAppendOnlySafe(string $sql): void
    {
        if (preg_match('/\b(update\s+[`"]?correction[`"]?|delete(\s+from)?\s+[`"]?correction[`"]?)\b/i', $sql)) {
            throw new RuntimeException("Table 'correction' is append-only. UPDATE and DELETE operations are forbidden.");
        }
    }

    /**
     * Execute a prepared query safely with bound parameters.
     */
    public static function query(string $sql, array $params = []): \PDOStatement
    {
        self::assertAppendOnlySafe($sql);
        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /**
     * Fetch all rows matching a prepared query.
     */
    public static function fetchAll(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }

    /**
     * Fetch a single row matching a prepared query.
     */
    public static function fetchOne(string $sql, array $params = []): ?array
    {
        $res = self::query($sql, $params)->fetch();
        return $res === false ? null : $res;
    }

    /**
     * Execute an INSERT / UPDATE / DELETE statement and return affected rows.
     */
    public static function execute(string $sql, array $params = []): int
    {
        return self::query($sql, $params)->rowCount();
    }

    /**
     * Return the last inserted ID.
     */
    public static function lastInsertId(): string
    {
        return self::get()->lastInsertId();
    }
}
