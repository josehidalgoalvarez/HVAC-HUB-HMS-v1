<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;

$passes = [];
$failures = [];

function assertTest(bool $condition, string $description, array &$passes, array &$failures): void {
    if ($condition) {
        $passes[] = $description;
        echo "[PASS] {$description}\n";
    } else {
        $failures[] = $description;
        echo "[FAIL] {$description}\n";
    }
}

echo "=== Running SQLite Schema Parity Verification (044/045) ===\n\n";

$tmpDb = sys_get_temp_dir() . '/hvachome_schema_verify_' . uniqid('', true) . '.sqlite';

try {
    $pdo = new PDO('sqlite:' . $tmpDb, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // -------------------------------------------------------------
    // 1. Initial Bootstrap Execution
    // -------------------------------------------------------------
    echo "--- 1. Initial Bootstrap Execution ---\n";
    Db::ensureSqliteSchema($pdo);
    assertTest(file_exists($tmpDb), "1.1 Throwaway SQLite file created and schema bootstrapped", $passes, $failures);

    // -------------------------------------------------------------
    // 2. buy_list_item Schema & Column Verification
    // -------------------------------------------------------------
    echo "\n--- 2. buy_list_item Schema Verification ---\n";
    $tableExists = (int)$pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'buy_list_item'")->fetchColumn();
    assertTest($tableExists === 1, "2.1 Table 'buy_list_item' exists in sqlite_master", $passes, $failures);

    $rawCols = $pdo->query("PRAGMA table_info(buy_list_item)")->fetchAll(PDO::FETCH_ASSOC);
    $cols = [];
    foreach ($rawCols as $c) {
        $cols[$c['name']] = $c;
    }

    assertTest(isset($cols['id']) && (int)$cols['id']['pk'] === 1, "2.2 Column 'id' is primary key", $passes, $failures);
    assertTest(isset($cols['part_name']) && (int)$cols['part_name']['notnull'] === 1, "2.3 Column 'part_name' is NOT NULL", $passes, $failures);
    assertTest(isset($cols['quantity']) && (int)$cols['quantity']['notnull'] === 1, "2.4 Column 'quantity' is NOT NULL", $passes, $failures);
    assertTest(isset($cols['part_number']) && (int)$cols['part_number']['notnull'] === 0, "2.5 Column 'part_number' is NULL", $passes, $failures);
    assertTest(isset($cols['supplier']) && (int)$cols['supplier']['notnull'] === 0, "2.6 Column 'supplier' is NULL", $passes, $failures);
    assertTest(isset($cols['notes']) && (int)$cols['notes']['notnull'] === 0, "2.7 Column 'notes' is NULL", $passes, $failures);
    assertTest(isset($cols['ticket_id']) && (int)$cols['ticket_id']['notnull'] === 0, "2.8 Column 'ticket_id' is NULL", $passes, $failures);
    assertTest(isset($cols['created_at']) && str_contains((string)$cols['created_at']['dflt_value'], 'CURRENT_TIMESTAMP'), "2.9 Column 'created_at' has DEFAULT CURRENT_TIMESTAMP", $passes, $failures);
    assertTest(isset($cols['updated_at']) && str_contains((string)$cols['updated_at']['dflt_value'], 'CURRENT_TIMESTAMP'), "2.10 Column 'updated_at' has DEFAULT CURRENT_TIMESTAMP", $passes, $failures);

    $fks = $pdo->query("PRAGMA foreign_key_list(buy_list_item)")->fetchAll(PDO::FETCH_ASSOC);
    assertTest(count($fks) === 0, "2.11 Table 'buy_list_item' has NO foreign key constraints (matches 044 deliberate orphan safety)", $passes, $failures);

    // -------------------------------------------------------------
    // 3. equipment Schema & Column Verification
    // -------------------------------------------------------------
    echo "\n--- 3. equipment Schema Verification ---\n";
    $tableExists = (int)$pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'equipment'")->fetchColumn();
    assertTest($tableExists === 1, "3.1 Table 'equipment' exists in sqlite_master", $passes, $failures);

    $rawCols = $pdo->query("PRAGMA table_info(equipment)")->fetchAll(PDO::FETCH_ASSOC);
    $cols = [];
    foreach ($rawCols as $c) {
        $cols[$c['name']] = $c;
    }

    assertTest(isset($cols['id']) && (int)$cols['id']['pk'] === 1, "3.2 Column 'id' is primary key", $passes, $failures);
    assertTest(isset($cols['name']) && (int)$cols['name']['notnull'] === 1, "3.3 Column 'name' is NOT NULL", $passes, $failures);
    assertTest(isset($cols['category']) && (int)$cols['category']['notnull'] === 0, "3.4 Column 'category' is NULL", $passes, $failures);
    assertTest(isset($cols['stockpile_id']) && (int)$cols['stockpile_id']['notnull'] === 0, "3.5 Column 'stockpile_id' is NULL", $passes, $failures);
    assertTest(isset($cols['status']) && (int)$cols['status']['notnull'] === 1 && str_contains((string)$cols['status']['dflt_value'], 'unknown'), "3.6 Column 'status' is NOT NULL DEFAULT 'unknown'", $passes, $failures);
    assertTest(isset($cols['notes']) && (int)$cols['notes']['notnull'] === 0, "3.7 Column 'notes' is NULL", $passes, $failures);
    assertTest(isset($cols['created_at']) && str_contains((string)$cols['created_at']['dflt_value'], 'CURRENT_TIMESTAMP'), "3.8 Column 'created_at' has DEFAULT CURRENT_TIMESTAMP", $passes, $failures);
    assertTest(isset($cols['updated_at']) && str_contains((string)$cols['updated_at']['dflt_value'], 'CURRENT_TIMESTAMP'), "3.9 Column 'updated_at' has DEFAULT CURRENT_TIMESTAMP", $passes, $failures);

    $eqSql = (string)$pdo->query("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'equipment'")->fetchColumn();
    $hasCheck = (bool)preg_match("/CHECK\s*\(\s*status\s+IN\s*\(\s*'available'\s*,\s*'needs_service'\s*,\s*'out_of_service'\s*,\s*'unknown'\s*\)\s*\)/i", $eqSql);
    assertTest($hasCheck, "3.10 Table 'equipment' enforces CHECK constraint on status ('available', 'needs_service', 'out_of_service', 'unknown')", $passes, $failures);

    // -------------------------------------------------------------
    // 4. Data Operations & Constraint Behavior
    // -------------------------------------------------------------
    echo "\n--- 4. Data Operations & Constraint Behavior ---\n";
    $pdo->exec("INSERT INTO buy_list_item (part_name, quantity, part_number, supplier, notes, ticket_id) VALUES ('Capacitor 45/5', 3, 'CAP-455', 'Johnstone Supply', 'Verify microfarads', 105)");
    $buyItemId = (int)$pdo->lastInsertId();
    $buyRow = $pdo->query("SELECT * FROM buy_list_item WHERE id = {$buyItemId}")->fetch(PDO::FETCH_ASSOC);
    assertTest($buyRow !== false && $buyRow['part_name'] === 'Capacitor 45/5' && (int)$buyRow['quantity'] === 3, "4.1 Valid buy_list_item row inserted and retrieved", $passes, $failures);

    $pdo->exec("INSERT INTO equipment (name, category, stockpile_id, status, notes) VALUES ('Vacuum Pump', 'HVAC Tools', 1, 'available', 'Robinair 15500')");
    $eqItemId = (int)$pdo->lastInsertId();
    $eqRow = $pdo->query("SELECT * FROM equipment WHERE id = {$eqItemId}")->fetch(PDO::FETCH_ASSOC);
    assertTest($eqRow !== false && $eqRow['name'] === 'Vacuum Pump' && $eqRow['status'] === 'available', "4.2 Valid equipment row with status 'available' inserted and retrieved", $passes, $failures);

    $checkRejected = false;
    try {
        $pdo->exec("INSERT INTO equipment (name, status) VALUES ('Broken Gauge Set', 'broken')");
    } catch (Throwable $e) {
        $checkRejected = true;
    }
    assertTest($checkRejected, "4.3 CHECK constraint rejects invalid equipment status ('broken')", $passes, $failures);

    // -------------------------------------------------------------
    // 5. Bootstrap Idempotency Verification
    // -------------------------------------------------------------
    echo "\n--- 5. Bootstrap Idempotency Verification ---\n";
    $secondBootstrapError = null;
    try {
        Db::ensureSqliteSchema($pdo);
    } catch (Throwable $e) {
        $secondBootstrapError = $e->getMessage();
    }
    assertTest($secondBootstrapError === null, "5.1 Second ensureSqliteSchema run completes with zero errors", $passes, $failures);

    $buyCountAfter = (int)$pdo->query("SELECT COUNT(*) FROM buy_list_item")->fetchColumn();
    $eqCountAfter = (int)$pdo->query("SELECT COUNT(*) FROM equipment")->fetchColumn();
    assertTest($buyCountAfter === 1, "5.2 buy_list_item data survived second bootstrap run without loss", $passes, $failures);
    assertTest($eqCountAfter === 1, "5.3 equipment data survived second bootstrap run without loss", $passes, $failures);

} finally {
    unset($pdo);
    if (file_exists($tmpDb)) {
        @unlink($tmpDb);
    }
}

// -------------------------------------------------------------
// Final Summary
// -------------------------------------------------------------
echo "\n=== Summary ===\n";
echo "Total Passes: " . count($passes) . "\n";
echo "Total Failures: " . count($failures) . "\n";

if (count($failures) > 0) {
    echo "\nFailed Tests:\n";
    foreach ($failures as $f) {
        echo " - {$f}\n";
    }
    exit(1);
}

echo "\nAll SQLite schema verification tests PASSED!\n";
exit(0);
