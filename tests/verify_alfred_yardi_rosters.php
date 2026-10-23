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

echo "=== Running Acceptance Tests for Alfred Verified Yardi Rosters ===\n\n";

// -------------------------------------------------------------
// 1. Building Records, Notes & External IDs in Database
// -------------------------------------------------------------
echo "--- 1. Building Records, Notes & External IDs in Database ---\n";

$alfredBuildingIds = [
    353 => 70,
    359 => 71,
    361 => 72,
    376 => 73,
    378 => 74,
    394 => 75
];

$requiredNote = 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units.';

foreach ($alfredBuildingIds as $streetNum => $bldgId) {
    $bldg = $db->query("SELECT * FROM building WHERE id = {$bldgId}")->fetch(PDO::FETCH_ASSOC);
    assertTest($bldg !== false, "Building record for {$streetNum} Alfred exists (ID {$bldgId})", $passes, $failures);
    if ($bldg) {
        assertTest((int)$bldg['complex_id'] === 6 || (int)$bldg['complex_id'] === 9, "{$streetNum} Alfred is assigned to Alfred or Frontenac-Alfred complex (got {$bldg['complex_id']})", $passes, $failures);
        assertTest(str_contains($bldg['comments'] ?? '', $requiredNote),
            "{$streetNum} Alfred comments contain required note: '{$requiredNote}'", $passes, $failures);
    }
}

// 378 Alfred Yardi codes check
$bldg378 = $db->query("SELECT * FROM building WHERE id = 74")->fetch(PDO::FETCH_ASSOC);
if ($bldg378) {
    $hasBothIn378 = (str_contains($bldg378['comments'] ?? '', '378alfr') && str_contains($bldg378['comments'] ?? '', 'alfr378'))
        || (str_contains($bldg378['external_ids'] ?? '', '378alfr') && str_contains($bldg378['external_ids'] ?? '', 'alfr378'));
    assertTest($hasBothIn378, "378 Alfred records BOTH Yardi property codes (378alfr and alfr378)", $passes, $failures);
}

// 394 Alfred Yardi codes and storage role check
$bldg394 = $db->query("SELECT * FROM building WHERE id = 75")->fetch(PDO::FETCH_ASSOC);
if ($bldg394) {
    $hasBothIn394 = (str_contains($bldg394['comments'] ?? '', '394alfr') && str_contains($bldg394['comments'] ?? '', 'alfr394'))
        || (str_contains($bldg394['external_ids'] ?? '', '394alfr') && str_contains($bldg394['external_ids'] ?? '', 'alfr394'));
    assertTest($hasBothIn394, "394 Alfred records BOTH Yardi property codes (394alfr and alfr394)", $passes, $failures);
    assertTest(str_contains($bldg394['comments'] ?? '', 'storage') || str_contains($bldg394['comments'] ?? '', 'Storage'),
        "394 Alfred retains quadrant main storage role note", $passes, $failures);
}

// -------------------------------------------------------------
// 2. Per-Building Unit Rosters & Counts in Database
// -------------------------------------------------------------
echo "\n--- 2. Per-Building Unit Rosters & Counts in Database ---\n";

