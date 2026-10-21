-- Migration 014: Complexes Layer, Appliance Default Sets, and 505 Days Pool Removal
-- Re-structures properties to a 4-level hierarchy: Complex -> Building -> Unit -> Appliance.
-- Complexes: BD (id=1, slug='bd'), Elm + Colborne (id=2, slug='elm-colborne').
-- All other properties have complex_id = NULL (Ungrouped).
-- Removes '505 Days Pool' location entirely (safety check: 0 references found).
-- Seeds 4 default appliance sets: BD/Apartment default, BD/Apartment 1-bed variant, BD/Townhouse, Elm+Colborne/Apartment.
-- Seeds 18 Elm St units (base numbers 101-414, including unit 411).

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create complexes table
CREATE TABLE IF NOT EXISTS `complexes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Seed Complexes: BD and Elm + Colborne
INSERT INTO `complexes` (`id`, `name`, `slug`, `notes`) VALUES
  (1, 'BD', 'bd', 'Bath Road and Days Road residential complex in Kingston, ON. 511 Days Rd is the storage building.'),
  (2, 'Elm + Colborne', 'elm-colborne', '18 Elm St, 24 Elm St, and 203 Colborne St proximity cluster.');

-- 3. Create default_sets table
CREATE TABLE IF NOT EXISTS `default_sets` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `complex_slug` VARCHAR(50) NOT NULL,
  `complex_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(100) NOT NULL,
  `unit_type` VARCHAR(50) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `bedrooms` INT UNSIGNED NULL,
  `bathrooms` INT UNSIGNED NULL,
  `stories` INT UNSIGNED NULL,
  `has_unit_water_heater` TINYINT(1) NOT NULL DEFAULT 0,
  `appliances_json` TEXT NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Seed the 4 Default Sets
INSERT INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`) VALUES
  ('set-bd-apt', 'bd', 1, 'Apartment (default)', 'apartment', 1, 2, 1, 1, 0, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true}]', 'Building-level shared laundry room appliances and shared water heaters live on mechanical room.'),
  ('set-bd-apt-1bed', 'bd', 1, 'Apartment 1-bed (variant)', 'apartment', 0, 1, 1, 1, 0, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true}]', '1-bed variant inheriting identical kitchen appliance list.'),
  ('set-bd-townhouse', 'bd', 1, 'Townhouse', 'townhouse', 1, 3, 2, 3, 1, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true},{"category":"Kitchen","type":"Range","name":"Stove (default)","isDefault":true},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true},{"category":"Water Heating","type":"Heater","name":"Unit Water Heater (default)","isDefault":true}]', '3 stories, 2 washrooms, dedicated per-unit water heater.'),
  ('set-elm-apt', 'elm-colborne', 2, 'Apartment', 'apartment', 1, 2, 1, 1, 0, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true},{"category":"Kitchen","type":"Range","name":"Stove (default)","isDefault":true},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true}]', 'Independent editable set for Elm and Colborne units.');

-- 5. Task 2: Remove 505 Days Pool
DELETE FROM `building` WHERE `id` = 13 OR `name` LIKE '%505 Days Pool%';

-- 6. Task 1: Backfill complex_id on properties (building table)
-- Reset all to NULL (Ungrouped)
UPDATE `building` SET `complex_id` = NULL;

-- BD Complex (id = 1): 1719, 1721, 1723, 1725, 1727, 1731, 1733, 1737 Bath Rd and 505, 507, 509, 511 Days Rd
UPDATE `building` SET `complex_id` = 1 WHERE `id` IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15, 16);

-- Elm + Colborne (id = 2): 18 Elm St, 24 Elm St, 203 Colborne St
UPDATE `building` SET `complex_id` = 2 WHERE `id` IN (78, 79, 80);

-- Flag 511 Days Rd as storage node in BD complex
UPDATE `building` SET `comments` = 'Attached pair with 509 Days Rd, SHARED mechanical room. Complex storage node in 511 basement. Storage building.' WHERE `id` = 15;

-- 7. Seed 18 Elm St Units (base numbers 101–414 across 4 floors, including unit 411)
DELETE FROM `unit` WHERE `building_id` = 78;
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`) VALUES
  (78, '101', 'First Floor', '18 Elm St residential unit'),
  (78, '102', 'First Floor', '18 Elm St residential unit'),
  (78, '103', 'First Floor', '18 Elm St residential unit'),
  (78, '104', 'First Floor', '18 Elm St residential unit'),
  (78, '105', 'First Floor', '18 Elm St residential unit'),
  (78, '106', 'First Floor', '18 Elm St residential unit'),
  (78, '107', 'First Floor', '18 Elm St residential unit'),
  (78, '108', 'First Floor', '18 Elm St residential unit'),
  (78, '109', 'First Floor', '18 Elm St residential unit'),
  (78, '110', 'First Floor', '18 Elm St residential unit'),
  (78, '111', 'First Floor', '18 Elm St residential unit'),
  (78, '112', 'First Floor', '18 Elm St residential unit'),
  (78, '113', 'First Floor', '18 Elm St residential unit'),
  (78, '114', 'First Floor', '18 Elm St residential unit'),
  (78, '201', 'Second Floor', '18 Elm St residential unit'),
  (78, '202', 'Second Floor', '18 Elm St residential unit'),
  (78, '203', 'Second Floor', '18 Elm St residential unit'),
  (78, '204', 'Second Floor', '18 Elm St residential unit'),
  (78, '205', 'Second Floor', '18 Elm St residential unit'),
  (78, '206', 'Second Floor', '18 Elm St residential unit'),
  (78, '207', 'Second Floor', '18 Elm St residential unit'),
  (78, '208', 'Second Floor', '18 Elm St residential unit'),
  (78, '209', 'Second Floor', '18 Elm St residential unit'),
  (78, '210', 'Second Floor', '18 Elm St residential unit'),
  (78, '211', 'Second Floor', '18 Elm St residential unit'),
  (78, '212', 'Second Floor', '18 Elm St residential unit'),
  (78, '213', 'Second Floor', '18 Elm St residential unit'),
  (78, '214', 'Second Floor', '18 Elm St residential unit'),
  (78, '301', 'Third Floor', '18 Elm St residential unit'),
  (78, '302', 'Third Floor', '18 Elm St residential unit'),
  (78, '303', 'Third Floor', '18 Elm St residential unit'),
  (78, '304', 'Third Floor', '18 Elm St residential unit'),
  (78, '305', 'Third Floor', '18 Elm St residential unit'),
  (78, '306', 'Third Floor', '18 Elm St residential unit'),
  (78, '307', 'Third Floor', '18 Elm St residential unit'),
  (78, '308', 'Third Floor', '18 Elm St residential unit'),
  (78, '309', 'Third Floor', '18 Elm St residential unit'),
  (78, '310', 'Third Floor', '18 Elm St residential unit'),
  (78, '311', 'Third Floor', '18 Elm St residential unit'),
  (78, '312', 'Third Floor', '18 Elm St residential unit'),
  (78, '313', 'Third Floor', '18 Elm St residential unit'),
  (78, '314', 'Third Floor', '18 Elm St residential unit'),
  (78, '401', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '402', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '403', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '404', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '405', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '406', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '407', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '408', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '409', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '410', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '411', 'Fourth Floor', '18 Elm St unit 411 (base unit)'),
  (78, '412', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '413', 'Fourth Floor', '18 Elm St residential unit'),
  (78, '414', 'Fourth Floor', '18 Elm St residential unit');

SET FOREIGN_KEY_CHECKS = 1;
