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

echo "=== Running Acceptance Tests for Frontenac Verified Yardi Rosters ===\n\n";

// -------------------------------------------------------------
// 1. Building Record, Address, Aliases & Notes in Database
// -------------------------------------------------------------
echo "--- 1. Building Record, Address, Aliases & Notes in Database ---\n";

$bldg76 = $db->query("SELECT * FROM building WHERE id = 76")->fetch(PDO::FETCH_ASSOC);
assertTest($bldg76 !== false, "Building record for 501 Frontenac exists (ID 76)", $passes, $failures);

if ($bldg76) {
    assertTest((int)$bldg76['complex_id'] === 7, "501 Frontenac is assigned to Frontenac complex (ID 7)", $passes, $failures);
    assertTest(str_contains($bldg76['name'], '501 Frontenac'), "Building name is '501 Frontenac St' (got '{$bldg76['name']}')", $passes, $failures);
    assertTest(str_contains($bldg76['address'], '495 Frontenac'), "Building system address is '495 Frontenac Street' (got '{$bldg76['address']}')", $passes, $failures);

    $requiredNote = 'Frontenac condos — single condo building, MIXED OWNERSHIP: some units belong to other companies, not Patry/Kenlar. Yardi letter suffixes (B/C/D/P) are rooms/spaces inside the apartment, not units.';
    assertTest(str_contains($bldg76['comments'] ?? '', $requiredNote), "Building comments contain required condo & mixed-ownership note", $passes, $failures);

    // Aliases check in DB
    $aliasesStr = ($bldg76['aliases'] ?? '') . ' ' . ($bldg76['comments'] ?? '');
    assertTest(str_contains($aliasesStr, '495 Frontenac Street'), "Building records alias '495 Frontenac Street'", $passes, $failures);
    assertTest(str_contains($aliasesStr, 'The Frontenac'), "Building records alias 'The Frontenac'", $passes, $failures);
}

// -------------------------------------------------------------
// 2. Per-Floor Unit Rosters & Counts in Database
// -------------------------------------------------------------
echo "\n--- 2. Per-Floor Unit Rosters & Counts in Database ---\n";

