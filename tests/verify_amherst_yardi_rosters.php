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

echo "=== Running Acceptance Tests for Amherst Verified Yardi Rosters ===\n\n";

// Street number to building ID mapping
$streetToBldgId = [
    103 => 90,
    107 => 58,
    111 => 57,
    115 => 56,
    119 => 55,
    123 => 54,
    125 => 53,
    127 => 52,
    129 => 51,
    131 => 50,
    133 => 49,
    135 => 48,
    137 => 10,
    141 => 47,
    145 => 46,
    149 => 45,
    153 => 44,
    157 => 43,
    161 => 42,
    165 => 41,
    167 => 40,
    169 => 39,
    171 => 38,
    173 => 37,
    175 => 36,
    177 => 35,
    179 => 34,
    183 => 33,
    187 => 32,
    191 => 31,
    193 => 30,
    195 => 29,
    197 => 28,
    199 => 27,
    201 => 26,
    205 => 25,
    207 => 24,
    209 => 23,
    211 => 22,
    213 => 21,
    217 => 20,
    219 => 19,
    225 => 18,
    229 => 17,
];

$threeTwoTwoStreets = [111, 115, 119, 141, 145, 149, 153, 157, 161, 183, 187];
$fourByFourStreets = [225, 229];
$townhouseStreets = [
    123, 125, 127, 129, 131, 133, 135, 137,
    165, 167, 169, 171, 173, 175, 177, 179,
    191, 193, 195, 197, 199, 201, 205, 207,
    209, 211, 213, 217, 219
];

// -------------------------------------------------------------
// 1. Building Counts & 103 Record
// -------------------------------------------------------------
echo "--- 1. Building Records & Counts in Database ---\n";

$bldg103 = $db->query("SELECT * FROM building WHERE address LIKE '%103 Amherst%' OR name LIKE '%103 Amherst%'")->fetch(PDO::FETCH_ASSOC);
assertTest($bldg103 !== false, "103 Amherst building record exists in database", $passes, $failures);
if ($bldg103) {
    assertTest((int)$bldg103['complex_id'] === 3, "103 Amherst is assigned to Amherst complex (ID 3)", $passes, $failures);
}

$amherstBldgCount = (int)$db->query("SELECT COUNT(*) FROM building WHERE complex_id = 3")->fetchColumn();
assertTest($amherstBldgCount === 44, "Amherst complex has exactly 44 buildings in database (got {$amherstBldgCount})", $passes, $failures);

$totalBldgs = (int)$db->query("SELECT COUNT(*) FROM building")->fetchColumn();
assertTest($totalBldgs >= 89, "Total portfolio buildings in database is at least 89 (got {$totalBldgs})", $passes, $failures);

// -------------------------------------------------------------
// 2. 103 and 107 Unit Rosters (35 each, no 105, 103 carries UTILITY)
// -------------------------------------------------------------
echo "\n--- 2. 103 and 107 Unit Rosters ---\n";

$b107Id = $streetToBldgId[107];
$count107 = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = {$b107Id}")->fetchColumn();
assertTest($count107 === 35, "107 Amherst has exactly 35 units in database (got {$count107})", $passes, $failures);

$has105In107 = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = {$b107Id} AND unit_number = '105'")->fetchColumn();
assertTest($has105In107 === 0, "Unit 105 does NOT exist in 107 Amherst", $passes, $failures);

if ($bldg103) {
    $b103Id = (int)$bldg103['id'];
    $count103 = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = {$b103Id}")->fetchColumn();
    assertTest($count103 === 35, "103 Amherst has exactly 35 units in database (got {$count103})", $passes, $failures);

    $has105In103 = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = {$b103Id} AND unit_number = '105'")->fetchColumn();
    assertTest($has105In103 === 0, "Unit 105 does NOT exist in 103 Amherst", $passes, $failures);

    // Verify 103 carries its UTILITY space
    $comments103 = $bldg103['comments'] ?? '';
    assertTest(str_contains($comments103, 'UTILITY'), "103 Amherst carries UTILITY non-residential space record in building data", $passes, $failures);
}

// Check notes for 103 and 107
$bldg107 = $db->query("SELECT * FROM building WHERE id = {$b107Id}")->fetch(PDO::FETCH_ASSOC);
$note107 = $bldg107['comments'] ?? '';
assertTest(str_contains($note107, 'Floor 1 skips 105 (utility/laundry space)'), "107 Amherst building note documents skipping unit 105", $passes, $failures);
if ($bldg103) {
    assertTest(str_contains($bldg103['comments'] ?? '', 'Floor 1 skips 105 (utility/laundry space)'), "103 Amherst building note documents skipping unit 105", $passes, $failures);
}

