-- Migration 021: Verified Frontenac Unit Rosters from Yardi Extract (2026-10-22)
-- Replaces pattern-generated units for 501 Frontenac St with verified roster (101 units):
-- Floor 1 (17): 101-107, 111-120 (no 108, 109, 110)
-- Floor 2 (21): 201–221
-- Floor 3 (21): 301–321
-- Floor 4 (21): 401–421
-- Floor 5 (21): 501–516, 519–523 (no 517, 518)
-- Total 501 Frontenac units: 101 units

-- 1. Ensure aliases column exists on building table, and ownership column exists on unit table
ALTER TABLE `building` ADD COLUMN `aliases` TEXT NULL;
ALTER TABLE `unit` ADD COLUMN `ownership` TEXT NOT NULL DEFAULT 'patry';

-- 2. Update building record for 501 Frontenac St (ID 76)
UPDATE `building` SET
  `name` = '501 Frontenac St',
  `address` = '495 Frontenac Street, Kingston, ON',
  `aliases` = '495 Frontenac Street, The Frontenac',
  `comments` = 'Frontenac condos — single condo building, MIXED OWNERSHIP: some units belong to other companies, not Patry/Kenlar. Yardi letter suffixes (B/C/D/P) are rooms/spaces inside the apartment, not units.'
WHERE `id` = 76;

-- 3. Seed Frontenac Condo Default Appliance Set
INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ('set-frontenac-condo', 'frontenac', 7, 'Frontenac / Condo (default)', 'apartment', 1, 2, 1, 1, 0, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Range Hood","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]', 'Frontenac single condo building default specification.');

-- 4. Purge old pattern units for 501 Frontenac (ID 76)
DELETE FROM `unit` WHERE `building_id` = 76;

-- 5. Insert 101 Verified Units
-- Floor 1 (17 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`, `ownership`) VALUES
  (76, "101", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "102", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "103", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "104", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "105", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "106", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "107", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "111", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "112", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "113", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "114", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "115", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "116", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "117", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "118", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "119", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "120", "First Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry");

-- Floor 2 (21 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`, `ownership`) VALUES
  (76, "201", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "202", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "203", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "204", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "205", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "206", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "207", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "208", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "209", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "210", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "211", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "212", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "213", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "214", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "215", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "216", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "217", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "218", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "219", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "220", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "221", "Second Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry");

-- Floor 3 (21 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`, `ownership`) VALUES
  (76, "301", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "302", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "303", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "304", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "305", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "306", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "307", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "308", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "309", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "310", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "311", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "312", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "313", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "314", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "315", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "316", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "317", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "318", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "319", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "320", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "321", "Third Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry");

-- Floor 4 (21 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`, `ownership`) VALUES
  (76, "401", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "402", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "403", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "404", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "405", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "406", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "407", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "408", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "409", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "410", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "411", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "412", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "413", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "414", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "415", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "416", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "417", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "418", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "419", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "420", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "421", "Fourth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry");

-- Floor 5 (21 units: 501-516, 519-523)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`, `ownership`) VALUES
  (76, "501", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "502", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "503", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "504", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "505", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "506", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "507", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "508", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "509", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "510", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "511", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "512", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "513", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "514", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "515", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "516", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "519", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "520", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "521", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "522", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry"),
  (76, "523", "Fifth Floor", "Frontenac condo apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22", "patry");
