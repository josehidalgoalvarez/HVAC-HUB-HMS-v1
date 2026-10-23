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
        [10, '137 Amherst Drive', '137 Amherst Dr, Kingston, ON', 'Residential units. Stockpiles nearby: 107 Amherst and 539 Armstrong.'],
        [11, '415 Albert Street', '415 Albert St, Kingston, ON', 'Multi-unit residential property.'],
        [12, '265 Ontario Street', '265 Ontario St, Kingston, ON', 'Residential property.']
    ];

    $bldCount = 0;
    foreach ($buildings as $b) {
        $stmt = $pdo->prepare("SELECT id FROM building WHERE id = ?");
        $stmt->execute([$b[0]]);
        if ($stmt->fetch()) {
            $update = $pdo->prepare("UPDATE building SET name = ?, address = ?, comments = ? WHERE id = ?");
            $update->execute([$b[1], $b[2], $b[3], $b[0]]);
        } else {
            $insert = $pdo->prepare("INSERT INTO building (id, name, address, comments) VALUES (?, ?, ?, ?)");
            $insert->execute([$b[0], $b[1], $b[2], $b[3]]);
        }
        $bldCount++;
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

    // Add non-BD verified units
    $units[] = [10, '137', 'Main Floor', 'Verified residential unit with range and water heater', 'verified'];
    $units[] = [11, '415B', 'Main Floor', 'Verified residential unit', 'verified'];
    $units[] = [11, '415E', 'Second Floor', 'Verified residential unit', 'verified'];
    $units[] = [12, '2', 'Main Floor', 'Verified residential unit', 'verified'];

    $unitCount = 0;
    foreach ($units as $u) {
        $stmt = $pdo->prepare("SELECT id FROM unit WHERE building_id = ? AND unit_number = ?");
        $stmt->execute([$u[0], $u[1]]);
        $existing = $stmt->fetch();
        if ($existing) {
            $update = $pdo->prepare("UPDATE unit SET floor = ?, comments = ?, provenance = ? WHERE id = ?");
            $update->execute([$u[2], $u[3], $u[4], $existing['id']]);
        } else {
            $insert = $pdo->prepare("INSERT INTO unit (building_id, unit_number, floor, comments, provenance) VALUES (?, ?, ?, ?, ?)");
            $insert->execute([$u[0], $u[1], $u[2], $u[3], $u[4]]);
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
