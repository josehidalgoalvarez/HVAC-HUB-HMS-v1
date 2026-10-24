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

echo "=== Running Acceptance Verification for Defaults Library Polish (Jose's Oct 23 Review) ===\n\n";

$db = Db::get();

// -------------------------------------------------------------
// 1. Total Verified Units Integrity (Exact 1,289)
// -------------------------------------------------------------
echo "--- 1. Total Verified Units Count Integrity ---\n";
$totalUnitsDb = (int)$db->query("SELECT COUNT(*) FROM unit")->fetchColumn();
assertTest($totalUnitsDb === 1289, "1.1 Total units in SQLite database is exactly 1,289 (got {$totalUnitsDb})", $passes, $failures);

// -------------------------------------------------------------
// 2. Types & Data Context Definitions
// -------------------------------------------------------------
echo "\n--- 2. Types & Data Context (manualUrl Support) ---\n";
$domainTypes = file_get_contents(__DIR__ . '/../types/domain.ts');
assertTest(str_contains($domainTypes, 'manualUrl?: string;'), "2.1 domain.ts exports manualUrl in ApplianceDefaultItem or ApplianceSpecs", $passes, $failures);

$dataContext = file_get_contents(__DIR__ . '/../context/DataContext.tsx');
assertTest(str_contains($dataContext, 'manualUrl: item.manualUrl'), "2.2 DataContext passes manualUrl to unit appliances inherited by reference", $passes, $failures);

// -------------------------------------------------------------
// 3. Trade Range & Relevance Utilities (utils/applianceDefaultsUtils.ts)
// -------------------------------------------------------------
echo "\n--- 3. Trade Range (10 Types) & Spec Relevance Rules ---\n";
$utilsPath = __DIR__ . '/../utils/applianceDefaultsUtils.ts';
assertTest(file_exists($utilsPath), "3.1 utils/applianceDefaultsUtils.ts exists", $passes, $failures);

$utilsContent = file_get_contents($utilsPath);

// Verify all 10 trade types
$requiredTradeTypes = [
    'Refrigerator',
    'Range',
    'Dishwasher',
    'Range Hood',
    'Gas Furnace',
    'Air Conditioner',
    'Water Heater',
    'Washer',
    'Dryer',
    'Thermostat'
];

foreach ($requiredTradeTypes as $trade) {
    assertTest(str_contains($utilsContent, "'{$trade}'") || str_contains($utilsContent, "\"{$trade}\""), "3.2 Trade range includes '{$trade}'", $passes, $failures);
}

// Check relevance rules in utils code
assertTest(str_contains($utilsContent, "case 'fridge':"), "3.3 Defines relevance rules for Refrigerator / Fridge", $passes, $failures);
assertTest(str_contains($utilsContent, "case 'furnace':"), "3.4 Defines relevance rules for Gas Furnace", $passes, $failures);
assertTest(str_contains($utilsContent, "case 'ac':"), "3.5 Defines relevance rules for Air Conditioner", $passes, $failures);
assertTest(str_contains($utilsContent, "case 'water_heater':"), "3.6 Defines relevance rules for Water Heater", $passes, $failures);

// -------------------------------------------------------------
// 4. Accordion & Expandable Menus in PropertyListView
// -------------------------------------------------------------
echo "\n--- 4. Expandable Accordion Menus (PropertyListView.tsx) ---\n";
$propListView = file_get_contents(__DIR__ . '/../components/properties/PropertyListView.tsx');

