<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Config;
use App\Db;

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

echo "=== Running Acceptance Tests for Manitou Verified Yardi Rosters ===\n\n";

// -------------------------------------------------------------
// 1. Complex & Building Records in Database
// -------------------------------------------------------------
echo "--- 1. Complex & Building Records in Database ---\n";

$complex = $db->query("SELECT * FROM complexes WHERE id = 8 OR slug = 'manitou'")->fetch(PDO::FETCH_ASSOC);
assertTest($complex !== false, "Manitou complex exists in complexes table (ID 8)", $passes, $failures);

$bldCount = (int)$db->query("SELECT COUNT(*) FROM building WHERE complex_id = 8")->fetchColumn();
assertTest($bldCount === 4, "Manitou complex has exactly 4 buildings in database (got {$bldCount})", $passes, $failures);

$expectedBuildings = [
    81 => ['name' => '77 Manitou Crescent', 'address' => '77 Manitou Crescent, Kingston, ON'],
    91 => ['name' => '77A Manitou Crescent', 'address' => '77A Manitou Crescent, Kingston, ON'],
    92 => ['name' => '77B Manitou Crescent', 'address' => '77B Manitou Crescent, Kingston, ON'],
    93 => ['name' => '77C Manitou Crescent', 'address' => '77C Manitou Crescent, Kingston, ON']
];

foreach ($expectedBuildings as $bId => $spec) {
    $row = $db->query("SELECT * FROM building WHERE id = {$bId}")->fetch(PDO::FETCH_ASSOC);
    assertTest($row !== false, "Building ID {$bId} exists ({$spec['name']})", $passes, $failures);
    if ($row) {
        assertTest((int)$row['complex_id'] === 8, "Building ID {$bId} is assigned to Manitou complex (ID 8)", $passes, $failures);
        assertTest(str_contains($row['name'], $spec['name']), "Building ID {$bId} name contains '{$spec['name']}'", $passes, $failures);
        assertTest(str_contains($row['address'], $spec['address']), "Building ID {$bId} address contains '{$spec['address']}'", $passes, $failures);
    }
}

$totalBldgs = (int)$db->query("SELECT COUNT(*) FROM building")->fetchColumn();
assertTest($totalBldgs >= 92, "Total portfolio buildings in database is at least 92 (got {$totalBldgs})", $passes, $failures);

// -------------------------------------------------------------
// 2. Numbering Pool Documentation & Notes
// -------------------------------------------------------------
echo "\n--- 2. Numbering Pool Documentation & Notes ---\n";

foreach ([91, 92, 93] as $aptBId) {
    $comments = (string)$db->query("SELECT comments FROM building WHERE id = {$aptBId}")->fetchColumn();
    assertTest(str_contains($comments, 'Shares numbering pool with') && str_contains($comments, '101–110'),
        "Building ID {$aptBId} notes record the shared 3-floor numbering pool", $passes, $failures);
}

// -------------------------------------------------------------
// 3. Per-Building Unit Rosters & Counts in Database
// -------------------------------------------------------------
echo "\n--- 3. Per-Building Unit Rosters & Counts in Database ---\n";

