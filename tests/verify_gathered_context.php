<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config;
use App\Db;
use App\Controllers\IntakeController;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\ResponseFactory;

Config::load();

$db = Db::get();
$passes = 0;
$failures = 0;

function assertTest(bool $condition, string $description, int &$passes, int &$failures): void {
    if ($condition) {
        echo "[PASS] {$description}\n";
        $passes++;
    } else {
        echo "[FAIL] {$description}\n";
        $failures++;
    }
}

echo "=== Running Acceptance Tests for Gathered-Context Data Batch ===\n\n";

// -------------------------------------------------------------
// 1. Total Verified Units Unchanged at 1,289
// -------------------------------------------------------------
echo "--- 1. Unit Count Validation ---\n";
$totalUnits = (int) $db->query("SELECT count(*) FROM unit")->fetchColumn();
assertTest($totalUnits === 1289, "Total verified units in database remains exactly 1,289 (got {$totalUnits})", $passes, $failures);

// -------------------------------------------------------------
// 2. Complex Regrouping
// -------------------------------------------------------------
echo "\n--- 2. Complex Regrouping ---\n";

// Complex 'bd' name
$bdComplex = $db->query("SELECT name FROM complexes WHERE slug = 'bd'")->fetch(PDO::FETCH_ASSOC);
assertTest($bdComplex && $bdComplex['name'] === 'BD — Bath & Days', "Complex 'bd' display name is 'BD — Bath & Days'", $passes, $failures);

// Complex 'frontenac-alfred'
$faComplex = $db->query("SELECT id, name, slug FROM complexes WHERE slug = 'frontenac-alfred'")->fetch(PDO::FETCH_ASSOC);
assertTest($faComplex !== false, "Complex 'frontenac-alfred' exists in DB", $passes, $failures);

