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

echo "=== Running Acceptance Tests for BD Verified Yardi Rosters ===\n\n";

// -------------------------------------------------------------
// 1. Per-building unit counts in database
// -------------------------------------------------------------
echo "--- 1. Per-Building Unit Counts in Database ---\n";

$expectedCounts = [
    8 => ['505 Days', 12],
    14 => ['509 Days', 12],
    15 => ['511 Days', 9],
    9 => ['507 Days Townhouses', 21],
    1 => ['1719 Bath', 9],
    2 => ['1721 Bath', 12],
    3 => ['1723 Bath', 10],
    5 => ['1731 Bath', 9],
    6 => ['1733 Bath', 12],
    16 => ['1727 Bath Townhouses', 4],
    7 => ['1737 Bath Townhouses', 8],
    4 => ['1725 Bath', 12]
];

$totalBd = 0;
foreach ($expectedCounts as $bId => [$name, $expected]) {
    $count = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = {$bId}")->fetchColumn();
    assertTest($count === $expected, "{$name} (ID {$bId}) has exactly {$expected} units (got {$count})", $passes, $failures);
    $totalBd += $count;
}

assertTest($totalBd === 130, "Total BD Complex units in database is exactly 130 (got {$totalBd})", $passes, $failures);

$daysCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (8, 9, 14, 15)")->fetchColumn();
assertTest($daysCount === 54, "Total Days units in database is exactly 54 (got {$daysCount})", $passes, $failures);

$bathCount = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (1, 2, 3, 4, 5, 6, 7, 16)")->fetchColumn();
assertTest($bathCount === 76, "Total Bath units in database is exactly 76 (got {$bathCount})", $passes, $failures);

// -------------------------------------------------------------
// 2. Prohibited unit numbers checks (WAIT*, 164, 264, 507 units 1-10 & 13)
// -------------------------------------------------------------
echo "\n--- 2. Prohibited Unit Checks (WAIT*, 164, 264, 507 1–10 & 13) ---\n";

$waitUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE unit_number LIKE 'WAIT%'")->fetchColumn();
assertTest($waitUnits === 0, "No WAIT* placeholder units exist in database (got {$waitUnits})", $passes, $failures);

$units164_264 = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 3 AND unit_number IN ('164', '264')")->fetchColumn();
assertTest($units164_264 === 0, "Units 164 and 264 do NOT exist in 1723 Bath (got {$units164_264})", $passes, $failures);

$days507Unconfirmed = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = 9 AND unit_number IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '13')")->fetchColumn();
assertTest($days507Unconfirmed === 0, "Units 1–10 and 13 do NOT exist for 507 Days (got {$days507Unconfirmed})", $passes, $failures);

