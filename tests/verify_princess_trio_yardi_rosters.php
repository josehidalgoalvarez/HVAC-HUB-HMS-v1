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

echo "=== Running Acceptance Tests for Princess Trio Verified Yardi Rosters ===\n\n";

// -------------------------------------------------------------
// 1. Building Records & Site Notes in Database
// -------------------------------------------------------------
echo "--- 1. Building Records & Site Notes in Database ---\n";

$bldgs = $db->query("SELECT id, name, address, comments, complex_id FROM building WHERE id IN (59, 60, 61) ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$bldgMap = [];
foreach ($bldgs as $b) {
    $bldgMap[(int)$b['id']] = $b;
}

$siteNote = 'Part of the 563/565/567 Princess site — displayed building number is 565. Yardi letter suffixes are rooms inside the unit.';

assertTest(isset($bldgMap[59]), "Building 563 Princess exists (ID 59)", $passes, $failures);
if (isset($bldgMap[59])) {
    assertTest(str_contains($bldgMap[59]['comments'] ?? '', $siteNote), "563 Princess comments contain site note", $passes, $failures);
    assertTest((int)$bldgMap[59]['complex_id'] === 4, "563 Princess complex assignment unchanged (ID 4)", $passes, $failures);
}

assertTest(isset($bldgMap[60]), "Building 565 Princess exists (ID 60)", $passes, $failures);
if (isset($bldgMap[60])) {
    assertTest(str_contains($bldgMap[60]['comments'] ?? '', $siteNote), "565 Princess comments contain site note", $passes, $failures);
    assertTest((int)$bldgMap[60]['complex_id'] === 4, "565 Princess complex assignment unchanged (ID 4)", $passes, $failures);
}

assertTest(isset($bldgMap[61]), "Building 567 Princess exists (ID 61)", $passes, $failures);
if (isset($bldgMap[61])) {
    assertTest(str_contains($bldgMap[61]['comments'] ?? '', $siteNote), "567 Princess comments contain site note", $passes, $failures);
    assertTest((int)$bldgMap[61]['complex_id'] === 4, "567 Princess complex assignment unchanged (ID 4)", $passes, $failures);
}

// -------------------------------------------------------------
// 2. Unit Counts & Exact Rosters in Database
// -------------------------------------------------------------
echo "\n--- 2. Unit Counts & Exact Rosters in Database ---\n";

$units59 = $db->query("SELECT unit_number, floor, provenance FROM unit WHERE building_id = 59 ORDER BY CAST(unit_number AS INTEGER) ASC, unit_number ASC")->fetchAll(PDO::FETCH_ASSOC);
$units60 = $db->query("SELECT unit_number, floor, provenance FROM unit WHERE building_id = 60")->fetchAll(PDO::FETCH_ASSOC);
$units61 = $db->query("SELECT unit_number, floor, provenance FROM unit WHERE building_id = 61")->fetchAll(PDO::FETCH_ASSOC);

$uNums59 = array_column($units59, 'unit_number');
$uNums60 = array_column($units60, 'unit_number');
$uNums61 = array_column($units61, 'unit_number');

// 563 Princess (23 units)
assertTest(count($units59) === 23, "563 Princess has exactly 23 units (got " . count($units59) . ")", $passes, $failures);
assertTest(in_array('1', $uNums59), "563 Princess includes unit '1' (house unit)", $passes, $failures);
assertTest(!in_array('602', $uNums59), "563 Princess does NOT contain unit 602", $passes, $failures);

$expected59 = [
    '1',
    '101', '102', '103',
    '201', '202', '203', '204',
    '301', '302', '303', '304',
    '401', '402', '403', '404',
    '501', '502', '503', '504',
    '601', '603', '604'
];
sort($expected59);
$actual59Sorted = $uNums59;
sort($actual59Sorted);
assertTest($actual59Sorted === $expected59, "563 Princess units match exact verified list (23 units)", $passes, $failures);

// 565 Princess (1 unit: '1')
assertTest(count($units60) === 1, "565 Princess has exactly 1 unit (got " . count($units60) . ")", $passes, $failures);
assertTest($uNums60 === ['1'], "565 Princess unit number is exactly '1'", $passes, $failures);

// 567 Princess (1 unit: '1')
assertTest(count($units61) === 1, "567 Princess has exactly 1 unit (got " . count($units61) . ")", $passes, $failures);
assertTest($uNums61 === ['1'], "567 Princess unit number is exactly '1'", $passes, $failures);

// Trio total: 25 units
$trioTotal = count($units59) + count($units60) + count($units61);
assertTest($trioTotal === 25, "Princess trio total units is exactly 25 (got {$trioTotal})", $passes, $failures);

// -------------------------------------------------------------
// 3. Floor Derivation & Prohibitions
// -------------------------------------------------------------
echo "\n--- 3. Floor Derivation & Prohibitions ---\n";

// Letter suffixes check
$letterSuffixed = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (59, 60, 61) AND unit_number GLOB '*[A-Za-z]*'")->fetchColumn();
assertTest($letterSuffixed === 0, "Zero units contain letter room suffixes (B/C/D) (got {$letterSuffixed})", $passes, $failures);

// WAIT* placeholders check
$waitCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (59, 60, 61) AND unit_number LIKE '%WAIT%'")->fetchColumn();
assertTest($waitCount === 0, "Zero WAIT* placeholder units exist in trio (got {$waitCount})", $passes, $failures);

// Provenance check
$verifiedCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (59, 60, 61) AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($verifiedCount === 25, "All 25 trio units carry provenance 'verified — Yardi extract 2026-10-22' (got {$verifiedCount})", $passes, $failures);

// Check floors for 563 units
$unitFloorMap = [];
foreach ($units59 as $u) {
    $unitFloorMap[$u['unit_number']] = $u['floor'];
}
assertTest(($unitFloorMap['1'] ?? '') === 'First Floor', "563 Unit 1 floor is 'First Floor'", $passes, $failures);
assertTest(($unitFloorMap['101'] ?? '') === 'First Floor', "563 Unit 101 floor is 'First Floor'", $passes, $failures);
assertTest(($unitFloorMap['201'] ?? '') === 'Second Floor', "563 Unit 201 floor is 'Second Floor'", $passes, $failures);
assertTest(($unitFloorMap['301'] ?? '') === 'Third Floor', "563 Unit 301 floor is 'Third Floor'", $passes, $failures);
assertTest(($unitFloorMap['401'] ?? '') === 'Fourth Floor', "563 Unit 401 floor is 'Fourth Floor'", $passes, $failures);
assertTest(($unitFloorMap['501'] ?? '') === 'Fifth Floor', "563 Unit 501 floor is 'Fifth Floor'", $passes, $failures);
assertTest(($unitFloorMap['601'] ?? '') === 'Sixth Floor', "563 Unit 601 floor is 'Sixth Floor'", $passes, $failures);
assertTest(($unitFloorMap['603'] ?? '') === 'Sixth Floor', "563 Unit 603 floor is 'Sixth Floor'", $passes, $failures);

// -------------------------------------------------------------
// 4. Default Appliance Set in Database
// -------------------------------------------------------------
echo "\n--- 4. Default Appliance Set in Database ---\n";

$princessSet = $db->query("SELECT * FROM default_sets WHERE id = 'set-princess-apt' OR id = 'set-quadrant-apt'")->fetch(PDO::FETCH_ASSOC);
assertTest($princessSet !== false, "Princess / Quadrant apartment default appliance set exists in database", $passes, $failures);

// -------------------------------------------------------------
// 5. TypeScript Constants Integrity & Unit Generation
// -------------------------------------------------------------
echo "\n--- 5. TypeScript Constants Integrity & Unit Generation ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');
assertTest(str_contains($tsCode, 'PRINCESS_TRIO_YARDI_ROSTERS'),
    "TypeScript defines PRINCESS_TRIO_YARDI_ROSTERS constant", $passes, $failures);

$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES } = require("./residential_constants.tsx");
const p563 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-princess-563");
const p565 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-princess-565");
const p567 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-princess-567");

