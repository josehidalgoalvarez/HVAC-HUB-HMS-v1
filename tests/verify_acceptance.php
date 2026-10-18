<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Auth;
use App\Config;
use App\Db;

$failures = [];
$passes = [];

function assertTest(bool $condition, string $description, array &$passes, array &$failures): void {
    if ($condition) {
        $passes[] = $description;
        echo "[PASS] {$description}\n";
    } else {
        $failures[] = $description;
        echo "[FAIL] {$description}\n";
    }
}

echo "=== Running Acceptance Tests for Phase 0 (0.1–0.3) ===\n\n";

// --- 0.1 Cleanup Tests ---
echo "--- 0.1 Cleanup Verification ---\n";
$packageJson = json_decode(file_get_contents(__DIR__ . '/../package.json'), true);
$hasGenAiDep = isset($packageJson['dependencies']['@google/genai']) || isset($packageJson['devDependencies']['@google/genai']);
assertTest(!$hasGenAiDep, "0.1.1 @google/genai is removed from package.json", $passes, $failures);

$packageLock = file_get_contents(__DIR__ . '/../package-lock.json');
assertTest(!str_contains($packageLock, '"@google/genai"'), "0.1.2 @google/genai is removed from package-lock.json", $passes, $failures);

$indexHtml = file_get_contents(__DIR__ . '/../index.html');
assertTest(!str_contains($indexHtml, '@google/genai'), "0.1.3 @google/genai is removed from index.html importmap", $passes, $failures);

$useStoreExists = file_exists(__DIR__ . '/../hooks/useStore.ts');
assertTest(!$useStoreExists, "0.1.4 hooks/useStore.ts is deleted", $passes, $failures);

$movedFiles = [
    'sync_data.js',
    'full_documentation.md',
    'final_code_analysis.md',
    'deployment_options.md',
];
$allMoved = true;
foreach ($movedFiles as $file) {
    if (file_exists(__DIR__ . "/../{$file}") || !file_exists(__DIR__ . "/../docs/v1-reference/{$file}")) {
        $allMoved = false;
        break;
    }
}
assertTest($allMoved, "0.1.5 Reference docs moved into docs/v1-reference/ and removed from root", $passes, $failures);

// --- 0.2 Slim 4 API Skeleton Tests ---
echo "\n--- 0.2 Slim 4 API Skeleton Verification ---\n";
assertTest(class_exists('\Slim\App'), "0.2.1 Slim 4 framework class loaded", $passes, $failures);
assertTest(class_exists('\Slim\Psr7\Response'), "0.2.2 Slim PSR-7 package loaded", $passes, $failures);
assertTest(file_exists(__DIR__ . '/../public/index.php'), "0.2.3 public/index.php exists", $passes, $failures);
assertTest(file_exists(__DIR__ . '/../public/.htaccess'), "0.2.4 public/.htaccess exists", $passes, $failures);
assertTest(file_exists(__DIR__ . '/../src/Config.php'), "0.2.5 src/Config.php exists", $passes, $failures);
assertTest(file_exists(__DIR__ . '/../src/Db.php'), "0.2.6 src/Db.php exists", $passes, $failures);
assertTest(file_exists(__DIR__ . '/../src/Auth.php'), "0.2.7 src/Auth.php exists", $passes, $failures);
assertTest(file_exists(__DIR__ . '/../src/Routes.php'), "0.2.8 src/Routes.php exists", $passes, $failures);

// Test Auth bearer extraction and validation
$techUser = Auth::authenticate('test-tech-token');
assertTest($techUser !== null && $techUser['role'] === Auth::ROLE_TECH, "0.2.9 Auth accepts valid tech token", $passes, $failures);

$mgmtUser = Auth::authenticate('test-management-token');
assertTest($mgmtUser !== null && $mgmtUser['role'] === Auth::ROLE_MANAGEMENT, "0.2.10 Auth accepts valid management token", $passes, $failures);

