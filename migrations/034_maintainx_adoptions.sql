-- Migration 034: MaintainX Adoptions (External IDs, Stockpile Minimums, Low-Stock Watches, Generalized Stock Transfers)

-- 1. Add external_id column to building, unit, and appliance
ALTER TABLE `building` ADD COLUMN `external_id` VARCHAR(100) NULL;
ALTER TABLE `unit` ADD COLUMN `external_id` VARCHAR(100) NULL;
ALTER TABLE `appliance` ADD COLUMN `external_id` VARCHAR(100) NULL;

-- 2. Add minimum column to part_stockpile for per-location minimums
ALTER TABLE `part_stockpile` ADD COLUMN `minimum` INT NOT NULL DEFAULT 1;

-- 3. Populate verified building external_id values from Yardi integration record
-- Bath Road (bd17xx)
UPDATE `building` SET `external_id` = 'bd1719' WHERE `name` = '1719 Bath Road';
UPDATE `building` SET `external_id` = 'bd1721' WHERE `name` = '1721 Bath Road';
UPDATE `building` SET `external_id` = 'bd1723' WHERE `name` = '1723 Bath Road';
UPDATE `building` SET `external_id` = 'bd1725' WHERE `name` = '1725 Bath Road';
UPDATE `building` SET `external_id` = 'bd1727' WHERE `name` = '1727 Bath Road';
UPDATE `building` SET `external_id` = 'bd1731' WHERE `name` = '1731 Bath Road';
UPDATE `building` SET `external_id` = 'bd1733' WHERE `name` = '1733 Bath Road';
UPDATE `building` SET `external_id` = 'bd1737' WHERE `name` = '1737 Bath Road';

-- Days Road (bd05xx)
UPDATE `building` SET `external_id` = 'bd0505' WHERE `name` = '505 Days Road';
UPDATE `building` SET `external_id` = 'bd0507' WHERE `name` = '507 Days Road';
UPDATE `building` SET `external_id` = 'bd0509' WHERE `name` = '509 Days Road';
UPDATE `building` SET `external_id` = 'bd0511' WHERE `name` = '511 Days Road';

-- Princess Street (800prin)
UPDATE `building` SET `external_id` = '800prin' WHERE `id` = 94;

-- Alfred Street duplicate-code pairs
UPDATE `building` SET `external_id` = '378alfr,alfr378' WHERE `id` = 74;
UPDATE `building` SET `external_id` = '394alfr,alfr394' WHERE `id` = 75;

-- Le Santé (300skyf,sante)
UPDATE `building` SET `external_id` = '300skyf,sante' WHERE `id` = 96;

-- Manitou Crescent (mn77a verified Yardi code)
UPDATE `building` SET `external_id` = 'mn77a' WHERE `id` = 91;

-- 4. Set initial per-location minimums on seeded part_stockpile rows
UPDATE `part_stockpile` SET `minimum` = 3 WHERE `part_id` = 1 AND `stockpile_id` = 1; -- 2 available < 3 minimum -> low-stock signal!
UPDATE `part_stockpile` SET `minimum` = 1 WHERE `minimum` < 1;
