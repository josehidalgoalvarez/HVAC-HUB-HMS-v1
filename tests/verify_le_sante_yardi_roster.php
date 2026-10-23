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

echo "=== Running Acceptance Tests for Le Santé / 300 Skyfall Lane Verified Yardi Roster ===\n\n";

// -------------------------------------------------------------
// 1. Building Record, Complex Assignment & Notes in Database
// -------------------------------------------------------------
echo "--- 1. Building Record & Complex Assignment in Database ---\n";

$bldg96 = $db->query("SELECT id, name, address, comments, complex_id, aliases, yardi_codes FROM building WHERE id = 96")->fetch(PDO::FETCH_ASSOC);
assertTest($bldg96 !== false, "Building Le Santé exists in DB (ID 96)", $passes, $failures);

$expectedNotes = 'Le Santé — 300 Skyfall Lane (Yardi spells it "300 Skyfal Lane"). Phased build-out: ~334 units planned; roster grows as phases release — re-extract periodically. Yardi labels 19 units "Sante" instead of the address (126, 133, 134, 235, 255, 416, 418, 421, 424, 426, 456, 516, 518, 521, 523, 524, 526, 621, 656) — TODO-verify whether that is a separate phase.';

if ($bldg96) {
    assertTest(str_contains($bldg96['name'] ?? '', 'Le Santé') || str_contains($bldg96['name'] ?? '', 'Le Sante'), "Building name is 'Le Santé'", $passes, $failures);
    assertTest(str_contains($bldg96['address'] ?? '', '300 Skyfall Lane'), "Address is '300 Skyfall Lane, Kingston, ON'", $passes, $failures);
    assertTest($bldg96['complex_id'] === null, "Complex assignment is NULL (ungrouped / standalone)", $passes, $failures);
    assertTest(($bldg96['comments'] ?? '') === $expectedNotes, "Building notes exactly match specification", $passes, $failures);
}

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
// 3. Database Unit Counts & Exact Roster for Le Santé (ID 96)
// -------------------------------------------------------------
echo "\n--- 3. Database Unit Counts & Exact Roster (161 units) ---\n";

$units = $db->query("SELECT unit_number, floor, provenance, comments, default_set_id, washer_dryer_state FROM unit WHERE building_id = 96 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_ASSOC);
$totalUnits = count($units);
assertTest($totalUnits === 161, "Le Santé has exactly 161 units in DB (got {$totalUnits})", $passes, $failures);

// Floor counts
$floorCounts = [];
$uNums = [];
$invalidProvenance = [];
$waitEntries = [];
$letterSuffixed = [];
$nonDefaultSet = [];
$invalidWasherDryer = [];

// Gap units tracking
$forbiddenUnitsFound = [];
$forbiddenList = array_merge(
    array_map('strval', range(127, 132)),
    ['420', '520', '616']
);

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
    $wdState = $u['washer_dryer_state'] ?? 'none';
    if (!in_array($wdState, ['building_installed', 'tenant_owned', 'none'], true)) {
        $invalidWasherDryer[] = $num;
    }
    if (in_array($num, $forbiddenList, true)) {
        $forbiddenUnitsFound[] = $num;
    }
}

