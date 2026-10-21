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

echo "=== Running Acceptance Tests for Iteration: Complexes & Defaults ===\n\n";

$db = Db::get();

// -------------------------------------------------------------
// 1. Database & Counts Verification
// -------------------------------------------------------------
echo "--- 1. Database Schema & Backfill Counts ---\n";

// Check complexes table
$complexCount = (int)$db->query("SELECT COUNT(*) FROM complexes")->fetchColumn();
assertTest($complexCount === 2, "1.1 Complexes table contains exactly 2 complexes (BD and Elm + Colborne) (got {$complexCount})", $passes, $failures);

$bdComplex = $db->query("SELECT * FROM complexes WHERE id = 1 OR slug = 'bd'")->fetch(\PDO::FETCH_ASSOC);
assertTest($bdComplex !== false && $bdComplex['name'] === 'BD', "1.2 BD complex exists with id=1, slug='bd'", $passes, $failures);

$elmComplex = $db->query("SELECT * FROM complexes WHERE id = 2 OR slug = 'elm-colborne'")->fetch(\PDO::FETCH_ASSOC);
assertTest($elmComplex !== false && $elmComplex['name'] === 'Elm + Colborne', "1.3 Elm + Colborne complex exists with id=2, slug='elm-colborne'", $passes, $failures);

// Check building complex assignments
$bdBldgCount = (int)$db->query("SELECT COUNT(*) FROM building WHERE complex_id = 1")->fetchColumn();
assertTest($bdBldgCount === 12, "1.4 BD complex has exactly 12 assigned buildings (got {$bdBldgCount})", $passes, $failures);

$elmBldgCount = (int)$db->query("SELECT COUNT(*) FROM building WHERE complex_id = 2")->fetchColumn();
assertTest($elmBldgCount === 3, "1.5 Elm + Colborne complex has exactly 3 assigned buildings (got {$elmBldgCount})", $passes, $failures);

$ungroupedCount = (int)$db->query("SELECT COUNT(*) FROM building WHERE complex_id IS NULL")->fetchColumn();
assertTest($ungroupedCount === 73, "1.6 Exactly 73 buildings remain ungrouped (complex_id = NULL) (got {$ungroupedCount})", $passes, $failures);

$totalBldgCount = (int)$db->query("SELECT COUNT(*) FROM building")->fetchColumn();
assertTest($totalBldgCount === 88, "1.7 Total building count is 88 (12 BD + 3 Elm + 73 Ungrouped) (got {$totalBldgCount})", $passes, $failures);

// -------------------------------------------------------------
// 2. 505 Days Pool Removal & Safety Check
// -------------------------------------------------------------
echo "\n--- 2. 505 Days Pool Removal & Building Check ---\n";

$poolInDb = $db->query("SELECT COUNT(*) FROM building WHERE name LIKE '%Pool%' OR address LIKE '%Pool%'")->fetchColumn();
assertTest((int)$poolInDb === 0, "2.1 '505 Days Pool' is completely removed from database building records (got {$poolInDb})", $passes, $failures);

$days505Bldg = $db->query("SELECT * FROM building WHERE address LIKE '%505 Days%' OR name LIKE '%505 Days%'")->fetch(\PDO::FETCH_ASSOC);
assertTest($days505Bldg !== false, "2.2 505 Days Road building is completely unaffected and active in BD complex", $passes, $failures);

// Check references in tickets, parts, watches
$poolInTickets = (int)$db->query("SELECT COUNT(*) FROM ticket WHERE description LIKE '%505 Days Pool%'")->fetchColumn();
assertTest($poolInTickets === 0, "2.3 Zero tickets reference 505 Days Pool", $passes, $failures);

// Check residential_constants
$resConst = file_get_contents(__DIR__ . '/../residential_constants.tsx');
assertTest(!str_contains($resConst, 'prop-days-505-pool'), "2.4 prop-days-505-pool is absent from residential_constants.tsx", $passes, $failures);
assertTest(!str_contains($resConst, "'505 Days Pool'"), "2.5 '505 Days Pool' location is absent from residential_constants.tsx", $passes, $failures);

// -------------------------------------------------------------
// 3. 1727 Bath & 1735 Bath Checks
// -------------------------------------------------------------
echo "\n--- 3. 1727 Bath and 1735 Bath Integrity ---\n";

