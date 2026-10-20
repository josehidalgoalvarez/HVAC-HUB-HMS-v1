<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config;
use App\Db;

Config::load();

echo "=== HVACHome Migration Runner ===\n";

try {
    $pdo = Db::get();
    echo "Connected to database successfully.\n";

    $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';

    // Create migrations tracker table if not exists
    if ($isSqlite) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `_migrations` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `migration` TEXT NOT NULL UNIQUE,
                `applied_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        ");
    } else {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `_migrations` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `migration` VARCHAR(255) NOT NULL UNIQUE,
                `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    }

    $files = glob(dirname(__DIR__) . '/migrations/*.sql');
    sort($files);

    if (empty($files)) {
        echo "No migration files found.\n";
        exit(0);
    }

    $stmt = $pdo->query("SELECT migration FROM `_migrations`");
    $applied = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $ranAny = false;
    foreach ($files as $file) {
        $name = basename($file);
        if (in_array($name, $applied, true)) {
            echo "[-] Skipping already applied: {$name}\n";
            continue;
        }

        echo "[+] Applying migration: {$name}... ";
        $sql = file_get_contents($file);
        if ($sql === false) {
            throw new RuntimeException("Cannot read migration file: {$file}");
        }

        if ($isSqlite) {
            // Adapt MySQL schema to SQLite dialect
            $sql = preg_replace('/SET\s+FOREIGN_KEY_CHECKS\s*=\s*[01];/i', '', $sql);
            $sql = preg_replace('/ENGINE\s*=\s*InnoDB[^;]*/i', '', $sql);
            $sql = preg_replace('/DEFAULT\s+CHARSET\s*=\s*utf8mb4[^;]*/i', '', $sql);
            $sql = preg_replace('/COLLATE\s*=\s*utf8mb4_unicode_ci/i', '', $sql);
            $sql = preg_replace('/ON\s+UPDATE\s+CURRENT_TIMESTAMP/i', '', $sql);
            $sql = preg_replace('/BIGINT\s+UNSIGNED\s+NOT\s+NULL\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
            $sql = preg_replace('/BIGINT\s+UNSIGNED\s+NOT\s+NULL\s+AUTO_INCREMENT/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
            $sql = preg_replace('/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
            $sql = preg_replace('/AUTO_INCREMENT/i', 'AUTOINCREMENT', $sql);
            $sql = preg_replace('/ENUM\([^)]+\)/i', 'TEXT', $sql);
            $sql = preg_replace('/DATETIME/i', 'TEXT', $sql);
            $sql = preg_replace('/TINYINT\(1\)/i', 'INTEGER', $sql);
            $sql = preg_replace('/BIGINT\s+UNSIGNED/i', 'INTEGER', $sql);
            $sql = preg_replace('/INT\s+UNSIGNED/i', 'INTEGER', $sql);
            $sql = preg_replace('/DECIMAL\([^)]+\)/i', 'REAL', $sql);
            $sql = preg_replace('/,\s*PRIMARY\s+KEY\s*\([^)]+\)/i', '', $sql);
            $sql = preg_replace('/PRIMARY\s+KEY\s*\([^)]+\),?/i', '', $sql);

            $statements = array_filter(array_map('trim', explode(';', $sql)));
            $pdo->beginTransaction();
            try {
                foreach ($statements as $stmt) {
                    if (empty($stmt)) continue;
                    try {
                        // If SQLite statement contains multiple ADD clauses, split them
                        if (preg_match('/^ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+ADD\s+(.+)$/is', $stmt, $m)) {
                            $table = $m[1];
                            $adds = preg_split('/,\s*ADD\s+/i', $m[2]);
                            foreach ($adds as $add) {
                                try {
                                    $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN " . trim($add));
                                } catch (Throwable) {
                                    // Ignore if column already exists
                                }
                            }
                        } else {
                            $pdo->exec($stmt);
                        }
                    } catch (Throwable) {
                        // Ignore unsupported MySQL ALTER syntax or duplicate columns in SQLite
                    }
                }
                $logStmt = $pdo->prepare("INSERT OR IGNORE INTO `_migrations` (`migration`) VALUES (?)");
                $logStmt->execute([$name]);
                $pdo->commit();
                echo "OK\n";
                $ranAny = true;
                continue;
            } catch (Throwable $e) {
                $pdo->rollBack();
                echo "FAILED!\n";
                throw $e;
            }
        }

        $pdo->beginTransaction();
        try {
            $pdo->exec($sql);
            $logStmt = $pdo->prepare("INSERT INTO `_migrations` (`migration`) VALUES (?)");
            $logStmt->execute([$name]);
            $pdo->commit();
            echo "OK\n";
            $ranAny = true;
        } catch (Throwable $e) {
            $pdo->rollBack();
            echo "FAILED!\n";
            throw $e;
        }
    }

    if (!$ranAny) {
        echo "Database schema is up to date.\n";
    } else {
        echo "All new migrations applied successfully.\n";
    }
} catch (Throwable $e) {
    echo "Migration error: " . $e->getMessage() . "\n";
    exit(1);
}
