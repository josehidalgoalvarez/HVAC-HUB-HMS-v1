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

echo "=== Running Acceptance Tests for Singles Verified Yardi Rosters ===\n\n";

// -------------------------------------------------------------
// 1. Building Records, Aliases & Notes in Database
// -------------------------------------------------------------
echo "--- 1. Building Records, Aliases & Notes in Database ---\n";

// 539 Armstrong (ID 87)
$armstrong = $db->query("SELECT id, name, address, comments, aliases FROM building WHERE id = 87")->fetch(PDO::FETCH_ASSOC);
assertTest($armstrong !== false, "539 Armstrong Road exists in DB (ID 87)", $passes, $failures);
if ($armstrong) {
    assertTest(str_contains($armstrong['aliases'] ?? '', 'Riverstone'), "539 Armstrong records 'Riverstone' alias", $passes, $failures);
    assertTest(str_contains($armstrong['comments'] ?? '', 'units 516–522 were obscured by a stitch artifact'), "539 Armstrong records stitch artifact note", $passes, $failures);
}

// 810 Blackburn Mews (ID 82)
$blackburn = $db->query("SELECT id, name, address, comments, aliases FROM building WHERE id = 82")->fetch(PDO::FETCH_ASSOC);
assertTest($blackburn !== false, "810 Blackburn Mews exists in DB (ID 82)", $passes, $failures);
if ($blackburn) {
    assertTest(str_contains($blackburn['aliases'] ?? '', 'Stonecrest'), "810 Blackburn records 'Stonecrest' alias", $passes, $failures);
}

// 85 Park Street (ID 83)
$park = $db->query("SELECT id, name, address, comments FROM building WHERE id = 83")->fetch(PDO::FETCH_ASSOC);
assertTest($park !== false, "85 Park Street exists in DB (ID 83)", $passes, $failures);

// 265 Ontario Street (ID 12)
$ontario = $db->query("SELECT id, name, address, comments FROM building WHERE id = 12")->fetch(PDO::FETCH_ASSOC);
assertTest($ontario !== false, "265 Ontario Street exists in DB (ID 12)", $passes, $failures);

// 415 Albert Street (ID 11)
$albert = $db->query("SELECT id, name, address, comments FROM building WHERE id = 11")->fetch(PDO::FETCH_ASSOC);
assertTest($albert !== false, "415 Albert Street exists in DB (ID 11)", $passes, $failures);
if ($albert) {
    assertTest(str_contains($albert['comments'] ?? '', 'Lettered units are separate apartments at this address'), "415 Albert records lettered units exception note", $passes, $failures);
}

// 36 Durham Street (ID 86)
$durham = $db->query("SELECT id, name, address, comments FROM building WHERE id = 86")->fetch(PDO::FETCH_ASSOC);
assertTest($durham !== false, "36 Durham Street exists in DB (ID 86)", $passes, $failures);
if ($durham) {
    assertTest(str_contains($durham['comments'] ?? '', 'Yardi letter suffixes are rooms inside the apartment'), "36 Durham records converted house note", $passes, $failures);
}

// -------------------------------------------------------------
// 2. Database Unit Counts & Rosters per Building
// -------------------------------------------------------------
echo "\n--- 2. Database Unit Counts & Rosters per Building ---\n";

