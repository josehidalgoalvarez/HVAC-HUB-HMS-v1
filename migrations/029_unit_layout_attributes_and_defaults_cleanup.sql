-- Migration 029: Unit Layout Attributes and Appliance Defaults Cleanup
-- 1. Add layout attributes to unit table: bedrooms, washrooms, storeys (all nullable)
-- 2. Collapse BD apartments to single set: repoint any units from set-bd-apt-1bed to set-bd-apt and delete set-bd-apt-1bed
-- 3. Apply known layout defaults:
--    - Elm buildings (18 Elm [ID 78], 24 Elm [ID 79]): storeys = 1, washrooms = 1
--    - BD townhouses (1727 Bath [ID 16], 1737 Bath [ID 7], 507 Days [ID 9]): storeys = 3, washrooms = 2
--    - 203 Colborne (ID 80): notes updated, layout attributes remain NULL
-- 4. Set portfolio-typical dishwasher model Frigidaire FFCD2418US3A in standard apartment default sets (Skyfall/Le Sante uniform set untouched)

ALTER TABLE `unit` ADD COLUMN `bedrooms` INTEGER NULL;
ALTER TABLE `unit` ADD COLUMN `washrooms` INTEGER NULL;
ALTER TABLE `unit` ADD COLUMN `storeys` INTEGER NULL;

-- Repoint any legacy BD 1-bed units to single BD apartment set
UPDATE `unit` SET `default_set_id` = 'set-bd-apt' WHERE `default_set_id` = 'set-bd-apt-1bed';
DELETE FROM `default_sets` WHERE `id` = 'set-bd-apt-1bed';

-- Ensure all BD apartment units reference set-bd-apt and townhouses reference set-bd-townhouse
UPDATE `unit` SET `default_set_id` = 'set-bd-apt' WHERE `building_id` IN (1, 2, 3, 4, 5, 6, 8, 14, 15) AND (`default_set_id` IS NULL OR `default_set_id` = 'set-bd-apt-1bed');
UPDATE `unit` SET `default_set_id` = 'set-bd-townhouse' WHERE `building_id` IN (7, 9, 16) AND `default_set_id` IS NULL;
UPDATE `unit` SET `default_set_id` = 'set-elm-apt' WHERE `building_id` IN (78, 79) AND `default_set_id` IS NULL;

-- Apply known layout defaults for Elm buildings (18 Elm, 24 Elm)
UPDATE `unit` SET `storeys` = 1, `washrooms` = 1 WHERE `building_id` IN (78, 79);

-- Apply known layout defaults for BD townhouses (1727 Bath, 1737 Bath, 507 Days)
UPDATE `unit` SET `storeys` = 3, `washrooms` = 2 WHERE `building_id` IN (7, 9, 16);

-- 203 Colborne note: Layout varies per unit, leave unit attributes NULL
UPDATE `building`
SET `comments` = 'Front building facing Colborne, 18 and 24 Elm sit directly behind. Layout varies per unit (some two-storey, 1–2 washrooms) — TODO-verify per unit.'
WHERE `id` = 80;

-- Update BD apartment default set: bedrooms 2, washrooms 1, storeys 1
UPDATE `default_sets`
SET `bedrooms` = 2, `bathrooms` = 1, `stories` = 1,
    `notes` = '2 bed / 1 washroom (default). Shared laundry room appliances, shared water heaters on building/mechanical room. Per-unit bedrooms overridable via unit attribute.'
WHERE `id` = 'set-bd-apt';

-- Update standard apartment default sets with Frigidaire FFCD2418US3A dishwasher model
UPDATE `default_sets`
SET `appliances_json` = '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric","model":"Frigidaire FFCD2418US3A"}},{"category":"Kitchen","type":"Range Hood","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]'
WHERE `id` IN ('set-bd-apt', 'set-elm-apt', 'set-amherst-apt', 'set-quadrant-apt', 'set-frontenac-condo', 'set-princess-apt', 'set-singles-apt');

UPDATE `default_sets`
SET `appliances_json` = '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric","model":"Frigidaire FFCD2418US3A"}},{"category":"Kitchen","type":"Range Hood","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}},{"category":"Water Heating","type":"Water Heater","name":"Unit Water Heater (default)","isDefault":true,"specs":{"fuelType":"Electric","btuInput":"4500W","capacity":"60 Gallons","volts":"240"}}]'
WHERE `id` IN ('set-bd-townhouse', 'set-amherst-townhouse', 'set-manitou-townhouse');

UPDATE `default_sets`
SET `appliances_json` = '[{"category":"Kitchen","type":"Refrigerator","name":"Fridge (default)","isDefault":true,"specs":{"capacity":"18 cu. ft.","volts":"120","fuelType":"Electric"}},{"category":"Kitchen","type":"Range","name":"Stove (electric coil) (default)","isDefault":true,"specs":{"fuelType":"Electric","volts":"240","capacity":"5.3 cu. ft."}},{"category":"Kitchen","type":"Dishwasher","name":"Dishwasher (default)","isDefault":true,"specs":{"volts":"120","capacity":"14 Place Settings","fuelType":"Electric","model":"Frigidaire FFCD2418US3A"}},{"category":"Kitchen","type":"Range Hood","name":"Range Hood (default)","isDefault":true,"specs":{"volts":"120","fuelType":"Electric","capacity":"300 CFM"}}]'
WHERE `id` = 'set-manitou-apt';