$invalidUser = Auth::authenticate('bad-token');
assertTest($invalidUser === null, "0.2.11 Auth rejects invalid token", $passes, $failures);

// --- 0.3 MySQL Migrations Tests ---
echo "\n--- 0.3 MySQL Migrations Verification ---\n";
$migrationFile = __DIR__ . '/../migrations/001_initial_schema.sql';
assertTest(file_exists($migrationFile), "0.3.1 migrations/001_initial_schema.sql exists", $passes, $failures);

$migrationSql = file_get_contents($migrationFile);

// Check all 17 tables are declared in migration
$expectedTables = [
    'users', 'building', 'unit', 'ticket', 'job', 'run_sheet',
    'notice', 'part', 'stockpile', 'supplier', 'photo', 'correction',
    'watch', 'reminder', 'building_note', 'vehicle_profile', 'yardi_sightings',
];

$allTablesFound = true;
foreach ($expectedTables as $tbl) {
    if (!preg_match("/CREATE TABLE IF NOT EXISTS [`\"]?{$tbl}[`\"]?/i", $migrationSql)) {
        $allTablesFound = false;
        echo "Missing table in SQL: {$tbl}\n";
    }
}
assertTest($allTablesFound, "0.3.2 migrations/001_initial_schema.sql defines all 17 specified tables", $passes, $failures);

// Check wo_number NULLABLE and parent_ticket_id NULLABLE in ticket table
$ticketNullables = (bool) preg_match('/`wo_number`\s+VARCHAR\([0-9]+\)\s+NULL/i', $migrationSql)
    && (bool) preg_match('/`parent_ticket_id`\s+BIGINT UNSIGNED\s+NULL/i', $migrationSql);
assertTest($ticketNullables, "0.3.3 ticket table has wo_number NULLABLE and parent_ticket_id NULLABLE", $passes, $failures);

// Check append-only constraint enforcement for correction table
$updateOrDeleteCorrectionFound = false;
$allPhpFiles = glob(__DIR__ . '/../src/**/*.php');
$allPhpFiles = array_merge($allPhpFiles, glob(__DIR__ . '/../src/*.php'), glob(__DIR__ . '/../public/*.php'), glob(__DIR__ . '/../cli/*.php'));

foreach ($allPhpFiles as $phpFile) {
    $code = file_get_contents($phpFile);
    if (preg_match('/\b(UPDATE|DELETE)\s+.*?\bcorrection\b/i', $code)) {
        $updateOrDeleteCorrectionFound = true;
        echo "Illegal update/delete on correction in {$phpFile}\n";
    }
}
assertTest(!$updateOrDeleteCorrectionFound, "0.3.4 Zero code paths with UPDATE or DELETE on correction table", $passes, $failures);

// Test Db::assertAppendOnlySafe throws on UPDATE or DELETE
$guardThrew = false;
try {
    Db::assertAppendOnlySafe("UPDATE correction SET field_name = 'test' WHERE id = 1");
} catch (\RuntimeException $e) {
    $guardThrew = true;
}
assertTest($guardThrew, "0.3.5 Db::assertAppendOnlySafe blocks UPDATE on correction", $passes, $failures);

$deleteThrew = false;
try {
    Db::assertAppendOnlySafe("DELETE FROM `correction` WHERE id = 1");
} catch (\RuntimeException $e) {
    $deleteThrew = true;
}
assertTest($deleteThrew, "0.3.6 Db::assertAppendOnlySafe blocks DELETE on correction", $passes, $failures);

// Parse SQL statements for syntax check
$statements = array_filter(array_map('trim', explode(';', $migrationSql)));
assertTest(count($statements) >= 17, "0.3.7 Migration contains at least 17 complete SQL statements", $passes, $failures);

echo "\n=========================================\n";
echo "Total Passes: " . count($passes) . "\n";
echo "Total Failures: " . count($failures) . "\n";

if (count($failures) > 0) {
    exit(1);
}
echo "ALL TESTS PASSED!\n";
exit(0);
