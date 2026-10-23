-- Migration 018: Verified Manitou Unit Rosters from Yardi Extract (2026-10-22)
-- Restructures Manitou complex from single property to four buildings (88 units total):
-- 77 Manitou Cres (58 townhouses: 1–58)
-- 77A Manitou Cres (10 units: 101–104, 201–203, 301–303)
-- 77B Manitou Cres (11 units: 105–107, 204–207, 304–307)
-- 77C Manitou Cres (9 units: 108–110, 208–210, 308–310)

-- 1. Update building 81 to 77 Manitou Crescent
UPDATE `building` SET
  `name` = "77 Manitou Crescent",
  `address` = "77 Manitou Crescent, Kingston, ON",
  `comments` = "58 townhouses, units labeled 1–58 continuous. Unit type townhouse.",
  `complex_id` = 8,
  `status` = "active",
  `is_3d_ready` = 0
WHERE `id` = 81;

-- 2. Insert buildings 91, 92, 93 for 77A, 77B, 77C Manitou Crescent
INSERT OR REPLACE INTO `building` (`id`, `name`, `address`, `comments`, `complex_id`, `status`, `is_3d_ready`)
VALUES (91, "77A Manitou Crescent", "77A Manitou Crescent, Kingston, ON", "Apartment building, 10 units. Shares numbering pool with 77B and 77C (floor 1: 101–110, floor 2: 201–210, floor 3: 301–310, sliced A/B/C).", 8, "active", 0);

INSERT OR REPLACE INTO `building` (`id`, `name`, `address`, `comments`, `complex_id`, `status`, `is_3d_ready`)
VALUES (92, "77B Manitou Crescent", "77B Manitou Crescent, Kingston, ON", "Apartment building, 11 units. Shares numbering pool with 77A and 77C (floor 1: 101–110, floor 2: 201–210, floor 3: 301–310, sliced A/B/C).", 8, "active", 0);

INSERT OR REPLACE INTO `building` (`id`, `name`, `address`, `comments`, `complex_id`, `status`, `is_3d_ready`)
VALUES (93, "77C Manitou Crescent", "77C Manitou Crescent, Kingston, ON", "Apartment building, 9 units. Shares numbering pool with 77A and 77B (floor 1: 101–110, floor 2: 201–210, floor 3: 301–310, sliced A/B/C).", 8, "active", 0);

-- 3. Update complex notes and building counts
UPDATE `complexes` SET `notes` = "Manitou complex: 58 townhouses at 77 Manitou Cres + 30 apartments across 77A, 77B, 77C sharing one 3-floor numbering pool." WHERE `id` = 8;
UPDATE `complex` SET `building_count` = 4 WHERE `id` = "complex-manitou";

-- 4. Default Appliance Sets (Manitou & Amherst)
INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ('set-manitou-townhouse', 'manitou', 8, 'Townhouse', 'townhouse', 1, 3, 2, 3, 1, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}},{"category":"Water Heating","type":"Heater","name":"Unit Water Heater (default)","isDefault":true,"specs":{"fuelType":"Electric","btuInput":"4500W","capacity":"60 Gallons","volts":"240"}}]', 'Manitou townhouse default specification (dedicated water heater)');

INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ('set-manitou-apt', 'manitou', 8, 'Apartment (default)', 'apartment', 1, 2, 1, 1, 0, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]', 'Manitou apartment default specification (77A, 77B, 77C)');

INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ('set-amherst-apt', 'amherst', 3, 'Apartment (default)', 'apartment', 1, 2, 1, 1, 0, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]', 'Amherst apartment default specification');

INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ('set-amherst-townhouse', 'amherst', 3, 'Townhouse', 'townhouse', 1, 3, 2, 3, 1, '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}},{"category":"Water Heating","type":"Heater","name":"Unit Water Heater (default)","isDefault":true,"specs":{"fuelType":"Electric","btuInput":"4500W","capacity":"60 Gallons","volts":"240"}}]', 'Amherst townhouse default specification (dedicated water heater)');

-- 5. Delete old Manitou units
DELETE FROM `unit` WHERE `building_id` IN (81, 91, 92, 93);

-- 6. Insert Verified Units (88 units total)
-- 77 Manitou Crescent (ID 81): 58 townhouses (1–58)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (81, "1", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "2", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "3", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "4", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "5", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "6", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "7", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "8", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "9", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "10", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "11", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "12", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "13", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "14", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "15", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "16", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "17", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "18", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "19", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "20", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "21", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "22", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "23", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "24", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "25", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "26", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "27", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "28", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "29", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "30", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "31", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "32", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "33", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "34", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "35", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "36", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "37", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "38", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "39", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "40", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "41", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "42", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "43", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "44", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "45", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "46", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "47", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "48", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "49", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "50", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "51", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "52", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "53", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "54", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "55", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "56", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "57", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (81, "58", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- 77A Manitou Crescent (ID 91): 10 units (101–104, 201–203, 301–303)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (91, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "104", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "203", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (91, "303", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- 77B Manitou Crescent (ID 92): 11 units (105–107, 204–207, 304–307)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (92, "105", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "106", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "107", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "204", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "205", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "206", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "207", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "304", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "305", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "306", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (92, "307", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- 77C Manitou Crescent (ID 93): 9 units (108–110, 208–210, 308–310)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (93, "108", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (93, "109", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (93, "110", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (93, "208", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (93, "209", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (93, "210", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (93, "308", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (93, "309", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (93, "310", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");
