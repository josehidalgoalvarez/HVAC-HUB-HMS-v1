-- Migration 017: Verified Amherst Unit Rosters from Yardi Extract (2026-10-22)
-- Replaces pattern-generated Amherst unit rosters with exact Yardi verified rosters (208 units across 44 buildings).

-- 1. Ensure building 90 exists for 103 Amherst Drive (Twin of 107)
INSERT OR REPLACE INTO `building` (`id`, `name`, `address`, `comments`, `complex_id`, `status`, `is_3d_ready`)
VALUES (90, "103 Amherst Drive", "103 Amherst Dr, Amherstview, ON", "Floor 1 skips 105 (utility/laundry space). Twin building of 107 Amherst. Non-residential space: UTILITY.", 3, "active", 0);

-- 2. Update building notes for 107 and 125 Amherst
UPDATE `building` SET `comments` = "Floor 1 skips 105 (utility/laundry space). Storage node for Amherst complex (supplies, tools, 2 white coil stoves)." WHERE `id` = 58;
UPDATE `building` SET `comments` = "Amherst Townhouse building in the time tracking system." WHERE `id` = 53;

-- 3. Update complex notes for Amherst
UPDATE `complexes` SET `notes` = "Long row of 44 apartment buildings in Amherstview, ON (odd numbers 103–229)." WHERE `id` = 3;

-- 4. Add default sets for Amherst
INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ("set-amherst-apt", "amherst", 3, "Apartment (default)", "apartment", 1, 2, 1, 1, 0, "[{\"category\":\"Kitchen\",\"type\":\"Refrigerator\",\"name\":\"Fridge (default)\",\"isDefault\":true,\"specs\":{\"capacity\":\"18 cu. ft.\",\"volts\":\"120\",\"fuelType\":\"Electric\"}},{\"category\":\"Kitchen\",\"type\":\"Range\",\"name\":\"Stove (electric coil) (default)\",\"isDefault\":true,\"specs\":{\"fuelType\":\"Electric\",\"volts\":\"240\",\"capacity\":\"5.3 cu. ft.\"}},{\"category\":\"Kitchen\",\"type\":\"Dishwasher\",\"name\":\"Dishwasher (default)\",\"isDefault\":true,\"specs\":{\"volts\":\"120\",\"capacity\":\"14 Place Settings\",\"fuelType\":\"Electric\"}},{\"category\":\"Kitchen\",\"type\":\"Ventilation\",\"name\":\"Range Hood (default)\",\"isDefault\":true,\"specs\":{\"volts\":\"120\",\"fuelType\":\"Electric\",\"capacity\":\"300 CFM\"}}]", "Amherst apartment default specification");

INSERT OR REPLACE INTO `default_sets` (`id`, `complex_slug`, `complex_id`, `name`, `unit_type`, `is_default`, `bedrooms`, `bathrooms`, `stories`, `has_unit_water_heater`, `appliances_json`, `notes`)
VALUES ("set-amherst-townhouse", "amherst", 3, "Townhouse", "townhouse", 1, 3, 2, 3, 1, "[{\"category\":\"Kitchen\",\"type\":\"Refrigerator\",\"name\":\"Fridge (default)\",\"isDefault\":true,\"specs\":{\"capacity\":\"18 cu. ft.\",\"volts\":\"120\",\"fuelType\":\"Electric\"}},{\"category\":\"Kitchen\",\"type\":\"Range\",\"name\":\"Stove (default)\",\"isDefault\":true,\"specs\":{\"fuelType\":\"Electric\",\"volts\":\"240\",\"capacity\":\"5.3 cu. ft.\"}},{\"category\":\"Kitchen\",\"type\":\"Dishwasher\",\"name\":\"Dishwasher (default)\",\"isDefault\":true,\"specs\":{\"volts\":\"120\",\"capacity\":\"14 Place Settings\",\"fuelType\":\"Electric\"}},{\"category\":\"Kitchen\",\"type\":\"Ventilation\",\"name\":\"Range Hood (default)\",\"isDefault\":true,\"specs\":{\"volts\":\"120\",\"fuelType\":\"Electric\",\"capacity\":\"300 CFM\"}},{\"category\":\"Water Heating\",\"type\":\"Heater\",\"name\":\"Unit Water Heater (default)\",\"isDefault\":true,\"specs\":{\"fuelType\":\"Electric\",\"btuInput\":\"4500W\",\"capacity\":\"60 Gallons\",\"volts\":\"240\"}}]", "Amherst townhouse default specification (dedicated water heater)");