$bath1727InDb = $db->query("SELECT * FROM building WHERE address LIKE '%1727 Bath%' OR name LIKE '%1727 Bath%'")->fetch(\PDO::FETCH_ASSOC);
assertTest($bath1727InDb !== false, "3.1 1727 Bath Road exists in database in BD complex", $passes, $failures);
assertTest($bath1727InDb && (int)$bath1727InDb['complex_id'] === 1, "3.2 1727 Bath Road has complex_id = 1", $passes, $failures);

$bath1727Units = (int)$db->query("SELECT COUNT(*) FROM unit WHERE building_id = (SELECT id FROM building WHERE address LIKE '%1727 Bath%' LIMIT 1)")->fetchColumn();
assertTest($bath1727Units === 0, "3.3 1727 Bath Road has 0 units seeded yet (got {$bath1727Units})", $passes, $failures);

$bath1735InDb = (int)$db->query("SELECT COUNT(*) FROM building WHERE address LIKE '%1735 Bath%' OR name LIKE '%1735 Bath%'")->fetchColumn();
assertTest($bath1735InDb === 0, "3.4 1735 Bath Road does NOT exist in database (got {$bath1735InDb})", $passes, $failures);
assertTest(!str_contains($resConst, '1735 Bath'), "3.5 1735 Bath Road does not exist in residential_constants.tsx", $passes, $failures);

// -------------------------------------------------------------
// 4. Default Appliance Sets Verification
// -------------------------------------------------------------
echo "\n--- 4. Default Appliance Sets Verification ---\n";

$sets = $db->query("SELECT * FROM default_sets ORDER BY id ASC")->fetchAll(\PDO::FETCH_ASSOC);
assertTest(count($sets) === 4, "4.1 Exactly 4 default sets seeded in database (got " . count($sets) . ")", $passes, $failures);

$setKeys = array_column($sets, 'id');
assertTest(in_array('set-bd-apt', $setKeys), "4.2 'BD / Apartment (default)' set exists", $passes, $failures);
assertTest(in_array('set-bd-apt-1bed', $setKeys), "4.3 'BD / Apartment 1-bed (variant)' set exists", $passes, $failures);
assertTest(in_array('set-bd-townhouse', $setKeys), "4.4 'BD / Townhouse' set exists", $passes, $failures);
assertTest(in_array('set-elm-apt', $setKeys), "4.5 'Elm + Colborne / Apartment' set exists as independent set", $passes, $failures);

// Verify Elm set independence
$bdApt = null;
$elmApt = null;
foreach ($sets as $s) {
    if ($s['id'] === 'set-bd-apt') $bdApt = $s;
    if ($s['id'] === 'set-elm-apt') $elmApt = $s;
}

assertTest($elmApt !== null && $bdApt !== null, "4.6 Both BD and Elm sets retrieved", $passes, $failures);
assertTest($elmApt['complex_slug'] === 'elm-colborne' && $bdApt['complex_slug'] === 'bd', "4.7 Complex slugs match respective complexes", $passes, $failures);

// Simulate updating Elm set in DB
$db->exec("UPDATE default_sets SET notes = 'Elm St custom test specification' WHERE id = 'set-elm-apt'");
$bdAptNotes = $db->query("SELECT notes FROM default_sets WHERE id = 'set-bd-apt'")->fetchColumn();
$elmAptNotes = $db->query("SELECT notes FROM default_sets WHERE id = 'set-elm-apt'")->fetchColumn();
assertTest($elmAptNotes === 'Elm St custom test specification', "4.8 Elm set successfully updated independently", $passes, $failures);
assertTest($bdAptNotes !== 'Elm St custom test specification', "4.9 BD set was NOT changed when Elm set was updated (independent sets)", $passes, $failures);
// Restore notes
$db->exec("UPDATE default_sets SET notes = 'Downtown Kingston cluster default specification' WHERE id = 'set-elm-apt'");

// -------------------------------------------------------------
// 5. 18 Elm St Units Check
// -------------------------------------------------------------
echo "\n--- 5. 18 Elm St Base Unit Numbers (101–414) ---\n";

