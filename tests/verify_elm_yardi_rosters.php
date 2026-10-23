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

echo "=== Running Acceptance Tests for Elm Verified Yardi Rosters ===\n\n";

// -------------------------------------------------------------
// 1. Building Records & Notes in Database
// -------------------------------------------------------------
echo "--- 1. Building Records & Notes in Database ---\n";

$bldg18 = $db->query("SELECT * FROM building WHERE id = 78 OR address LIKE '%18 Elm%'")->fetch(PDO::FETCH_ASSOC);
assertTest($bldg18 !== false, "18 Elm St building record exists in database (ID 78)", $passes, $failures);
if ($bldg18) {
    assertTest((int)$bldg18['complex_id'] === 2, "18 Elm St is assigned to Elm + Colborne complex (ID 2)", $passes, $failures);
    assertTest(str_contains($bldg18['comments'], 'Small-storage role (water heaters)'),
        "18 Elm St comments record small-storage role (water heaters)", $passes, $failures);
}

$bldg24 = $db->query("SELECT * FROM building WHERE id = 79 OR address LIKE '%24 Elm%'")->fetch(PDO::FETCH_ASSOC);
assertTest($bldg24 !== false, "24 Elm St building record exists in database (ID 79)", $passes, $failures);
if ($bldg24) {
    assertTest((int)$bldg24['complex_id'] === 2, "24 Elm St is assigned to Elm + Colborne complex (ID 2)", $passes, $failures);
    assertTest(str_contains($bldg24['comments'], 'TODO-verify: 304/404 absent in Yardi; 303D/403D may be the physical 4th units on floors 3–4'),
        "24 Elm St comments record note on absent 304/404 and 303D/403D variants", $passes, $failures);
}

// -------------------------------------------------------------
// 2. 18 Elm St Unit Rosters (17 units)
// -------------------------------------------------------------
echo "\n--- 2. 18 Elm St Unit Rosters in Database ---\n";

$expected18Units = [
    '101P', '111', '112', '113', '114',
    '211', '212', '213', '214',
    '311', '312', '313', '314',
    '411', '412', '413', '414'
];

$units18 = $db->query("SELECT unit_number FROM unit WHERE building_id = 78 ORDER BY id ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units18) === 17, "18 Elm St has exactly 17 units in database (got " . count($units18) . ")", $passes, $failures);
assertTest($units18 === $expected18Units, "18 Elm St units match exact verified roster (101P, 111–114, 211–214, 311–314, 411–414)", $passes, $failures);
assertTest(in_array('101P', $units18), "18 Elm St contains 101P as verified base exception", $passes, $failures);
assertTest(!in_array('101', $units18), "18 Elm St does NOT contain plain 101", $passes, $failures);

// Check zero lettered split variants (111B, 112C, etc.)
$letteredVariants18 = $db->query("SELECT unit_number FROM unit WHERE building_id = 78 AND unit_number NOT IN ('101P') AND unit_number GLOB '*[A-Za-z]*'")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($letteredVariants18) === 0, "18 Elm St has zero split lettered variants (got: " . implode(', ', $letteredVariants18) . ")", $passes, $failures);

// -------------------------------------------------------------
// 3. 24 Elm St Unit Rosters (14 units)
// -------------------------------------------------------------
echo "\n--- 3. 24 Elm St Unit Rosters in Database ---\n";

$expected24Units = [
    '101', '102', '103', '104',
    '201', '202', '203', '204',
    '301', '302', '303',
    '401', '402', '403'
];

$units24 = $db->query("SELECT unit_number FROM unit WHERE building_id = 79 ORDER BY id ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units24) === 14, "24 Elm St has exactly 14 units in database (got " . count($units24) . ")", $passes, $failures);
assertTest($units24 === $expected24Units, "24 Elm St units match exact verified roster (101–104, 201–204, 301–303, 401–403)", $passes, $failures);

// Check no 24- prefix stored
$prefixed24 = $db->query("SELECT COUNT(*) FROM unit WHERE building_id = 79 AND unit_number LIKE '24-%'")->fetchColumn();
assertTest((int)$prefixed24 === 0, "24 Elm St units stored without '24-' prefix (got {$prefixed24})", $passes, $failures);

// Check 304 and 404 absent
assertTest(!in_array('304', $units24), "24 Elm St unit 304 is absent (as confirmed in Yardi)", $passes, $failures);
assertTest(!in_array('404', $units24), "24 Elm St unit 404 is absent (as confirmed in Yardi)", $passes, $failures);

// Check zero lettered variants (B/C/D)
$letteredVariants24 = $db->query("SELECT unit_number FROM unit WHERE building_id = 79 AND unit_number GLOB '*[A-Za-z]*'")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($letteredVariants24) === 0, "24 Elm St has zero lettered variants (got: " . implode(', ', $letteredVariants24) . ")", $passes, $failures);

// -------------------------------------------------------------
// 4. Elm Complex Two-Building Total & Provenance
// -------------------------------------------------------------
echo "\n--- 4. Elm Complex Two-Building Total & Provenance ---\n";

$totalElmUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (78, 79)")->fetchColumn();
assertTest($totalElmUnits === 31, "Elm complex total for the two buildings (18 & 24 Elm) is exactly 31 units (got {$totalElmUnits})", $passes, $failures);

$waitUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (78, 79) AND unit_number LIKE '%WAIT%'")->fetchColumn();
assertTest($waitUnits === 0, "Zero WAIT* placeholder units exist in 18 & 24 Elm (got {$waitUnits})", $passes, $failures);

$nonVerified = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (78, 79) AND provenance != 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($nonVerified === 0, "Zero pattern provenance units left in 18 & 24 Elm (got {$nonVerified})", $passes, $failures);

