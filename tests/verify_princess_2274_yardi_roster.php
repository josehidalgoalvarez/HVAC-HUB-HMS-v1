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

echo "=== Running Acceptance Tests for 2274 Princess Verified Yardi Roster ===\n\n";

// -------------------------------------------------------------
// 1. Building Record, Complex Assignment & Counts in Database
// -------------------------------------------------------------
echo "--- 1. Building Record & Complex Assignment in Database ---\n";

$bldg95 = $db->query("SELECT id, name, address, comments, complex_id FROM building WHERE id = 95")->fetch(PDO::FETCH_ASSOC);
assertTest($bldg95 !== false, "Building 2274 Princess exists in DB (ID 95)", $passes, $failures);

if ($bldg95) {
    assertTest(str_contains($bldg95['address'] ?? '', '2274 Princess St'), "2274 Princess address is '2274 Princess St, Kingston, ON'", $passes, $failures);
    assertTest((int)$bldg95['complex_id'] === 4 || (int)$bldg95['complex_id'] === 10, "2274 Princess complex assignment is Princess (4) or Armstrong-Skyfall (10) (got {$bldg95['complex_id']})", $passes, $failures);
}

// Complex building count
$complexPrincessCount = (int)$db->query("SELECT building_count FROM complex WHERE id = 'complex-princess'")->fetchColumn();
assertTest($complexPrincessCount === 9 || $complexPrincessCount === 4, "Princess complex building_count is valid in complex table (got {$complexPrincessCount})", $passes, $failures);

$actualPrincessBuildings = (int)$db->query("SELECT COUNT(*) FROM building WHERE complex_id = 4")->fetchColumn();
assertTest($actualPrincessBuildings === 9 || $actualPrincessBuildings === 6 || $actualPrincessBuildings === 4, "Princess complex buildings count is valid in DB (got {$actualPrincessBuildings})", $passes, $failures);

// -------------------------------------------------------------
// 2. Uniform Appliance Default Set in Database
// -------------------------------------------------------------
echo "\n--- 2. Uniform Appliance Default Set in Database ---\n";

$defaultSet = $db->query("SELECT * FROM default_sets WHERE id = 'set-skyfall-sante-uniform'")->fetch(PDO::FETCH_ASSOC);
assertTest($defaultSet !== false, "Default set 'set-skyfall-sante-uniform' exists in default_sets table", $passes, $failures);

if ($defaultSet) {
    assertTest((int)$defaultSet['has_unit_water_heater'] === 1, "Default set has has_unit_water_heater = 1", $passes, $failures);
    $appliances = json_decode($defaultSet['appliances_json'] ?? '[]', true) ?: [];
    $types = array_column($appliances, 'type');
    sort($types);
    $expectedTypes = ['Air Conditioner', 'Dishwasher', 'Range', 'Refrigerator', 'Thermostat', 'Water Heater'];
    sort($expectedTypes);
    assertTest($types === $expectedTypes, "Default set contains exact 6 uniform appliances (AC, WH, Thermostat, Dishwasher, Fridge, Stove)", $passes, $failures);
}

// -------------------------------------------------------------
// 3. Database Unit Counts & Exact Roster for 2274 Princess (ID 95)
// -------------------------------------------------------------
echo "\n--- 3. Database Unit Counts & Exact Roster (236 units) ---\n";

