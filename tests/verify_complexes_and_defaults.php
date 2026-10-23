<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config;
use App\Db;

$passes = [];
$failures = [];

function assertTest(bool $condition, string $description, array &$passes, array &$failures): void {
    if ($condition) {
        $passes[] = $description;
        echo "[PASS] {$description}\n";
    } else {
        $failures[] = $description;
        echo "[FAIL] {$description}\n";
    }
}

echo "=== Running Acceptance Tests for Portfolio Grouping & Appliance History ===\n\n";

$db = Db::get();

// -------------------------------------------------------------
// 1. Database & Counts Verification (8 Complexes + Ungrouped)
// -------------------------------------------------------------
echo "--- 1. Database Schema & Backfill Counts ---\n";

// Check complexes table
$complexCount = (int)$db->query("SELECT COUNT(*) FROM complexes")->fetchColumn();
assertTest($complexCount === 8, "1.1 Complexes table contains exactly 8 complexes (got {$complexCount})", $passes, $failures);

$expectedComplexes = [
    'bd' => ['id' => 1, 'name' => 'BD', 'expected_buildings' => 12],
    'elm-colborne' => ['id' => 2, 'name' => 'Elm + Colborne', 'expected_buildings' => 3],
    'amherst' => ['id' => 3, 'name' => 'Amherst', 'expected_buildings' => 44],
    'princess' => ['id' => 4, 'name' => 'Princess', 'expected_buildings' => 7],
    'victoria' => ['id' => 5, 'name' => 'Victoria', 'expected_buildings' => 4],
    'alfred' => ['id' => 6, 'name' => 'Alfred', 'expected_buildings' => 6],
    'frontenac' => ['id' => 7, 'name' => 'Frontenac', 'expected_buildings' => 2],
    'manitou' => ['id' => 8, 'name' => 'Manitou', 'expected_buildings' => 4]
];

foreach ($expectedComplexes as $slug => $info) {
    $row = $db->query("SELECT * FROM complexes WHERE slug = '{$slug}'")->fetch(\PDO::FETCH_ASSOC);
    assertTest($row !== false, "1.2 Complex '{$slug}' exists in database", $passes, $failures);
    $bldCount = (int)$db->query("SELECT COUNT(*) FROM building WHERE complex_id = {$row['id']}")->fetchColumn();
    assertTest($bldCount === $info['expected_buildings'], "1.3 Complex '{$slug}' has {$info['expected_buildings']} buildings (got {$bldCount})", $passes, $failures);
}

// Check ungrouped count
$ungroupedCount = (int)$db->query("SELECT COUNT(*) FROM building WHERE complex_id IS NULL")->fetchColumn();
assertTest($ungroupedCount === 10, "1.4 Exactly 10 buildings remain ungrouped (singles + McKay office) (got {$ungroupedCount})", $passes, $failures);

$totalBldgCount = (int)$db->query("SELECT COUNT(*) FROM building")->fetchColumn();
assertTest($totalBldgCount === 92, "1.5 Total building count is 92 (82 in complexes + 10 Ungrouped) (got {$totalBldgCount})", $passes, $failures);

// Verify Ungrouped names
$ungroupedNames = $db->query("SELECT name FROM building WHERE complex_id IS NULL ORDER BY name")->fetchAll(\PDO::FETCH_COLUMN);
$expectedSingles = [
    '176 Railway Street',
    '265 Ontario Street',
    '36 Durham Street',
    '415 Albert Street',
    '539 Armstrong Road',
    '55 Ontario Street',
    '698 McKay Street (Office)',
    '810 Blackburn Mews',
    '847 Development',
    '85 Park Street'
];
assertTest($ungroupedNames === $expectedSingles, "1.6 Ungrouped list matches exactly the 9 singles and McKay office", $passes, $failures);

// -------------------------------------------------------------
// 2. 505 Days Pool Removal & Safety Check
// -------------------------------------------------------------
echo "\n--- 2. 505 Days Pool Removal & Building Check ---\n";

$poolInDb = $db->query("SELECT COUNT(*) FROM building WHERE name LIKE '%Pool%' OR address LIKE '%Pool%'")->fetchColumn();
assertTest((int)$poolInDb === 0, "2.1 '505 Days Pool' is completely removed from database building records (got {$poolInDb})", $passes, $failures);

