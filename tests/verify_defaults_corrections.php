<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

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

echo "=== Running Verification for Defaults Corrections (Jose's Oct 23 Field Review) ===\n\n";

$db = Db::get();

// -------------------------------------------------------------
// 1. Total Verified Units Integrity (Exact 1,289)
// -------------------------------------------------------------
echo "--- 1. Total Verified Units Count ---\n";

$totalUnitsDb = (int)$db->query("SELECT COUNT(*) FROM unit")->fetchColumn();
assertTest($totalUnitsDb === 1289, "1.1 Total units in SQLite database is exactly 1,289 (got {$totalUnitsDb})", $passes, $failures);

$resConst = file_get_contents(__DIR__ . '/../residential_constants.tsx');
assertTest(str_contains($resConst, 'RESIDENTIAL_UNITS'), "1.2 RESIDENTIAL_UNITS exported in residential_constants.tsx", $passes, $failures);

// -------------------------------------------------------------
// 2. Unit Attributes & BD Apartment Collapse
// -------------------------------------------------------------
echo "\n--- 2. Bedrooms Attribute & BD Apartment Collapse ---\n";

// Check unit columns
$columns = $db->query("PRAGMA table_info(unit)")->fetchAll(\PDO::FETCH_ASSOC);
$colNames = array_column($columns, 'name');
assertTest(in_array('bedrooms', $colNames), "2.1 Unit table has 'bedrooms' column", $passes, $failures);
assertTest(in_array('washrooms', $colNames), "2.2 Unit table has 'washrooms' column", $passes, $failures);
assertTest(in_array('storeys', $colNames), "2.3 Unit table has 'storeys' column", $passes, $failures);

// Check set-bd-apt-1bed deletion
$legacySetDb = (int)$db->query("SELECT COUNT(*) FROM default_sets WHERE id = 'set-bd-apt-1bed'")->fetchColumn();
assertTest($legacySetDb === 0, "2.4 'set-bd-apt-1bed' is deleted from default_sets table (got {$legacySetDb})", $passes, $failures);

$legacyUnitsInDb = (int)$db->query("SELECT COUNT(*) FROM unit WHERE default_set_id = 'set-bd-apt-1bed'")->fetchColumn();
assertTest($legacyUnitsInDb === 0, "2.5 Zero units point to 'set-bd-apt-1bed' in database (got {$legacyUnitsInDb})", $passes, $failures);

assertTest(!str_contains($resConst, "'set-bd-apt-1bed'"), "2.6 'set-bd-apt-1bed' removed from residential_constants.tsx DEFAULT_APPLIANCE_SETS", $passes, $failures);

// BD apartment units repointed to set-bd-apt
$bdAptSet = $db->query("SELECT * FROM default_sets WHERE id = 'set-bd-apt'")->fetch(\PDO::FETCH_ASSOC);
assertTest($bdAptSet !== false, "2.7 'set-bd-apt' exists in database", $passes, $failures);

$bdAptUnits = (int)$db->query("SELECT COUNT(*) FROM unit WHERE default_set_id = 'set-bd-apt'")->fetchColumn();
assertTest($bdAptUnits === 97, "2.8 All 97 BD apartment units reference 'set-bd-apt' (got {$bdAptUnits})", $passes, $failures);

// -------------------------------------------------------------
// 3. Layout Defaults
// -------------------------------------------------------------
echo "\n--- 3. Layout Defaults (Elm, BD Townhouses, 203 Colborne) ---\n";

// Elm buildings: 18 Elm (78) & 24 Elm (79) -> 31 units total
$elmUnits = $db->query("SELECT COUNT(*) as cnt, SUM(CASE WHEN storeys = 1 AND washrooms = 1 THEN 1 ELSE 0 END) as matching FROM unit WHERE building_id IN (78, 79)")->fetch(\PDO::FETCH_ASSOC);
assertTest((int)$elmUnits['cnt'] === 31, "3.1 Elm buildings (18 Elm & 24 Elm) have 31 units total", $passes, $failures);
assertTest((int)$elmUnits['matching'] === 31, "3.2 All 31 Elm units have storeys = 1 and washrooms = 1 in database", $passes, $failures);