$units = $db->query("SELECT unit_number, floor, provenance, comments, default_set_id, washer_dryer_state FROM unit WHERE building_id = 95 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_ASSOC);
$totalUnits = count($units);
assertTest($totalUnits === 236, "2274 Princess has exactly 236 units in DB (got {$totalUnits})", $passes, $failures);

// Floor counts
$floorCounts = [];
$uNums = [];
$invalidProvenance = [];
$waitEntries = [];
$letterSuffixed = [];
$nonDefaultSet = [];
$nonNoneWasherDryer = [];

foreach ($units as $u) {
    $fl = $u['floor'] ?? 'Unknown';
    $floorCounts[$fl] = ($floorCounts[$fl] ?? 0) + 1;
    $num = $u['unit_number'];
    $uNums[] = $num;

    if ($u['provenance'] !== 'verified — Yardi extract 2026-10-22') {
        $invalidProvenance[] = $num;
    }
    if (stripos($num, 'WAIT') !== false) {
        $waitEntries[] = $num;
    }
    if (preg_match('/[A-Za-z]/', $num)) {
        $letterSuffixed[] = $num;
    }
    if (($u['default_set_id'] ?? '') !== 'set-skyfall-sante-uniform') {
        $nonDefaultSet[] = $num;
    }
    if (($u['washer_dryer_state'] ?? 'none') !== 'none') {
        $nonNoneWasherDryer[] = $num;
    }
}

// Acceptance criteria: Floor 1: 50, Floor 2: 59, Floor 3: 59, Floor 4: 51, Floor 5: 17
assertTest(($floorCounts['First Floor'] ?? 0) === 50, "Floor 1 has exactly 50 units (got " . ($floorCounts['First Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Second Floor'] ?? 0) === 59, "Floor 2 has exactly 59 units (got " . ($floorCounts['Second Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Third Floor'] ?? 0) === 59, "Floor 3 has exactly 59 units (got " . ($floorCounts['Third Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Fourth Floor'] ?? 0) === 51, "Floor 4 has exactly 51 units (got " . ($floorCounts['Fourth Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Fifth Floor'] ?? 0) === 17, "Floor 5 has exactly 17 units (got " . ($floorCounts['Fifth Floor'] ?? 0) . ")", $passes, $failures);

// Verify exact unbroken runs
$expectedF1 = array_map('strval', range(101, 150));
$expectedF2 = array_map('strval', range(201, 259));
$expectedF3 = array_map('strval', range(301, 359));
$expectedF4 = array_map('strval', range(401, 451));
$expectedF5 = array_map('strval', range(501, 517));
$expectedAll = array_merge($expectedF1, $expectedF2, $expectedF3, $expectedF4, $expectedF5);

assertTest($uNums === $expectedAll, "All 236 unit numbers match exact five unbroken runs (101-150, 201-259, 301-359, 401-451, 501-517)", $passes, $failures);
assertTest(empty($waitEntries), "Zero WAIT* entries in DB (found " . count($waitEntries) . ")", $passes, $failures);
assertTest(empty($letterSuffixed), "Zero letter-suffixed unit numbers in DB (found " . count($letterSuffixed) . ")", $passes, $failures);
assertTest(empty($invalidProvenance), "All 236 units have provenance 'verified — Yardi extract 2026-10-22'", $passes, $failures);
assertTest(empty($nonDefaultSet), "All 236 units reference default set 'set-skyfall-sante-uniform'", $passes, $failures);
assertTest(empty($nonNoneWasherDryer), "All 236 units have washer_dryer_state 'none' by default", $passes, $failures);

// Pattern units check
$patternCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 95 AND provenance LIKE '%pattern%'")->fetchColumn();
assertTest($patternCount === 0, "Zero pattern-generated units left for 2274 Princess in DB", $passes, $failures);

// -------------------------------------------------------------
// 4. TypeScript Constants & Unit Generation Verification
// -------------------------------------------------------------
echo "\n--- 4. TypeScript Constants & Unit Generation Verification ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');
assertTest(str_contains($tsCode, 'set-skyfall-sante-uniform'), "TypeScript defines 'set-skyfall-sante-uniform' in residential_constants.tsx", $passes, $failures);
assertTest(str_contains($tsCode, 'prop-princess-2274'), "TypeScript defines 'prop-princess-2274' in residential_constants.tsx", $passes, $failures);
assertTest((bool)preg_match('/id:\s*[\'"]princess[\'"][\s\S]*?buildingCount:\s*(?:9|4)/', $tsCode), "TypeScript Princess complex has valid buildingCount", $passes, $failures);

$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES, DEFAULT_APPLIANCE_SETS } = require("./residential_constants.tsx");