// Acceptance criteria: Floor 1: 28, Floor 2: 32, Floor 3: 30, Floor 4: 25, Floor 5: 25, Floor 6: 21 (total 161)
assertTest(($floorCounts['First Floor'] ?? 0) === 28, "Floor 1 has exactly 28 units (got " . ($floorCounts['First Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Second Floor'] ?? 0) === 32, "Floor 2 has exactly 32 units (got " . ($floorCounts['Second Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Third Floor'] ?? 0) === 30, "Floor 3 has exactly 30 units (got " . ($floorCounts['Third Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Fourth Floor'] ?? 0) === 25, "Floor 4 has exactly 25 units (got " . ($floorCounts['Fourth Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Fifth Floor'] ?? 0) === 25, "Floor 5 has exactly 25 units (got " . ($floorCounts['Fifth Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($floorCounts['Sixth Floor'] ?? 0) === 21, "Floor 6 has exactly 21 units (got " . ($floorCounts['Sixth Floor'] ?? 0) . ")", $passes, $failures);

// Verify exact unit lists
$expectedF1 = array_map('strval', array_merge(range(101, 126), [133, 134]));
$expectedF2 = array_map('strval', array_merge(range(201, 227), [235, 255, 256, 257, 258]));
$expectedF3 = array_map('strval', array_merge(range(301, 327), [356, 357, 358]));
$expectedF4 = array_map('strval', [401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 421, 424, 426, 439, 441, 456]);
$expectedF5 = array_map('strval', [501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 521, 523, 524, 526, 539, 541]);
$expectedF6 = array_map('strval', [601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 617, 619, 621, 639, 641, 656]);

$expectedAll = array_merge($expectedF1, $expectedF2, $expectedF3, $expectedF4, $expectedF5, $expectedF6);
sort($expectedAll);
$sortedUNums = $uNums;
sort($sortedUNums);

assertTest($sortedUNums === $expectedAll, "All 161 unit numbers match exact specified roster", $passes, $failures);
assertTest(empty($forbiddenUnitsFound), "No gap-filling units created (no 127–132, no 420, no 520, no 616; found: " . implode(',', $forbiddenUnitsFound) . ")", $passes, $failures);
assertTest(empty($waitEntries), "Zero WAIT* entries in DB (found " . count($waitEntries) . ")", $passes, $failures);
assertTest(empty($letterSuffixed), "Zero letter-suffixed unit numbers in DB (found " . count($letterSuffixed) . ")", $passes, $failures);
assertTest(empty($invalidProvenance), "All 161 units have provenance 'verified — Yardi extract 2026-10-22'", $passes, $failures);
assertTest(empty($nonDefaultSet), "All 161 units reference default set 'set-skyfall-sante-uniform'", $passes, $failures);
assertTest(empty($invalidWasherDryer), "All 161 units have valid washer_dryer_state (building_installed | tenant_owned | none)", $passes, $failures);

// Pattern units check
$patternCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 96 AND provenance LIKE '%pattern%'")->fetchColumn();
assertTest($patternCount === 0, "Zero pattern-generated units left for Le Santé in DB", $passes, $failures);

// -------------------------------------------------------------
// 4. TypeScript Constants & Unit Generation Verification
// -------------------------------------------------------------
echo "\n--- 4. TypeScript Constants & Unit Generation Verification ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');
assertTest(str_contains($tsCode, 'prop-skyfall-300'), "TypeScript defines 'prop-skyfall-300' in residential_constants.tsx", $passes, $failures);
assertTest(str_contains($tsCode, 'set-skyfall-sante-uniform'), "TypeScript defines 'set-skyfall-sante-uniform' in residential_constants.tsx", $passes, $failures);

$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES, DEFAULT_APPLIANCE_SETS } = require("./residential_constants.tsx");

const propSkyfall = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-skyfall-300");
if (!propSkyfall) {
    console.log(JSON.stringify({ error: "prop-skyfall-300 not found" }));
    process.exit(0);
}

const units = generateUnitRoster(propSkyfall);
const floorCounts = {};
const setIds = new Set();
const washerDryerStates = new Set();
const waitList = [];
const letterList = [];
const nonVerified = [];
const forbiddenList = ["127","128","129","130","131","132","420","520","616"];
const forbiddenFound = [];

for (const u of units) {
    floorCounts[u.floor || "Unknown"] = (floorCounts[u.floor || "Unknown"] || 0) + 1;
    if (u.defaultSetId) setIds.add(u.defaultSetId);
    if (u.washerDryerState) washerDryerStates.add(u.washerDryerState);
    if (u.unitNumber.includes("WAIT")) waitList.push(u.unitNumber);
    if (/[A-Za-z]/.test(u.unitNumber)) letterList.push(u.unitNumber);
    if (u.provenance !== "verified — Yardi extract 2026-10-22") nonVerified.push(u.unitNumber);
    if (forbiddenList.includes(u.unitNumber)) forbiddenFound.push(u.unitNumber);
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
    forbiddenFound,
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
    assertTest(($tsRes['totalUnits'] ?? 0) === 161, "TypeScript generateUnitRoster yields exactly 161 units (got " . ($tsRes['totalUnits'] ?? 0) . ")", $passes, $failures);
    assertTest(($tsRes['floorCounts']['First Floor'] ?? 0) === 28, "TypeScript Floor 1 has 28 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Second Floor'] ?? 0) === 32, "TypeScript Floor 2 has 32 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Third Floor'] ?? 0) === 30, "TypeScript Floor 3 has 30 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Fourth Floor'] ?? 0) === 25, "TypeScript Floor 4 has 25 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Fifth Floor'] ?? 0) === 25, "TypeScript Floor 5 has 25 units", $passes, $failures);
    assertTest(($tsRes['floorCounts']['Sixth Floor'] ?? 0) === 21, "TypeScript Floor 6 has 21 units", $passes, $failures);
    assertTest(($tsRes['waitCount'] ?? 1) === 0, "TypeScript roster has zero WAIT entries", $passes, $failures);
    assertTest(($tsRes['letterCount'] ?? 1) === 0, "TypeScript roster has zero lettered units", $passes, $failures);
    assertTest(empty($tsRes['forbiddenFound'] ?? [1]), "TypeScript roster has no gap-filling units", $passes, $failures);
    assertTest(($tsRes['nonVerifiedCount'] ?? 1) === 0, "TypeScript roster units all have verified Yardi provenance", $passes, $failures);
    assertTest(($tsRes['defaultSetIds'] ?? []) === ['set-skyfall-sante-uniform'], "TypeScript roster units all inherit 'set-skyfall-sante-uniform' by reference", $passes, $failures);
    assertTest(in_array('none', $tsRes['washerDryerStates'] ?? []), "TypeScript roster units default washerDryerState to 'none'", $passes, $failures);
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