// BD townhouses: 1727 Bath (7), 1737 Bath (9), 507 Days (16) -> 33 units total
$bdThUnits = $db->query("SELECT COUNT(*) as cnt, SUM(CASE WHEN storeys = 3 AND washrooms = 2 THEN 1 ELSE 0 END) as matching FROM unit WHERE building_id IN (7, 9, 16)")->fetch(\PDO::FETCH_ASSOC);
assertTest((int)$bdThUnits['cnt'] === 33, "3.3 BD townhouses (1727 Bath, 1737 Bath, 507 Days) have 33 units total", $passes, $failures);
assertTest((int)$bdThUnits['matching'] === 33, "3.4 All 33 BD townhouse units have storeys = 3 and washrooms = 2 in database", $passes, $failures);

// 203 Colborne (80)
$colborneBld = $db->query("SELECT * FROM building WHERE id = 80 OR address LIKE '%203 Colborne%'")->fetch(\PDO::FETCH_ASSOC);
assertTest($colborneBld !== false, "3.5 203 Colborne building exists in database", $passes, $failures);
$expectedNote = 'Layout varies per unit (some two-storey, 1–2 washrooms) — TODO-verify per unit.';
assertTest(str_contains($colborneBld['comments'] ?? '', $expectedNote), "3.6 203 Colborne comments include exact TODO layout note", $passes, $failures);
assertTest(str_contains($resConst, $expectedNote), "3.7 residential_constants.tsx 203 Colborne comment includes exact TODO layout note", $passes, $failures);

// -------------------------------------------------------------
// 4. Appliance Defaults Library & Model Specifications
// -------------------------------------------------------------
echo "\n--- 4. Appliance Defaults Library & Model Specifications ---\n";

// Frigidaire FFCD2418US3A in standard apartment dishwashers
$stdAptSets = ['set-bd-apt', 'set-elm-apt', 'set-amherst-apt', 'set-manitou-apt', 'set-quadrant-apt', 'set-princess-apt', 'set-singles-apt'];
foreach ($stdAptSets as $setId) {
    $row = $db->query("SELECT appliances_json FROM default_sets WHERE id = '{$setId}'")->fetch(\PDO::FETCH_ASSOC);
    assertTest($row !== false, "4.1 Default set '{$setId}' exists in database", $passes, $failures);
    $apps = json_decode($row['appliances_json'] ?? '[]', true);
    $dishwasher = null;
    foreach ($apps as $a) {
        if (($a['type'] ?? '') === 'Dishwasher') {
            $dishwasher = $a;
            break;
        }
    }
    assertTest($dishwasher !== null, "4.2 Set '{$setId}' contains a Dishwasher", $passes, $failures);
    $model = $dishwasher['model'] ?? ($dishwasher['specs']['model'] ?? null);
    assertTest($model === 'Frigidaire FFCD2418US3A', "4.3 Set '{$setId}' dishwasher model is 'Frigidaire FFCD2418US3A' (got '{$model}')", $passes, $failures);
}

// Skyfall / Le Sante uniform set dishwasher MUST keep its own spec (NOT Frigidaire)
$skyfallRow = $db->query("SELECT appliances_json FROM default_sets WHERE id = 'set-skyfall-sante-uniform'")->fetch(\PDO::FETCH_ASSOC);
assertTest($skyfallRow !== false, "4.4 'set-skyfall-sante-uniform' exists in database", $passes, $failures);
$skyfallApps = json_decode($skyfallRow['appliances_json'] ?? '[]', true);
$skyfallDw = null;
foreach ($skyfallApps as $a) {
    if (($a['type'] ?? '') === 'Dishwasher') {
        $skyfallDw = $a;
        break;
    }
}
assertTest($skyfallDw !== null, "4.5 Skyfall uniform set contains a Dishwasher", $passes, $failures);
$skyfallModel = $skyfallDw['model'] ?? ($skyfallDw['specs']['model'] ?? null);
assertTest($skyfallModel !== 'Frigidaire FFCD2418US3A', "4.6 Skyfall uniform dishwasher does NOT use Frigidaire FFCD2418US3A (kept its own uniform spec)", $passes, $failures);