// 353 Alfred: 3 units — '1', '2', '3'
$units353 = $db->query("SELECT unit_number FROM unit WHERE building_id = 70 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units353) === 3, "353 Alfred has exactly 3 units (got " . count($units353) . ")", $passes, $failures);
assertTest($units353 === ['1', '2', '3'], "353 Alfred units are exactly ['1', '2', '3']", $passes, $failures);

// 359 Alfred: 1 unit — '359'
$units359 = $db->query("SELECT unit_number FROM unit WHERE building_id = 71 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units359) === 1, "359 Alfred has exactly 1 unit (got " . count($units359) . ")", $passes, $failures);
assertTest($units359 === ['359'], "359 Alfred unit is exactly ['359']", $passes, $failures);

// 361 Alfred: 1 unit — '1'
$units361 = $db->query("SELECT unit_number FROM unit WHERE building_id = 72 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units361) === 1, "361 Alfred has exactly 1 unit (got " . count($units361) . ")", $passes, $failures);
assertTest($units361 === ['1'], "361 Alfred unit is exactly ['1']", $passes, $failures);

// 376 Alfred: 1 unit — '376'
$units376 = $db->query("SELECT unit_number FROM unit WHERE building_id = 73 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units376) === 1, "376 Alfred has exactly 1 unit (got " . count($units376) . ")", $passes, $failures);
assertTest($units376 === ['376'], "376 Alfred unit is exactly ['376']", $passes, $failures);

// 378 Alfred: 1 unit — '378'
$units378 = $db->query("SELECT unit_number FROM unit WHERE building_id = 74 ORDER BY unit_number ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units378) === 1, "378 Alfred has exactly 1 unit (got " . count($units378) . ")", $passes, $failures);
assertTest($units378 === ['378'], "378 Alfred unit is exactly ['378']", $passes, $failures);

// 394 Alfred: 7 units — '1' through '7'
$units394 = $db->query("SELECT unit_number FROM unit WHERE building_id = 75 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(PDO::FETCH_COLUMN);
assertTest(count($units394) === 7, "394 Alfred has exactly 7 units (got " . count($units394) . ")", $passes, $failures);
assertTest($units394 === ['1', '2', '3', '4', '5', '6', '7'], "394 Alfred units are exactly ['1'..'7']", $passes, $failures);

// -------------------------------------------------------------
// 3. Prohibitions & Provenance Checks
// -------------------------------------------------------------
echo "\n--- 3. Prohibitions & Provenance Checks ---\n";

// Complex total
$totalAlfredUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (70, 71, 72, 73, 74, 75)")->fetchColumn();
assertTest($totalAlfredUnits === 14, "Total Alfred complex units in database is exactly 14 (3+1+1+1+1+7) (got {$totalAlfredUnits})", $passes, $failures);

// Prefix stripping: no '353-', '361-', '394-' prefixes
$prefixedCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (70, 71, 72, 73, 74, 75) AND unit_number LIKE '%-%'")->fetchColumn();
assertTest($prefixedCount === 0, "Zero units contain building prefixes (got {$prefixedCount})", $passes, $failures);

// No letter suffixes (rooms in converted houses)
$letterSuffixed = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (70, 71, 72, 73, 74, 75) AND unit_number GLOB '*[A-Za-z]*'")->fetchColumn();
assertTest($letterSuffixed === 0, "Zero units contain letter suffixes (rooms inside apartments) (got {$letterSuffixed})", $passes, $failures);

// No WAIT* placeholders
$waitCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (70, 71, 72, 73, 74, 75) AND unit_number LIKE '%WAIT%'")->fetchColumn();
assertTest($waitCount === 0, "Zero WAIT* placeholder units exist in Alfred (got {$waitCount})", $passes, $failures);

// Provenance checks
$nonVerified = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (70, 71, 72, 73, 74, 75) AND provenance != 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($nonVerified === 0, "Zero pattern provenance units left in Alfred (got {$nonVerified})", $passes, $failures);

$verifiedCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (70, 71, 72, 73, 74, 75) AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($verifiedCount === 14, "All 14 Alfred units carry provenance 'verified — Yardi extract 2026-10-22' (got {$verifiedCount})", $passes, $failures);

// -------------------------------------------------------------
// 4. Default Appliance Sets in Database & Reference Inheritance
// -------------------------------------------------------------
echo "\n--- 4. Default Appliance Sets in Database ---\n";

$quadrantSet = $db->query("SELECT * FROM default_sets WHERE id = 'set-quadrant-apt'")->fetch(PDO::FETCH_ASSOC);
assertTest($quadrantSet !== false, "Default set 'set-quadrant-apt' exists in database", $passes, $failures);
if ($quadrantSet) {
    assertTest($quadrantSet['unit_type'] === 'apartment', "set-quadrant-apt unit_type is 'apartment'", $passes, $failures);
}

// -------------------------------------------------------------
// 5. TypeScript Constants Integrity (residential_constants.tsx)
// -------------------------------------------------------------
echo "\n--- 5. TypeScript Constants Integrity (residential_constants.tsx) ---\n";

$tsCode = file_get_contents(__DIR__ . '/../residential_constants.tsx');

assertTest(str_contains($tsCode, 'ALFRED_YARDI_ROSTERS'),
    "TypeScript defines ALFRED_YARDI_ROSTERS constant", $passes, $failures);

assertTest(str_contains($tsCode, 'STORAGE_394_ALFRED'),
    "TypeScript defines STORAGE_394_ALFRED constant", $passes, $failures);

assertTest(str_contains($tsCode, 'set-quadrant-apt'),
    "TypeScript defines set-quadrant-apt in DEFAULT_APPLIANCE_SETS", $passes, $failures);

// Test unit generation from node
$testScript = '
const { generateUnitRoster, RESIDENTIAL_PROPERTIES } = require("./residential_constants.tsx");
const alfredBuildings = RESIDENTIAL_PROPERTIES.filter(p => p.id.startsWith("prop-alfred-"));

const units = alfredBuildings.flatMap(b => generateUnitRoster(b));
const byBldg = {};
for (const b of alfredBuildings) {
    byBldg[b.id] = generateUnitRoster(b).map(u => u.unitNumber);
}

const prop378 = alfredBuildings.find(b => b.id === "prop-alfred-378");
const prop394 = alfredBuildings.find(b => b.id === "prop-alfred-394");

console.log(JSON.stringify({
    totalBuildings: alfredBuildings.length,
    totalUnits: units.length,
    byBldg,
    allProvenance: [...new Set(units.map(u => u.provenance))],
    allDefaultSetIds: [...new Set(units.map(u => u.defaultSetId))],
    codes378: prop378?.yardiCodes || prop378?.externalIds || [],
    codes394: prop394?.yardiCodes || prop394?.externalIds || [],
    isStorage394: !!(prop394?.isStorageNode || prop394?.role === "storage")
}));
';

$nodeCmd = "npx tsx -e " . escapeshellarg($testScript);
$output = shell_exec($nodeCmd);
$tsResult = json_decode($output, true);

if ($tsResult) {
    assertTest($tsResult['totalBuildings'] === 6, "TypeScript has exactly 6 Alfred buildings (got {$tsResult['totalBuildings']})", $passes, $failures);
    assertTest($tsResult['totalUnits'] === 14, "TypeScript generates exactly 14 Alfred units (got {$tsResult['totalUnits']})", $passes, $failures);
    assertTest($tsResult['byBldg']['prop-alfred-353'] === ['1', '2', '3'], "TypeScript 353 Alfred units are ['1', '2', '3']", $passes, $failures);
    assertTest($tsResult['byBldg']['prop-alfred-359'] === ['359'], "TypeScript 359 Alfred unit is ['359']", $passes, $failures);
    assertTest($tsResult['byBldg']['prop-alfred-361'] === ['1'], "TypeScript 361 Alfred unit is ['1']", $passes, $failures);
    assertTest($tsResult['byBldg']['prop-alfred-376'] === ['376'], "TypeScript 376 Alfred unit is ['376']", $passes, $failures);
    assertTest($tsResult['byBldg']['prop-alfred-378'] === ['378'], "TypeScript 378 Alfred unit is ['378']", $passes, $failures);
    assertTest($tsResult['byBldg']['prop-alfred-394'] === ['1', '2', '3', '4', '5', '6', '7'], "TypeScript 394 Alfred units are ['1'..'7']", $passes, $failures);
    assertTest($tsResult['allProvenance'] === ['verified — Yardi extract 2026-10-22'], "TypeScript units all carry verified provenance", $passes, $failures);
    assertTest($tsResult['allDefaultSetIds'] === ['set-quadrant-apt'], "TypeScript units all inherit set-quadrant-apt by reference", $passes, $failures);
    assertTest(in_array('378alfr', $tsResult['codes378']) && in_array('alfr378', $tsResult['codes378']),
        "TypeScript 378 Alfred carries both Yardi codes (378alfr and alfr378)", $passes, $failures);
    assertTest(in_array('394alfr', $tsResult['codes394']) && in_array('alfr394', $tsResult['codes394']),
        "TypeScript 394 Alfred carries both Yardi codes (394alfr and alfr394)", $passes, $failures);
    assertTest($tsResult['isStorage394'] === true, "TypeScript 394 Alfred retains storage node role", $passes, $failures);
} else {
    assertTest(false, "Failed to execute TypeScript runtime inspection via npx tsx", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Alfred Rosters Acceptance Verification Summary:\n";
echo "Passes: {$passes}\n";
echo "Failures: {$failures}\n";
echo "========================================\n";

if ($failures === 0) {
    echo "SUCCESS: All Alfred Verified Yardi Rosters Acceptance Tests PASSED!\n";
    exit(0);
} else {
    echo "FAILURE: Some acceptance tests failed!\n";
    exit(1);
}
