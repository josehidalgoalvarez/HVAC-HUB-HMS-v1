<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config;
use App\Db;

Config::load();

$options = getopt('', ['photos-dir:']);
$photosDir = $options['photos-dir'] ?? (dirname(__DIR__) . '/public/uploads');

echo "=== HVACHome Real Portfolio Seeder ===\n";
echo "Photos directory: {$photosDir}\n";

$result = seedRealPortfolio($photosDir);
echo "Seeded successfully:\n";
echo "  - Buildings: " . $result['buildings'] . "\n";
echo "  - Units: " . $result['units'] . "\n";
echo "  - Appliances: " . $result['appliances'] . "\n";
echo "  - Photos Attached: " . $result['photos'] . "\n";

/**
 * Reusable function callable by CLI or POST /api/admin/seed-demo
 */
function seedRealPortfolio(?string $customPhotosDir = null): array
{
    $pdo = Db::get();
    $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';

    // Ensure columns and appliance table exist
    try { $pdo->exec("ALTER TABLE building ADD COLUMN comments TEXT NULL"); } catch (\Throwable) {}
    try { $pdo->exec("ALTER TABLE unit ADD COLUMN comments TEXT NULL"); } catch (\Throwable) {}
    try { $pdo->exec("ALTER TABLE job ADD COLUMN room TEXT NULL"); } catch (\Throwable) {}

    if ($isSqlite) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS appliance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id TEXT NOT NULL,
                building_id INTEGER NULL,
                unit_id INTEGER NULL,
                name TEXT NOT NULL,
                brand TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT NULL,
                status TEXT NOT NULL DEFAULT 'operational',
                last_service TEXT NULL,
                model_number TEXT NULL,
                serial_number TEXT NULL,
                room TEXT NULL,
                unit_number TEXT NULL,
                location TEXT NULL,
                image_url TEXT NULL,
                rating_plate_url TEXT NULL,
                manual_url TEXT NULL,
                warranty_url TEXT NULL,
                installation_url TEXT NULL,
                notes TEXT NULL,
                specs TEXT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        ");
    }

    // Scan photos directory
    $photosDir = $customPhotosDir && is_dir($customPhotosDir) ? $customPhotosDir : (dirname(__DIR__) . '/public/uploads');
    $photoFiles = is_dir($photosDir) ? glob($photosDir . '/photo_*.jpg') : [];
    $photoUrls = array_map(function ($file) {
        return '/uploads/' . basename($file);
    }, $photoFiles);

    if (empty($photoUrls)) {
        // Fallback to standard photo names
        $photoUrls = [
            '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
            '/uploads/photo_2aa8d094f66a8ede0a7b.jpg',
            '/uploads/photo_86e84cf408480a53552b.jpg',
            '/uploads/photo_6a700f6adc9bd57ba9db.jpg',
            '/uploads/photo_5a0393354bd60e0ac63f.jpg',
            '/uploads/photo_8db7e895c76fcfce8de5.jpg',
            '/uploads/photo_c61a96df0f03a7620bf1.jpg',
            '/uploads/photo_b9a7b4d1af836cee96c8.jpg',
            '/uploads/photo_7b90897a4994f447765e.jpg',
            '/uploads/photo_3fba10b6250dd34fcc10.jpg',
            '/uploads/photo_cdde6e8442e952e7c538.jpg'
        ];
    }

    // Clean old prototype buildings and pool
    try {
        $pdo->exec("DELETE FROM building WHERE name IN ('1735 Bath Road', '505 Days Pool')");
        $pdo->exec("DELETE FROM appliance WHERE model_number IN ('RU199iN', '59TP6B080V1716', '24ACC636A003', 'LGB-8', 'FWA-110', 'PTC153G35AXXX')");
        $pdo->exec("DELETE FROM unit WHERE building_id IN (81, 91, 92, 93) AND provenance != 'verified — Yardi extract 2026-10-22'");
        $pdo->exec("DELETE FROM unit WHERE building_id IN (78, 79) AND provenance != 'verified — Yardi extract 2026-10-22'");
    } catch (\Throwable) {}

    // Seed Verified Buildings (15 properties: 12 BD + Amherst 137, Albert 415, Ontario 265)
    $buildings = [
        [1, '1719 Bath Road', '1719 Bath Rd, Kingston, ON', 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached trio (1719-1721-1723), SHARED electrical + water heating at 1721. Laundry: sink YES. 1719 basement storage: 3-4 white coil stoves + 2-3 fridges + Danby AC.'],
        [2, '1721 Bath Road', '1721 Bath Rd, Kingston, ON', 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached trio hub: shared mechanical room containing 7 water heaters (3 working, 2 valved-off stagnant, 2 disconnected rotting), fiber connections, electrical shutoffs. Laundry: sink NO.'],
        [3, '1723 Bath Road', '1723 Bath Rd, Kingston, ON K7M 4Y9', 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached trio with 1719 & 1721. Shared electrical & water heating from 1721. Laundry: sink YES. Verified postal code: K7M 4Y9.'],
        [4, '1725 Bath Road', '1725 Bath Rd, Kingston, ON', '2-digit pool runs 33–56 across 1727/1737/1725 (1725 has apartments 45–56 continuous). Apartments with inner hallways. Laundry contains Bell cable setup + 1 water heater. Automated timer lights.'],
        [5, '1731 Bath Road', '1731 Bath Rd, Kingston, ON', 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached pair with 1733, SHARED electrical. Yardi picker conflict on 163/261/262 assigned to 1731. Shared mechanical room with 1733: 1 electric water heater + 2 donor fridges. Laundry: WITH sink.'],
        [6, '1733 Bath Road', '1733 Bath Rd, Kingston, ON', 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached pair with 1731, SHARED electrical. Yardi picker conflict on 158/260 assigned to 1733. Laundry in basement: without sink.'],
        [7, '1737 Bath Road', '1737 Bath Rd, Kingston, ON', '2-digit pool runs 33–56 across 1727/1737/1725 (1737 has townhouses 37–44). 3 stories, 2 washrooms, dedicated water heater per unit. No communal laundry.'],
        [8, '505 Days Road', '505 Days Rd, Kingston, ON', 'Days apartments share numbering pool (G1–G11 / 101–111 / 201–211). Standalone electrical (the exception in BD complex), different layout/floors, nothing stored here.'],
        [9, '507 Days Road', '507 Days Rd, Kingston, ON', 'TOWNHOUSES: 2-digit unit pool (11–32 continuous except 13). TODO-verify: units 1–10 and 13 unconfirmed in Yardi extract. 3 stories (2 floors + basement), 2 washrooms, own water heater per unit (believed // TODO-verify), laundry WITH sink, NO storage.'],
        [14, '509 Days Road', '509 Days Rd, Kingston, ON', 'Days apartments share numbering pool (G1–G11 / 101–111 / 201–211). Attached pair with 511 Days Rd. Shared mechanical room with 511. Laundry: no sink (believed // TODO-verify).'],
        [15, '511 Days Road', '511 Days Rd, Kingston, ON', 'Days apartments share numbering pool (G1–G11 / 101–111 / 201–211). Attached pair with 509 Days Rd, SHARED mechanical room. Complex storage node in 511 basement. Storage building. Laundry: WITH sink.'],
        [16, '1727 Bath Road', '1727 Bath Rd, Kingston, ON', '2-digit pool runs 33–56 across 1727/1737/1725 (1727 has townhouses 33–36). 3 stories, 2 washrooms, dedicated water heater per unit. No communal laundry.'],
        [10, '137 Amherst Drive', '137 Amherst Dr, Kingston, ON', 'Residential townhouse building. Verified unit 137 (range, water heater).'],
        [58, '107 Amherst Drive', '107 Amherst Dr, Amherstview, ON', 'Floor 1 skips 105 (utility/laundry space). Storage node for Amherst complex (supplies, tools, 2 white coil stoves).'],
        [90, '103 Amherst Drive', '103 Amherst Dr, Amherstview, ON', 'Floor 1 skips 105 (utility/laundry space). Twin building of 107 Amherst. Non-residential space: UTILITY.'],
        [81, '77 Manitou Crescent', '77 Manitou Crescent, Kingston, ON', '58 townhouses, units labeled 1–58 continuous. Unit type townhouse.'],
        [91, '77A Manitou Crescent', '77A Manitou Crescent, Kingston, ON', 'Apartment building, 10 units. Shares numbering pool with 77B and 77C (floor 1: 101–110, floor 2: 201–210, floor 3: 301–310, sliced A/B/C).'],
        [92, '77B Manitou Crescent', '77B Manitou Crescent, Kingston, ON', 'Apartment building, 11 units. Shares numbering pool with 77A and 77C (floor 1: 101–110, floor 2: 201–210, floor 3: 301–310, sliced A/B/C).'],
        [93, '77C Manitou Crescent', '77C Manitou Crescent, Kingston, ON', 'Apartment building, 9 units. Shares numbering pool with 77A and 77B (floor 1: 101–110, floor 2: 201–210, floor 3: 301–310, sliced A/B/C).'],
        [78, '18 Elm Street', '18 Elm St, Kingston, ON', 'Sits right behind 203 Colborne St. Small-storage role (water heaters).'],
        [79, '24 Elm Street', '24 Elm St, Kingston, ON', 'Sits right behind 203 Colborne St. TODO-verify: 304/404 absent in Yardi; 303D/403D may be the physical 4th units on floors 3–4.'],
        [70, '353 Alfred Street', '353 Alfred St, Kingston, ON', 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units.'],
        [71, '359 Alfred Street', '359 Alfred St, Kingston, ON', 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units. Single-unit house (Yardi base entry is address itself).'],
        [72, '361 Alfred Street', '361 Alfred St, Kingston, ON', 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units.'],
        [73, '376 Alfred Street', '376 Alfred St, Kingston, ON', 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units.'],
        [74, '378 Alfred Street', '378 Alfred St, Kingston, ON', 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units. Duplicate records in Yardi, one building. Yardi codes: 378alfr, alfr378.'],
        [75, '394 Alfred Street', '394 Alfred St, Kingston, ON', 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units. Quadrant main storage node. Yardi codes: 394alfr, alfr394.'],
        [76, '501 Frontenac St', '495 Frontenac Street, Kingston, ON', 'Frontenac condos — single condo building, MIXED OWNERSHIP: some units belong to other companies, not Patry/Kenlar. Yardi letter suffixes (B/C/D/P) are rooms/spaces inside the apartment, not units.'],
        [59, '563 Princess Street', '563 Princess St, Kingston, ON', 'Part of the 563/565/567 Princess site — displayed building number is 565. Yardi letter suffixes are rooms inside the unit.'],
        [60, '565 Princess Street', '565 Princess St, Kingston, ON', 'Part of the 563/565/567 Princess site — displayed building number is 565. Yardi letter suffixes are rooms inside the unit.'],
        [61, '567 Princess Street', '567 Princess St, Kingston, ON', 'Part of the 563/565/567 Princess site — displayed building number is 565. Yardi letter suffixes are rooms inside the unit.'],
        [62, '630 Princess St', '630 Princess St, Kingston, ON', 'Under construction (Oct 2026); roster as listed in Yardi.'],
        [64, '800 Princess St', '800 Princess St, Kingston, ON', 'Princess Street multi-unit property.'],
        [94, '800 Princess St — annex', '800 Princess St, Kingston, ON', 'TODO-verify: second Yardi record at 800 Princess; its 301/302 are distinct from the main building\'s 301/302 until verified.'],
        [95, '2274 Princess St', '2274 Princess St, Kingston, ON', 'Princess Street multi-unit property (verified Yardi roster, 236 units).'],
        [96, 'Le Santé', '300 Skyfall Lane, Kingston, ON', 'Le Santé — 300 Skyfall Lane (Yardi spells it "300 Skyfal Lane"). Phased build-out: ~334 units planned; roster grows as phases release — re-extract periodically. Yardi labels 19 units "Sante" instead of the address (126, 133, 134, 235, 255, 416, 418, 421, 424, 426, 456, 516, 518, 521, 523, 524, 526, 621, 656) — TODO-verify whether that is a separate phase.'],
        [87, '539 Armstrong Road', '539 Armstrong Rd, Kingston, ON', 'Stockpile location. Riverstone development. White stoves rule everywhere: donor coils by SIZE only. TODO-verify: units 516–522 were obscured by a stitch artifact in the source screenshot; included by count validation (116 entries) and floor pattern.'],
        [82, '810 Blackburn Mews', '810 Blackburn Mews, Kingston, ON', 'Stonecrest. The five B-suffixed entries (110B, 114B, 116B, 212B, 312B) are rooms/splits.'],
        [83, '85 Park Street', '85 Park St, Kingston, ON', 'Residential standalone property (no unit 13).'],
        [12, '265 Ontario Street', '265 Ontario St, Kingston, ON', 'Residential property (14 units continuous 1–14).'],
        [11, '415 Albert Street', '415 Albert St, Kingston, ON', 'Multi-unit residential property. Lettered units are separate apartments at this address (exception to the rooms convention).'],
        [86, '36 Durham Street', '36 Durham St, Kingston, ON', 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units.']
    ];

    $bldCount = 0;
    foreach ($buildings as $b) {
        $stmt = $pdo->prepare("SELECT id FROM building WHERE id = ?");
        $stmt->execute([$b[0]]);
        if ($stmt->fetch()) {
            $update = $pdo->prepare("UPDATE building SET name = ?, address = ?, comments = ? WHERE id = ?");
            $update->execute([$b[1], $b[2], $b[3], $b[0]]);
        } else {
            $cId = in_array($b[0], [59, 60, 61, 62, 63, 64, 65, 94, 95]) ? 4 : (in_array($b[0], [70, 71, 72, 73, 74, 75]) ? 6 : (in_array($b[0], [76, 77]) ? 7 : (in_array($b[0], [78, 79]) ? 2 : (in_array($b[0], [81, 91, 92, 93]) ? 8 : (in_array($b[0], [10, 58, 90]) ? 3 : (in_array($b[0], [1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15, 16]) ? 1 : null))))));
            $insert = $pdo->prepare("INSERT INTO building (id, name, address, comments, complex_id) VALUES (?, ?, ?, ?, ?)");
            $insert->execute([$b[0], $b[1], $b[2], $b[3], $cId]);
        }
        if ($b[0] === 76) {
            try {
                $pdo->prepare("UPDATE building SET aliases = ? WHERE id = ?")->execute(['495 Frontenac Street, The Frontenac', 76]);
            } catch (\Throwable) {}
        }
        if ($b[0] === 64) {
            try {
                $pdo->prepare("UPDATE building SET aliases = ? WHERE id = ?")->execute(['The 800', 64]);
            } catch (\Throwable) {}
        }
        if ($b[0] === 94) {
            try {
                $pdo->prepare("UPDATE building SET external_ids = ?, yardi_codes = ? WHERE id = ?")->execute(['800prin', '800prin', 94]);
            } catch (\Throwable) {}
        }
        if (in_array($b[0], [74, 75])) {
            $codes = $b[0] === 74 ? '378alfr,alfr378' : '394alfr,alfr394';
            try {
                $pdo->prepare("UPDATE building SET external_ids = ?, yardi_codes = ? WHERE id = ?")->execute([$codes, $codes, $b[0]]);
            } catch (\Throwable) {}
        }
        if ($b[0] === 96) {
            try {
                $pdo->prepare("UPDATE building SET aliases = ?, external_ids = ?, yardi_codes = ? WHERE id = ?")->execute([
                    '300 Skyfall Lane, 300 Skyfal Lane, Sante, Le Sante',
                    '300skyf,sante',
                    '300skyf,sante',
                    96
                ]);
            } catch (\Throwable) {}
        }
        if ($b[0] === 87) {
            try {
                $pdo->prepare("UPDATE building SET aliases = ? WHERE id = ?")->execute(['Riverstone', 87]);
            } catch (\Throwable) {}
        }
        if ($b[0] === 82) {
            try {
                $pdo->prepare("UPDATE building SET aliases = ? WHERE id = ?")->execute(['Stonecrest', 82]);
            } catch (\Throwable) {}
        }
        $bldCount++;
    }

    // Clean up old pattern units for Princess (59, 60, 61, 62, 64, 94, 95), Frontenac (76), Alfred buildings (70-75), and Le Santé (96)
    $pdo->exec("DELETE FROM unit WHERE building_id IN (59, 60, 61, 62, 64, 94, 95) AND provenance != 'verified — Yardi extract 2026-10-22'");
    $pdo->exec("DELETE FROM unit WHERE building_id = 76 AND provenance != 'verified — Yardi extract 2026-10-22'");
    $pdo->exec("DELETE FROM unit WHERE building_id IN (70, 71, 72, 73, 74, 75) AND provenance != 'verified — Yardi extract 2026-10-22'");
    $pdo->exec("DELETE FROM unit WHERE building_id = 96 AND provenance != 'verified — Yardi extract 2026-10-22'");
    $pdo->exec("DELETE FROM unit WHERE building_id IN (87, 82, 83, 12, 11, 86) AND provenance != 'verified — Yardi extract 2026-10-22'");
    $pdo->exec("UPDATE complex SET building_count = 9 WHERE id = 'complex-princess'");

    // Ensure Uniform Appliance Default Set exists
    $dsStmt = $pdo->prepare("SELECT id FROM default_sets WHERE id = 'set-skyfall-sante-uniform'");
    $dsStmt->execute();
    if (!$dsStmt->fetch()) {
        $appJson = json_encode([
            ["category" => "HVAC", "type" => "Air Conditioner", "name" => "Air Conditioner (default)", "isDefault" => true, "specs" => ["fuelType" => "Electric", "volts" => "240"]],
            ["category" => "Water Heating", "type" => "Water Heater", "name" => "Unit Water Heater (default)", "isDefault" => true, "specs" => ["fuelType" => "Electric", "btuInput" => "4500W", "capacity" => "60 Gallons", "volts" => "240"]],
            ["category" => "HVAC", "type" => "Thermostat", "name" => "Thermostat (default)", "isDefault" => true, "specs" => ["volts" => "24"]],
            ["category" => "Kitchen", "type" => "Dishwasher", "name" => "Dishwasher (default)", "isDefault" => true, "specs" => ["volts" => "120", "capacity" => "14 Place Settings", "fuelType" => "Electric"]],
            ["category" => "Kitchen", "type" => "Refrigerator", "name" => "Fridge (default)", "isDefault" => true, "specs" => ["capacity" => "18 cu. ft.", "volts" => "120", "fuelType" => "Electric"]],
            ["category" => "Kitchen", "type" => "Range", "name" => "Stove (electric coil) (default)", "isDefault" => true, "specs" => ["fuelType" => "Electric", "volts" => "240", "capacity" => "5.3 cu. ft."]]
        ]);
        $pdo->prepare("INSERT INTO default_sets (id, complex_slug, complex_id, name, unit_type, is_default, bedrooms, bathrooms, stories, has_unit_water_heater, appliances_json, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")->execute([
            'set-skyfall-sante-uniform', 'princess', 4, 'Uniform Building / Apartment (Skyfall / Le Santé default)', 'apartment', 1, 2, 1, 1, 1, $appJson, 'Uniform building default specification (Skyfall / Le Santé / 2274 Princess): dedicated AC, water heater, thermostat, dishwasher, fridge, stove in every unit.'
        ]);
    }

    // Ensure Singles & Standalone Default Set exists
    $singlesDsStmt = $pdo->prepare("SELECT id FROM default_sets WHERE id = 'set-singles-apt'");
    $singlesDsStmt->execute();
    if (!$singlesDsStmt->fetch()) {
        $singlesAppJson = json_encode([
            ["category" => "Kitchen", "type" => "Refrigerator", "name" => "Fridge (default)", "isDefault" => true, "specs" => ["capacity" => "18 cu. ft.", "volts" => "120", "fuelType" => "Electric"]],
            ["category" => "Kitchen", "type" => "Range", "name" => "Stove (electric coil) (default)", "isDefault" => true, "specs" => ["fuelType" => "Electric", "volts" => "240", "capacity" => "5.3 cu. ft."]],
            ["category" => "Kitchen", "type" => "Dishwasher", "name" => "Dishwasher (default)", "isDefault" => true, "specs" => ["volts" => "120", "capacity" => "14 Place Settings", "fuelType" => "Electric"]],
            ["category" => "Kitchen", "type" => "Range Hood", "name" => "Range Hood (default)", "isDefault" => true, "specs" => ["volts" => "120", "fuelType" => "Electric", "capacity" => "300 CFM"]]
        ]);
        $pdo->prepare("INSERT INTO default_sets (id, complex_slug, complex_id, name, unit_type, is_default, bedrooms, bathrooms, stories, has_unit_water_heater, appliances_json, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")->execute([
            'set-singles-apt', 'singles', null, 'Singles & Standalone / Apartment (default)', 'apartment', 1, 2, 1, 1, 0, $singlesAppJson, 'Singles and standalone properties default apartment specification.'
        ]);
    }

    // Seed Verified Units (130 BD units from Yardi extract 2026-10-22 + external verified units)
    $bdUnitsSpec = [
        8 => [
            'units' => ['101', '102', '103', '104', '201', '202', '203', '204', 'G1', 'G2', 'G3', 'G4'],
            'custom_notes' => ['103' => 'Verified unit with noisy freezer complaint (WO 19255)']
        ],
        14 => [
            'units' => ['105', '106', '107', '108', '205', '206', '207', '208', 'G5', 'G6', 'G7', 'G8']
        ],
        15 => [
            'units' => ['109', '110', '111', '209', '210', '211', 'G9', 'G10', 'G11']
        ],
        9 => [
            'units' => ['11', '12', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32'],
            'is_townhouse' => true,
            'custom_notes' => ['32' => 'Verified unit 32 — Yardi extract 2026-10-22']
        ],
        1 => [
            'units' => ['172', '173', '174', '272', '273', '274', 'G72', 'G73', 'G74'],
            'custom_notes' => ['273' => 'Verified unit with basement mechanical access & refrigerator']
        ],
        2 => [
            'units' => ['168', '169', '170', '171', '268', '269', '270', '271', 'G68', 'G69', 'G70', 'G71']
        ],
        3 => [
            'units' => ['165', '166', '167', '265', '266', '267', 'G64', 'G65', 'G66', 'G67'],
            'custom_notes' => ['266' => 'Verified unit with Frigidaire FFCD2418US3A dishwasher']
        ],
        5 => [
            'units' => ['161', '162', '163', '261', '262', '263', 'G61', 'G62', 'G63'],
            'custom_notes' => [
                '163' => 'Yardi label conflict: labeled 1723 Bath Road inside bd1731 picker -- assigned to 1731 (picker wins)',
                '261' => 'Yardi label conflict: labeled 1723 Bath Road inside bd1731 picker -- assigned to 1731 (picker wins)',
                '262' => 'Yardi label conflict: labeled 1723 Bath Road inside bd1731 picker -- assigned to 1731 (picker wins)'
            ]
        ],
        6 => [
            'units' => ['157', '158', '159', '160', '257', '258', '259', '260', 'G57', 'G58', 'G59', 'G60'],
            'custom_notes' => [
                '158' => 'Yardi label conflict: labeled 1723 Bath Road inside bd1733 picker -- assigned to 1733 (picker wins)',
                '260' => 'Yardi label conflict: labeled 1723 Bath Road inside bd1733 picker -- assigned to 1733 (picker wins)'
            ]
        ],
        16 => [
            'units' => ['33', '34', '35', '36'],
            'is_townhouse' => true
        ],
        7 => [
            'units' => ['37', '38', '39', '40', '41', '42', '43', '44'],
            'is_townhouse' => true
        ],
        4 => [
            'units' => ['45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56'],
            'is_townhouse' => false,
            'custom_floors' => [
                '45' => 'Main Floor', '46' => 'Main Floor', '47' => 'Main Floor',
                '48' => 'Main Floor', '49' => 'Main Floor', '50' => 'Main Floor',
                '51' => 'Second Floor', '52' => 'Second Floor', '53' => 'Second Floor',
                '54' => 'Second Floor', '55' => 'Second Floor', '56' => 'Second Floor'
            ]
        ]
    ];

    $units = [];
    foreach ($bdUnitsSpec as $bId => $spec) {
        $isTownhouse = !empty($spec['is_townhouse']);
        foreach ($spec['units'] as $uNum) {
            $floor = 'Main Floor';
            if (!empty($spec['custom_floors'][$uNum])) {
                $floor = $spec['custom_floors'][$uNum];
            } elseif ($isTownhouse) {
                $floor = 'Multi-Floor Townhouse';
            } elseif (str_starts_with($uNum, 'G')) {
                $floor = 'Ground Floor';
            } elseif (str_starts_with($uNum, '1')) {
                $floor = 'First Floor';
            } elseif (str_starts_with($uNum, '2')) {
                $floor = 'Second Floor';
            }
            $note = $spec['custom_notes'][$uNum] ?? 'verified — Yardi extract 2026-10-22';
            $units[] = [$bId, $uNum, $floor, $note, 'verified — Yardi extract 2026-10-22'];
        }
    }

    // Add Amherst verified units (208 units across 44 buildings from Yardi extract 2026-10-22)
    $amherstProv = 'verified — Yardi extract 2026-10-22';
    $streetToBldgId = [
        103 => 90, 107 => 58, 111 => 57, 115 => 56, 119 => 55, 123 => 54, 125 => 53, 127 => 52, 129 => 51,
        131 => 50, 133 => 49, 135 => 48, 137 => 10, 141 => 47, 145 => 46, 149 => 45, 153 => 44, 157 => 43,
        161 => 42, 165 => 41, 167 => 40, 169 => 39, 171 => 38, 173 => 37, 175 => 36, 177 => 35, 179 => 34,
        183 => 33, 187 => 32, 191 => 31, 193 => 30, 195 => 29, 197 => 28, 199 => 27, 201 => 26, 205 => 25,
        207 => 24, 209 => 23, 211 => 22, 213 => 21, 217 => 20, 219 => 19, 225 => 18, 229 => 17
    ];
    $threeTwoTwoStreets = [111, 115, 119, 141, 145, 149, 153, 157, 161, 183, 187];
    $fourByFourStreets = [225, 229];
    $townhouseStreets = [
        123, 125, 127, 129, 131, 133, 135, 137,
        165, 167, 169, 171, 173, 175, 177, 179,
        191, 193, 195, 197, 199, 201, 205, 207,
        209, 211, 213, 217, 219
    ];

    // 107 and 103 (35 units each)
    foreach ([107, 103] as $st) {
        $bId = $streetToBldgId[$st];
        for ($u = 1; $u <= 12; $u++) {
            if ($u === 5) continue; // Floor 1 skips 105
            $uNum = '1' . sprintf('%02d', $u);
            $units[] = [$bId, $uNum, 'First Floor', $amherstProv, $amherstProv];
        }
        for ($fl = 2; $fl <= 3; $fl++) {
            $flLabel = $fl === 2 ? 'Second Floor' : 'Third Floor';
            for ($u = 1; $u <= 12; $u++) {
                $uNum = $fl . sprintf('%02d', $u);
                $units[] = [$bId, $uNum, $flLabel, $amherstProv, $amherstProv];
            }
        }
    }

    // 11 3-2-2 buildings
    $threeTwoTwoRoster = [
        ['101', 'First Floor'], ['102', 'First Floor'], ['103', 'First Floor'],
        ['201', 'Second Floor'], ['202', 'Second Floor'],
        ['301', 'Third Floor'], ['302', 'Third Floor']
    ];
    foreach ($threeTwoTwoStreets as $st) {
        $bId = $streetToBldgId[$st];
        foreach ($threeTwoTwoRoster as [$uNum, $fl]) {
            $units[] = [$bId, $uNum, $fl, $amherstProv, $amherstProv];
        }
    }

    // 2 4x4 buildings
    foreach ($fourByFourStreets as $st) {
        $bId = $streetToBldgId[$st];
        for ($fl = 1; $fl <= 4; $fl++) {
            $flLabel = $fl === 1 ? 'First Floor' : ($fl === 2 ? 'Second Floor' : ($fl === 3 ? 'Third Floor' : 'Fourth Floor'));
            for ($u = 1; $u <= 4; $u++) {
                $uNum = "{$fl}0{$u}";
                $units[] = [$bId, $uNum, $flLabel, $amherstProv, $amherstProv];
            }
        }
    }

    // 29 townhouses
    foreach ($townhouseStreets as $st) {
        $bId = $streetToBldgId[$st];
        $comment = $amherstProv;
        if ($st === 137) {
            $comment = 'Verified unit with Frigidaire range & Rheem water heater (WO on hold)';
        } elseif ($st === 125) {
            $comment = 'Amherst Townhouse verified unit';
        }
        $units[] = [$bId, (string)$st, 'Multi-Floor Townhouse', $comment, $amherstProv];
    }

    // Add Manitou verified units (88 units across 4 buildings from Yardi extract 2026-10-22)
    $manitouProv = 'verified — Yardi extract 2026-10-22';
    // 77 Manitou Cres (58 townhouses: 1–58)
    for ($u = 1; $u <= 58; $u++) {
        $units[] = [81, (string)$u, 'Multi-Floor Townhouse', $manitouProv, $manitouProv];
    }
    // 77A Manitou Cres (10 units: 101–104, 201–203, 301–303)
    $manitou77a = [
        ['101', 'First Floor'], ['102', 'First Floor'], ['103', 'First Floor'], ['104', 'First Floor'],
        ['201', 'Second Floor'], ['202', 'Second Floor'], ['203', 'Second Floor'],
        ['301', 'Third Floor'], ['302', 'Third Floor'], ['303', 'Third Floor']
    ];
    foreach ($manitou77a as [$uNum, $fl]) {
        $units[] = [91, $uNum, $fl, $manitouProv, $manitouProv];
    }
    // 77B Manitou Cres (11 units: 105–107, 204–207, 304–307)
    $manitou77b = [
        ['105', 'First Floor'], ['106', 'First Floor'], ['107', 'First Floor'],
        ['204', 'Second Floor'], ['205', 'Second Floor'], ['206', 'Second Floor'], ['207', 'Second Floor'],
        ['304', 'Third Floor'], ['305', 'Third Floor'], ['306', 'Third Floor'], ['307', 'Third Floor']
    ];
    foreach ($manitou77b as [$uNum, $fl]) {
        $units[] = [92, $uNum, $fl, $manitouProv, $manitouProv];
    }
    // 77C Manitou Cres (9 units: 108–110, 208–210, 308–310)
    $manitou77c = [
        ['108', 'First Floor'], ['109', 'First Floor'], ['110', 'First Floor'],
        ['208', 'Second Floor'], ['209', 'Second Floor'], ['210', 'Second Floor'],
        ['308', 'Third Floor'], ['309', 'Third Floor'], ['310', 'Third Floor']
    ];
    foreach ($manitou77c as [$uNum, $fl]) {
        $units[] = [93, $uNum, $fl, $manitouProv, $manitouProv];
    }

    // Add Elm verified units (31 units across 18 Elm and 24 Elm from Yardi extract 2026-10-22)
    $elmProv = 'verified — Yardi extract 2026-10-22';
    // 18 Elm St (17 units)
    $elm18Units = ['101P', '111', '112', '113', '114', '211', '212', '213', '214', '311', '312', '313', '314', '411', '412', '413', '414'];
    foreach ($elm18Units as $uNum) {
        $fl = str_starts_with($uNum, '1') ? 'First Floor' : (str_starts_with($uNum, '2') ? 'Second Floor' : (str_starts_with($uNum, '3') ? 'Third Floor' : 'Fourth Floor'));
        $note = $uNum === '101P' ? '18 Elm St unit 101P (verified base exception, no plain 101)' : '18 Elm St residential unit (verified base number)';
        $units[] = [78, $uNum, $fl, $note, $elmProv];
    }
    // 24 Elm St (14 units)
    $elm24Units = ['101', '102', '103', '104', '201', '202', '203', '204', '301', '302', '303', '401', '402', '403'];
    foreach ($elm24Units as $uNum) {
        $fl = str_starts_with($uNum, '1') ? 'First Floor' : (str_starts_with($uNum, '2') ? 'Second Floor' : (str_starts_with($uNum, '3') ? 'Third Floor' : 'Fourth Floor'));
        $units[] = [79, $uNum, $fl, '24 Elm St residential unit (verified base number, no 24- prefix)', $elmProv];
    }

    // Add Alfred verified units (14 units across 6 buildings from Yardi extract 2026-10-22)
    $alfredProv = 'verified — Yardi extract 2026-10-22';
    // 353 Alfred St (3 units)
    $units[] = [70, '1', 'First Floor', 'Converted house apartment (base unit, ignores Yardi letter room suffixes)', $alfredProv];
    $units[] = [70, '2', 'Second Floor', 'Converted house apartment (base unit, ignores Yardi letter room suffixes)', $alfredProv];
    $units[] = [70, '3', 'Third Floor', 'Converted house apartment (base unit, ignores Yardi letter room suffixes)', $alfredProv];
    // 359 Alfred St (1 unit)
    $units[] = [71, '359', 'Main Floor', 'Converted house apartment (base unit, ignores Yardi letter room suffixes)', $alfredProv];
    // 361 Alfred St (1 unit)
    $units[] = [72, '1', 'Main Floor', 'Converted house apartment (base unit, ignores Yardi letter room suffixes)', $alfredProv];
    // 376 Alfred St (1 unit)
    $units[] = [73, '376', 'Main Floor', 'Converted house apartment (base unit, ignores Yardi letter room suffixes)', $alfredProv];
    // 378 Alfred St (1 unit)
    $units[] = [74, '378', 'Main Floor', 'Converted house apartment (base unit, ignores Yardi letter room suffixes)', $alfredProv];
    // 394 Alfred St (7 units)
    for ($u = 1; $u <= 7; $u++) {
        $fl = $u <= 3 ? 'First Floor' : ($u <= 5 ? 'Second Floor' : 'Third Floor');
        $units[] = [75, (string)$u, $fl, 'Converted house apartment (base unit, ignores Yardi letter room suffixes)', $alfredProv];
    }

    // Add Frontenac verified units (101 units for 501 Frontenac from Yardi extract 2026-10-22)
    $frontenacProv = 'verified — Yardi extract 2026-10-22';
    $frontenacF1 = ['101', '102', '103', '104', '105', '106', '107', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120'];
    foreach ($frontenacF1 as $uNum) {
        $units[] = [76, $uNum, 'First Floor', 'Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)', $frontenacProv, 'patry'];
    }
    for ($fl = 2; $fl <= 4; $fl++) {
        $flLabel = $fl === 2 ? 'Second Floor' : ($fl === 3 ? 'Third Floor' : 'Fourth Floor');
        for ($u = 1; $u <= 21; $u++) {
            $uNum = $fl . sprintf('%02d', $u);
            $units[] = [76, $uNum, $flLabel, 'Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)', $frontenacProv, 'patry'];
        }
    }
    $frontenacF5 = array_merge(
        array_map(fn($n) => (string)$n, range(501, 516)),
        ['519', '520', '521', '522', '523']
    );
    foreach ($frontenacF5 as $uNum) {
        $units[] = [76, $uNum, 'Fifth Floor', 'Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)', $frontenacProv, 'patry'];
    }

    // Add Princess trio verified units (25 units across 563, 565, 567 Princess from Yardi extract 2026-10-22)
    $princessProv = 'verified — Yardi extract 2026-10-22';
    // 563 Princess (23 units)
    $units[] = [59, '1', 'First Floor', 'House-style unit (Yardi 563-1)', $princessProv, 'patry'];
    $p563F1 = ['101', '102', '103'];
    foreach ($p563F1 as $uNum) {
        $units[] = [59, $uNum, 'First Floor', 'Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)', $princessProv, 'patry'];
    }
    for ($fl = 2; $fl <= 5; $fl++) {
        $flLabel = $fl === 2 ? 'Second Floor' : ($fl === 3 ? 'Third Floor' : ($fl === 4 ? 'Fourth Floor' : 'Fifth Floor'));
        for ($u = 1; $u <= 4; $u++) {
            $uNum = "{$fl}0{$u}";
            $units[] = [59, $uNum, $flLabel, 'Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)', $princessProv, 'patry'];
        }
    }
    $p563F6 = ['601', '603', '604'];
    foreach ($p563F6 as $uNum) {
        $units[] = [59, $uNum, 'Sixth Floor', 'Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)', $princessProv, 'patry'];
    }
    // 565 Princess (1 unit: '1')
    $units[] = [60, '1', 'First Floor', 'House unit (Yardi 565-1)', $princessProv, 'patry'];
    // 567 Princess (1 unit: '1')
    $units[] = [61, '1', 'First Floor', 'House unit (Yardi 567-1)', $princessProv, 'patry'];

    // 630 Princess (26 units)
    $p630Units = [
        // F1: 102, 104, 106
        ['102', 'First Floor'], ['104', 'First Floor'], ['106', 'First Floor'],
        // F2: 201, 203, 204, 205, 206, 207 (no 202)
        ['201', 'Second Floor'], ['203', 'Second Floor'], ['204', 'Second Floor'],
        ['205', 'Second Floor'], ['206', 'Second Floor'], ['207', 'Second Floor'],
        // F3: 301, 303, 304, 305, 306, 307 (no 302)
        ['301', 'Third Floor'], ['303', 'Third Floor'], ['304', 'Third Floor'],
        ['305', 'Third Floor'], ['306', 'Third Floor'], ['307', 'Third Floor'],
        // F4: 401, 402, 403, 404, 405, 407 (no 406)
        ['401', 'Fourth Floor'], ['402', 'Fourth Floor'], ['403', 'Fourth Floor'],
        ['404', 'Fourth Floor'], ['405', 'Fourth Floor'], ['407', 'Fourth Floor'],
        // F5: 501, 503, 504, 505, 507 (no 502, 506)
        ['501', 'Fifth Floor'], ['503', 'Fifth Floor'], ['504', 'Fifth Floor'],
        ['505', 'Fifth Floor'], ['507', 'Fifth Floor']
    ];
    foreach ($p630Units as [$uNum, $fl]) {
        $units[] = [62, $uNum, $fl, '630 Princess St apartment (base unit, ignores Yardi letter room suffixes)', $princessProv, 'patry'];
    }

    // 800 Princess (51 units across floors 2, 3, 4 - no 210, 310, 410)
    for ($fl = 2; $fl <= 4; $fl++) {
        $flLabel = $fl === 2 ? 'Second Floor' : ($fl === 3 ? 'Third Floor' : 'Fourth Floor');
        for ($u = 1; $u <= 18; $u++) {
            if ($u === 10) continue;
            $uNum = $fl . sprintf('%02d', $u);
            $units[] = [64, $uNum, $flLabel, '800 Princess St apartment', $princessProv, 'patry'];
        }
    }

    // 800 Princess Annex (4 units: 100, 101A, 301, 302)
    $units[] = [94, '100', 'First Floor', '800 Princess annex unit (Yardi property 800prin)', $princessProv, 'patry'];
    $units[] = [94, '101A', 'First Floor', '800 Princess annex unit (Yardi property 800prin)', $princessProv, 'patry'];
    $units[] = [94, '301', 'Third Floor', '800 Princess annex unit (Yardi property 800prin, distinct from main 301)', $princessProv, 'patry'];
    $units[] = [94, '302', 'Third Floor', '800 Princess annex unit (Yardi property 800prin, distinct from main 302)', $princessProv, 'patry'];

    // 2274 Princess St (236 units across 5 floors: F1: 101–150, F2: 201–259, F3: 301–359, F4: 401–451, F5: 501–517)
    $p2274Ranges = [
        ['First Floor', 101, 150],
        ['Second Floor', 201, 259],
        ['Third Floor', 301, 359],
        ['Fourth Floor', 401, 451],
        ['Fifth Floor', 501, 517],
    ];
    foreach ($p2274Ranges as [$flLabel, $start, $end]) {
        for ($u = $start; $u <= $end; $u++) {
            $units[] = [95, (string)$u, $flLabel, '2274 Princess St apartment (verified base number, uniform appliance set)', $princessProv, 'patry', 'set-skyfall-sante-uniform', 'none'];
        }
    }

    // Le Santé / 300 Skyfall Lane (161 units across 6 floors)
    $santeProv = 'verified — Yardi extract 2026-10-22';
    $santeFloors = [
        ['First Floor', array_merge(range(101, 126), [133, 134])],
        ['Second Floor', array_merge(range(201, 227), [235, 255, 256, 257, 258])],
        ['Third Floor', array_merge(range(301, 327), [356, 357, 358])],
        ['Fourth Floor', [401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 421, 424, 426, 439, 441, 456]],
        ['Fifth Floor', [501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 521, 523, 524, 526, 539, 541]],
        ['Sixth Floor', [601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 617, 619, 621, 639, 641, 656]],
    ];
    foreach ($santeFloors as [$flLabel, $uList]) {
        foreach ($uList as $uNum) {
            $units[] = [96, (string)$uNum, $flLabel, 'Le Santé apartment (verified base number, uniform appliance set)', $santeProv, 'patry', 'set-skyfall-sante-uniform', 'none'];
        }
    }

    // Singles & Standalone (214 units across 6 buildings, verified Yardi extract 2026-10-22)
    $singlesProv = 'verified — Yardi extract 2026-10-22';

    // 539 Armstrong Road (112 units)
    foreach (array_merge(range(101, 109), range(111, 123)) as $u) {
        $units[] = [87, (string)$u, 'First Floor', '539 Armstrong Road apartment (Riverstone)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }
    foreach (array_merge(range(201, 209), range(211, 223)) as $u) {
        $units[] = [87, (string)$u, 'Second Floor', '539 Armstrong Road apartment (Riverstone)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }
    foreach (range(301, 323) as $u) {
        $units[] = [87, (string)$u, 'Third Floor', '539 Armstrong Road apartment (Riverstone)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }
    foreach (range(401, 423) as $u) {
        $units[] = [87, (string)$u, 'Fourth Floor', '539 Armstrong Road apartment (Riverstone)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }
    foreach (array_merge(range(501, 509), range(511, 523)) as $u) {
        $units[] = [87, (string)$u, 'Fifth Floor', '539 Armstrong Road apartment (Riverstone)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }

    // 810 Blackburn Mews (66 units)
    foreach (range(101, 116) as $u) {
        $units[] = [82, (string)$u, 'First Floor', '810 Blackburn Mews unit (Stonecrest)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }
    foreach (range(201, 216) as $u) {
        $units[] = [82, (string)$u, 'Second Floor', '810 Blackburn Mews unit (Stonecrest)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }
    foreach (range(301, 318) as $u) {
        $units[] = [82, (string)$u, 'Third Floor', '810 Blackburn Mews unit (Stonecrest)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }
    foreach (range(401, 416) as $u) {
        $units[] = [82, (string)$u, 'Fourth Floor', '810 Blackburn Mews unit (Stonecrest)', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }

    // 85 Park Street (15 units)
    foreach ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16] as $u) {
        $units[] = [83, (string)$u, 'Main Floor', '85 Park Street residential unit', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }

    // 265 Ontario Street (14 units)
    foreach (range(1, 14) as $u) {
        $units[] = [12, (string)$u, 'Main Floor', '265 Ontario Street residential unit', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    }

    // 415 Albert Street (6 units)
    $units[] = [11, '415', 'Main Floor', '415 Albert Street separate apartment unit', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    $units[] = [11, '415B', 'Main Floor', '415 Albert Street separate apartment unit', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    $units[] = [11, '415C', 'Main Floor', '415 Albert Street separate apartment unit', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    $units[] = [11, '415D', 'Second Floor', '415 Albert Street separate apartment unit', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    $units[] = [11, '415E', 'Second Floor', '415 Albert Street separate apartment unit', $singlesProv, 'patry', 'set-singles-apt', 'none'];
    $units[] = [11, '415F', 'Second Floor', '415 Albert Street separate apartment unit', $singlesProv, 'patry', 'set-singles-apt', 'none'];

    // 36 Durham Street (1 unit)
    $units[] = [86, '1', 'Main Floor', '36 Durham Street residential unit (base unit, ignores Yardi letter room suffixes)', $singlesProv, 'patry', 'set-singles-apt', 'none'];

    $unitCount = 0;
    foreach ($units as $u) {
        $stmt = $pdo->prepare("SELECT id FROM unit WHERE building_id = ? AND unit_number = ?");
        $stmt->execute([$u[0], $u[1]]);
        $existing = $stmt->fetch();
        $ownership = $u[5] ?? 'patry';
        $defaultSetId = $u[6] ?? null;
        $washerDryerState = $u[7] ?? 'none';
        if ($existing) {
            $update = $pdo->prepare("UPDATE unit SET floor = ?, comments = ?, provenance = ?, ownership = ?, default_set_id = ?, washer_dryer_state = ? WHERE id = ?");
            $update->execute([$u[2], $u[3], $u[4], $ownership, $defaultSetId, $washerDryerState, $existing['id']]);
        } else {
            $insert = $pdo->prepare("INSERT INTO unit (building_id, unit_number, floor, comments, provenance, ownership, default_set_id, washer_dryer_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $insert->execute([$u[0], $u[1], $u[2], $u[3], $u[4], $ownership, $defaultSetId, $washerDryerState]);
        }
        $unitCount++;
    }

    // Seed 6 Verified Appliances
    $appliances = [
        [
            1, 'prop-bath-1723', 3, null, 'Dishwasher', 'Frigidaire', 'Dishwasher', 'Kitchen', 'operational',
            '2026-10-15', 'FFCD2418US3A', null, 'Kitchen', '266', '1723 Bath Rd · Unit 266 · Kitchen',
            'https://frigidaire.bynder.com/transform/e1966ae3-49aa-4b00-86e2-92f2e0ebf80e/FFCD2418US-HOV_824-psd?preset=three-bears',
            null,
            'Drain pump Askoll M376 (part A16944601) replaced 2026-10-15; status operational, load test pending.',
            json_encode(['capacity' => '14 Place Settings', 'volts' => '120V', 'room' => 'Kitchen', 'location' => '1723 Bath Rd · Unit 266 · Kitchen'])
        ],
        [
            2, 'prop-amherst-137', 10, null, 'Electric Range', 'Frigidaire', 'Range', 'Kitchen', 'needs_service',
            null, null, null, 'Kitchen', '137', '137 Amherst Dr · Unit 137 · Kitchen',
            null,
            null,
            'Gray electric range. Burner infinite switch WB24T10025 (order by model #). Status: needs repair (on hold).',
            json_encode(['room' => 'Kitchen', 'location' => '137 Amherst Dr · Unit 137 · Kitchen'])
        ],
        [
            3, 'prop-amherst-137', 10, null, 'Water Heater', 'Rheem', 'Heater', 'Water Heating', 'needs_service',
            null, null, null, null, '137', '137 Amherst Dr · Unit 137',
            null,
            null,
            'No hot water since ~2026-10-08. Status: needs repair (on hold).',
            json_encode(['location' => '137 Amherst Dr · Unit 137'])
        ],
        [
            4, 'prop-bath-1731', 5, null, 'Water Heater (Laundry)', '', 'Heater', 'Water Heating', 'operational',
            null, null, null, 'Laundry Room', 'Common', '1731 Bath Rd · Laundry Room',
            null,
            null,
            '1/2" copper supply (16–17mm OD); SharkBite 1/2" push-fit ball valve planned. Building drain stack has recurring blockages.',
            json_encode(['room' => 'Laundry Room', 'location' => '1731 Bath Rd · Laundry Room'])
        ],
        [
            5, 'prop-bath-1719', 1, null, 'Refrigerator', '', 'Refrigerator', 'Kitchen', 'needs_service',
            null, null, null, 'Kitchen', '273', '1719 Bath Rd · Unit 273 · Kitchen',
            null,
            null,
            'Needs crisper drawer + door shelf, ordered via Dependable Appliances once the model is known. Rating-plate photo pending.',
            json_encode(['room' => 'Kitchen', 'location' => '1719 Bath Rd · Unit 273 · Kitchen'])
        ],
        [
            6, 'prop-days-505', 8, null, 'Freezer', '', 'Freezer', 'Kitchen', 'needs_service',
            null, null, null, null, '103', '505 Days Rd · Unit 103',
            null,
            null,
            'Recurring noise complaint (WO 19255).',
            json_encode(['location' => '505 Days Rd · Unit 103'])
        ]
    ];

    $appCount = 0;
    foreach ($appliances as $a) {
        $targetUnitId = $a[3];
        if (!empty($a[13]) && $a[13] !== 'Common') {
            $uStmt = $pdo->prepare("SELECT id FROM unit WHERE building_id = ? AND unit_number = ? LIMIT 1");
            $uStmt->execute([$a[2], $a[13]]);
            $uRow = $uStmt->fetch();
            if ($uRow) {
                $targetUnitId = $uRow['id'];
            }
        }

        $stmt = $pdo->prepare("SELECT id FROM appliance WHERE id = ?");
        $stmt->execute([$a[0]]);
        if ($stmt->fetch()) {
            $update = $pdo->prepare("UPDATE appliance SET property_id = ?, building_id = ?, unit_id = ?, name = ?, brand = ?, type = ?, category = ?, status = ?, last_service = ?, model_number = ?, serial_number = ?, room = ?, unit_number = ?, location = ?, image_url = ?, rating_plate_url = ?, notes = ?, specs = ? WHERE id = ?");
            $update->execute([$a[1], $a[2], $targetUnitId, $a[4], $a[5], $a[6], $a[7], $a[8], $a[9], $a[10], $a[11], $a[12], $a[13], $a[14], $a[15], $a[16], $a[17], $a[18], $a[0]]);
        } else {
            $insert = $pdo->prepare("INSERT INTO appliance (id, property_id, building_id, unit_id, name, brand, type, category, status, last_service, model_number, serial_number, room, unit_number, location, image_url, rating_plate_url, notes, specs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $insert->execute([$a[0], $a[1], $a[2], $targetUnitId, $a[4], $a[5], $a[6], $a[7], $a[8], $a[9], $a[10], $a[11], $a[12], $a[13], $a[14], $a[15], $a[16], $a[17], $a[18]]);
        }
        $appCount++;
    }

    return [
        'buildings' => $bldCount,
        'units' => $unitCount,
        'appliances' => $appCount,
        'photos' => count($photoUrls)
    ];
}