// 77 Manitou Crescent (58 townhouses)
$units77 = $db->query("SELECT unit_number FROM unit WHERE building_id = 81 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units77) === 58, "77 Manitou Crescent has exactly 58 units (got " . count($units77) . ")", $passes, $failures);

$expected77Units = array_map('strval', range(1, 58));
assertTest($units77 === $expected77Units, "77 Manitou Crescent has units 1–58 continuous with NO gaps", $passes, $failures);

// 77A Manitou Crescent (10 units)
$units77a = $db->query("SELECT unit_number FROM unit WHERE building_id = 91 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
$expected77a = ['101', '102', '103', '104', '201', '202', '203', '301', '302', '303'];
sort($units77a);
assertTest(count($units77a) === 10, "77A Manitou Crescent has exactly 10 units (got " . count($units77a) . ")", $passes, $failures);
assertTest($units77a === $expected77a, "77A Manitou Crescent units match verified roster (101–104, 201–203, 301–303)", $passes, $failures);

// 77B Manitou Crescent (11 units)
$units77b = $db->query("SELECT unit_number FROM unit WHERE building_id = 92 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
$expected77b = ['105', '106', '107', '204', '205', '206', '207', '304', '305', '306', '307'];
sort($units77b);
assertTest(count($units77b) === 11, "77B Manitou Crescent has exactly 11 units (got " . count($units77b) . ")", $passes, $failures);
assertTest($units77b === $expected77b, "77B Manitou Crescent units match verified roster (105–107, 204–207, 304–307)", $passes, $failures);

// 77C Manitou Crescent (9 units)
$units77c = $db->query("SELECT unit_number FROM unit WHERE building_id = 93 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
$expected77c = ['108', '109', '110', '208', '209', '210', '308', '309', '310'];
sort($units77c);
assertTest(count($units77c) === 9, "77C Manitou Crescent has exactly 9 units (got " . count($units77c) . ")", $passes, $failures);
assertTest($units77c === $expected77c, "77C Manitou Crescent units match verified roster (108–110, 208–210, 308–310)", $passes, $failures);

// Complex Total
$totalManitouUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (81, 91, 92, 93)")->fetchColumn();
assertTest($totalManitouUnits === 88, "Total Manitou complex units in database is exactly 88 (got {$totalManitouUnits})", $passes, $failures);

// -------------------------------------------------------------
// 4. Prohibited Units & Provenance Checks
// -------------------------------------------------------------
echo "\n--- 4. Prohibited Units & Provenance Checks ---\n";

$waitUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (81, 91, 92, 93) AND unit_number LIKE '%WAIT%'")->fetchColumn();
assertTest($waitUnits === 0, "Zero WAIT* placeholder units exist in Manitou complex (got {$waitUnits})", $passes, $failures);

$nonVerifiedUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (81, 91, 92, 93) AND provenance != 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($nonVerifiedUnits === 0, "Zero pattern provenance units left in Manitou (got {$nonVerifiedUnits})", $passes, $failures);

$verifiedUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (81, 91, 92, 93) AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($verifiedUnits === 88, "All 88 Manitou units carry provenance 'verified — Yardi extract 2026-10-22'", $passes, $failures);

// -------------------------------------------------------------
// 5. Floor Derivations in Database
// -------------------------------------------------------------
echo "\n--- 5. Floor Derivations in Database ---\n";

$thFloors = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 81 AND floor = 'Multi-Floor Townhouse'")->fetchColumn();
assertTest($thFloors === 58, "All 58 townhouses have floor 'Multi-Floor Townhouse' (got {$thFloors})", $passes, $failures);

$firstFloors = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (91, 92, 93) AND floor = 'First Floor'")->fetchColumn();
assertTest($firstFloors === 10, "Exactly 10 units across 77A/B/C have floor 'First Floor' (got {$firstFloors})", $passes, $failures);

$secondFloors = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (91, 92, 93) AND floor = 'Second Floor'")->fetchColumn();
assertTest($secondFloors === 10, "Exactly 10 units across 77A/B/C have floor 'Second Floor' (got {$secondFloors})", $passes, $failures);

$thirdFloors = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (91, 92, 93) AND floor = 'Third Floor'")->fetchColumn();
assertTest($thirdFloors === 10, "Exactly 10 units across 77A/B/C have floor 'Third Floor' (got {$thirdFloors})", $passes, $failures);

// -------------------------------------------------------------
// 6. Default Appliance Sets in Database
// -------------------------------------------------------------
echo "\n--- 6. Default Appliance Sets in Database ---\n";

$thSet = $db->query("SELECT * FROM default_sets WHERE id = 'set-manitou-townhouse'")->fetch(PDO::FETCH_ASSOC);
assertTest($thSet !== false, "Default set 'set-manitou-townhouse' exists in database", $passes, $failures);
if ($thSet) {
    assertTest($thSet['unit_type'] === 'townhouse', "set-manitou-townhouse unit_type is 'townhouse'", $passes, $failures);
    assertTest((int)$thSet['has_unit_water_heater'] === 1, "set-manitou-townhouse has per-unit water heater (1)", $passes, $failures);
}

$aptSet = $db->query("SELECT * FROM default_sets WHERE id = 'set-manitou-apt'")->fetch(PDO::FETCH_ASSOC);
assertTest($aptSet !== false, "Default set 'set-manitou-apt' exists in database", $passes, $failures);
if ($aptSet) {
    assertTest($aptSet['unit_type'] === 'apartment', "set-manitou-apt unit_type is 'apartment'", $passes, $failures);
    assertTest((int)$aptSet['has_unit_water_heater'] === 0, "set-manitou-apt has building/shared water heater (0)", $passes, $failures);
}

// -------------------------------------------------------------
// 7. TypeScript Constants Integrity (residential_constants.tsx)
// -------------------------------------------------------------
echo "\n--- 7. TypeScript Constants Integrity (residential_constants.tsx) ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');

assertTest(str_contains($tsCode, "'set-manitou-townhouse'") && str_contains($tsCode, "'set-manitou-apt'"),
    "TypeScript DEFAULT_APPLIANCE_SETS includes set-manitou-townhouse and set-manitou-apt", $passes, $failures);

assertTest(str_contains($tsCode, "id: 'prop-manitou-77',") &&
           str_contains($tsCode, "id: 'prop-manitou-77a',") &&
           str_contains($tsCode, "id: 'prop-manitou-77b',") &&
           str_contains($tsCode, "id: 'prop-manitou-77c',"),
    "TypeScript RESIDENTIAL_PROPERTIES includes all 4 Manitou buildings (77, 77A, 77B, 77C)", $passes, $failures);

assertTest(str_contains($tsCode, 'MANITOU_YARDI_ROSTERS'),
    "TypeScript defines MANITOU_YARDI_ROSTERS constant", $passes, $failures);

assertTest(str_contains($tsCode, 'cluster-manitou-77abc'),
    "TypeScript BUILDING_CLUSTERS includes cluster-manitou-77abc", $passes, $failures);

// Test unit generation from node
$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES, COMPLEXES } = require("./residential_constants.tsx");
const manitouProps = RESIDENTIAL_PROPERTIES.filter(p => p.complexId === "manitou");
console.log(JSON.stringify({
    complexBuildingCount: COMPLEXES.find(c => c.id === "manitou")?.buildingCount,
    propertyCount: manitouProps.length,
    rosters: manitouProps.map(p => ({
        id: p.id,
        name: p.name,
        count: generateUnitRoster(p).length,
        provenances: [...new Set(generateUnitRoster(p).map(u => u.provenance))],
        hasWait: generateUnitRoster(p).some(u => u.unitNumber.includes("WAIT")),
        defaultSetIds: [...new Set(generateUnitRoster(p).map(u => u.defaultSetId))]
    }))
}));
';

$nodeCmd = "npx tsx -e " . escapeshellarg($testScript);
$output = shell_exec($nodeCmd);
$tsResult = json_decode($output, true);

if ($tsResult) {
    assertTest($tsResult['complexBuildingCount'] === 4, "TypeScript COMPLEXES manitou buildingCount is 4 (got {$tsResult['complexBuildingCount']})", $passes, $failures);
    assertTest($tsResult['propertyCount'] === 4, "TypeScript RESIDENTIAL_PROPERTIES has exactly 4 Manitou properties (got {$tsResult['propertyCount']})", $passes, $failures);

    $rosterMap = [];
    $totalTsUnits = 0;
    foreach ($tsResult['rosters'] as $r) {
        $rosterMap[$r['id']] = $r;
        $totalTsUnits += $r['count'];
    }

    assertTest(($rosterMap['prop-manitou-77']['count'] ?? 0) === 58, "TypeScript 77 Manitou generates exactly 58 units (got " . ($rosterMap['prop-manitou-77']['count'] ?? 0) . ")", $passes, $failures);
    assertTest(($rosterMap['prop-manitou-77a']['count'] ?? 0) === 10, "TypeScript 77A Manitou generates exactly 10 units (got " . ($rosterMap['prop-manitou-77a']['count'] ?? 0) . ")", $passes, $failures);
    assertTest(($rosterMap['prop-manitou-77b']['count'] ?? 0) === 11, "TypeScript 77B Manitou generates exactly 11 units (got " . ($rosterMap['prop-manitou-77b']['count'] ?? 0) . ")", $passes, $failures);
    assertTest(($rosterMap['prop-manitou-77c']['count'] ?? 0) === 9, "TypeScript 77C Manitou generates exactly 9 units (got " . ($rosterMap['prop-manitou-77c']['count'] ?? 0) . ")", $passes, $failures);
    assertTest($totalTsUnits === 88, "TypeScript Manitou complex total generates exactly 88 units (got {$totalTsUnits})", $passes, $failures);

    $allVerified = true;
    $hasAnyWait = false;
    foreach ($rosterMap as $r) {
        if ($r['provenances'] !== ['verified — Yardi extract 2026-10-22']) {
            $allVerified = false;
        }
        if ($r['hasWait']) {
            $hasAnyWait = true;
        }
    }
    assertTest($allVerified, "All Manitou units in TypeScript carry provenance 'verified — Yardi extract 2026-10-22'", $passes, $failures);
    assertTest(!$hasAnyWait, "Zero WAIT* placeholder units in TypeScript Manitou rosters", $passes, $failures);
    assertTest($rosterMap['prop-manitou-77']['defaultSetIds'] === ['set-manitou-townhouse'], "77 Manitou inherits set-manitou-townhouse by reference", $passes, $failures);
    assertTest($rosterMap['prop-manitou-77a']['defaultSetIds'] === ['set-manitou-apt'], "77A Manitou inherits set-manitou-apt by reference", $passes, $failures);
    assertTest($rosterMap['prop-manitou-77b']['defaultSetIds'] === ['set-manitou-apt'], "77B Manitou inherits set-manitou-apt by reference", $passes, $failures);
    assertTest($rosterMap['prop-manitou-77c']['defaultSetIds'] === ['set-manitou-apt'], "77C Manitou inherits set-manitou-apt by reference", $passes, $failures);
} else {
    assertTest(false, "Failed to execute TypeScript runtime inspection via npx tsx", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Manitou Rosters Acceptance Verification Summary:\n";
echo "Passes: {$passes}\n";
echo "Failures: {$failures}\n";
echo "========================================\n";

if ($failures === 0) {
    echo "SUCCESS: All Manitou Verified Yardi Rosters Acceptance Tests PASSED!\n";
    exit(0);
} else {
    echo "FAILURE: Some acceptance tests failed!\n";
    exit(1);
}