-- 5. Remove old Amherst units
DELETE FROM `unit` WHERE `building_id` IN (90, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48, 10, 47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17);

-- Building 107 Amherst (ID 58) - 35 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (58, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "104", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "106", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "107", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "108", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "109", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "110", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "111", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "112", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "203", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "204", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "205", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "206", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "207", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "208", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "209", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "210", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "211", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "212", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "303", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "304", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "305", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "306", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "307", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "308", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "309", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "310", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "311", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (58, "312", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 103 Amherst (ID 90) - 35 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (90, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "104", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "106", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "107", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "108", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "109", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "110", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "111", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "112", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "203", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "204", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "205", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "206", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "207", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "208", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "209", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "210", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "211", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "212", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "303", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "304", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "305", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "306", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "307", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "308", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "309", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "310", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "311", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (90, "312", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 111 Amherst 3-2-2 (ID 57) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (57, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (57, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (57, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (57, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (57, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (57, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (57, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 115 Amherst 3-2-2 (ID 56) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (56, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (56, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (56, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (56, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (56, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (56, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (56, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 119 Amherst 3-2-2 (ID 55) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (55, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (55, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (55, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (55, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (55, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (55, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (55, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 141 Amherst 3-2-2 (ID 47) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (47, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (47, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (47, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (47, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (47, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (47, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (47, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 145 Amherst 3-2-2 (ID 46) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (46, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (46, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (46, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (46, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (46, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (46, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (46, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 149 Amherst 3-2-2 (ID 45) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (45, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (45, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (45, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (45, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (45, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (45, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (45, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 153 Amherst 3-2-2 (ID 44) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (44, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (44, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (44, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (44, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (44, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (44, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (44, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 157 Amherst 3-2-2 (ID 43) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (43, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (43, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (43, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (43, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (43, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (43, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (43, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 161 Amherst 3-2-2 (ID 42) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (42, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (42, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (42, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (42, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (42, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (42, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (42, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 183 Amherst 3-2-2 (ID 33) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (33, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (33, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (33, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (33, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (33, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (33, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (33, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 187 Amherst 3-2-2 (ID 32) - 7 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (32, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (32, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (32, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (32, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (32, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (32, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (32, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 225 Amherst 4x4 (ID 18) - 16 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (18, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "104", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "203", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "204", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "303", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "304", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "401", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "402", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "403", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (18, "404", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- Building 229 Amherst 4x4 (ID 17) - 16 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (17, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "104", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "203", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "204", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "303", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "304", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "401", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "402", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "403", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (17, "404", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- 29 Amherst Townhouses - 1 unit each
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (54, "123", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (53, "125", "Multi-Floor Townhouse", "Amherst Townhouse verified unit", "verified — Yardi extract 2026-10-22"),
  (52, "127", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (51, "129", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (50, "131", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (49, "133", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (48, "135", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (10, "137", "Multi-Floor Townhouse", "Verified unit with Frigidaire range and Rheem water heater (WO on hold)", "verified — Yardi extract 2026-10-22"),
  (41, "165", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (40, "167", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (39, "169", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (38, "171", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (37, "173", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (36, "175", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (35, "177", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (34, "179", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (31, "191", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (30, "193", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (29, "195", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (28, "197", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (27, "199", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (26, "201", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (25, "205", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (24, "207", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (23, "209", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (22, "211", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (21, "213", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (20, "217", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (19, "219", "Multi-Floor Townhouse", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- 6. Re-anchor verified appliances at 137 Amherst (building 10) to unit 137
UPDATE `appliance` SET `unit_id` = (SELECT `id` FROM `unit` WHERE `building_id` = 10 AND `unit_number` = "137") WHERE `building_id` = 10;