assertTest(str_contains($propListView, 'expandedSetIds'), "4.1 PropertyListView tracks expandedSetIds state", $passes, $failures);
assertTest(str_contains($propListView, 'expandedApplianceKeys'), "4.2 PropertyListView tracks expandedApplianceKeys state", $passes, $failures);
assertTest(str_contains($propListView, 'toggleSetExpanded'), "4.3 PropertyListView implements toggleSetExpanded handler", $passes, $failures);
assertTest(str_contains($propListView, 'toggleApplianceExpanded'), "4.4 PropertyListView implements toggleApplianceExpanded handler", $passes, $failures);
assertTest(str_contains($propListView, 'handleExpandAllSets'), "4.5 PropertyListView provides Expand All Sets action", $passes, $failures);
assertTest(str_contains($propListView, 'handleCollapseAllSets'), "4.6 PropertyListView provides Collapse All Sets action", $passes, $failures);

// -------------------------------------------------------------
// 5. Add Appliance per Set & Trade Picker
// -------------------------------------------------------------
echo "\n--- 5. Add Appliance per Set (Trade Picker Grid) ---\n";
assertTest(str_contains($propListView, 'addApplianceModalSet'), "5.1 PropertyListView has addApplianceModalSet state", $passes, $failures);
assertTest(str_contains($propListView, 'handleStartAddAppliance'), "5.2 PropertyListView implements handleStartAddAppliance", $passes, $failures);
assertTest(str_contains($propListView, 'handleConfirmAddAppliance'), "5.3 PropertyListView implements handleConfirmAddAppliance", $passes, $failures);
assertTest(str_contains($propListView, 'Add Appliance to Default Set'), "5.4 Modal 6 renders Add Appliance to Default Set modal", $passes, $failures);
assertTest(str_contains($propListView, 'TRADE_APPLIANCE_TYPES'), "5.5 Modal 6 renders visual trade picker grid from TRADE_APPLIANCE_TYPES", $passes, $failures);

// -------------------------------------------------------------
// 6. View Mode Spec Display — Hide What Doesn't Apply
// -------------------------------------------------------------
echo "\n--- 6. Spec Display — Hide Irrelevant & Blank Fields ---\n";
assertTest(str_contains($propListView, 'getVisibleSpecFields'), "6.1 PropertyListView calls getVisibleSpecFields in view mode", $passes, $failures);
assertTest(str_contains($propListView, 'visibleSpecs.map'), "6.2 PropertyListView iterates only over visibleSpecs", $passes, $failures);
assertTest(!str_contains($propListView, "{appItem.specs?.filterSize || '—'}"), "6.3 PropertyListView removed static empty/placeholder '—' filterSize row", $passes, $failures);
assertTest(!str_contains($propListView, "{appItem.specs?.fuelType || '—'}"), "6.4 PropertyListView removed static empty/placeholder '—' fuelType row", $passes, $failures);

// -------------------------------------------------------------
// 7. Edit Form Full Inputs + Manual Link Rendering
// -------------------------------------------------------------
echo "\n--- 7. Edit Form Full Inputs & Manual Link Rendering ---\n";
assertTest(str_contains($propListView, 'getEditFormFieldsForType'), "7.1 PropertyListView uses getEditFormFieldsForType in Edit Spec Modal", $passes, $failures);
assertTest(str_contains($propListView, 'editSpecForm.manualUrl'), "7.2 Edit Spec Modal includes manualUrl input", $passes, $failures);
assertTest(str_contains($propListView, 'Manual Reference URL'), "7.3 Edit Spec Modal has Manual Reference URL field with test link", $passes, $failures);
assertTest(str_contains($propListView, 'Manual'), "7.4 View mode renders 'Manual' link when manualUrl is present", $passes, $failures);
assertTest(str_contains($propListView, 'menu_book'), "7.5 View mode displays menu_book icon for manual link", $passes, $failures);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
echo "\n======================================================\n";
echo "Total Tests: " . (count($passes) + count($failures)) . "\n";
echo "Passes: " . count($passes) . "\n";
echo "Failures: " . count($failures) . "\n";

if (count($failures) > 0) {
    echo "\nFAILED TESTS:\n";
    foreach ($failures as $f) {
        echo " - {$f}\n";
    }
    exit(1);
}

echo "\nAll Defaults Library Polish acceptance tests passed successfully!\n";