$units76 = $db->query("SELECT unit_number, floor, ownership, provenance FROM unit WHERE building_id = 76 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_ASSOC);
$totalUnits = count($units76);
assertTest($totalUnits === 101, "501 Frontenac has exactly 101 units in database (got {$totalUnits})", $passes, $failures);

$unitNums = array_column($units76, 'unit_number');

// Floor 1: 17 units (101-107, 111-120; no 108, 109, 110)
$f1Units = array_values(array_filter($unitNums, fn($u) => str_starts_with($u, '1')));
$expectedF1 = ['101', '102', '103', '104', '105', '106', '107', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120'];
assertTest(count($f1Units) === 17, "Floor 1 has exactly 17 units (got " . count($f1Units) . ")", $passes, $failures);
assertTest($f1Units === $expectedF1, "Floor 1 units match exact verified list (101-107, 111-120)", $passes, $failures);
assertTest(!in_array('108', $unitNums), "Unit 108 does NOT exist", $passes, $failures);
assertTest(!in_array('109', $unitNums), "Unit 109 does NOT exist", $passes, $failures);
assertTest(!in_array('110', $unitNums), "Unit 110 does NOT exist", $passes, $failures);

// Floor 2: 21 units (201-221)
$f2Units = array_values(array_filter($unitNums, fn($u) => str_starts_with($u, '2')));
$expectedF2 = array_map(fn($n) => (string)$n, range(201, 221));
assertTest(count($f2Units) === 21, "Floor 2 has exactly 21 units (got " . count($f2Units) . ")", $passes, $failures);
assertTest($f2Units === $expectedF2, "Floor 2 units match exact verified list (201–221 continuous)", $passes, $failures);

// Floor 3: 21 units (301-321)
$f3Units = array_values(array_filter($unitNums, fn($u) => str_starts_with($u, '3')));
$expectedF3 = array_map(fn($n) => (string)$n, range(301, 321));
assertTest(count($f3Units) === 21, "Floor 3 has exactly 21 units (got " . count($f3Units) . ")", $passes, $failures);
assertTest($f3Units === $expectedF3, "Floor 3 units match exact verified list (301–321 continuous)", $passes, $failures);

// Floor 4: 21 units (401-421)
$f4Units = array_values(array_filter($unitNums, fn($u) => str_starts_with($u, '4')));
$expectedF4 = array_map(fn($n) => (string)$n, range(401, 421));
assertTest(count($f4Units) === 21, "Floor 4 has exactly 21 units (got " . count($f4Units) . ")", $passes, $failures);
assertTest($f4Units === $expectedF4, "Floor 4 units match exact verified list (401–421 continuous)", $passes, $failures);

// Floor 5: 21 units (501-516, 519-523; no 517, 518)
$f5Units = array_values(array_filter($unitNums, fn($u) => str_starts_with($u, '5')));
$expectedF5 = array_merge(
    array_map(fn($n) => (string)$n, range(501, 516)),
    ['519', '520', '521', '522', '523']
);
assertTest(count($f5Units) === 21, "Floor 5 has exactly 21 units (got " . count($f5Units) . ")", $passes, $failures);
assertTest($f5Units === $expectedF5, "Floor 5 units match exact verified list (501-516, 519-523)", $passes, $failures);
assertTest(!in_array('517', $unitNums), "Unit 517 does NOT exist", $passes, $failures);
assertTest(!in_array('518', $unitNums), "Unit 518 does NOT exist", $passes, $failures);

// -------------------------------------------------------------
// 3. Ownership & Prohibitions in Database
// -------------------------------------------------------------
echo "\n--- 3. Ownership & Prohibitions in Database ---\n";

// Ownership field check
$nonPatryCount = 0;
foreach ($units76 as $uRow) {
    if (($uRow['ownership'] ?? '') !== 'patry') {
        $nonPatryCount++;
    }
}
assertTest($nonPatryCount === 0, "All 101 units expose ownership defaulting to 'patry' (non-patry count: {$nonPatryCount})", $passes, $failures);

// No letter suffixes
$letterSuffixed = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 76 AND unit_number GLOB '*[A-Za-z]*'")->fetchColumn();
assertTest($letterSuffixed === 0, "Zero units contain letter suffixes (rooms inside apartments) (got {$letterSuffixed})", $passes, $failures);

// No WAIT* placeholders
$waitCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 76 AND unit_number LIKE '%WAIT%'")->fetchColumn();
assertTest($waitCount === 0, "Zero WAIT* placeholder units exist (got {$waitCount})", $passes, $failures);

// Provenance
$verifiedCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 76 AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($verifiedCount === 101, "All 101 units carry provenance 'verified — Yardi extract 2026-10-22' (got {$verifiedCount})", $passes, $failures);

// -------------------------------------------------------------
// 4. Default Appliance Set in Database
// -------------------------------------------------------------
echo "\n--- 4. Default Appliance Set in Database ---\n";

$frontenacSet = $db->query("SELECT * FROM default_sets WHERE id = 'set-frontenac-condo' OR id = 'set-frontenac-apt'")->fetch(PDO::FETCH_ASSOC);
assertTest($frontenacSet !== false, "Frontenac default appliance set exists in database", $passes, $failures);

// -------------------------------------------------------------
// 5. TypeScript Constants Integrity & Search Resolution
// -------------------------------------------------------------
echo "\n--- 5. TypeScript Constants Integrity & Search Resolution ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');

assertTest(str_contains($tsCode, 'FRONTENAC_YARDI_ROSTERS'),
    "TypeScript defines FRONTENAC_YARDI_ROSTERS constant", $passes, $failures);

assertTest(str_contains($tsCode, 'set-frontenac-condo') || str_contains($tsCode, 'set-frontenac-apt'),
    "TypeScript defines Frontenac default appliance set", $passes, $failures);

// Test TypeScript runtime inspection & search resolution
$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES } = require("./residential_constants.tsx");
const prop501 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-frontenac-501");

const units = prop501 ? generateUnitRoster(prop501) : [];

const f1 = units.filter(u => u.floor === "First Floor").map(u => u.unitNumber);
const f2 = units.filter(u => u.floor === "Second Floor").map(u => u.unitNumber);
const f3 = units.filter(u => u.floor === "Third Floor").map(u => u.unitNumber);
const f4 = units.filter(u => u.floor === "Fourth Floor").map(u => u.unitNumber);
const f5 = units.filter(u => u.floor === "Fifth Floor").map(u => u.unitNumber);

const ownerships = [...new Set(units.map(u => u.ownership))];
const defaultSets = [...new Set(units.map(u => u.defaultSetId))];
const provenances = [...new Set(units.map(u => u.provenance))];

// Test search resolution against aliases
const searchBuilding = (query) => {
    const q = query.trim().toLowerCase();
    const tokens = q.replace(/,/g, " ").split(/\s+/).filter(t => t.length > 0 && t !== "unit" && t !== "apt");
    const target = `${prop501.name} ${prop501.address} ${(prop501.aliases || []).join(" ")}`.toLowerCase();
    return tokens.every(t => target.includes(t));
};

console.log(JSON.stringify({
    buildingFound: !!prop501,
    name: prop501?.name,
    address: prop501?.address,
    aliases: prop501?.aliases || [],
    totalUnits: units.length,
    f1Count: f1.length,
    f2Count: f2.length,
    f3Count: f3.length,
    f4Count: f4.length,
    f5Count: f5.length,
    f1,
    f5,
    ownerships,
    defaultSets,
    provenances,
    searchAlias1: searchBuilding("495 Frontenac Street"),
    searchAlias2: searchBuilding("The Frontenac")
}));
';

$nodeCmd = "npx tsx -e " . escapeshellarg($testScript);
$output = shell_exec($nodeCmd);
$tsResult = json_decode($output, true);

if ($tsResult) {
    assertTest($tsResult['buildingFound'] === true, "TypeScript defines prop-frontenac-501", $passes, $failures);
    assertTest($tsResult['name'] === '501 Frontenac St', "TypeScript building name is '501 Frontenac St' (got '{$tsResult['name']}')", $passes, $failures);
    assertTest(str_contains($tsResult['address'], '495 Frontenac'), "TypeScript system address is '495 Frontenac Street' (got '{$tsResult['address']}')", $passes, $failures);
    assertTest(in_array('495 Frontenac Street', $tsResult['aliases']) && in_array('The Frontenac', $tsResult['aliases']),
        "TypeScript building carries both aliases ('495 Frontenac Street' and 'The Frontenac')", $passes, $failures);

    assertTest($tsResult['totalUnits'] === 101, "TypeScript generates exactly 101 units (got {$tsResult['totalUnits']})", $passes, $failures);
    assertTest($tsResult['f1Count'] === 17, "TypeScript Floor 1 has 17 units", $passes, $failures);
    assertTest($tsResult['f2Count'] === 21, "TypeScript Floor 2 has 21 units", $passes, $failures);
    assertTest($tsResult['f3Count'] === 21, "TypeScript Floor 3 has 21 units", $passes, $failures);
    assertTest($tsResult['f4Count'] === 21, "TypeScript Floor 4 has 21 units", $passes, $failures);
    assertTest($tsResult['f5Count'] === 21, "TypeScript Floor 5 has 21 units", $passes, $failures);

    assertTest(!in_array('108', $tsResult['f1']) && !in_array('109', $tsResult['f1']) && !in_array('110', $tsResult['f1']),
        "TypeScript Floor 1 skips 108, 109, 110", $passes, $failures);
    assertTest(!in_array('517', $tsResult['f5']) && !in_array('518', $tsResult['f5']),
        "TypeScript Floor 5 skips 517, 518", $passes, $failures);

    assertTest($tsResult['ownerships'] === ['patry'], "TypeScript all units have ownership defaulting to 'patry'", $passes, $failures);
    assertTest($tsResult['provenances'] === ['verified — Yardi extract 2026-10-22'], "TypeScript all units carry verified provenance", $passes, $failures);

    assertTest($tsResult['searchAlias1'] === true, "Search query '495 Frontenac Street' resolves to 501 Frontenac building", $passes, $failures);
    assertTest($tsResult['searchAlias2'] === true, "Search query 'The Frontenac' resolves to 501 Frontenac building", $passes, $failures);
} else {
    assertTest(false, "Failed to execute TypeScript runtime inspection via npx tsx", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Frontenac Rosters Acceptance Verification Summary:\n";
echo "Passes: {$passes}\n";
echo "Failures: {$failures}\n";
echo "========================================\n";

if ($failures === 0) {
    echo "SUCCESS: All Frontenac Verified Yardi Rosters Acceptance Tests PASSED!\n";
    exit(0);
} else {
    echo "FAILURE: Some acceptance tests failed!\n";
    exit(1);
}