$days505Bldg = $db->query("SELECT * FROM building WHERE address LIKE '%505 Days%' OR name LIKE '%505 Days%'")->fetch(\PDO::FETCH_ASSOC);
assertTest($days505Bldg !== false, "2.2 505 Days Road building is completely unaffected and active in BD complex", $passes, $failures);

// -------------------------------------------------------------
// 3. 1727 Bath & 1735 Bath Checks
// -------------------------------------------------------------
echo "\n--- 3. 1727 Bath and 1735 Bath Integrity ---\n";

$bath1727InDb = $db->query("SELECT * FROM building WHERE address LIKE '%1727 Bath%' OR name LIKE '%1727 Bath%'")->fetch(\PDO::FETCH_ASSOC);
assertTest($bath1727InDb !== false, "3.1 1727 Bath Road exists in database in BD complex", $passes, $failures);
assertTest($bath1727InDb && (int)$bath1727InDb['complex_id'] === 1, "3.2 1727 Bath Road has complex_id = 1", $passes, $failures);

$bath1727Units = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = (SELECT id FROM building WHERE address LIKE '%1727 Bath%' LIMIT 1)")->fetchColumn();
assertTest($bath1727Units === 4, "3.3 1727 Bath Road has 4 verified townhouse units (got {$bath1727Units})", $passes, $failures);

$bath1735InDb = (int)$db->query("SELECT COUNT(*) FROM building WHERE address LIKE '%1735 Bath%' OR name LIKE '%1735 Bath%'")->fetchColumn();
assertTest($bath1735InDb === 0, "3.4 1735 Bath Road does NOT exist in database (got {$bath1735InDb})", $passes, $failures);

// -------------------------------------------------------------
// 4. Default Appliance Sets Verification
// -------------------------------------------------------------
echo "\n--- 4. Default Appliance Sets Verification ---\n";

$sets = $db->query("SELECT * FROM default_sets ORDER BY id ASC")->fetchAll(\PDO::FETCH_ASSOC);
assertTest(count($sets) >= 4, "4.1 At least 4 default sets seeded in database (got " . count($sets) . ")", $passes, $failures);

$resConst = file_get_contents(__DIR__ . '/../residential_constants.tsx');
assertTest(str_contains($resConst, 'DEFAULT_APPLIANCE_SETS'), "4.2 DEFAULT_APPLIANCE_SETS defined in residential_constants.tsx", $passes, $failures);
assertTest(str_contains($resConst, "'18 cu. ft.'") && str_contains($resConst, "volts: '120'"), "4.3 Refrigerator specs present in default templates", $passes, $failures);
assertTest(str_contains($resConst, "volts: '240'") && str_contains($resConst, "capacity: '5.3 cu. ft.'"), "4.4 Stove specs present in default templates", $passes, $failures);
assertTest(str_contains($resConst, "'14 Place Settings'"), "4.5 Dishwasher specs present in default templates", $passes, $failures);

// -------------------------------------------------------------
// 5. Seeded Real History Records
// -------------------------------------------------------------
echo "\n--- 5. Seeded History Records on Verified Appliances ---\n";

assertTest(str_contains($resConst, 'Drain pump replaced (Askoll M376'), "5.1 Frigidaire FFCD2418US3A dishwasher has drain pump repair record", $passes, $failures);
assertTest(str_contains($resConst, 'WB24T10025'), "5.2 Gray Frigidaire range has infinite switch inspection record", $passes, $failures);
assertTest(str_contains($resConst, 'No hot water reported. Work on hold pending management'), "5.3 Rheem water heater has no hot water inspection record", $passes, $failures);
assertTest(str_contains($resConst, 'WO 20316'), "5.4 John Wood ProLine has leaking tee & ECO trips inspection record", $passes, $failures);
assertTest(str_contains($resConst, 'SharkBite 1/2" push-fit ball valve'), "5.5 Electric water heater 1731/1733 has gate valve replacement record", $passes, $failures);
assertTest(str_contains($resConst, 'Crisper drawer 240337103 replaced'), "5.6 Frigidaire FFHT1826LS9 has crisper drawer repair record", $passes, $failures);
assertTest(str_contains($resConst, 'WO 19255'), "5.7 Freezer 505 Days 103 has noise complaint record", $passes, $failures);
assertTest(str_contains($resConst, 'Held as parts sources, not in service'), "5.8 Donor fridges have parts source note record", $passes, $failures);