// -------------------------------------------------------------
// 3. Eleven "3-2-2" Buildings (7 units each = 77 units)
// -------------------------------------------------------------
echo "\n--- 3. Eleven 3-2-2 Buildings (7 units each) ---\n";

$all322Pass = true;
$expected322Units = ['101', '102', '103', '201', '202', '301', '302'];
foreach ($threeTwoTwoStreets as $st) {
    $bId = $streetToBldgId[$st];
    $units = $db->query("SELECT unit_number FROM unit WHERE building_id = {$bId} ORDER BY unit_number")->fetchAll(PDO::FETCH_COLUMN);
    if (count($units) !== 7 || $units !== $expected322Units) {
        $all322Pass = false;
        echo "[FAIL] {$st} Amherst has unexpected units: " . implode(', ', $units) . "\n";
    }
}
assertTest($all322Pass, "All eleven 3-2-2 buildings have exactly 7 units (101, 102, 103, 201, 202, 301, 302)", $passes, $failures);

// -------------------------------------------------------------
// 4. Two "4×4" Buildings (16 units each = 32 units)
// -------------------------------------------------------------
echo "\n--- 4. Two 4x4 Buildings (16 units each) ---\n";

$all4x4Pass = true;
$expected4x4Units = [
    '101', '102', '103', '104',
    '201', '202', '203', '204',
    '301', '302', '303', '304',
    '401', '402', '403', '404'
];
foreach ($fourByFourStreets as $st) {
    $bId = $streetToBldgId[$st];
    $units = $db->query("SELECT unit_number FROM unit WHERE building_id = {$bId} ORDER BY unit_number")->fetchAll(PDO::FETCH_COLUMN);
    if (count($units) !== 16 || $units !== $expected4x4Units) {
        $all4x4Pass = false;
        echo "[FAIL] {$st} Amherst has unexpected units: " . implode(', ', $units) . "\n";
    }
}
assertTest($all4x4Pass, "Both 4x4 buildings (225, 229) have exactly 16 units (101-104, 201-204, 301-304, 401-404)", $passes, $failures);

// -------------------------------------------------------------
// 5. Twenty-Nine Townhouses (1 unit each = 29 units)
// -------------------------------------------------------------
echo "\n--- 5. Twenty-Nine Townhouses ---\n";

$allTownhousesPass = true;
foreach ($townhouseStreets as $st) {
    $bId = $streetToBldgId[$st];
    $units = $db->query("SELECT unit_number, floor FROM unit WHERE building_id = {$bId}")->fetchAll(PDO::FETCH_ASSOC);
    if (count($units) !== 1 || $units[0]['unit_number'] !== (string)$st) {
        $allTownhousesPass = false;
        echo "[FAIL] Townhouse {$st} Amherst has unexpected units: " . json_encode($units) . "\n";
    }
}
assertTest($allTownhousesPass, "All 29 townhouses have exactly 1 unit whose label equals its street number", $passes, $failures);

// -------------------------------------------------------------
// 6. Complex Total & Prohibitions
// -------------------------------------------------------------
echo "\n--- 6. Complex Total & Prohibitions ---\n";

$amherstBldgIds = array_values($streetToBldgId);
$inClause = implode(',', $amherstBldgIds);
$totalAmherstUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN ({$inClause})")->fetchColumn();
assertTest($totalAmherstUnits === 208, "Complex total is exactly 208 units across 44 buildings in database (got {$totalAmherstUnits})", $passes, $failures);

// Prohibited WAIT* units
$waitUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE unit_number LIKE 'WAIT%'")->fetchColumn();
assertTest($waitUnits === 0, "No WAIT* placeholder units exist in database (got {$waitUnits})", $passes, $failures);

// Provenance
$verifiedUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN ({$inClause}) AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($verifiedUnits === 208, "All 208 Amherst units in database have provenance 'verified — Yardi extract 2026-10-22' (got {$verifiedUnits})", $passes, $failures);

$patternUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN ({$inClause}) AND provenance LIKE '%pattern%'")->fetchColumn();
assertTest($patternUnits === 0, "Zero pattern units remain in Amherst complex in database (got {$patternUnits})", $passes, $failures);