const prop2274 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-princess-2274");
if (!prop2274) {
    console.log(JSON.stringify({ error: "prop-princess-2274 not found" }));
    process.exit(0);
}

const units = generateUnitRoster(prop2274);
const floorCounts = {};
const setIds = new Set();
const washerDryerStates = new Set();
const waitList = [];
const letterList = [];
const nonVerified = [];

for (const u of units) {
    floorCounts[u.floor || "Unknown"] = (floorCounts[u.floor || "Unknown"] || 0) + 1;
    if (u.defaultSetId) setIds.add(u.defaultSetId);
    if (u.washerDryerState) washerDryerStates.add(u.washerDryerState);
    if (u.unitNumber.includes("WAIT")) waitList.push(u.unitNumber);
    if (/[A-Za-z]/.test(u.unitNumber)) letterList.push(u.unitNumber);
    if (u.provenance !== "verified — Yardi extract 2026-10-22") nonVerified.push(u.unitNumber);
}

const uniformSet = DEFAULT_APPLIANCE_SETS.find(s => s.id === "set-skyfall-sante-uniform");

console.log(JSON.stringify({
    totalUnits: units.length,
    floorCounts,
    defaultSetIds: Array.from(setIds),
    washerDryerStates: Array.from(washerDryerStates),
    waitCount: waitList.length,
    letterCount: letterList.length,
    nonVerifiedCount: nonVerified.length,
    hasUniformSet: !!uniformSet,
    uniformApplianceCount: uniformSet?.appliances?.length || 0,
    uniformApplianceTypes: uniformSet?.appliances?.map(a => a.type) || []
}));
';

$nodeCmd = "npx tsx -e " . escapeshellarg($testScript);
$output = shell_exec($nodeCmd);
$tsRes = json_decode(trim($output ?? ''), true);

if (!$tsRes || isset($tsRes['error'])) {
    echo "[FAIL] TypeScript evaluation failed: " . ($output ?: 'no output') . "\n";
    $failures++;
} else {
    assertTest(($tsRes['totalUnits'] ?? 0) === 236, "TypeScript generateUnitRoster yields exactly 236 units (got " . ($tsRes['totalUnits'] ?? 0) . ")", $passes, $failures);
    assertTest(($tsRes['floorCounts']['First Floor'] ?? 0) === 50, "TypeScript Floor 1 has 50 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Second Floor'] ?? 0) === 59, "TypeScript Floor 2 has 59 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Third Floor'] ?? 0) === 59, "TypeScript Floor 3 has 59 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Fourth Floor'] ?? 0) === 51, "TypeScript Floor 4 has 51 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Fifth Floor'] ?? 0) === 17, "TypeScript Floor 5 has 17 units", $passes, $failures);
    assertTest(($tsRes['waitCount'] ?? 1) === 0, "TypeScript roster has zero WAIT entries", $passes, $failures);
    assertTest(($tsRes['letterCount'] ?? 1) === 0, "TypeScript roster has zero lettered units", $passes, $failures);
    assertTest(($tsRes['nonVerifiedCount'] ?? 1) === 0, "TypeScript roster units all have verified Yardi provenance", $passes, $failures);
    assertTest(($tsRes['defaultSetIds'] ?? []) === ['set-skyfall-sante-uniform'], "TypeScript roster units all inherit 'set-skyfall-sante-uniform' by reference", $passes, $failures);
    assertTest(($tsRes['washerDryerStates'] ?? []) === ['none'], "TypeScript roster units default washerDryerState to 'none'", $passes, $failures);
    assertTest(($tsRes['hasUniformSet'] ?? false) === true, "TypeScript DEFAULT_APPLIANCE_SETS includes 'set-skyfall-sante-uniform'", $passes, $failures);
    assertTest(($tsRes['uniformApplianceCount'] ?? 0) === 6, "Uniform set has exactly 6 appliances", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n======================================================\n";
echo "Tests Passed: {$passes}\n";
echo "Tests Failed: {$failures}\n";
echo "======================================================\n";

exit($failures > 0 ? 1 : 0);
