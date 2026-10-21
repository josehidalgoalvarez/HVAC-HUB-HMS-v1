-- Migration 015: Complete Complex Grouping and Enriched Default Sets
-- Defines all 8 portfolio complexes: BD, Amherst, Manitou, Princess, Victoria, Alfred, Frontenac, Elm + Colborne.
-- Backfills real complex_id on all buildings across all 8 complexes.
-- Ungrouped contains strictly the 9 true singles and 1 office (10 entries total).
-- Enriches default_sets with full technical specification templates.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Insert the remaining 6 Complexes into complexes table
DELETE FROM `complexes` WHERE `id` >= 3 OR `slug` IN ('amherst', 'princess', 'victoria', 'alfred', 'frontenac', 'manitou');

INSERT INTO `complexes` (`id`, `name`, `slug`, `notes`) VALUES
  (3, 'Amherst', 'amherst', 'Long row of 43 apartment buildings in Amherstview, ON (odd numbers 107–229).'),
  (4, 'Princess', 'princess', 'Princess Street multi-unit properties in Kingston, ON.'),
  (5, 'Victoria', 'victoria', 'Victoria Street residential properties in Kingston, ON.'),
  (6, 'Alfred', 'alfred', 'Alfred Street residential multi-unit cluster in Kingston, ON.'),
  (7, 'Frontenac', 'frontenac', 'Frontenac Street residential properties in Kingston, ON.'),
  (8, 'Manitou', 'manitou', 'Manitou Crescent townhouse row (1–58 Manitou Cres, anchored by 77 Manitou Cres).');

-- 2. Backfill building complex_id assignments

-- BD Complex (id = 1): 12 buildings (Bath Road & Days Road)
UPDATE `building` SET `complex_id` = 1 WHERE `id` IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15, 16);

-- Elm + Colborne (id = 2): 3 buildings
UPDATE `building` SET `complex_id` = 2 WHERE `id` IN (78, 79, 80);

-- Amherst (id = 3): 43 buildings (10, 17 through 58)
UPDATE `building` SET `complex_id` = 3 WHERE `id` = 10 OR (`id` >= 17 AND `id` <= 58);

-- Princess (id = 4): 7 buildings (59 through 65)
UPDATE `building` SET `complex_id` = 4 WHERE `id` >= 59 AND `id` <= 65;

-- Victoria (id = 5): 4 buildings (66 through 69)
UPDATE `building` SET `complex_id` = 5 WHERE `id` >= 66 AND `id` <= 69;

-- Alfred (id = 6): 6 buildings (70 through 75)
UPDATE `building` SET `complex_id` = 6 WHERE `id` >= 70 AND `id` <= 75;

-- Frontenac (id = 7): 2 buildings (76, 77)
UPDATE `building` SET `complex_id` = 7 WHERE `id` IN (76, 77);

-- Manitou (id = 8): 1 building entry (81)
UPDATE `building` SET `complex_id` = 8 WHERE `id` = 81;

-- Ungrouped (NULL complex_id): 9 singles (11, 12, 82, 83, 84, 85, 86, 87, 88) + 1 office (89)
UPDATE `building` SET `complex_id` = NULL WHERE `id` IN (11, 12, 82, 83, 84, 85, 86, 87, 88, 89);

-- 3. Update default_sets with enriched specs
UPDATE `default_sets` SET `appliances_json` = '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]' WHERE `id` = 'set-bd-apt';

UPDATE `default_sets` SET `appliances_json` = '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]' WHERE `id` = 'set-bd-apt-1bed';

UPDATE `default_sets` SET `appliances_json` = '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}},{"category":"Water Heating","type":"Heater","name":"Unit Water Heater (default)","isDefault":true,"specs":{"fuelType":"Electric","btuInput":"4500W","capacity":"60 Gallons","volts":"240"}}]' WHERE `id` = 'set-bd-townhouse';

UPDATE `default_sets` SET `appliances_json` = '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric"}},{"category":"Kitchen","type":"Ventilation","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]' WHERE `id` = 'set-elm-apt';

SET FOREIGN_KEY_CHECKS = 1;