// -------------------------------------------------------------
// 7. Verified Appliance Anchoring at 137 Amherst
// -------------------------------------------------------------
echo "\n--- 7. Verified Appliance Anchoring at 137 Amherst ---\n";

$unit137Row = $db->query("SELECT id FROM unit WHERE building_id = 10 AND unit_number = '137'")->fetch(PDO::FETCH_ASSOC);
assertTest($unit137Row !== false, "Unit 137 exists in 137 Amherst Drive (building 10)", $passes, $failures);

if ($unit137Row) {
    $u137Id = (int)$unit137Row['id'];
    $range = $db->query("SELECT * FROM appliance WHERE id = 2 AND unit_id = {$u137Id}")->fetch(PDO::FETCH_ASSOC);
    assertTest($range !== false, "Gray Frigidaire range (ID 2) anchors to Unit 137 at 137 Amherst Drive", $passes, $failures);

    $wh = $db->query("SELECT * FROM appliance WHERE id = 3 AND unit_id = {$u137Id}")->fetch(PDO::FETCH_ASSOC);
    assertTest($wh !== false, "Rheem water heater (ID 3) anchors to Unit 137 at 137 Amherst Drive", $passes, $failures);
}

// -------------------------------------------------------------
// 8. TypeScript Constants Integrity
// -------------------------------------------------------------
echo "\n--- 8. TypeScript Constants Integrity (residential_constants.tsx) ---\n";

$tmpScript = __DIR__ . '/check_amherst_ts.mjs';
$scriptCode = <<<JAVASCRIPT
import { RESIDENTIAL_PROPERTIES, RESIDENTIAL_UNITS, DEFAULT_APPLIANCE_SETS } from '../residential_constants';

const amherstBuildings = RESIDENTIAL_PROPERTIES.filter(p => p.complexId === 'amherst');
const amherstUnits = RESIDENTIAL_UNITS.filter(u => amherstBuildings.some(b => b.id === u.buildingId));

const b107 = amherstBuildings.find(b => b.id === 'prop-amherst-107');
const b103 = amherstBuildings.find(b => b.id === 'prop-amherst-103');
const b125 = amherstBuildings.find(b => b.id === 'prop-amherst-125');

const units107 = amherstUnits.filter(u => u.buildingId === 'prop-amherst-107');
const units103 = amherstUnits.filter(u => u.buildingId === 'prop-amherst-103');

const has105In107 = units107.some(u => u.unitNumber === '105');
const has105In103 = units103.some(u => u.unitNumber === '105');

const patternUnits = amherstUnits.filter(u => u.provenance === 'pattern');
const waitUnits = amherstUnits.filter(u => u.unitNumber.startsWith('WAIT'));

const threeTwoTwoStreets = [111, 115, 119, 141, 145, 149, 153, 157, 161, 183, 187];
const fourByFourStreets = [225, 229];
const townhouseStreets = [
    123, 125, 127, 129, 131, 133, 135, 137,
    165, 167, 169, 171, 173, 175, 177, 179,
    191, 193, 195, 197, 199, 201, 205, 207,
    209, 211, 213, 217, 219
];

const threeTwoTwoCounts = threeTwoTwoStreets.map(st => ({
    street: st,
    count: amherstUnits.filter(u => u.buildingId === `prop-amherst-\${st}`).length
}));

const fourByFourCounts = fourByFourStreets.map(st => ({
    street: st,
    count: amherstUnits.filter(u => u.buildingId === `prop-amherst-\${st}`).length
}));

const townhouseCounts = townhouseStreets.map(st => {
    const bUnits = amherstUnits.filter(u => u.buildingId === `prop-amherst-\${st}`);
    return {
        street: st,
        count: bUnits.length,
        unitNumber: bUnits[0]?.unitNumber,
        unitType: bUnits[0]?.unitType
    };
});

const defaultSetsAmherst = DEFAULT_APPLIANCE_SETS.filter(s => s.complexSlug === 'amherst' || s.complexId === 'amherst');