// -------------------------------------------------------------
// 5. Unit API Endpoints & Audit Log
// -------------------------------------------------------------
echo "\n--- 5. Unit API Endpoints & Audit Logging ---\n";

$app = \Slim\Factory\AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
\App\Routes::register($app);

// GET /api/units
$reqUnits = (new \Slim\Psr7\Factory\ServerRequestFactory())
    ->createServerRequest('GET', '/api/units')
    ->withHeader('Authorization', 'Bearer test-tech-token');
$resUnits = $app->handle($reqUnits);
assertTest($resUnits->getStatusCode() === 200, "5.1 GET /api/units returns HTTP 200", $passes, $failures);
$unitsEnvelope = json_decode((string)$resUnits->getBody(), true);
$unitsData = $unitsEnvelope['data'] ?? [];
assertTest(is_array($unitsData) && count($unitsData) === 1289, "5.2 GET /api/units returns all 1,289 units (got " . count($unitsData) . ")", $passes, $failures);

// Pick a unit to test PATCH /api/units/{id}
$testUnit = $unitsData[0];
$testUnitId = $testUnit['id'];
$origBedrooms = $testUnit['bedrooms'] ?? 2;
$newBedrooms = ($origBedrooms === 3) ? 2 : 3;

$patchPayload = json_encode(['bedrooms' => $newBedrooms]);
$stream = (new \Slim\Psr7\Factory\StreamFactory())->createStream($patchPayload);
$reqPatch = (new \Slim\Psr7\Factory\ServerRequestFactory())
    ->createServerRequest('PATCH', "/api/units/{$testUnitId}")
    ->withHeader('Authorization', 'Bearer test-tech-token')
    ->withHeader('Content-Type', 'application/json')
    ->withBody($stream);

$resPatch = $app->handle($reqPatch);
assertTest($resPatch->getStatusCode() === 200, "5.3 PATCH /api/units/{$testUnitId} returns HTTP 200", $passes, $failures);
$patchEnv = json_decode((string)$resPatch->getBody(), true);
assertTest(($patchEnv['data']['bedrooms'] ?? null) === $newBedrooms, "5.4 PATCH /api/units/{$testUnitId} updated bedrooms to {$newBedrooms}", $passes, $failures);

// Verify correction table audited this change
$lastCorr = $db->query("SELECT * FROM correction WHERE entity_type = 'unit' AND entity_id = '{$testUnitId}' ORDER BY id DESC LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
assertTest($lastCorr !== false, "5.5 Unit modification audited in correction table (append-only)", $passes, $failures);

// Revert back
$revertPayload = json_encode(['bedrooms' => $origBedrooms]);
$revertStream = (new \Slim\Psr7\Factory\StreamFactory())->createStream($revertPayload);
$reqRevert = (new \Slim\Psr7\Factory\ServerRequestFactory())
    ->createServerRequest('PATCH', "/api/units/{$testUnitId}")
    ->withHeader('Authorization', 'Bearer test-tech-token')
    ->withHeader('Content-Type', 'application/json')
    ->withBody($revertStream);
$app->handle($reqRevert);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Defaults Corrections Verification Summary:\n";
echo "Passes: " . count($passes) . "\n";
echo "Failures: " . count($failures) . "\n";
echo "========================================\n";

if (count($failures) === 0) {
    echo "ALL DEFAULTS CORRECTIONS ACCEPTANCE TESTS PASSED!\n";
    exit(0);
} else {
    echo "SOME TESTS FAILED!\n";
    exit(1);
}