$days507Units = $db->query("SELECT unit_number FROM unit WHERE building_id = 9 ORDER BY CAST(unit_number AS INTEGER) ASC")->fetchAll(\PDO::FETCH_COLUMN);
$expected507 = ['11', '12', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32'];
assertTest($days507Units === $expected507, "507 Days contains exactly continuous 11, 12, 14–32 except 13", $passes, $failures);

// -------------------------------------------------------------
// 3. Building notes and numbering pool documentation
// -------------------------------------------------------------
echo "\n--- 3. Building Notes and Numbering Pool Documentation ---\n";

$b507 = $db->query("SELECT comments FROM building WHERE id = 9")->fetchColumn();
assertTest(str_contains($b507, 'TODO-verify: units 1–10 and 13 unconfirmed in Yardi extract'), "507 Days has note 'TODO-verify: units 1–10 and 13 unconfirmed in Yardi extract'", $passes, $failures);

$b505 = $db->query("SELECT comments FROM building WHERE id = 8")->fetchColumn();
assertTest(str_contains($b505, 'Days apartments share numbering pool (G1–G11 / 101–111 / 201–211)'), "505 Days records Days apartments numbering pool", $passes, $failures);

$b1719 = $db->query("SELECT comments FROM building WHERE id = 1")->fetchColumn();
assertTest(str_contains($b1719, 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist)'), "1719 Bath records Bath apartments numbering pool", $passes, $failures);

$b1725 = $db->query("SELECT comments FROM building WHERE id = 4")->fetchColumn();
assertTest(str_contains($b1725, '2-digit pool runs 33–56 across 1727/1737/1725'), "1725 Bath records 2-digit pool (33–56)", $passes, $failures);

$b1731 = $db->query("SELECT comments FROM building WHERE id = 5")->fetchColumn();
assertTest(str_contains($b1731, 'Yardi picker conflict on 163/261/262 assigned to 1731'), "1731 Bath records picker conflict note", $passes, $failures);

$b1733 = $db->query("SELECT comments FROM building WHERE id = 6")->fetchColumn();
assertTest(str_contains($b1733, 'Yardi picker conflict on 158/260 assigned to 1733'), "1733 Bath records picker conflict note", $passes, $failures);

// -------------------------------------------------------------
// 4. Floor derivation and Provenance checks
// -------------------------------------------------------------
echo "\n--- 4. Floor Derivation and Provenance Checks ---\n";

$groundUnits = $db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (1,2,3,4,5,6,7,8,9,14,15,16) AND unit_number LIKE 'G%' AND floor != 'Ground Floor'")->fetchColumn();
assertTest((int)$groundUnits === 0, "All G* units derive floor as 'Ground Floor'", $passes, $failures);

$firstFloorUnits = $db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (1,2,3,4,5,6,7,8,9,14,15,16) AND unit_number LIKE '1__' AND floor != 'First Floor'")->fetchColumn();
assertTest((int)$firstFloorUnits === 0, "All 1xx units derive floor as 'First Floor'", $passes, $failures);

$secondFloorUnits = $db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (1,2,3,4,5,6,7,8,9,14,15,16) AND unit_number LIKE '2__' AND floor != 'Second Floor'")->fetchColumn();
assertTest((int)$secondFloorUnits === 0, "All 2xx units derive floor as 'Second Floor'", $passes, $failures);

$townhouseFloors = $db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (9, 16, 7) AND floor != 'Multi-Floor Townhouse'")->fetchColumn();
assertTest((int)$townhouseFloors === 0, "All townhouses (507, 1727, 1737) have floor 'Multi-Floor Townhouse'", $passes, $failures);

$apt1725Main = $db->query("SELECT COUNT(*) FROM unit WHERE building_id = 4 AND CAST(unit_number AS INTEGER) <= 50 AND floor != 'Main Floor'")->fetchColumn();
$apt1725Second = $db->query("SELECT COUNT(*) FROM unit WHERE building_id = 4 AND CAST(unit_number AS INTEGER) > 50 AND floor != 'Second Floor'")->fetchColumn();
assertTest((int)$apt1725Main === 0 && (int)$apt1725Second === 0, "1725 Bath units 45-50 are 'Main Floor' and 51-56 are 'Second Floor'", $passes, $failures);

$bdVerifiedProvenance = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id IN (1,2,3,4,5,6,7,8,9,14,15,16) AND provenance = 'verified — Yardi extract 2026-10-22'")->fetchColumn();
assertTest($bdVerifiedProvenance === 130, "All 130 BD units in database have provenance 'verified — Yardi extract 2026-10-22' (got {$bdVerifiedProvenance})", $passes, $failures);

// -------------------------------------------------------------
// 5. Verified appliance anchoring in database
// -------------------------------------------------------------
echo "\n--- 5. Verified Appliance Anchoring in Database ---\n";

$dw = $db->query("SELECT a.name, a.unit_number, a.unit_id, u.unit_number as u_num, b.name as b_name FROM appliance a JOIN unit u ON a.unit_id = u.id JOIN building b ON a.building_id = b.id WHERE a.id = 1")->fetch(\PDO::FETCH_ASSOC);
assertTest($dw && $dw['unit_number'] === '266' && $dw['u_num'] === '266' && str_contains($dw['b_name'], '1723 Bath'), "Dishwasher is anchored to Unit 266 in 1723 Bath Road", $passes, $failures);

$fridge = $db->query("SELECT a.name, a.unit_number, a.unit_id, u.unit_number as u_num, b.name as b_name FROM appliance a JOIN unit u ON a.unit_id = u.id JOIN building b ON a.building_id = b.id WHERE a.id = 5")->fetch(\PDO::FETCH_ASSOC);
assertTest($fridge && $fridge['unit_number'] === '273' && $fridge['u_num'] === '273' && str_contains($fridge['b_name'], '1719 Bath'), "Refrigerator is anchored to Unit 273 in 1719 Bath Road", $passes, $failures);

$freezer = $db->query("SELECT a.name, a.unit_number, a.unit_id, u.unit_number as u_num, b.name as b_name FROM appliance a JOIN unit u ON a.unit_id = u.id JOIN building b ON a.building_id = b.id WHERE a.id = 6")->fetch(\PDO::FETCH_ASSOC);
assertTest($freezer && $freezer['unit_number'] === '103' && $freezer['u_num'] === '103' && str_contains($freezer['b_name'], '505 Days'), "Freezer is anchored to Unit 103 in 505 Days Road", $passes, $failures);

// -------------------------------------------------------------
// 6. residential_constants.tsx integrity
// -------------------------------------------------------------
echo "\n--- 6. TypeScript Constants Integrity (residential_constants.tsx) ---\n";

$code = file_get_contents(__DIR__ . '/../residential_constants.tsx');

assertTest(str_contains($code, 'BD_YARDI_ROSTERS'), "residential_constants.tsx defines BD_YARDI_ROSTERS", $passes, $failures);
assertTest(str_contains($code, "'verified — Yardi extract 2026-10-22'"), "residential_constants.tsx assigns provenance 'verified — Yardi extract 2026-10-22'", $passes, $failures);
assertTest(!str_contains($code, "bId === 'prop-bath-1727') {\n            // 1727 Bath Rd: real building with no units yet"), "1727 Bath no longer returns empty units in residential_constants.tsx", $passes, $failures);

// Check that no BD unit has provenance 'pattern'
$script = "
import { RESIDENTIAL_PROPERTIES, RESIDENTIAL_UNITS } from '../residential_constants';
const bdBuildings = ['prop-days-505', 'prop-days-509', 'prop-days-511', 'prop-days-507', 'prop-bath-1719', 'prop-bath-1721', 'prop-bath-1723', 'prop-bath-1725', 'prop-bath-1731', 'prop-bath-1733', 'prop-bath-1727', 'prop-bath-1737'];
const bdUnits = RESIDENTIAL_UNITS.filter(u => bdBuildings.includes(u.buildingId));
const patternUnits = bdUnits.filter(u => u.provenance === 'pattern');
const waitUnits = bdUnits.filter(u => u.unitNumber.startsWith('WAIT'));
const unconfirmed507 = bdUnits.filter(u => u.buildingId === 'prop-days-507' && ['1','2','3','4','5','6','7','8','9','10','13'].includes(u.unitNumber));
const units164_264 = bdUnits.filter(u => ['164', '264'].includes(u.unitNumber));

console.log(JSON.stringify({
    totalBdUnits: bdUnits.length,
    patternUnitsCount: patternUnits.length,
    waitUnitsCount: waitUnits.length,
    unconfirmed507Count: unconfirmed507.length,
    units164_264Count: units164_264.length,
    byBuilding: bdBuildings.reduce((acc, id) => {
        acc[id] = bdUnits.filter(u => u.buildingId === id).length;
        return acc;
    }, {})
}));
";

file_put_contents(__DIR__ . '/test_ts_units.ts', $script);
$tsOutput = shell_exec("npx -y tsx " . escapeshellarg(__DIR__ . '/test_ts_units.ts'));
unlink(__DIR__ . '/test_ts_units.ts');

$tsData = json_decode($tsOutput ?? '', true);
assertTest($tsData !== null && $tsData['totalBdUnits'] === 130, "TypeScript RESIDENTIAL_UNITS produces exactly 130 BD units (got " . ($tsData['totalBdUnits'] ?? 'null') . ")", $passes, $failures);
assertTest($tsData !== null && $tsData['patternUnitsCount'] === 0, "Zero pattern units in BD (got " . ($tsData['patternUnitsCount'] ?? 'null') . ")", $passes, $failures);
assertTest($tsData !== null && $tsData['waitUnitsCount'] === 0, "Zero WAIT* units in BD (got " . ($tsData['waitUnitsCount'] ?? 'null') . ")", $passes, $failures);
assertTest($tsData !== null && $tsData['unconfirmed507Count'] === 0, "Zero unconfirmed units 1–10/13 in 507 Days (got " . ($tsData['unconfirmed507Count'] ?? 'null') . ")", $passes, $failures);
assertTest($tsData !== null && $tsData['units164_264Count'] === 0, "Zero 164/264 units in BD (got " . ($tsData['units164_264Count'] ?? 'null') . ")", $passes, $failures);

$expectedTsCounts = [
    'prop-days-505' => 12,
    'prop-days-509' => 12,
    'prop-days-511' => 9,
    'prop-days-507' => 21,
    'prop-bath-1719' => 9,
    'prop-bath-1721' => 12,
    'prop-bath-1723' => 10,
    'prop-bath-1731' => 9,
    'prop-bath-1733' => 12,
    'prop-bath-1727' => 4,
    'prop-bath-1737' => 8,
    'prop-bath-1725' => 12
];

foreach ($expectedTsCounts as $bId => $expCount) {
    $act = $tsData['byBuilding'][$bId] ?? 0;
    assertTest($act === $expCount, "TypeScript building {$bId} has exactly {$expCount} units (got {$act})", $passes, $failures);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "BD Rosters Acceptance Verification Summary:\n";
echo "Passes: {$passes}\n";
echo "Failures: {$failures}\n";
echo "========================================\n";

if ($failures > 0) {
    echo "FAILED: Some acceptance criteria failed!\n";
    exit(1);
} else {
    echo "SUCCESS: All BD Verified Yardi Rosters Acceptance Tests PASSED!\n";
    exit(0);
}
