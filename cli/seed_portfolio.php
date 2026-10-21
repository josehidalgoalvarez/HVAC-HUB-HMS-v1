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

    // Seed Verified Buildings (12 properties)
    $buildings = [
        [1, '1719 Bath Road', '1719 Bath Rd, Kingston, ON', 'Multi-unit residential complex. Stockpile: donor appliances on site at 1719 Bath.'],
        [2, '1721 Bath Road', '1721 Bath Rd, Kingston, ON', 'Multi-unit residential complex.'],
        [3, '1723 Bath Road', '1723 Bath Rd, Kingston, ON K7M 4Y9', 'Multi-unit residential complex.'],
        [4, '1725 Bath Road', '1725 Bath Rd, Kingston, ON', 'Multi-unit residential complex.'],
        [5, '1731 Bath Road', '1731 Bath Rd, Kingston, ON', 'Multi-unit complex. Note: building drain stack has recurring blockages.'],
        [6, '1733 Bath Road', '1733 Bath Rd, Kingston, ON', 'Multi-unit residential complex.'],
        [7, '1737 Bath Road', '1737 Bath Rd, Kingston, ON', 'End-of-block multi-family property.'],
        [8, '505 Days Road', '505 Days Rd, Kingston, ON', 'Days Road residential complex. Stockpiles nearby: 511 Days Rd storage (holds spare Askoll pump), 509 Days Rd storage rooms.'],
        [9, '507 Days Road', '507 Days Rd, Kingston, ON', 'Residential apartments. Stockpiles nearby: 509 & 511 Days Rd storage rooms.'],
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

    // Seed Verified Units
    $units = [
        [1, 1, '273', 'Basement', 'Unit 273 with basement mechanical access'],
        [2, 2, '268', 'Second Floor', 'Verified residential unit'],
        [3, 2, '266', 'Second Floor', 'Verified residential unit'],
        [4, 3, '266', 'Second Floor', 'Verified unit with Frigidaire dishwasher'],
        [5, 3, '67', 'Main Floor', 'Verified residential unit'],
        [6, 5, 'G63', 'Ground Floor', 'Verified residential unit'],
        [7, 5, '161', 'First Floor', 'Verified residential unit'],
        [8, 8, '103', 'First Floor', 'Verified unit with freezer noise complaint'],
        [9, 9, '32', 'Main Floor', 'Verified residential unit'],
        [10, 10, '137', 'Main Floor', 'Verified residential unit with range and water heater'],
        [11, 11, '415B', 'Main Floor', 'Verified residential unit'],
        [12, 11, '415E', 'Second Floor', 'Verified residential unit'],
        [13, 12, '2', 'Main Floor', 'Verified residential unit']
    ];

    $unitCount = 0;
    foreach ($units as $u) {
        $stmt = $pdo->prepare("SELECT id FROM unit WHERE id = ?");
        $stmt->execute([$u[0]]);
        if ($stmt->fetch()) {
            $update = $pdo->prepare("UPDATE unit SET building_id = ?, unit_number = ?, floor = ?, comments = ? WHERE id = ?");
            $update->execute([$u[1], $u[2], $u[3], $u[4], $u[0]]);
        } else {
            $insert = $pdo->prepare("INSERT INTO unit (id, building_id, unit_number, floor, comments) VALUES (?, ?, ?, ?, ?)");
            $insert->execute([$u[0], $u[1], $u[2], $u[3], $u[4]]);
        }
        $unitCount++;
    }

    // Seed 6 Verified Appliances
    $appliances = [
        [
            1, 'prop-bath-1723', 3, 4, 'Dishwasher', 'Frigidaire', 'Dishwasher', 'Kitchen', 'operational',
            '2026-10-15', 'FFCD2418US3A', null, 'Kitchen', '266', '1723 Bath Rd · Unit 266 · Kitchen',
            'https://frigidaire.bynder.com/transform/e1966ae3-49aa-4b00-86e2-92f2e0ebf80e/FFCD2418US-HOV_824-psd?preset=three-bears',
            null,
            'Drain pump Askoll M376 (part A16944601) replaced 2026-10-15; status operational, load test pending.',
            json_encode(['capacity' => '14 Place Settings', 'volts' => '120V', 'room' => 'Kitchen', 'location' => '1723 Bath Rd · Unit 266 · Kitchen'])
        ],
        [
            2, 'prop-amherst-137', 10, 10, 'Electric Range', 'Frigidaire', 'Range', 'Kitchen', 'needs_service',
            null, null, null, 'Kitchen', '137', '137 Amherst Dr · Unit 137 · Kitchen',
            null,
            null,
            'Gray electric range. Burner infinite switch WB24T10025 (order by model #). Status: needs repair (on hold).',
            json_encode(['room' => 'Kitchen', 'location' => '137 Amherst Dr · Unit 137 · Kitchen'])
        ],
        [
            3, 'prop-amherst-137', 10, 10, 'Water Heater', 'Rheem', 'Heater', 'Water Heating', 'needs_service',
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
            5, 'prop-bath-1719', 1, 1, 'Refrigerator', '', 'Refrigerator', 'Kitchen', 'needs_service',
            null, null, null, 'Kitchen', '273', '1719 Bath Rd · Unit 273 · Kitchen',
            null,
            null,
            'Needs crisper drawer + door shelf, ordered via Dependable Appliances once the model is known. Rating-plate photo pending.',
            json_encode(['room' => 'Kitchen', 'location' => '1719 Bath Rd · Unit 273 · Kitchen'])
        ],
        [
            6, 'prop-days-505', 8, 8, 'Freezer', '', 'Freezer', 'Kitchen', 'needs_service',
            null, null, null, null, '103', '505 Days Rd · Unit 103',
            null,
            null,
            'Recurring noise complaint (WO 19255).',
            json_encode(['location' => '505 Days Rd · Unit 103'])
        ]
    ];

    $appCount = 0;
    foreach ($appliances as $a) {
        $stmt = $pdo->prepare("SELECT id FROM appliance WHERE id = ?");
        $stmt->execute([$a[0]]);
        if ($stmt->fetch()) {
            $update = $pdo->prepare("UPDATE appliance SET property_id = ?, building_id = ?, unit_id = ?, name = ?, brand = ?, type = ?, category = ?, status = ?, last_service = ?, model_number = ?, serial_number = ?, room = ?, unit_number = ?, location = ?, image_url = ?, rating_plate_url = ?, notes = ?, specs = ? WHERE id = ?");
            $update->execute([$a[1], $a[2], $a[3], $a[4], $a[5], $a[6], $a[7], $a[8], $a[9], $a[10], $a[11], $a[12], $a[13], $a[14], $a[15], $a[16], $a[17], $a[18], $a[0]]);
        } else {
            $insert = $pdo->prepare("INSERT INTO appliance (id, property_id, building_id, unit_id, name, brand, type, category, status, last_service, model_number, serial_number, room, unit_number, location, image_url, rating_plate_url, notes, specs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $insert->execute([$a[0], $a[1], $a[2], $a[3], $a[4], $a[5], $a[6], $a[7], $a[8], $a[9], $a[10], $a[11], $a[12], $a[13], $a[14], $a[15], $a[16], $a[17], $a[18]]);
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
