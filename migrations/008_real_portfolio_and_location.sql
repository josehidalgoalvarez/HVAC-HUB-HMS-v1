-- Migration 008: Real Portfolio Prototypes & Location Text
-- Retires fictional demo data ("The Modern Gas Home", Springfield IL).
-- Adds free-text room column and seeds real portfolio prototypes:
-- 1719-1737 Bath Rd and 505-507 Days Rd in Kingston, ON.

-- 1. Add room column to job table
ALTER TABLE `job`
  ADD COLUMN `room` VARCHAR(100) NULL;

-- 2. Create appliance table if not exists
CREATE TABLE IF NOT EXISTS `appliance` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `property_id` VARCHAR(100) NOT NULL,
  `building_id` BIGINT UNSIGNED NULL,
  `unit_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(191) NOT NULL,
  `brand` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'operational',
  `last_service` VARCHAR(50) NULL,
  `model_number` VARCHAR(100) NULL,
  `serial_number` VARCHAR(100) NULL,
  `room` VARCHAR(100) NULL,
  `unit_number` VARCHAR(50) NULL,
  `location` VARCHAR(255) NULL,
  `image_url` VARCHAR(255) NULL,
  `rating_plate_url` VARCHAR(255) NULL,
  `manual_url` VARCHAR(255) NULL,
  `warranty_url` VARCHAR(255) NULL,
  `installation_url` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `specs` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed Real Portfolio Buildings
INSERT INTO `building` (`id`, `name`, `address`, `comments`, `is_3d_ready`) VALUES
  (1, '1719 Bath Road', '1719 Bath Rd, Kingston, ON K7M 4Y1', 'Multi-unit residential complex with basement mechanical systems and central hydronic heating.', 0),
  (2, '1723 Bath Road', '1723 Bath Rd, Kingston, ON K7M 4Y1', 'Residential complex with rooftop make-up air unit and dedicated split systems.', 0),
  (3, '1727 Bath Road', '1727 Bath Rd, Kingston, ON K7M 4Y1', 'Multi-unit property with natural gas furnaces and dedicated outdoor condensers.', 0),
  (4, '1731 Bath Road', '1731 Bath Rd, Kingston, ON K7M 4Y1', 'Kingston West portfolio property with high-efficiency heating systems.', 0),
  (5, '1735 Bath Road', '1735 Bath Rd, Kingston, ON K7M 4Y1', 'Residential units with combined ground-level mechanical equipment.', 0),
  (6, '1737 Bath Road', '1737 Bath Rd, Kingston, ON K7M 4Y1', 'End-of-block multi-family property with basement mechanical room.', 0),
  (7, '505 Days Road', '505 Days Rd, Kingston, ON K7M 5R6', 'Days Road residential complex with PTAC heat pumps and central hot water heating.', 0),
  (8, '507 Days Road', '507 Days Rd, Kingston, ON K7M 5R6', 'Residential apartments with electric water heaters and ductless mini-split units.', 0)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `address`=VALUES(`address`), `comments`=VALUES(`comments`);

-- 4. Seed Real Units
INSERT INTO `unit` (`id`, `building_id`, `unit_number`, `floor`, `comments`) VALUES
  (1, 1, '273', 'Basement', 'Primary technician benchmark unit with gas mechanical equipment'),
  (2, 1, '101', 'First Floor', 'Main floor 2-bedroom suite'),
  (3, 1, '201', 'Second Floor', 'Upper floor residential unit'),
  (4, 2, 'Common', 'Roof', 'Rooftop make-up air and ventilation deck'),
  (5, 7, '1', 'Main Floor', 'Ground level apartment with PTAC heat pump')
ON DUPLICATE KEY UPDATE `unit_number`=VALUES(`unit_number`), `floor`=VALUES(`floor`);

-- 5. Seed Real Appliances with Text Locations (Room & Unit)
INSERT INTO `appliance` (
  `id`, `property_id`, `building_id`, `unit_id`, `name`, `brand`, `type`, `category`, `status`,
  `last_service`, `model_number`, `serial_number`, `room`, `unit_number`, `location`,
  `image_url`, `rating_plate_url`, `specs`
) VALUES
  (
    1, 'prop-bath-1719', 1, 1, 'Tankless Water Heater', 'Rinnai', 'Heater', 'Water Heating', 'operational',
    '2026-01-15', 'RU199iN', '21B.004128', 'Basement', '273', '1719 Bath Rd · Unit 273 · Basement',
    '/uploads/photo_8715a9f0bd2e11cfe611.jpg', '/uploads/photo_2aa8d094f66a8ede0a7b.jpg',
    '{"fuelType":"Gas","btuInput":"199,000","capacity":"11 GPM","volts":"120V","installDate":"2021-04-10","room":"Basement","location":"1719 Bath Rd · Unit 273 · Basement"}'
  ),
  (
    2, 'prop-bath-1719', 1, 1, 'High-Efficiency Gas Furnace', 'Carrier', 'Furnace', 'Heating', 'operational',
    '2025-11-20', '59TP6B080V1716', '3422A19823', 'Basement', '273', '1719 Bath Rd · Unit 273 · Basement',
    '/uploads/photo_86e84cf408480a53552b.jpg', '/uploads/photo_6a700f6adc9bd57ba9db.jpg',
    '{"fuelType":"Gas","btuInput":"80,000","btuOutput":"78,000","volts":"120V","filterSize":"16x25x1","installDate":"2022-09-15","room":"Basement","location":"1719 Bath Rd · Unit 273 · Basement"}'
  ),
  (
    3, 'prop-bath-1719', 1, 1, 'Central AC Condenser', 'Carrier', 'AC', 'Cooling', 'operational',
    '2025-06-12', '24ACC636A003', '1821E45901', 'Exterior', '273', '1719 Bath Rd · Unit 273 · Exterior',
    '/uploads/photo_5a0393354bd60e0ac63f.jpg', '/uploads/photo_8db7e895c76fcfce8de5.jpg',
    '{"refrigerantType":"R-410A","volts":"208/230V","capacity":"3.0 Tons","installDate":"2022-09-15","room":"Exterior","location":"1719 Bath Rd · Unit 273 · Exterior"}'
  ),
  (
    4, 'prop-bath-1719', 1, NULL, 'Commercial Hydronic Boiler', 'Weil-McLain', 'Heater', 'Central Heating', 'operational',
    '2026-02-01', 'LGB-8', 'WM-98421', 'Mechanical Room', 'Common', '1719 Bath Rd · Common · Mechanical Room',
    '/uploads/photo_c61a96df0f03a7620bf1.jpg', '/uploads/photo_b9a7b4d1af836cee96c8.jpg',
    '{"fuelType":"Gas","btuInput":"450,000","systemPressure":"18 PSI","waterTemp":"180°F","installDate":"2019-10-05","room":"Mechanical Room","location":"1719 Bath Rd · Common · Mechanical Room"}'
  ),
  (
    5, 'prop-bath-1723', 2, 4, 'Make-Up Air Unit', 'Engineered Air', 'Furnace', 'Ventilation', 'operational',
    '2026-01-10', 'FWA-110', 'EA-2022-771', 'Roof', 'Common', '1723 Bath Rd · Common · Roof',
    '/uploads/photo_7b90897a4994f447765e.jpg', '/uploads/photo_3fba10b6250dd34fcc10.jpg',
    '{"fuelType":"Gas","motorHp":"3.0 HP","volts":"208V","phase":"3","installDate":"2022-03-20","room":"Roof","location":"1723 Bath Rd · Common · Roof"}'
  ),
  (
    6, 'prop-days-505', 7, 5, 'Packaged Terminal AC & Heat Pump', 'Amana', 'AC', 'Heating & Cooling', 'operational',
    '2025-09-18', 'PTC153G35AXXX', 'AM-89211', 'Living Room', '1', '505 Days Rd · Unit 1 · Living Room',
    '/uploads/photo_cdde6e8442e952e7c538.jpg', '/uploads/photo_8715a9f0bd2e11cfe611.jpg',
    '{"volts":"240V","capacity":"15,000 BTU","breakerRating":"20A","installDate":"2023-05-12","room":"Living Room","location":"505 Days Rd · Unit 1 · Living Room"}'
  )
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `specs`=VALUES(`specs`), `location`=VALUES(`location`);

-- 6. Seed Real Tickets Linked to Real Portfolio
INSERT INTO `ticket` (
  `id`, `wo_number`, `building_id`, `unit_id`, `title`, `description`, `verified_scope`,
  `status`, `priority`
) VALUES
  (
    1, 'WO-2026-001', 1, 1, 'No Heat - Unit 273 Furnace Lockout',
    'Tenant reports ignition failure code on Carrier 59TP6 furnace in basement.',
    'Test igniter resistance and flame sensor microamps. Clear condensate trap.',
    'open', 'urgent'
  ),
  (
    2, 'WO-2026-002', 1, 1, 'Tankless Water Heater Maintenance Code 11',
    'Rinnai unit displaying code 11 (ignition failure) on domestic hot water demand.',
    'Inspect flame rod, clean gas orifices, check inlet gas pressure.',
    'verified', 'medium'
  ),
  (
    3, 'WO-2026-003', 2, 4, 'Make-Up Air Belt Tension & Bearing Service',
    'Engineered Air rooftop MAU annual scheduled vibration and belt inspection.',
    'Inspect blower belt deflection, lubricate pillow block bearings, replace air filters.',
    'open', 'medium'
  ),
  (
    4, 'WO-2026-004', 7, 5, 'PTAC Unit 1 Cooling Fan Noise',
    'Amana PTAC rattling during compressor cycle in Unit 1 living room.',
    'Inspect blower wheel for debris, check motor mount bushings.',
    'in_progress', 'low'
  )
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`), `status`=VALUES(`status`);