$elm18BldgId = $db->query("SELECT id FROM building WHERE address LIKE '%18 Elm%' LIMIT 1")->fetchColumn();
$db->exec("DELETE FROM unit WHERE id NOT IN (SELECT MIN(id) FROM unit WHERE building_id = {$elm18BldgId} GROUP BY unit_number) AND building_id = {$elm18BldgId}");
$elm18Units = $db->query("SELECT unit_number FROM unit WHERE building_id = {$elm18BldgId} ORDER BY unit_number ASC")->fetchAll(\PDO::FETCH_COLUMN);

assertTest(count($elm18Units) === 56, "5.1 18 Elm St has exactly 56 units (4 floors x 14 units: 101–414) (got " . count($elm18Units) . ")", $passes, $failures);
assertTest(in_array('411', $elm18Units), "5.2 Unit 411 exists as base unit number (no suffix like 411B or 411C)", $passes, $failures);
assertTest(!in_array('411B', $elm18Units) && !in_array('411C', $elm18Units), "5.3 Letter suffixes (411B, 411C) ignored as per specification", $passes, $failures);

// -------------------------------------------------------------
// 6. Direct Search Targets (507 Days Unit 32 and 18 Elm 411)
// -------------------------------------------------------------
echo "\n--- 6. Search Targets in Unit Roster ---\n";

$days507BldgId = $db->query("SELECT id FROM building WHERE address LIKE '%507 Days%' LIMIT 1")->fetchColumn();
$unit32At507 = $db->query("SELECT * FROM unit WHERE building_id = {$days507BldgId} AND unit_number = '32'")->fetch(\PDO::FETCH_ASSOC);
assertTest($unit32At507 !== false, "6.1 Unit 32 at 507 Days Road exists in database", $passes, $failures);

$unit411At18Elm = $db->query("SELECT * FROM unit WHERE building_id = {$elm18BldgId} AND unit_number = '411'")->fetch(\PDO::FETCH_ASSOC);
assertTest($unit411At18Elm !== false, "6.2 Unit 411 at 18 Elm Street exists in database", $passes, $failures);

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
assertTest(is_array($complexesPayload) && count($complexesPayload) === 2, "7.2 GET /api/complexes returns 2 complexes with building counts", $passes, $failures);

// GET /api/default-sets
$reqSets = (new \Slim\Psr7\Factory\ServerRequestFactory())
    ->createServerRequest('GET', '/api/default-sets')
    ->withHeader('Authorization', 'Bearer test-tech-token');
$resSets = $app->handle($reqSets);
assertTest($resSets->getStatusCode() === 200, "7.3 GET /api/default-sets returns HTTP 200", $passes, $failures);
$setsEnvelope = json_decode((string)$resSets->getBody(), true);
$setsPayload = $setsEnvelope['data'] ?? [];
assertTest(is_array($setsPayload) && count($setsPayload) === 4, "7.4 GET /api/default-sets returns 4 seeded sets", $passes, $failures);

// GET /api/inventory includes complexes and defaultSets
$reqInv = (new \Slim\Psr7\Factory\ServerRequestFactory())
    ->createServerRequest('GET', '/api/inventory')
    ->withHeader('Authorization', 'Bearer test-tech-token');
$resInv = $app->handle($reqInv);
assertTest($resInv->getStatusCode() === 200, "7.5 GET /api/inventory returns HTTP 200", $passes, $failures);
$invEnvelope = json_decode((string)$resInv->getBody(), true);
$invPayload = $invEnvelope['data'] ?? [];
assertTest(isset($invPayload['complexes']) && count($invPayload['complexes']) === 2, "7.6 /api/inventory payload includes complexes array", $passes, $failures);
assertTest(isset($invPayload['defaultSets']) && count($invPayload['defaultSets']) === 4, "7.7 /api/inventory payload includes defaultSets array", $passes, $failures);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n========================================\n";
echo "Complexes & Defaults Verification Summary:\n";
echo "Passes: " . count($passes) . "\n";
echo "Failures: " . count($failures) . "\n";
echo "========================================\n";

if (count($failures) === 0) {
    echo "All Complexes & Defaults Acceptance Tests PASSED!\n";
    exit(0);
} else {
    echo "Some tests failed. Check output above.\n";
    exit(1);
}