$verified = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (78, 79) AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($verified === 31, "All 31 units in 18 & 24 Elm carry provenance 'verified — Yardi extract 2026-10-22'", $passes, $failures);

// -------------------------------------------------------------
// 5. Floor Derivations in Database
// -------------------------------------------------------------
echo "\n--- 5. Floor Derivations in Database ---\n";

$f1Count = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (78, 79) AND floor = 'First Floor'")->fetchColumn();
assertTest($f1Count === 9, "Exactly 9 units on First Floor (5 in 18 Elm + 4 in 24 Elm) (got {$f1Count})", $passes, $failures);

$f2Count = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (78, 79) AND floor = 'Second Floor'")->fetchColumn();
assertTest($f2Count === 8, "Exactly 8 units on Second Floor (4 in 18 Elm + 4 in 24 Elm) (got {$f2Count})", $passes, $failures);

$f3Count = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (78, 79) AND floor = 'Third Floor'")->fetchColumn();
assertTest($f3Count === 7, "Exactly 7 units on Third Floor (4 in 18 Elm + 3 in 24 Elm) (got {$f3Count})", $passes, $failures);

$f4Count = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (78, 79) AND floor = 'Fourth Floor'")->fetchColumn();
assertTest($f4Count === 7, "Exactly 7 units on Fourth Floor (4 in 18 Elm + 3 in 24 Elm) (got {$f4Count})", $passes, $failures);

// -------------------------------------------------------------
// 6. TypeScript Constants Integrity (residential_constants.tsx)
// -------------------------------------------------------------
echo "\n--- 6. TypeScript Constants Integrity (residential_constants.tsx) ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');

assertTest(str_contains($tsCode, 'ELM_YARDI_ROSTERS'),
    "TypeScript defines ELM_YARDI_ROSTERS constant", $passes, $failures);

assertTest(str_contains($tsCode, 'STORAGE_18_ELM'),
    "TypeScript defines STORAGE_18_ELM constant", $passes, $failures);

assertTest(str_contains($tsCode, 'isStorageNode: true') && str_contains($tsCode, "storageInventory: STORAGE_18_ELM"),
    "TypeScript 18 Elm property has isStorageNode and storageInventory attached", $passes, $failures);

assertTest(str_contains($tsCode, 'TODO-verify: 304/404 absent in Yardi; 303D/403D may be the physical 4th units on floors 3–4'),
    "TypeScript 24 Elm property includes absent 304/404 note", $passes, $failures);

// Test unit generation from node
$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES } = require("./residential_constants.tsx");
const elm18 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-elm-18");
const elm24 = RESIDENTIAL_PROPERTIES.find(p => p.id === "prop-elm-24");

const u18 = generateUnitRoster(elm18);
const u24 = generateUnitRoster(elm24);

console.log(JSON.stringify({
    count18: u18.length,
    units18: u18.map(u => u.unitNumber),
    floors18: u18.map(u => u.floor),
    provenance18: [...new Set(u18.map(u => u.provenance))],
    defaultSetId18: [...new Set(u18.map(u => u.defaultSetId))],
    count24: u24.length,
    units24: u24.map(u => u.unitNumber),
    floors24: u24.map(u => u.floor),
    provenance24: [...new Set(u24.map(u => u.provenance))],
    defaultSetId24: [...new Set(u24.map(u => u.defaultSetId))]
}));
';

$nodeCmd = "npx tsx -e " . escapeshellarg($testScript);
$output = shell_exec($nodeCmd);
$tsResult = json_decode($output, true);

if ($tsResult) {
    assertTest($tsResult['count18'] === 17, "TypeScript 18 Elm generates exactly 17 units (got {$tsResult['count18']})", $passes, $failures);
    assertTest($tsResult['units18'] === $expected18Units, "TypeScript 18 Elm unit numbers match verified roster", $passes, $failures);
    assertTest($tsResult['provenance18'] === ['verified — Yardi extract 2026-10-22'], "TypeScript 18 Elm units have verified provenance", $passes, $failures);
    assertTest($tsResult['defaultSetId18'] === ['set-elm-apt'], "TypeScript 18 Elm units inherit set-elm-apt by reference", $passes, $failures);

    assertTest($tsResult['count24'] === 14, "TypeScript 24 Elm generates exactly 14 units (got {$tsResult['count24']})", $passes, $failures);
    assertTest($tsResult['units24'] === $expected24Units, "TypeScript 24 Elm unit numbers match verified roster (no 24- prefix)", $passes, $failures);
    assertTest($tsResult['provenance24'] === ['verified — Yardi extract 2026-10-22'], "TypeScript 24 Elm units have verified provenance", $passes, $failures);
    assertTest($tsResult['defaultSetId24'] === ['set-elm-apt'], "TypeScript 24 Elm units inherit set-elm-apt by reference", $passes, $failures);

    $totalTs = $tsResult['count18'] + $tsResult['count24'];
    assertTest($totalTs === 31, "TypeScript total Elm units across 18 & 24 Elm is exactly 31 (got {$totalTs})", $passes, $failures);
} else {
    assertTest(false, "Failed to execute TypeScript runtime inspection via npx tsx", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Elm Rosters Acceptance Verification Summary:\n";
echo "Passes: {$passes}\n";
echo "Failures: {$failures}\n";
echo "========================================\n";

if ($failures === 0) {
    echo "SUCCESS: All Elm Verified Yardi Rosters Acceptance Tests PASSED!\n";
    exit(0);
} else {
    echo "FAILURE: Some acceptance tests failed!\n";
    exit(1);
}
