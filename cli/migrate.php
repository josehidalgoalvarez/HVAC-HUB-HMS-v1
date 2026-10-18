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

    // Create migrations tracker table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `_migrations` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `migration` VARCHAR(255) NOT NULL UNIQUE,
            `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

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
