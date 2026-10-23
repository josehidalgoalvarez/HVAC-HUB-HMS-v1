-- Migration 022: Verified Princess Trio Unit Rosters from Yardi Extract (2026-10-22)
-- Replaces pattern-generated units for 563, 565, and 567 Princess St with verified rosters:
-- 563 Princess (ID 59): 23 units (1, 101-103, 201-204, 301-304, 401-404, 501-504, 601, 603, 604; no 602)
-- 565 Princess (ID 60): 1 unit ('1')
-- 567 Princess (ID 61): 1 unit ('1')
-- Trio Total: 25 units

-- 1. Update site notes on all three buildings
UPDATE `building` SET
  `comments` = 'Part of the 563/565/567 Princess site — displayed building number is 565. Yardi letter suffixes are rooms inside the unit.'
WHERE `id` IN (59, 60, 61);

-- 2. Seed Princess Apartment Default Set
INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ('set-princess-apt', 'princess', 4, 'Princess / Apartment (default)', 'apartment', 1, 2, 1, 1, 0, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Range Hood","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]', 'Princess Street multi-unit apartment default specification.');

-- 3. Purge old pattern units for Princess trio buildings (59, 60, 61)
DELETE FROM `unit` WHERE `building_id` IN (59, 60, 61);

-- 4. Insert Verified Units (25 units total)
-- 563 Princess St (ID 59) — 23 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (59, "1", "First Floor", "House-style unit (Yardi 563-1)", "verified — Yardi extract 2026-10-22"),
  (59, "101", "First Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "102", "First Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "103", "First Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "201", "Second Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "202", "Second Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "203", "Second Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "204", "Second Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "301", "Third Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "302", "Third Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "303", "Third Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "304", "Third Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "401", "Fourth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "402", "Fourth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "403", "Fourth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "404", "Fourth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "501", "Fifth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "502", "Fifth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "503", "Fifth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "504", "Fifth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "601", "Sixth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "603", "Sixth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (59, "604", "Sixth Floor", "Part of 563/565/567 Princess site (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22");

-- 565 Princess St (ID 60) — 1 unit
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (60, "1", "First Floor", "House unit (Yardi 565-1)", "verified — Yardi extract 2026-10-22");

-- 567 Princess St (ID 61) — 1 unit
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (61, "1", "First Floor", "House unit (Yardi 567-1)", "verified — Yardi extract 2026-10-22");
