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

echo "=== Running Acceptance Tests for 630 and 800 Princess Verified Yardi Rosters ===\n\n";

// -------------------------------------------------------------
// 1. Building Records, Aliases & Notes in Database
// -------------------------------------------------------------
echo "--- 1. Building Records, Aliases & Notes in Database ---\n";

$bldgs = $db->query("SELECT id, name, address, comments, aliases, yardi_codes, external_ids, complex_id FROM building WHERE id IN (62, 64, 94) ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$bldgMap = [];
foreach ($bldgs as $b) {
    $bldgMap[(int)$b['id']] = $b;
}

// 630 Princess St (ID 62)
assertTest(isset($bldgMap[62]), "Building 630 Princess exists (ID 62)", $passes, $failures);
if (isset($bldgMap[62])) {
    assertTest(str_contains($bldgMap[62]['comments'] ?? '', 'Under construction (Oct 2026)'), "630 Princess comments contain under-construction note", $passes, $failures);
    assertTest($bldgMap[62]['complex_id'] === null || (int)$bldgMap[62]['complex_id'] === 4, "630 Princess complex assignment is standalone or Princess (got " . ($bldgMap[62]['complex_id'] ?? 'NULL') . ")", $passes, $failures);
}

// 800 Princess St (ID 64)
assertTest(isset($bldgMap[64]), "Building 800 Princess exists (ID 64)", $passes, $failures);
if (isset($bldgMap[64])) {
    assertTest(str_contains($bldgMap[64]['aliases'] ?? '', 'The 800'), "800 Princess aliases contain 'The 800'", $passes, $failures);
    assertTest((int)$bldgMap[64]['complex_id'] === 4, "800 Princess complex assignment is 4 (Princess)", $passes, $failures);
}

// 800 Princess St — annex (ID 94)
assertTest(isset($bldgMap[94]), "Building 800 Princess annex exists (ID 94)", $passes, $failures);
if (isset($bldgMap[94])) {
    $noteAnnex = 'TODO-verify: second Yardi record at 800 Princess; its 301/302 are distinct from the main building\'s 301/302 until verified.';
    assertTest(str_contains($bldgMap[94]['comments'] ?? '', $noteAnnex), "800 Princess annex comments contain distinct-records TODO note", $passes, $failures);
    assertTest(str_contains($bldgMap[94]['name'] ?? '', '800 Princess St — annex'), "800 Princess annex name is '800 Princess St — annex'", $passes, $failures);
    $yardiProp = ($bldgMap[94]['yardi_codes'] ?? '') . ($bldgMap[94]['external_ids'] ?? '');
    assertTest(str_contains($yardiProp, '800prin'), "800 Princess annex records Yardi property code '800prin'", $passes, $failures);
    assertTest((int)$bldgMap[94]['complex_id'] === 4, "800 Princess annex complex assignment is 4 (Princess)", $passes, $failures);
}

// -------------------------------------------------------------
// 2. Unit Counts & Exact Rosters in Database
// -------------------------------------------------------------
echo "\n--- 2. Unit Counts & Exact Rosters in Database ---\n";

$units62 = $db->query("SELECT unit_number, floor, provenance FROM unit WHERE building_id = 62 ORDER BY CAST(unit_number AS INTEGER) ASC, unit_number ASC")->fetchAll(PDO::FETCH_ASSOC);
$units64 = $db->query("SELECT unit_number, floor, provenance FROM unit WHERE building_id = 64 ORDER BY CAST(unit_number AS INTEGER) ASC, unit_number ASC")->fetchAll(PDO::FETCH_ASSOC);
$units94 = $db->query("SELECT unit_number, floor, provenance FROM unit WHERE building_id = 94 ORDER BY CAST(unit_number AS INTEGER) ASC, unit_number ASC")->fetchAll(PDO::FETCH_ASSOC);

$uNums62 = array_column($units62, 'unit_number');
$uNums64 = array_column($units64, 'unit_number');
$uNums94 = array_column($units94, 'unit_number');

// 630 Princess (26 units)
assertTest(count($units62) === 26, "630 Princess has exactly 26 units (got " . count($units62) . ")", $passes, $failures);

$expected62 = [
    '102', '104', '106',
    '201', '203', '204', '205', '206', '207',
    '301', '303', '304', '305', '306', '307',
    '401', '402', '403', '404', '405', '407',
    '501', '503', '504', '505', '507'
];
sort($expected62);
$actual62Sorted = $uNums62;
sort($actual62Sorted);
assertTest($actual62Sorted === $expected62, "630 Princess units match exact verified list with gaps preserved (26 units)", $passes, $failures);

// Verify gaps in 630 Princess
$unexpected62 = ['101', '103', '105', '202', '302', '406', '502', '506'];
$foundUnexpected62 = array_intersect($unexpected62, $uNums62);
assertTest(empty($foundUnexpected62), "630 Princess does NOT contain gap units (checked 202, 302, 406, 502, 506, etc.)", $passes, $failures);

// 630 Princess letter suffixes check
$letterSuffixed62 = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 62 AND unit_number GLOB '*[A-Za-z]*'")->fetchColumn();
assertTest($letterSuffixed62 === 0, "630 Princess has zero letter room suffixes (got {$letterSuffixed62})", $passes, $failures);

// 800 Princess (51 units)
assertTest(count($units64) === 51, "800 Princess main record has exactly 51 units (got " . count($units64) . ")", $passes, $failures);

// Verify no x10 in 800 Princess
$hasX10 = in_array('210', $uNums64) || in_array('310', $uNums64) || in_array('410', $uNums64);
assertTest(!$hasX10, "800 Princess does NOT contain 210, 310, or 410", $passes, $failures);

$expected64 = [];
foreach ([2, 3, 4] as $fl) {
    for ($u = 1; $u <= 18; $u++) {
        if ($u === 10) continue;
        $expected64[] = $fl . sprintf('%02d', $u);
    }
}
sort($expected64);
$actual64Sorted = $uNums64;
sort($actual64Sorted);
assertTest($actual64Sorted === $expected64, "800 Princess units match exact verified list (51 units across floors 2, 3, 4)", $passes, $failures);

// 800 Princess letter suffixes check
$letterSuffixed64 = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 64 AND unit_number GLOB '*[A-Za-z]*'")->fetchColumn();
assertTest($letterSuffixed64 === 0, "800 Princess main record has zero letter room suffixes (got {$letterSuffixed64})", $passes, $failures);

// 800 Princess Annex (4 units: 100, 101A, 301, 302)
assertTest(count($units94) === 4, "800 Princess annex has exactly 4 units (got " . count($units94) . ")", $passes, $failures);
$expected94 = ['100', '101A', '301', '302'];
sort($expected94);
$actual94Sorted = $uNums94;
sort($actual94Sorted);
assertTest($actual94Sorted === $expected94, "800 Princess annex units are exactly 100, 101A, 301, 302", $passes, $failures);

// Total units for this prompt: 26 + 51 + 4 = 81 units
$totalUnitsPrompt = count($units62) + count($units64) + count($units94);
assertTest($totalUnitsPrompt === 81, "Total units for this prompt is exactly 81 (26 + 51 + 4, got {$totalUnitsPrompt})", $passes, $failures);

// -------------------------------------------------------------
// 3. Provenance & Pattern Purge Checks
// -------------------------------------------------------------
echo "\n--- 3. Provenance & Pattern Purge Checks ---\n";

$verifiedCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (62, 64, 94) AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($verifiedCount === 81, "All 81 units carry provenance 'verified — Yardi extract 2026-10-22' (got {$verifiedCount})", $passes, $failures);

$patternCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (62, 64, 94) AND provenance LIKE '%pattern%'")->fetchColumn();
assertTest($patternCount === 0, "Zero pattern-generated units remain for 630 or 800 Princess (got {$patternCount})", $passes, $failures);

// -------------------------------------------------------------
// 4. Floor Derivation Checks
// -------------------------------------------------------------
echo "\n--- 4. Floor Derivation Checks ---\n";

$floorMap62 = array_column($units62, 'floor', 'unit_number');
assertTest(($floorMap62['102'] ?? '') === 'First Floor', "630 Princess Unit 102 is 'First Floor'", $passes, $failures);
assertTest(($floorMap62['201'] ?? '') === 'Second Floor', "630 Princess Unit 201 is 'Second Floor'", $passes, $failures);
assertTest(($floorMap62['301'] ?? '') === 'Third Floor', "630 Princess Unit 301 is 'Third Floor'", $passes, $failures);
assertTest(($floorMap62['401'] ?? '') === 'Fourth Floor', "630 Princess Unit 401 is 'Fourth Floor'", $passes, $failures);
assertTest(($floorMap62['501'] ?? '') === 'Fifth Floor', "630 Princess Unit 501 is 'Fifth Floor'", $passes, $failures);

$floorMap64 = array_column($units64, 'floor', 'unit_number');
assertTest(($floorMap64['201'] ?? '') === 'Second Floor', "800 Princess Unit 201 is 'Second Floor'", $passes, $failures);
assertTest(($floorMap64['301'] ?? '') === 'Third Floor', "800 Princess Unit 301 is 'Third Floor'", $passes, $failures);
assertTest(($floorMap64['401'] ?? '') === 'Fourth Floor', "800 Princess Unit 401 is 'Fourth Floor'", $passes, $failures);

$floorMap94 = array_column($units94, 'floor', 'unit_number');
assertTest(($floorMap94['100'] ?? '') === 'First Floor', "800 Princess Annex Unit 100 is 'First Floor'", $passes, $failures);
assertTest(($floorMap94['101A'] ?? '') === 'First Floor', "800 Princess Annex Unit 101A is 'First Floor'", $passes, $failures);
assertTest(($floorMap94['301'] ?? '') === 'Third Floor', "800 Princess Annex Unit 301 is 'Third Floor'", $passes, $failures);
assertTest(($floorMap94['302'] ?? '') === 'Third Floor', "800 Princess Annex Unit 302 is 'Third Floor'", $passes, $failures);

// -------------------------------------------------------------
// 5. TypeScript Constants Integrity & Unit Generation
// -------------------------------------------------------------
echo "\n--- 5. TypeScript Constants Integrity & Unit Generation ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');
assertTest(str_contains($tsCode, 'PRINCESS_630_800_YARDI_ROSTERS'),
    "TypeScript defines PRINCESS_630_800_YARDI_ROSTERS constant", $passes, $failures);

$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES } = require("./residential_constants.tsx");
const p630 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-princess-630");
const p800 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-princess-800");
const p800Annex = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-princess-800-annex");