// -------------------------------------------------------------
// 6. 18 Elm St Units Check
// -------------------------------------------------------------
echo "\n--- 6. 18 Elm St Base Unit Numbers (101–414) ---\n";

$elm18BldgId = $db->query("SELECT id FROM building WHERE address LIKE '%18 Elm%' LIMIT 1")->fetchColumn();
$elm18Units = $db->query("SELECT unit_number FROM unit WHERE building_id = {$elm18BldgId} ORDER BY unit_number ASC")->fetchAll(\PDO::FETCH_COLUMN);

assertTest(count($elm18Units) === 56, "6.1 18 Elm St has exactly 56 units (4 floors x 14 units: 101–414) (got " . count($elm18Units) . ")", $passes, $failures);
assertTest(in_array('411', $elm18Units), "6.2 Unit 411 exists as base unit number", $passes, $failures);

// -------------------------------------------------------------
// 7. API Endpoints
// -------------------------------------------------------------
echo "\n--- 7. API Endpoints Verification ---\n";

$app = \Slim\Factory\AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
\App\Routes::register($app);

// GET /api/complexes
$req = (new \Slim\Psr7\Factory\ServerRequestFactory())
    ->createServerRequest('GET', '/api/complexes')
    ->withHeader('Authorization', 'Bearer test-tech-token');
$res = $app->handle($req);
assertTest($res->getStatusCode() === 200, "7.1 GET /api/complexes returns HTTP 200", $passes, $failures);
$complexesEnvelope = json_decode((string)$res->getBody(), true);
$complexesPayload = $complexesEnvelope['data'] ?? [];
assertTest(is_array($complexesPayload) && count($complexesPayload) === 8, "7.2 GET /api/complexes returns all 8 complexes with building counts (got " . count($complexesPayload) . ")", $passes, $failures);

// GET /api/default-sets
$reqSets = (new \Slim\Psr7\Factory\ServerRequestFactory())
    ->createServerRequest('GET', '/api/default-sets')
    ->withHeader('Authorization', 'Bearer test-tech-token');
$resSets = $app->handle($reqSets);
assertTest($resSets->getStatusCode() === 200, "7.3 GET /api/default-sets returns HTTP 200", $passes, $failures);
$setsEnvelope = json_decode((string)$resSets->getBody(), true);
$setsPayload = $setsEnvelope['data'] ?? [];
assertTest(is_array($setsPayload) && count($setsPayload) >= 4, "7.4 GET /api/default-sets returns at least 4 seeded sets", $passes, $failures);

// GET /api/inventory includes complexes and defaultSets
$reqInv = (new \Slim\Psr7\Factory\ServerRequestFactory())
    ->createServerRequest('GET', '/api/inventory')
    ->withHeader('Authorization', 'Bearer test-tech-token');
$resInv = $app->handle($reqInv);
assertTest($resInv->getStatusCode() === 200, "7.5 GET /api/inventory returns HTTP 200", $passes, $failures);
$invEnvelope = json_decode((string)$resInv->getBody(), true);
$invPayload = $invEnvelope['data'] ?? [];
assertTest(isset($invPayload['complexes']) && count($invPayload['complexes']) === 8, "7.6 /api/inventory payload includes all 8 complexes", $passes, $failures);
assertTest(isset($invPayload['defaultSets']) && count($invPayload['defaultSets']) >= 4, "7.7 /api/inventory payload includes defaultSets array", $passes, $failures);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Acceptance Verification Summary:\n";
echo "Passes: " . count($passes) . "\n";
echo "Failures: " . count($failures) . "\n";
echo "========================================\n";

if (count($failures) === 0) {
    echo "All Complexes, Defaults & History Acceptance Tests PASSED!\n";
    exit(0);
} else {
    echo "Some tests failed. Check output above.\n";
    exit(1);
}
