-- Migration 020: Verified Alfred Unit Rosters from Yardi Extract (2026-10-22)
-- Replaces pattern-generated units for the 6 Alfred St buildings with verified rosters:
-- 353 Alfred: 3 units ('1', '2', '3')
-- 359 Alfred: 1 unit ('359')
-- 361 Alfred: 1 unit ('1')
-- 376 Alfred: 1 unit ('376')
-- 378 Alfred: 1 unit ('378'; duplicate records: 378alfr, alfr378)
-- 394 Alfred: 7 units ('1'..'7'; quadrant main storage; codes: 394alfr, alfr394)
-- Total Alfred complex units: 14 units

-- 1. Ensure external_ids and yardi_codes columns exist on building table
ALTER TABLE `building` ADD COLUMN `external_ids` TEXT NULL;
ALTER TABLE `building` ADD COLUMN `yardi_codes` TEXT NULL;

-- 2. Update building notes, storage role, and external IDs
UPDATE `building` SET
  `comments` = 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units.'
WHERE `id` = 70;

UPDATE `building` SET
  `comments` = 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units. Single-unit house (Yardi base entry is address itself).'
WHERE `id` = 71;

UPDATE `building` SET
  `comments` = 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units.'
WHERE `id` = 72;

UPDATE `building` SET
  `comments` = 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units.'
WHERE `id` = 73;

UPDATE `building` SET
  `comments` = 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units. Duplicate records in Yardi, one building. Yardi codes: 378alfr, alfr378.',
  `external_ids` = '378alfr,alfr378',
  `yardi_codes` = '378alfr,alfr378'
WHERE `id` = 74;

UPDATE `building` SET
  `comments` = 'Converted house. Yardi letter suffixes are rooms inside the apartment, not units. Quadrant main storage node. Yardi codes: 394alfr, alfr394.',
  `external_ids` = '394alfr,alfr394',
  `yardi_codes` = '394alfr,alfr394'
WHERE `id` = 75;

-- 3. Seed Quadrant Apartment Default Set
INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ('set-quadrant-apt', 'alfred', 6, 'Quadrant Apartment (default)', 'apartment', 1, 2, 1, 1, 0, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]', 'Quadrant converted house apartment default specification (Princess, Victoria, Alfred, Frontenac).');

-- 4. Purge old pattern units for Alfred buildings
DELETE FROM `unit` WHERE `building_id` IN (70, 71, 72, 73, 74, 75);

-- 5. Insert Verified Units (14 units total)
-- 353 Alfred Street (ID 70) - 3 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (70, "1", "First Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (70, "2", "Second Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (70, "3", "Third Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22");

-- 359 Alfred Street (ID 71) - 1 unit
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (71, "359", "Main Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22");

-- 361 Alfred Street (ID 72) - 1 unit
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (72, "1", "Main Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22");

-- 376 Alfred Street (ID 73) - 1 unit
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (73, "376", "Main Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22");

-- 378 Alfred Street (ID 74) - 1 unit
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (74, "378", "Main Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22");

-- 394 Alfred Street (ID 75) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (75, "1", "First Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (75, "2", "First Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (75, "3", "First Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (75, "4", "Second Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (75, "5", "Second Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (75, "6", "Third Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (75, "7", "Third Floor", "Converted house apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22");