const u630 = p630 ? generateUnitRoster(p630) : [];
const u800 = p800 ? generateUnitRoster(p800) : [];
const u800Annex = p800Annex ? generateUnitRoster(p800Annex) : [];

const uNums630 = u630.map(u => u.unitNumber);
const uNums800 = u800.map(u => u.unitNumber);
const uNums800Annex = u800Annex.map(u => u.unitNumber);

const provs = [...new Set([...u630, ...u800, ...u800Annex].map(u => u.provenance))];
const setIds = [...new Set([...u630, ...u800, ...u800Annex].map(u => u.defaultSetId))];

console.log(JSON.stringify({
    has630: !!p630,
    has800: !!p800,
    has800Annex: !!p800Annex,
    comments630: p630?.comments,
    aliases800: p800?.aliases,
    commentsAnnex: p800Annex?.comments,
    yardiCodesAnnex: p800Annex?.yardiCodes,
    count630: u630.length,
    count800: u800.length,
    countAnnex: u800Annex.length,
    totalCount: u630.length + u800.length + u800Annex.length,
    has210: uNums800.includes("210"),
    has310: uNums800.includes("310"),
    has410: uNums800.includes("410"),
    has202In630: uNums630.includes("202"),
    has302In630: uNums630.includes("302"),
    has406In630: uNums630.includes("406"),
    uNums800Annex,
    provs,
    setIds,
    floor100Annex: u800Annex.find(u => u.unitNumber === "100")?.floor,
    floor101AAnnex: u800Annex.find(u => u.unitNumber === "101A")?.floor,
    floor301Annex: u800Annex.find(u => u.unitNumber === "301")?.floor
}));
';