// A. 539 Armstrong Road (112 units)
$armstrongUnits = $db->query("SELECT unit_number, floor, provenance, default_set_id FROM unit WHERE building_id = 87 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_ASSOC);
$armstrongCount = count($armstrongUnits);
assertTest($armstrongCount === 112, "539 Armstrong has exactly 112 units in DB (got {$armstrongCount})", $passes, $failures);

$armFloors = [];
$armNums = [];
foreach ($armstrongUnits as $u) {
    $armFloors[$u['floor']] = ($armFloors[$u['floor']] ?? 0) + 1;
    $armNums[] = $u['unit_number'];
}
assertTest(($armFloors['First Floor'] ?? 0) === 22, "Armstrong Floor 1 has 22 units (got " . ($armFloors['First Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($armFloors['Second Floor'] ?? 0) === 22, "Armstrong Floor 2 has 22 units (got " . ($armFloors['Second Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($armFloors['Third Floor'] ?? 0) === 23, "Armstrong Floor 3 has 23 units (got " . ($armFloors['Third Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($armFloors['Fourth Floor'] ?? 0) === 23, "Armstrong Floor 4 has 23 units (got " . ($armFloors['Fourth Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($armFloors['Fifth Floor'] ?? 0) === 22, "Armstrong Floor 5 has 22 units (got " . ($armFloors['Fifth Floor'] ?? 0) . ")", $passes, $failures);

assertTest(!in_array('110', $armNums, true), "Armstrong has no unit 110", $passes, $failures);
assertTest(!in_array('210', $armNums, true), "Armstrong has no unit 210", $passes, $failures);
assertTest(!in_array('510', $armNums, true), "Armstrong has no unit 510", $passes, $failures);

// B. 810 Blackburn Mews (66 units)
$blackburnUnits = $db->query("SELECT unit_number, floor, provenance, default_set_id FROM unit WHERE building_id = 82 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_ASSOC);
$blackburnCount = count($blackburnUnits);
assertTest($blackburnCount === 66, "810 Blackburn Mews has exactly 66 units in DB (got {$blackburnCount})", $passes, $failures);

$bbFloors = [];
$bbNums = [];
$bSuffixed = [];
foreach ($blackburnUnits as $u) {
    $bbFloors[$u['floor']] = ($bbFloors[$u['floor']] ?? 0) + 1;
    $bbNums[] = $u['unit_number'];
    if (str_ends_with($u['unit_number'], 'B')) {
        $bSuffixed[] = $u['unit_number'];
    }
}
assertTest(($bbFloors['First Floor'] ?? 0) === 16, "Blackburn Floor 1 has 16 units (got " . ($bbFloors['First Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($bbFloors['Second Floor'] ?? 0) === 16, "Blackburn Floor 2 has 16 units (got " . ($bbFloors['Second Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($bbFloors['Third Floor'] ?? 0) === 18, "Blackburn Floor 3 has 18 units (got " . ($bbFloors['Third Floor'] ?? 0) . ")", $passes, $failures);
assertTest(($bbFloors['Fourth Floor'] ?? 0) === 16, "Blackburn Floor 4 has 16 units (got " . ($bbFloors['Fourth Floor'] ?? 0) . ")", $passes, $failures);
assertTest(empty($bSuffixed), "Blackburn has zero B-suffixed units (found: " . implode(',', $bSuffixed) . ")", $passes, $failures);

// C. 85 Park Street (15 units)
$parkUnits = $db->query("SELECT unit_number FROM unit WHERE building_id = 83 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_COLUMN);
$parkCount = count($parkUnits);
assertTest($parkCount === 15, "85 Park Street has exactly 15 units in DB (got {$parkCount})", $passes, $failures);
assertTest(!in_array('13', $parkUnits, true), "85 Park Street has no unit 13", $passes, $failures);
$expectedPark = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '15', '16'];
assertTest($parkUnits === $expectedPark, "85 Park Street matches exact numbers 1-12, 14-16", $passes, $failures);

// D. 265 Ontario Street (14 units)
$ontarioUnits = $db->query("SELECT unit_number FROM unit WHERE building_id = 12 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_COLUMN);
$ontarioCount = count($ontarioUnits);
assertTest($ontarioCount === 14, "265 Ontario Street has exactly 14 units in DB (got {$ontarioCount})", $passes, $failures);
$expectedOntario = array_map('strval', range(1, 14));
assertTest($ontarioUnits === $expectedOntario, "265 Ontario Street matches exact numbers 1-14", $passes, $failures);

// E. 415 Albert Street (6 units)
$albertUnits = $db->query("SELECT unit_number FROM unit WHERE building_id = 11 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
$albertCount = count($albertUnits);
assertTest($albertCount === 6, "415 Albert Street has exactly 6 units in DB (got {$albertCount})", $passes, $failures);
$expectedAlbert = ['415', '415B', '415C', '415D', '415E', '415F'];
sort($albertUnits);
sort($expectedAlbert);
assertTest($albertUnits === $expectedAlbert, "415 Albert Street has all six lettered units (415, 415B-415F)", $passes, $failures);

// F. 36 Durham Street (1 unit)
$durhamUnits = $db->query("SELECT unit_number FROM unit WHERE building_id = 86")->fetchAll(PDO::FETCH_COLUMN);
$durhamCount = count($durhamUnits);
assertTest($durhamCount === 1, "36 Durham Street has exactly 1 unit in DB (got {$durhamCount})", $passes, $failures);
assertTest(($durhamUnits[0] ?? '') === '1', "36 Durham Street unit number is '1'", $passes, $failures);

// -------------------------------------------------------------
// 3. Prohibitions, Provenance & Total Count (214 units)
// -------------------------------------------------------------
echo "\n--- 3. Prohibitions, Provenance & Total Count ---\n";

$singleBldgIds = [87, 82, 83, 12, 11, 86];
$idList = implode(',', $singleBldgIds);

$totalUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN ($idList)")->fetchColumn();
assertTest($totalUnits === 214, "Exact 214 units total across the six singles in DB (got {$totalUnits})", $passes, $failures);

$waitUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN ($idList) AND unit_number LIKE '%WAIT%'")->fetchColumn();
assertTest($waitUnits === 0, "Zero WAIT* placeholder units exist across the six singles", $passes, $failures);

$patternUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN ($idList) AND provenance LIKE '%pattern%'")->fetchColumn();
assertTest($patternUnits === 0, "Zero pattern-generated units left for the six singles in DB", $passes, $failures);

$verifiedUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN ($idList) AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($verifiedUnits === 214, "All 214 units have provenance 'verified — Yardi extract 2026-10-22' (got {$verifiedUnits})", $passes, $failures);

$defaultSetUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN ($idList) AND default_set_id = 'set-singles-apt'")->fetchColumn();
assertTest($defaultSetUnits === 214, "All 214 units inherit default set 'set-singles-apt' by reference (got {$defaultSetUnits})", $passes, $failures);

// -------------------------------------------------------------
// 4. TypeScript Constants & Unit Generation Verification
// -------------------------------------------------------------
echo "\n--- 4. TypeScript Constants & Unit Generation Verification ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');
assertTest(str_contains($tsCode, 'set-singles-apt'), "TypeScript defines 'set-singles-apt' in residential_constants.tsx", $passes, $failures);

$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES, DEFAULT_APPLIANCE_SETS } = require("./residential_constants.tsx");

const bIds = [
    { id: "prop-armstrong-539", expected: 112, name: "Armstrong" },
    { id: "prop-blackburn-810", expected: 66, name: "Blackburn" },
    { id: "prop-park-85", expected: 15, name: "Park" },
    { id: "prop-ontario-265", expected: 14, name: "Ontario" },
    { id: "prop-albert-415", expected: 6, name: "Albert" },
    { id: "prop-durham-36", expected: 1, name: "Durham" }
];

const results = {};
let totalUnits = 0;

for (const { id, expected, name } of bIds) {
    const prop = RESIDENTIAL_PROPERTIES.find(p => p.id === id);
    if (!prop) {
        results[name] = { error: `Not found: ${id}` };
        continue;
    }
    const units = generateUnitRoster(prop);
    totalUnits += units.length;
    results[name] = {
        found: true,
        count: units.length,
        aliases: prop.aliases || [],
        isStorageNode: prop.isStorageNode,
        comments: prop.comments || "",
        unitNumbers: units.map(u => u.unitNumber),
        provenances: [...new Set(units.map(u => u.provenance))],
        defaultSets: [...new Set(units.map(u => u.defaultSetId))],
        floorCounts: units.reduce((acc, u) => {
            acc[u.floor || "Unknown"] = (acc[u.floor || "Unknown"] || 0) + 1;
            return acc;
        }, {})
    };
}

console.log(JSON.stringify({ totalUnits, results }));
';

$nodeCmd = "npx tsx -e " . escapeshellarg($testScript);
$output = shell_exec($nodeCmd);
$tsRes = json_decode(trim($output ?? ''), true);

if (!$tsRes || !isset($tsRes['totalUnits'])) {
    echo "[FAIL] TypeScript evaluation failed: " . ($output ?: 'no output') . "\n";
    $failures++;
} else {
    assertTest($tsRes['totalUnits'] === 214, "TypeScript generateUnitRoster produces exactly 214 units across the 6 singles (got {$tsRes['totalUnits']})", $passes, $failures);

    $r = $tsRes['results'];
    // Armstrong
    assertTest(($r['Armstrong']['count'] ?? 0) === 112, "TypeScript Armstrong has 112 units", $passes, $failures);
    assertTest(in_array('Riverstone', $r['Armstrong']['aliases'] ?? []), "TypeScript Armstrong has alias 'Riverstone'", $passes, $failures);
    assertTest(($r['Armstrong']['isStorageNode'] ?? false) === true, "TypeScript Armstrong keeps storage role", $passes, $failures);
    assertTest(!in_array('110', $r['Armstrong']['unitNumbers'] ?? []), "TypeScript Armstrong has no unit 110", $passes, $failures);
    assertTest(!in_array('210', $r['Armstrong']['unitNumbers'] ?? []), "TypeScript Armstrong has no unit 210", $passes, $failures);
    assertTest(!in_array('510', $r['Armstrong']['unitNumbers'] ?? []), "TypeScript Armstrong has no unit 510", $passes, $failures);

    // Blackburn
    assertTest(($r['Blackburn']['count'] ?? 0) === 66, "TypeScript Blackburn has 66 units", $passes, $failures);
    assertTest(in_array('Stonecrest', $r['Blackburn']['aliases'] ?? []), "TypeScript Blackburn has alias 'Stonecrest'", $passes, $failures);
    assertTest(($r['Blackburn']['isStorageNode'] ?? false) === true, "TypeScript Blackburn keeps storage role", $passes, $failures);
    $bbBSuffixed = array_filter($r['Blackburn']['unitNumbers'] ?? [], fn($n) => str_ends_with($n, 'B'));
    assertTest(empty($bbBSuffixed), "TypeScript Blackburn has zero B-suffixed units", $passes, $failures);

    // Park
    assertTest(($r['Park']['count'] ?? 0) === 15, "TypeScript Park has 15 units", $passes, $failures);
    assertTest(($r['Park']['isStorageNode'] ?? false) === true, "TypeScript Park keeps storage role", $passes, $failures);
    assertTest(!in_array('13', $r['Park']['unitNumbers'] ?? []), "TypeScript Park has no unit 13", $passes, $failures);

    // Ontario
    assertTest(($r['Ontario']['count'] ?? 0) === 14, "TypeScript Ontario has 14 units", $passes, $failures);
    assertTest(($r['Ontario']['isStorageNode'] ?? false) === true, "TypeScript Ontario keeps storage role", $passes, $failures);

    // Albert
    assertTest(($r['Albert']['count'] ?? 0) === 6, "TypeScript Albert has 6 units", $passes, $failures);
    $albertUnitsTs = $r['Albert']['unitNumbers'] ?? [];
    sort($albertUnitsTs);
    assertTest($albertUnitsTs === ['415', '415B', '415C', '415D', '415E', '415F'], "TypeScript Albert has all six lettered units", $passes, $failures);

    // Durham
    assertTest(($r['Durham']['count'] ?? 0) === 1, "TypeScript Durham has 1 unit", $passes, $failures);
    assertTest(($r['Durham']['unitNumbers'] ?? []) === ['1'], "TypeScript Durham has unit '1'", $passes, $failures);

    // Provenance and Default Set across all
    $allProv = [];
    $allDefaultSets = [];
    foreach ($r as $bName => $bData) {
        $allProv = array_merge($allProv, $bData['provenances'] ?? []);
        $allDefaultSets = array_merge($allDefaultSets, $bData['defaultSets'] ?? []);
    }
    $uniqueProv = array_values(array_unique($allProv));
    $uniqueSets = array_values(array_unique($allDefaultSets));
    assertTest($uniqueProv === ['verified — Yardi extract 2026-10-22'], "TypeScript units across all 6 singles have verified Yardi provenance", $passes, $failures);
    assertTest($uniqueSets === ['set-singles-apt'], "TypeScript units across all 6 singles inherit 'set-singles-apt' by reference", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n======================================================\n";
echo "Tests Passed: {$passes}\n";
echo "Tests Failed: {$failures}\n";
echo "======================================================\n";

exit($failures > 0 ? 1 : 0);
