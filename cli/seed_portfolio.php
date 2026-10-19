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

    // Seed Buildings
    $buildings = [
        [1, '1719 Bath Road', '1719 Bath Rd, Kingston, ON K7M 4Y1', 'Multi-unit residential complex with basement mechanical systems and central hydronic heating.'],
        [2, '1723 Bath Road', '1723 Bath Rd, Kingston, ON K7M 4Y1', 'Residential complex with rooftop make-up air unit and dedicated split systems.'],
        [3, '1727 Bath Road', '1727 Bath Rd, Kingston, ON K7M 4Y1', 'Multi-unit property with natural gas furnaces and dedicated outdoor condensers.'],
        [4, '1731 Bath Road', '1731 Bath Rd, Kingston, ON K7M 4Y1', 'Kingston West portfolio property with high-efficiency heating systems.'],
        [5, '1735 Bath Road', '1735 Bath Rd, Kingston, ON K7M 4Y1', 'Residential units with combined ground-level mechanical equipment.'],
        [6, '1737 Bath Road', '1737 Bath Rd, Kingston, ON K7M 4Y1', 'End-of-block multi-family property with basement mechanical room.'],
        [7, '505 Days Road', '505 Days Rd, Kingston, ON K7M 5R6', 'Days Road residential complex with PTAC heat pumps and central hot water heating.'],
        [8, '507 Days Road', '507 Days Rd, Kingston, ON K7M 5R6', 'Residential apartments with electric water heaters and ductless mini-split units.']
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

    // Seed Units
    $units = [
        [1, 1, '273', 'Basement', 'Primary technician benchmark unit with gas mechanical equipment'],
        [2, 1, '101', 'First Floor', 'Main floor 2-bedroom suite'],
        [3, 1, '201', 'Second Floor', 'Upper floor residential unit'],
        [4, 2, 'Common', 'Roof', 'Rooftop make-up air and ventilation deck'],
        [5, 7, '1', 'Main Floor', 'Ground level apartment with PTAC heat pump']
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

    // Seed Appliances
    $appliances = [
        [
            1, 'prop-bath-1719', 1, 1, 'Tankless Water Heater', 'Rinnai', 'Heater', 'Water Heating', 'operational',
            '2026-01-15', 'RU199iN', '21B.004128', 'Basement', '273', '1719 Bath Rd · Unit 273 · Basement',
            $photoUrls[0] ?? '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
            $photoUrls[1] ?? '/uploads/photo_2aa8d094f66a8ede0a7b.jpg',
            json_encode(['fuelType' => 'Gas', 'btuInput' => '199,000', 'capacity' => '11 GPM', 'volts' => '120V', 'room' => 'Basement', 'location' => '1719 Bath Rd · Unit 273 · Basement'])
        ],
        [
            2, 'prop-bath-1719', 1, 1, 'High-Efficiency Gas Furnace', 'Carrier', 'Furnace', 'Heating', 'operational',
            '2025-11-20', '59TP6B080V1716', '3422A19823', 'Basement', '273', '1719 Bath Rd · Unit 273 · Basement',
            $photoUrls[2] ?? '/uploads/photo_86e84cf408480a53552b.jpg',
            $photoUrls[3] ?? '/uploads/photo_6a700f6adc9bd57ba9db.jpg',
            json_encode(['fuelType' => 'Gas', 'btuInput' => '80,000', 'btuOutput' => '78,000', 'volts' => '120V', 'filterSize' => '16x25x1', 'room' => 'Basement', 'location' => '1719 Bath Rd · Unit 273 · Basement'])
        ],
        [
            3, 'prop-bath-1719', 1, 1, 'Central AC Condenser', 'Carrier', 'AC', 'Cooling', 'operational',
            '2025-06-12', '24ACC636A003', '1821E45901', 'Exterior', '273', '1719 Bath Rd · Unit 273 · Exterior',
            $photoUrls[4] ?? '/uploads/photo_5a0393354bd60e0ac63f.jpg',
            $photoUrls[5] ?? '/uploads/photo_8db7e895c76fcfce8de5.jpg',
            json_encode(['refrigerantType' => 'R-410A', 'volts' => '208/230V', 'capacity' => '3.0 Tons', 'room' => 'Exterior', 'location' => '1719 Bath Rd · Unit 273 · Exterior'])
        ],
        [
            4, 'prop-bath-1719', 1, null, 'Commercial Hydronic Boiler', 'Weil-McLain', 'Heater', 'Central Heating', 'operational',
            '2026-02-01', 'LGB-8', 'WM-98421', 'Mechanical Room', 'Common', '1719 Bath Rd · Common · Mechanical Room',
            $photoUrls[6] ?? '/uploads/photo_c61a96df0f03a7620bf1.jpg',
            $photoUrls[7] ?? '/uploads/photo_b9a7b4d1af836cee96c8.jpg',
            json_encode(['fuelType' => 'Gas', 'btuInput' => '450,000', 'systemPressure' => '18 PSI', 'waterTemp' => '180°F', 'room' => 'Mechanical Room', 'location' => '1719 Bath Rd · Common · Mechanical Room'])
        ],
        [
            5, 'prop-bath-1723', 2, 4, 'Make-Up Air Unit', 'Engineered Air', 'Furnace', 'Ventilation', 'operational',
            '2026-01-10', 'FWA-110', 'EA-2022-771', 'Roof', 'Common', '1723 Bath Rd · Common · Roof',
            $photoUrls[8] ?? '/uploads/photo_7b90897a4994f447765e.jpg',
            $photoUrls[9] ?? '/uploads/photo_3fba10b6250dd34fcc10.jpg',
            json_encode(['fuelType' => 'Gas', 'motorHp' => '3.0 HP', 'volts' => '208V', 'phase' => '3', 'room' => 'Roof', 'location' => '1723 Bath Rd · Common · Roof'])
        ],
        [
            6, 'prop-days-505', 7, 5, 'Packaged Terminal AC & Heat Pump', 'Amana', 'AC', 'Heating & Cooling', 'operational',
            '2025-09-18', 'PTC153G35AXXX', 'AM-89211', 'Living Room', '1', '505 Days Rd · Unit 1 · Living Room',
            $photoUrls[10] ?? '/uploads/photo_cdde6e8442e952e7c538.jpg',
            $photoUrls[0] ?? '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
            json_encode(['volts' => '240V', 'capacity' => '15,000 BTU', 'breakerRating' => '20A', 'room' => 'Living Room', 'location' => '505 Days Rd · Unit 1 · Living Room'])
        ]
    ];

    $appCount = 0;
    foreach ($appliances as $a) {
        $stmt = $pdo->prepare("SELECT id FROM appliance WHERE id = ?");
        $stmt->execute([$a[0]]);
        if ($stmt->fetch()) {
            $update = $pdo->prepare("UPDATE appliance SET property_id = ?, building_id = ?, unit_id = ?, name = ?, brand = ?, type = ?, category = ?, status = ?, last_service = ?, model_number = ?, serial_number = ?, room = ?, unit_number = ?, location = ?, image_url = ?, rating_plate_url = ?, specs = ? WHERE id = ?");
            $update->execute([$a[1], $a[2], $a[3], $a[4], $a[5], $a[6], $a[7], $a[8], $a[9], $a[10], $a[11], $a[12], $a[13], $a[14], $a[15], $a[16], $a[17], $a[0]]);
        } else {
            $insert = $pdo->prepare("INSERT INTO appliance (id, property_id, building_id, unit_id, name, brand, type, category, status, last_service, model_number, serial_number, room, unit_number, location, image_url, rating_plate_url, specs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $insert->execute([$a[0], $a[1], $a[2], $a[3], $a[4], $a[5], $a[6], $a[7], $a[8], $a[9], $a[10], $a[11], $a[12], $a[13], $a[14], $a[15], $a[16], $a[17]]);
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