$nodeCmd = "npx tsx -e " . escapeshellarg($testScript);
$output = shell_exec($nodeCmd);
$tsResult = json_decode($output, true);

if ($tsResult) {
    assertTest($tsResult['count630'] === 26, "TypeScript generates 26 units for 630 Princess (got {$tsResult['count630']})", $passes, $failures);
    assertTest($tsResult['count800'] === 51, "TypeScript generates 51 units for 800 Princess (got {$tsResult['count800']})", $passes, $failures);
    assertTest($tsResult['countAnnex'] === 4, "TypeScript generates 4 units for 800 Princess annex (got {$tsResult['countAnnex']})", $passes, $failures);
    assertTest($tsResult['totalCount'] === 81, "TypeScript total units for 630 + 800 is 81 (got {$tsResult['totalCount']})", $passes, $failures);
    assertTest($tsResult['has210'] === false, "TypeScript 800 skips 210", $passes, $failures);
    assertTest($tsResult['has310'] === false, "TypeScript 800 skips 310", $passes, $failures);
    assertTest($tsResult['has410'] === false, "TypeScript 800 skips 410", $passes, $failures);
    assertTest($tsResult['has202In630'] === false, "TypeScript 630 skips 202", $passes, $failures);
    assertTest($tsResult['has302In630'] === false, "TypeScript 630 skips 302", $passes, $failures);
    assertTest($tsResult['has406In630'] === false, "TypeScript 630 skips 406", $passes, $failures);
    assertTest(is_array($tsResult['aliases800']) && in_array('The 800', $tsResult['aliases800']), "TypeScript 800 has alias 'The 800'", $passes, $failures);
    assertTest(str_contains($tsResult['comments630'] ?? '', 'Under construction (Oct 2026)'), "TypeScript 630 carries under-construction note", $passes, $failures);
    assertTest(str_contains($tsResult['commentsAnnex'] ?? '', 'TODO-verify: second Yardi record at 800 Princess; its 301/302 are distinct from the main building\'s 301/302 until verified.'), "TypeScript 800 annex carries distinct-records TODO note", $passes, $failures);
    assertTest($tsResult['provs'] === ['verified — Yardi extract 2026-10-22'], "TypeScript units carry verified provenance", $passes, $failures);
    assertTest($tsResult['setIds'] === ['set-princess-apt'], "All units inherit 'set-princess-apt' by reference", $passes, $failures);
} else {
    assertTest(false, "TypeScript runtime inspection failed", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Princess 630 & 800 Rosters Acceptance Verification Summary:\n";
echo "Passes: {$passes}\n";
echo "Failures: {$failures}\n";
echo "========================================\n";

if ($failures === 0) {
    echo "SUCCESS: All 630 & 800 Princess Verified Yardi Rosters Acceptance Tests PASSED!\n";
    exit(0);
} else {
    echo "FAILURE: Some acceptance tests failed!\n";
    exit(1);
}
