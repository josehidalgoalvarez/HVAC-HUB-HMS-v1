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
                comments TEXT NULL,
                image_url TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS unit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                building_id INTEGER NOT NULL,
                unit_number TEXT NOT NULL,
                floor TEXT NULL,
                bedrooms INTEGER NULL,
                washrooms INTEGER NULL,
                storeys INTEGER NULL,
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
                exterior_work INTEGER NOT NULL DEFAULT 0,
                work_exposure TEXT NOT NULL DEFAULT 'indoor',
                weather_note TEXT NULL,
                notice_needed INTEGER NOT NULL DEFAULT 0,
                notice_sent_at TEXT NULL,
                notice_confirmed_by TEXT NULL,
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
                url TEXT NULL,
                file_size_bytes INTEGER NULL,
                mime_type TEXT NULL,
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
                handed_off_at TEXT NULL,
                handed_off_to TEXT NULL,
                sent_at TEXT NULL,
                scheduled_at TEXT NULL,
                served_at TEXT NULL,
                verified_at TEXT NULL,
                served_method TEXT NULL,
                verified_by_user_id INTEGER NULL,
                created_by INTEGER NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS run_sheet (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tech_id INTEGER NOT NULL,
                title TEXT NULL,
                run_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                route_order TEXT NULL,
                notes TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS run_sheet_block (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_sheet_id INTEGER NOT NULL,
                ticket_id INTEGER NULL,
                building_id INTEGER NULL,
                unit_id INTEGER NULL,
                title TEXT NOT NULL,
                notes TEXT NULL,
                sort_order INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'pending',
                start_time TEXT NULL,
                end_time TEXT NULL,
                estimated_minutes INTEGER NOT NULL DEFAULT 45,
                actual_minutes INTEGER NULL,
                required_tools TEXT NULL,
                required_parts TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS job (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NULL,
                run_sheet_block_id INTEGER NULL,
                building_id INTEGER NULL,
                unit_id INTEGER NULL,
                tech_id INTEGER NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'in_progress',
                start_time TEXT NULL,
                end_time TEXT NULL,
                estimated_minutes INTEGER NOT NULL DEFAULT 45,
                actual_minutes INTEGER NULL,
                notes TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS job_part (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                part_name TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 1.0,
                unit TEXT NOT NULL DEFAULT 'pcs',
                notes TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS job_note (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                tech_id INTEGER NULL,
                note_text TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS supplier (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact_name TEXT NULL,
                phone TEXT NULL,
                email TEXT NULL,
                address TEXT NULL,
                hours TEXT NULL,
                account_number TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS stockpile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                building_id INTEGER NULL,
                notes TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS part (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                part_number TEXT NULL,
                category TEXT NULL,
                description TEXT NULL,
                quantity_on_hand INTEGER NOT NULL DEFAULT 0,
                min_quantity INTEGER NOT NULL DEFAULT 1,
                reorder_point INTEGER NOT NULL DEFAULT 1,
                unit_cost REAL NULL,
                compatible_models TEXT NULL,
                price_history TEXT NULL,
                stockpile_id INTEGER NULL,
                preferred_supplier_id INTEGER NULL,
                is_reorder INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS part_stockpile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                part_id INTEGER NOT NULL,
                stockpile_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'available',
                location_notes TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS ticket_part (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                part_id INTEGER NULL,
                part_number TEXT NULL,
                part_name TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS watch (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NULL,
                watch_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NULL,
                target_type TEXT NULL,
                target_id INTEGER NULL,
                state TEXT NOT NULL DEFAULT 'active',
                config TEXT NULL,
                snoozed_until TEXT NULL,
                last_evaluated_at TEXT NULL,
                last_triggered_at TEXT NULL,
                acknowledged_at TEXT NULL,
                resolved_at TEXT NULL,
                latest_trigger_reason TEXT NULL,
                latest_trigger_data TEXT NULL,
                quiet_hours_delayed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        ");

        try {
            $pdo->exec("ALTER TABLE building ADD COLUMN comments TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE unit ADD COLUMN comments TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE job ADD COLUMN room TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE notice ADD COLUMN handed_off_at TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE notice ADD COLUMN scheduled_at TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE notice ADD COLUMN handed_off_to TEXT NULL");
        } catch (\Throwable) {}

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS appliance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id TEXT NOT NULL,
                building_id INTEGER NULL,
                unit_id INTEGER NULL,
                name TEXT NOT NULL,
                brand TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT NULL,
                status TEXT NOT NULL DEFAULT 'operational',
                last_service TEXT NULL,
                model_number TEXT NULL,
                serial_number TEXT NULL,
                room TEXT NULL,
                unit_number TEXT NULL,
                location TEXT NULL,
                image_url TEXT NULL,
                rating_plate_url TEXT NULL,
                manual_url TEXT NULL,
                warranty_url TEXT NULL,
                installation_url TEXT NULL,
                notes TEXT NULL,
                specs TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        ");

        try {
            $pdo->exec("ALTER TABLE run_sheet ADD COLUMN title TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE photo ADD COLUMN file_size_bytes INTEGER NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE photo ADD COLUMN mime_type TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE ticket ADD COLUMN exterior_work INTEGER NOT NULL DEFAULT 0");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE ticket ADD COLUMN weather_note TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE ticket ADD COLUMN work_exposure TEXT NOT NULL DEFAULT 'indoor'");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE ticket ADD COLUMN notice_needed INTEGER NOT NULL DEFAULT 0");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE ticket ADD COLUMN notice_sent_at TEXT NULL");
        } catch (\Throwable) {}

        try {
            $pdo->exec("ALTER TABLE ticket ADD COLUMN notice_confirmed_by TEXT NULL");
        } catch (\Throwable) {}

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS complex (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NULL,
                address TEXT NULL,
                building_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        ");

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS complexes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                notes TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS default_sets (
                id TEXT PRIMARY KEY,
                complex_slug TEXT NOT NULL,
                complex_id INTEGER NULL,
                name TEXT NOT NULL,
                unit_type TEXT NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 0,
                bedrooms INTEGER NULL,
                bathrooms INTEGER NULL,
                stories INTEGER NULL,
                has_unit_water_heater INTEGER NOT NULL DEFAULT 0,
                appliances_json TEXT NOT NULL,
                notes TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        ");

        try { $pdo->exec("ALTER TABLE building ADD COLUMN complex_id TEXT NULL"); } catch (\Throwable) {}
        try { $pdo->exec("ALTER TABLE building ADD COLUMN cluster_id TEXT NULL"); } catch (\Throwable) {}
        try { $pdo->exec("ALTER TABLE building ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"); } catch (\Throwable) {}
        try { $pdo->exec("ALTER TABLE building ADD COLUMN is_3d_ready INTEGER NOT NULL DEFAULT 0"); } catch (\Throwable) {}
        try { $pdo->exec("ALTER TABLE unit ADD COLUMN bedrooms INTEGER NULL"); } catch (\Throwable) {}
        try { $pdo->exec("ALTER TABLE unit ADD COLUMN washrooms INTEGER NULL"); } catch (\Throwable) {}
        try { $pdo->exec("ALTER TABLE unit ADD COLUMN storeys INTEGER NULL"); } catch (\Throwable) {}
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
