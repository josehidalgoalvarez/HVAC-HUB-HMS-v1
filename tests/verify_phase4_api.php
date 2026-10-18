<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Db;
use App\Models\Correction;
use App\Models\Part;
use App\Models\Stockpile;
use App\Models\Supplier;
use App\Models\Ticket;

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

echo "=== Running Phase 4 Parts Catalog, Stockpiles & Shopping Lists Backend Tests ===\n\n";

// 0. Initialize clean SQLite test database
$testDbPath = __DIR__ . '/phase4_test.sqlite';
if (file_exists($testDbPath)) {
    unlink($testDbPath);
}

$pdo = new PDO("sqlite:{$testDbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('PRAGMA foreign_keys = ON;');
Db::setPdo($pdo);
Db::ensureSqliteSchema($pdo);

// 1. Seed base data: users, buildings, stockpiles, suppliers, and parts
echo "--- 1. Seeding Phase 4 Domain Data ---\n";
Db::execute("INSERT INTO users (id, name, email, password_hash, role, api_token) VALUES (1, 'Tech Joe', 'joe@hvachome.local', 'hash', 'tech', 'test-tech-token')");
Db::execute("INSERT INTO building (id, name, address) VALUES (1, '1719 Bath Road', '1719 Bath Rd')");
Db::execute("INSERT INTO building (id, name, address) VALUES (2, '511 Days Road', '511 Days Rd')");
Db::execute("INSERT INTO building (id, name, address) VALUES (3, '137 Amherst', '137 Amherst St')");
Db::execute("INSERT INTO unit (id, building_id, unit_number) VALUES (1, 1, '174')");

// Seed Stockpiles
$sp1 = Stockpile::create([
    'name' => '511 Days Rd Storage',
    'location' => '511 Days Rd',
    'notes' => 'Central parts depot and spare inventory',
]);
$sp2 = Stockpile::create([
    'name' => '1719 Bath Donors',
    'location' => '1719 Bath Rd',
    'notes' => 'Decommissioned unit donors and reclaimed switches',
]);

assertTest($sp1['id'] === 1, "1.1 Stockpile 1 '511 Days Rd Storage' created", $passes, $failures);
assertTest($sp2['id'] === 2, "1.2 Stockpile 2 '1719 Bath Donors' created", $passes, $failures);

// Seed Supplier: Dependable Appliances (Mon–Fri 8:30–5, phone 613-542-8822)
$supplier = Supplier::create([
    'name' => 'Dependable Appliances',
    'contact_name' => 'Parts Order Desk',
    'phone' => '613-542-8822',
    'hours' => 'Mon–Fri 8:30–5',
    'address' => 'Kingston, ON',
    'account_number' => 'DEP-HVAC-9941',
]);

assertTest($supplier['id'] === 1, "1.3 Supplier 'Dependable Appliances' created", $passes, $failures);
assertTest($supplier['phone'] === '613-542-8822', "1.4 Supplier phone matches 613-542-8822", $passes, $failures);
assertTest($supplier['hours'] === 'Mon–Fri 8:30–5', "1.5 Supplier hours match 'Mon–Fri 8:30–5'", $passes, $failures);

// Seed Part: 6 Robertshaw WB24T10025 switches (2 in stock at 511 Days Rd, 2 on hold at 137 Amherst, 2 in use at 1719 unit 174)
$switchPart = Part::create([
    'name' => 'Robertshaw Infinite Switch',
    'part_number' => 'WB24T10025',
    'category' => 'Electric Range',
    'description' => 'Surface burner infinite rotary control switch 240V',
    'quantity_on_hand' => 2, // 2 available in active stock
    'min_quantity' => 2,
    'reorder_point' => 2,
    'unit_cost' => 42.50,
    'compatible_models' => ['GE JBP24', 'Hotpoint RB525', 'Kenmore 911', 'GE Spectra'],
    'price_history' => [
        ['date' => '2026-01-15', 'price' => 39.50, 'supplier' => 'Dependable Appliances'],
        ['date' => '2026-02-10', 'price' => 42.50, 'supplier' => 'Dependable Appliances']
    ],
    'stockpile_id' => $sp1['id'],
    'preferred_supplier_id' => $supplier['id'],
]);

// Multi-location stockpile distribution for WB24T10025:
// 2 in stock at 511 Days Rd (already created in sp1 by Part::create)
// 2 on hold at 137 Amherst
Db::execute(
    "INSERT INTO part_stockpile (part_id, stockpile_id, quantity, status, location_notes) VALUES (?, ?, ?, ?, ?)",
    [$switchPart['id'], $sp1['id'], 2, 'on_hold', '137 Amherst on hold']
);
// 2 in use at 1719 Bath unit 174
Db::execute(
    "INSERT INTO part_stockpile (part_id, stockpile_id, quantity, status, location_notes) VALUES (?, ?, ?, ?, ?)",
    [$switchPart['id'], $sp2['id'], 2, 'in_use', '1719 unit 174']
);

// Seed Askoll M376 pump: installed, 1 spare at 511 Days Rd
$pumpPart = Part::create([
    'name' => 'Askoll Drain Pump M376',
    'part_number' => 'M376',
    'category' => 'Laundry',
    'description' => 'Universal magnetic drain pump motor',
    'quantity_on_hand' => 1,
    'min_quantity' => 1,
    'reorder_point' => 1,
    'unit_cost' => 34.00,
    'compatible_models' => ['Whirlpool WFW', 'Maytag MHW', 'Bosch 300 Series'],
    'price_history' => [
        ['date' => '2026-01-08', 'price' => 34.00, 'supplier' => 'Dependable Appliances']
    ],
    'stockpile_id' => $sp1['id'],
    'preferred_supplier_id' => $supplier['id'],
]);

Db::execute(
    "INSERT INTO part_stockpile (part_id, stockpile_id, quantity, status, location_notes) VALUES (?, ?, ?, ?, ?)",
    [$pumpPart['id'], $sp2['id'], 1, 'in_use', '1719 Bath installed']
);

echo "\n--- 2. Acceptance Criterion 1: Search 'WB24T10025' Catalog & Stockpile Lookup ---\n";
$searchResults = Part::findAll(['q' => 'WB24T10025']);
assertTest(count($searchResults) === 1, "2.1 Search 'WB24T10025' returned exactly 1 matching part", $passes, $failures);

$found = $searchResults[0];
assertTest($found['part_number'] === 'WB24T10025', "2.2 Part number matches 'WB24T10025'", $passes, $failures);
assertTest(is_array($found['compatible_models']) && count($found['compatible_models']) >= 3, "2.3 Compatible models listed as array", $passes, $failures);
assertTest(in_array('GE JBP24', $found['compatible_models'], true), "2.4 'GE JBP24' is among compatible models", $passes, $failures);

// Check stock location and quantity
assertTest($found['quantity_on_hand'] === 2, "2.5 Quantity on hand shows 2 in active stock", $passes, $failures);
assertTest(str_contains($found['stock_summary'], '511 Days Rd'), "2.6 Stock shows location '511 Days Rd'", $passes, $failures);

// Check price/order history
assertTest(is_array($found['price_history']) && count($found['price_history']) >= 2, "2.7 Price/order history is present with 2 entries", $passes, $failures);
assertTest($found['price_history'][1]['price'] == 42.50, "2.8 Price history records accurate pricing (42.50)", $passes, $failures);

// Also test searching by compatible model name (e.g. 'RB525')
$modelSearch = Part::findAll(['q' => 'RB525']);
assertTest(count($modelSearch) === 1 && $modelSearch[0]['part_number'] === 'WB24T10025', "2.9 Searching by compatible model 'RB525' finds WB24T10025", $passes, $failures);

echo "\n--- 3. Acceptance Criterion 2: Shopping List Builder from 3 Open Tickets (Harvest-First) ---\n";
// Create 3 open tickets each needing the Robertshaw WB24T10025 switch
$t1 = Ticket::create([
    'wo_number' => 'WO-SW-01',
    'title' => 'Stove 8-inch burner switch clicking',
    'description' => 'Need Robertshaw switch WB24T10025 for kitchen range',
    'verified_scope' => 'Replace surface burner switch WB24T10025',
    'building_id' => 1,
    'unit_id' => 1,
    'priority' => 'medium',
]);
$t2 = Ticket::create([
    'wo_number' => 'WO-SW-02',
    'title' => 'Burner element stuck on high heat',
    'description' => 'Infinite switch WB24T10025 contacts welded',
    'verified_scope' => 'Replace WB24T10025 infinite switch',
    'building_id' => 2,
    'priority' => 'high',
]);
$t3 = Ticket::create([
    'wo_number' => 'WO-SW-03',
    'title' => 'Front right burner not energizing',
    'description' => 'Requires switch WB24T10025',
    'verified_scope' => 'Install switch WB24T10025',
    'building_id' => 3,
    'priority' => 'medium',
]);

// Build shopping list from the 3 ticket IDs
$shoppingList = Part::buildShoppingListFromTickets([$t1['id'], $t2['id'], $t3['id']]);

assertTest($shoppingList['total_parts_count'] === 1, "3.1 Deduped 3 tickets needing switch into exactly 1 line item", $passes, $failures);
assertTest($shoppingList['total_items_needed'] === 3, "3.2 Total quantity needed across 3 tickets is 3", $passes, $failures);

$item = $shoppingList['items'][0];
assertTest($item['part_number'] === 'WB24T10025', "3.3 Deduped line item is WB24T10025", $passes, $failures);
assertTest($item['available_in_stock'] === 2, "3.4 Correctly identified 2 switches available in stockpile", $passes, $failures);
assertTest($item['harvest_quantity'] === 2, "3.5 Harvest quantity is 2", $passes, $failures);
assertTest($item['buy_quantity'] === 1, "3.6 Remaining buy quantity is 1", $passes, $failures);
assertTest($item['harvest_tag'] === 'harvest first @ 511 Days Rd', "3.7 Flagged explicitly with 'harvest first @ 511 Days Rd'", $passes, $failures);
assertTest($item['buy_tag'] === 'buy @ Dependable Appliances', "3.8 Unfulfilled amount flagged with 'buy @ Dependable Appliances'", $passes, $failures);

echo "\n--- 4. Acceptance Criterion 3: Log Part Use, Decrement Stock & Dynamic Reorder Flag ---\n";
// Create a field job to log part use
$job = \App\Models\Job::create([
    'title' => 'Replace front right stove switch',
    'ticket_id' => $t1['id'],
    'building_id' => 1,
    'unit_id' => 1,
    'tech_id' => 1,
    'estimated_minutes' => 30,
]);

// Part starts with quantity_on_hand = 2, reorder_point = 2.
// Using 1 switch drops quantity_on_hand from 2 to 1 (which is <= reorder_point 2).
$useResult = Part::usePart(
    $switchPart['id'],
    1,
    $job['id'],
    $sp1['id'],
    1,
    "Installed switch on range in unit 174"
);

assertTest($useResult['previous_quantity'] === 2, "4.1 Previous quantity was 2", $passes, $failures);
assertTest($useResult['new_quantity'] === 1, "4.2 Stock decremented from 2 to 1", $passes, $failures);
assertTest($useResult['quantity_used'] === 1, "4.3 Quantity used recorded as 1", $passes, $failures);
assertTest($useResult['is_reorder'] === true, "4.4 Stock (1) dropping to/below reorder point (2) raises is_reorder flag", $passes, $failures);
assertTest(!empty($useResult['reorder_warning']), "4.5 Reorder warning message is generated", $passes, $failures);

// Verify append-only correction audit log recorded the usage
$corrections = Db::fetchAll("SELECT * FROM correction WHERE entity_type = 'part' AND entity_id = ?", [$switchPart['id']]);
assertTest(count($corrections) >= 1, "4.6 Correction row written for part stock change", $passes, $failures);

$qtyCorrection = null;
foreach ($corrections as $c) {
    if ($c['field_name'] === 'quantity_on_hand') {
        $qtyCorrection = $c;
        break;
    }
}
assertTest($qtyCorrection !== null, "4.7 'quantity_on_hand' field edit captured in correction table", $passes, $failures);
assertTest($qtyCorrection['old_value'] === '2' && $qtyCorrection['new_value'] === '1', "4.8 Old value (2) and new value (1) accurately recorded", $passes, $failures);
assertTest($qtyCorrection['changed_by_user_id'] === 1, "4.9 Technician user ID recorded in correction audit", $passes, $failures);

// Verify job_part has recorded entry
$jobParts = Db::fetchAll("SELECT * FROM job_part WHERE job_id = ?", [$job['id']]);
assertTest(count($jobParts) === 1, "4.10 Usage recorded in job_part table", $passes, $failures);
assertTest(str_contains($jobParts[0]['part_name'], 'WB24T10025'), "4.11 job_part records part name & number", $passes, $failures);

echo "\n--- 5. Acceptance Criterion 4: Supplier Record Shows Phone + Hours ---\n";
$suppliers = Supplier::findAll();
assertTest(count($suppliers) >= 1, "5.1 GET /api/suppliers returns supplier list", $passes, $failures);

$dep = null;
foreach ($suppliers as $s) {
    if ($s['name'] === 'Dependable Appliances') {
        $dep = $s;
        break;
    }
}
assertTest($dep !== null, "5.2 'Dependable Appliances' found in supplier list", $passes, $failures);
assertTest($dep['phone'] === '613-542-8822', "5.3 Phone number is '613-542-8822'", $passes, $failures);
assertTest($dep['hours'] === 'Mon–Fri 8:30–5', "5.4 Hours are 'Mon–Fri 8:30–5'", $passes, $failures);

echo "\n========================================\n";
echo "Phase 4 Backend Verification Summary:\n";
echo "Passes: " . count($passes) . "\n";
echo "Failures: " . count($failures) . "\n";
echo "========================================\n";

if (count($failures) === 0) {
    echo "All Phase 4 Backend Tests PASSED!\n";
    exit(0);
} else {
    echo "FAILURES DETECTED in Phase 4 Backend Tests!\n";
    exit(1);
}