const u563 = p563 ? generateUnitRoster(p563) : [];
const u565 = p565 ? generateUnitRoster(p565) : [];
const u567 = p567 ? generateUnitRoster(p567) : [];

const uNums563 = u563.map(u => u.unitNumber);
const uNums565 = u565.map(u => u.unitNumber);
const uNums567 = u567.map(u => u.unitNumber);

const provs = [...new Set([...u563, ...u565, ...u567].map(u => u.provenance))];
const setIds = [...new Set([...u563, ...u565, ...u567].map(u => u.defaultSetId))];

console.log(JSON.stringify({
    has563: !!p563,
    has565: !!p565,
    has567: !!p567,
    comments563: p563?.comments,
    count563: u563.length,
    count565: u565.length,
    count567: u567.length,
    has602: uNums563.includes("602"),
    hasUnit1In563: uNums563.includes("1"),
    uNums565,
    uNums567,
    provs,
    setIds,
    unit1Type: u563.find(u => u.unitNumber === "1")?.unitType,
    unit1Floor: u563.find(u => u.unitNumber === "1")?.floor
}));
';

$nodeCmd = "npx tsx -e " . escapeshellarg($testScript);
$output = shell_exec($nodeCmd);
$tsResult = json_decode($output, true);

if ($tsResult) {
    assertTest($tsResult['count563'] === 23, "TypeScript generates 23 units for 563 Princess (got {$tsResult['count563']})", $passes, $failures);
    assertTest($tsResult['count565'] === 1, "TypeScript generates 1 unit for 565 Princess (got {$tsResult['count565']})", $passes, $failures);
    assertTest($tsResult['count567'] === 1, "TypeScript generates 1 unit for 567 Princess (got {$tsResult['count567']})", $passes, $failures);
    assertTest($tsResult['hasUnit1In563'] === true, "TypeScript 563 includes unit '1'", $passes, $failures);
    assertTest($tsResult['has602'] === false, "TypeScript 563 skips 602", $passes, $failures);
    assertTest($tsResult['uNums565'] === ['1'], "TypeScript 565 has unit '1'", $passes, $failures);
    assertTest($tsResult['uNums567'] === ['1'], "TypeScript 567 has unit '1'", $passes, $failures);
    assertTest(str_contains($tsResult['comments563'] ?? '', $siteNote), "TypeScript 563 carries site note", $passes, $failures);
    assertTest($tsResult['provs'] === ['verified — Yardi extract 2026-10-22'], "TypeScript units carry verified provenance", $passes, $failures);
    assertTest($tsResult['unit1Floor'] === 'First Floor', "TypeScript unit 1 is Floor 1 ('First Floor')", $passes, $failures);
} else {
    assertTest(false, "TypeScript runtime inspection failed", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Princess Trio Rosters Acceptance Verification Summary:\n";
echo "Passes: {$passes}\n";
echo "Failures: {$failures}\n";
echo "========================================\n";

if ($failures === 0) {
    echo "SUCCESS: All Princess Trio Verified Yardi Rosters Acceptance Tests PASSED!\n";
    exit(0);
} else {
    echo "FAILURE: Some acceptance tests failed!\n";
    exit(1);
}