const results = {
    totalAmherstBuildings: amherstBuildings.length,
    totalAmherstUnits: amherstUnits.length,
    b107StorageNode: b107?.isStorageNode === true && Array.isArray(b107?.storageInventory),
    b107Skips105Comment: (b107?.comments || '').includes('Floor 1 skips 105 (utility/laundry space)'),
    b103Skips105Comment: (b103?.comments || '').includes('Floor 1 skips 105 (utility/laundry space)'),
    b103DefinedRoomsHasUtility: (b103?.definedRooms || []).includes('UTILITY'),
    b125Identity: (b125?.comments || '').includes('Amherst Townhouse'),
    count107: units107.length,
    count103: units103.length,
    has105In107,
    has105In103,
    patternUnitsCount: patternUnits.length,
    waitUnitsCount: waitUnits.length,
    threeTwoTwoAllSeven: threeTwoTwoCounts.every(c => c.count === 7),
    fourByFourAllSixteen: fourByFourCounts.every(c => c.count === 16),
    townhousesAllOneMatchStreet: townhouseCounts.every(c => c.count === 1 && c.unitNumber === String(c.street) && c.unitType === 'townhouse'),
    defaultSetsCount: defaultSetsAmherst.length
};

console.log(JSON.stringify(results));
JAVASCRIPT;

file_put_contents($tmpScript, $scriptCode);

$tsOutput = shell_exec('npx -y tsx tests/check_amherst_ts.mjs 2>/dev/null');
@unlink($tmpScript);

$tsData = json_decode($tsOutput ?: '', true);

if ($tsData) {
    assertTest($tsData['totalAmherstBuildings'] === 44, "TypeScript RESIDENTIAL_PROPERTIES has exactly 44 Amherst buildings (got {$tsData['totalAmherstBuildings']})", $passes, $failures);
    assertTest($tsData['totalAmherstUnits'] === 208, "TypeScript RESIDENTIAL_UNITS produces exactly 208 Amherst units (got {$tsData['totalAmherstUnits']})", $passes, $failures);
    assertTest($tsData['count107'] === 35, "TypeScript 107 Amherst has exactly 35 units (got {$tsData['count107']})", $passes, $failures);
    assertTest($tsData['count103'] === 35, "TypeScript 103 Amherst has exactly 35 units (got {$tsData['count103']})", $passes, $failures);
    assertTest(!$tsData['has105In107'], "TypeScript unit 105 does NOT exist in 107 Amherst", $passes, $failures);
    assertTest(!$tsData['has105In103'], "TypeScript unit 105 does NOT exist in 103 Amherst", $passes, $failures);
    assertTest($tsData['b103DefinedRoomsHasUtility'], "TypeScript 103 Amherst definedRooms carries 'UTILITY' space", $passes, $failures);
    assertTest($tsData['b107StorageNode'], "TypeScript 107 Amherst retains storage-node role and stockpile", $passes, $failures);
    assertTest($tsData['b125Identity'], "TypeScript 125 Amherst retains Amherst Townhouse identity", $passes, $failures);
    assertTest($tsData['b107Skips105Comment'], "TypeScript 107 Amherst note includes 'Floor 1 skips 105 (utility/laundry space)'", $passes, $failures);
    assertTest($tsData['b103Skips105Comment'], "TypeScript 103 Amherst note includes 'Floor 1 skips 105 (utility/laundry space)'", $passes, $failures);
    assertTest($tsData['threeTwoTwoAllSeven'], "TypeScript all eleven 3-2-2 buildings have exactly 7 units each", $passes, $failures);
    assertTest($tsData['fourByFourAllSixteen'], "TypeScript both 4x4 buildings have exactly 16 units each", $passes, $failures);
    assertTest($tsData['townhousesAllOneMatchStreet'], "TypeScript all 29 townhouses have 1 unit matching street number", $passes, $failures);
    assertTest($tsData['patternUnitsCount'] === 0, "Zero pattern units in Amherst in TypeScript (got {$tsData['patternUnitsCount']})", $passes, $failures);
    assertTest($tsData['waitUnitsCount'] === 0, "Zero WAIT* units in Amherst in TypeScript (got {$tsData['waitUnitsCount']})", $passes, $failures);
} else {
    echo "[FAIL] Failed to run TypeScript integrity check\n";
    $failures++;
}

echo "\n========================================\n";
echo "Amherst Rosters Acceptance Verification Summary:\n";
echo "Passes: {$passes}\n";
echo "Failures: {$failures}\n";
echo "========================================\n";

if ($failures > 0) {
    echo "ERROR: {$failures} Amherst acceptance tests failed!\n";
    exit(1);
} else {
    echo "SUCCESS: All Amherst Verified Yardi Rosters Acceptance Tests PASSED!\n";
    exit(0);
}
