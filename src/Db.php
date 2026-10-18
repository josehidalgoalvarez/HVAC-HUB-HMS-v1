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

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        $connection = (string) Config::get('db.connection', 'mysql');
        $database = (string) Config::get('db.database', 'hvachome');

        if ($connection === 'sqlite' || str_ends_with($database, '.sqlite') || str_ends_with($database, '.db') || $database === ':memory:') {
            $sqlitePath = $database === ':memory:' ? ':memory:' : (str_starts_with($database, '/') ? $database : dirname(__DIR__) . '/' . $database);
            try {
                self::$pdo = new PDO("sqlite:{$sqlitePath}", null, null, $options);
                self::$pdo->exec('PRAGMA foreign_keys = ON;');
                self::ensureSqliteSchema(self::$pdo);
                return self::$pdo;
            } catch (PDOException $e) {
                throw new RuntimeException("SQLite connection failed: " . $e->getMessage(), (int) $e->getCode(), $e);
            }
        }

        $host = (string) Config::get('db.host', '127.0.0.1');
        $port = (int) Config::get('db.port', 3306);
        $username = (string) Config::get('db.username', 'root');
        $password = (string) Config::get('db.password', '');
        $charset = (string) Config::get('db.charset', 'utf8mb4');

        $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";

        try {
            self::$pdo = new PDO($dsn, $username, $password, $options);
        } catch (PDOException $e) {
            if (!Config::isProduction()) {
                $devSqlite = dirname(__DIR__) . '/hvachome_dev.sqlite';
                self::$pdo = new PDO("sqlite:{$devSqlite}", null, null, $options);
                self::$pdo->exec('PRAGMA foreign_keys = ON;');
                self::ensureSqliteSchema(self::$pdo);
                return self::$pdo;
            }
            throw new RuntimeException("Database connection failed: " . $e->getMessage(), (int) $e->getCode(), $e);
        }

        return self::$pdo;
    }

    public static function ensureSqliteSchema(PDO $pdo): void
    {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'tech',
                api_token TEXT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS building (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                image_url TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS unit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                building_id INTEGER NOT NULL,
                unit_number TEXT NOT NULL,
                floor TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS ticket (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wo_number TEXT NULL,
                parent_ticket_id INTEGER NULL,
                building_id INTEGER NOT NULL,
                unit_id INTEGER NULL,
                title TEXT NOT NULL,
                description TEXT NULL,
                verbatim_text TEXT NULL,
                verified_scope TEXT NULL,
                photo_url TEXT NULL,
                status TEXT NOT NULL DEFAULT 'new',
                priority TEXT NOT NULL DEFAULT 'medium',
                blocker_reason TEXT NULL,
                last_seen_in_yardi TEXT NULL,
                created_by_user_id INTEGER NULL,
                assigned_tech_id INTEGER NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS correction (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                old_value TEXT NULL,
                new_value TEXT NULL,
                changed_by_user_id INTEGER NULL,
                reason TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS yardi_sightings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NULL,
                wo_number TEXT NOT NULL,
                unit_raw TEXT NULL,
                description TEXT NULL,
                status TEXT NULL,
                sighted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                payload TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS photo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                url TEXT NOT NULL,
                caption TEXT NULL,
                taken_by_user_id INTEGER NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS notice (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NULL,
                building_id INTEGER NOT NULL,
                unit_id INTEGER NULL,
                title TEXT NOT NULL,
                content TEXT NULL,
                notice_type TEXT NOT NULL DEFAULT 'entry',
                status TEXT NOT NULL DEFAULT 'drafted',
                entry_date TEXT NULL,
                entry_start TEXT NULL,
                entry_end TEXT NULL,
                serve_by_deadline TEXT NULL,
                drafted_at TEXT NULL,
                sent_at TEXT NULL,
                served_at TEXT NULL,
                verified_at TEXT NULL,
                served_method TEXT NULL,
                verified_by_user_id INTEGER NULL,
                created_by INTEGER NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        ");
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