$faComplexId = $faComplex ? $faComplex['id'] : 9;
$faBuildings = $db->query("SELECT id, name, complex_id FROM building WHERE complex_id = '{$faComplexId}' OR complex_id = 'frontenac-alfred' ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$faBuildingIds = array_map(fn($b) => (int) $b['id'], $faBuildings);
sort($faBuildingIds);
$expectedFaIds = [60, 70, 71, 72, 73, 74, 75, 76, 77];
assertTest($faBuildingIds === $expectedFaIds, "Frontenac-Alfred quadrant holds exactly 9 buildings (501, 520, 353-394 Alfred, 565 Princess)", $passes, $failures);

// 563 and 567 Princess stay in princess complex (ID 4)
$p563 = $db->query("SELECT complex_id FROM building WHERE id = 59")->fetch(PDO::FETCH_ASSOC);
$p567 = $db->query("SELECT complex_id FROM building WHERE id = 61")->fetch(PDO::FETCH_ASSOC);
assertTest(($p563['complex_id'] ?? '') == '4', "563 Princess stays in Princess complex", $passes, $failures);
assertTest(($p567['complex_id'] ?? '') == '4', "567 Princess stays in Princess complex", $passes, $failures);

// 630 Princess stands alone (complex_id IS NULL)
$p630 = $db->query("SELECT complex_id FROM building WHERE id = 62")->fetch(PDO::FETCH_ASSOC);
assertTest(empty($p630['complex_id']), "630 Princess is standalone (complex_id is NULL)", $passes, $failures);

// Armstrong / Skyfall complex
$asComplex = $db->query("SELECT id, name, slug FROM complexes WHERE slug = 'armstrong-skyfall'")->fetch(PDO::FETCH_ASSOC);
assertTest($asComplex !== false, "Complex 'armstrong-skyfall' exists in DB", $passes, $failures);

$asComplexId = $asComplex ? $asComplex['id'] : 10;
$asBuildings = $db->query("SELECT id, name, complex_id FROM building WHERE complex_id = '{$asComplexId}' OR complex_id = 'armstrong-skyfall' ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$asBuildingIds = array_map(fn($b) => (int) $b['id'], $asBuildings);
sort($asBuildingIds);
$expectedAsIds = [87, 95, 96];
assertTest($asBuildingIds === $expectedAsIds, "Armstrong / Skyfall complex holds 539 Armstrong, 2274 Princess, and Le Santé / 300 Skyfall", $passes, $failures);

// 847 Development responsibility 'external'
$b847 = $db->query("SELECT id, name, responsibility, comments FROM building WHERE id = 88")->fetch(PDO::FETCH_ASSOC);
assertTest($b847 && ($b847['responsibility'] ?? '') === 'external', "847 Development has responsibility flag 'external'", $passes, $failures);

// -------------------------------------------------------------
// 3. 501 Frontenac Aliases & Intake Search
// -------------------------------------------------------------
echo "\n--- 3. 501 Frontenac Aliases & Intake Search ---\n";
$b501 = $db->query("SELECT id, name, address, aliases, comments FROM building WHERE id = 76")->fetch(PDO::FETCH_ASSOC);
assertTest($b501 !== false, "501 Frontenac exists (ID 76)", $passes, $failures);
if ($b501) {
    $aliasesStr = $b501['aliases'] ?? '';
    assertTest(str_contains($aliasesStr, '495 Frontenac St'), "501 Frontenac includes '495 Frontenac St' alias", $passes, $failures);
    assertTest(str_contains($aliasesStr, '503 Frontenac St'), "501 Frontenac includes '503 Frontenac St' alias", $passes, $failures);
    assertTest(str_contains($aliasesStr, '505 Frontenac St'), "501 Frontenac includes '505 Frontenac St' alias", $passes, $failures);
    assertTest(str_contains($aliasesStr, '507 Frontenac St'), "501 Frontenac includes '507 Frontenac St' alias", $passes, $failures);
    assertTest(str_contains($aliasesStr, '509 Frontenac St'), "501 Frontenac includes '509 Frontenac St' alias", $passes, $failures);
    assertTest(str_contains($aliasesStr, 'The Frontenac'), "501 Frontenac includes 'The Frontenac' alias", $passes, $failures);
    assertTest(str_contains($b501['comments'] ?? '', 'Frontenac condos — single building; 495–509 are alias addresses.'), "501 Frontenac includes alias addresses note", $passes, $failures);
}

// Test ticket intake resolving '509 Frontenac'
$requestFactory = new ServerRequestFactory();
$responseFactory = new ResponseFactory();
$request = $requestFactory->createServerRequest('POST', '/api/intake')
    ->withParsedBody([
        'verbatim_text' => 'AC leaking water at 509 Frontenac St unit 204',
        'verified_scope' => 'Clear condensate drain line',
    ]);
$controller = new IntakeController();
$res = $controller->intake($request, $responseFactory->createResponse());
$intakeData = json_decode((string) $res->getBody(), true);
$resolvedBuildingId = $intakeData['data']['building_id'] ?? ($intakeData['data']['ticket']['building_id'] ?? null);
assertTest($resolvedBuildingId === 76, "Ticket intake resolves '509 Frontenac' to Building 76 (got " . var_export($resolvedBuildingId, true) . ")", $passes, $failures);

// -------------------------------------------------------------
// 4. Special-Role Flag
// -------------------------------------------------------------
echo "\n--- 4. Special-Role Flag Validation ---\n";
$specialRolesExpected = [
    15 => 'storage',     // 511 Days
    58 => 'storage',     // 107 Amherst
    2  => 'mechanical',  // 1721 Bath
    75 => 'storage',     // 394 Alfred
    87 => 'storage',     // 539 Armstrong
    82 => 'storage',     // 810 Blackburn Mews
    83 => 'storage',     // 85 Park St
    97 => 'storage',     // 181 Hillendale Ave
    78 => 'storage',     // 18 Elm St
    12 => 'storage',     // 265 Ontario St
    89 => 'office',      // 698 McKay St
];

foreach ($specialRolesExpected as $bId => $expectedRole) {
    $bRow = $db->query("SELECT id, name, role FROM building WHERE id = {$bId}")->fetch(PDO::FETCH_ASSOC);
    assertTest($bRow && ($bRow['role'] ?? '') === $expectedRole, "Building {$bId} ({$bRow['name']}) has role '{$expectedRole}'", $passes, $failures);
}

// 511 Days central storage note
$b511 = $db->query("SELECT comments FROM building WHERE id = 15")->fetch(PDO::FETCH_ASSOC);
assertTest($b511 && str_contains(strtolower($b511['comments'] ?? ''), 'central storage'), "511 Days keeps 'central storage building' note", $passes, $failures);

// Exactly 11 buildings have role != 'standard'
$nonStandardCount = (int) $db->query("SELECT count(*) FROM building WHERE role IS NOT NULL AND role != 'standard'")->fetchColumn();
assertTest($nonStandardCount === 11, "Exactly 11 buildings have role != 'standard' (got {$nonStandardCount})", $passes, $failures);

// -------------------------------------------------------------
// 5. Storage Network Stockpiles
// -------------------------------------------------------------
echo "\n--- 5. Storage Network Stockpiles ---\n";
$stockpileNames = [
    '511 Days',
    '107 Amherst',
    '539 Armstrong',
    '394 Alfred',
    '810 Blackburn',
    '85 Park',
    '181 Hillendale',
    '18 Elm',
    '265 Ontario', // will check for upstairs and basement
    '698 McKay',   // will check for warehouse and sea containers
];

$allStockpiles = $db->query("SELECT id, name, location, building_id FROM stockpile")->fetchAll(PDO::FETCH_ASSOC);
$spNameList = array_map(fn($s) => $s['name'], $allStockpiles);

assertTest(count($allStockpiles) >= 12, "At least 12 stockpiles exist in DB (got " . count($allStockpiles) . ")", $passes, $failures);

$hasOntarioUpstairs = false;
$hasOntarioBasement = false;
$hasMcKayWarehouse = false;
$hasMcKayContainers = false;

foreach ($allStockpiles as $sp) {
    $n = strtolower($sp['name']);
    if (str_contains($n, '265 ontario') && str_contains($n, 'upstairs')) $hasOntarioUpstairs = true;
    if (str_contains($n, '265 ontario') && str_contains($n, 'basement')) $hasOntarioBasement = true;
    if (str_contains($n, '698 mckay') && str_contains($n, 'warehouse')) $hasMcKayWarehouse = true;
    if (str_contains($n, '698 mckay') && (str_contains($n, 'container') || str_contains($n, 'sea container'))) $hasMcKayContainers = true;
}

assertTest($hasOntarioUpstairs, "Stockpile exists for 265 Ontario St (upstairs)", $passes, $failures);
assertTest($hasOntarioBasement, "Stockpile exists for 265 Ontario St (basement)", $passes, $failures);
assertTest($hasMcKayWarehouse, "Stockpile exists for 698 McKay St warehouse", $passes, $failures);
assertTest($hasMcKayContainers, "Stockpile exists for 698 McKay sea containers", $passes, $failures);

// -------------------------------------------------------------
// 6. Suppliers & Parts
// -------------------------------------------------------------
echo "\n--- 6. Suppliers & Parts Tweaks ---\n";
$homeDepot = $db->query("SELECT * FROM supplier WHERE name LIKE '%Home Depot%'")->fetch(PDO::FETCH_ASSOC);
assertTest($homeDepot !== false, "Supplier 'Home Depot (Gardiners Rd, Kingston)' exists in DB", $passes, $failures);

// -------------------------------------------------------------
// Final Acceptance Summary
// -------------------------------------------------------------
echo "\n==========================================\n";
echo "Acceptance Test Results: {$passes} Passed, {$failures} Failed\n";
echo "==========================================\n";

if ($failures > 0) {
    exit(1);
}
