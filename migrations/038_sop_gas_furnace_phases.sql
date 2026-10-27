-- 038: Group the gas-furnace procedure steps into the six phases from Jose's SOP page.
-- Adds sop_step.phase and sets it for sop-gas-furnace-service by step position. Migrations 033
-- and 037 are history and are not edited. No sop_run table is touched.

ALTER TABLE `sop_step` ADD COLUMN `phase` TEXT NULL;

UPDATE `sop_step` SET `phase` = 'Phase I: Pre-Service Assessment & Safety Shutdown' WHERE `sop_id` = 'sop-gas-furnace-service' AND `position` BETWEEN 1 AND 10;
UPDATE `sop_step` SET `phase` = 'Phase II: Disassembly & Initial Inspection' WHERE `sop_id` = 'sop-gas-furnace-service' AND `position` BETWEEN 11 AND 22;
UPDATE `sop_step` SET `phase` = 'Phase III: Cleaning & Maintenance' WHERE `sop_id` = 'sop-gas-furnace-service' AND `position` BETWEEN 23 AND 33;
UPDATE `sop_step` SET `phase` = 'Phase IV: Reassembly & Gap Verification' WHERE `sop_id` = 'sop-gas-furnace-service' AND `position` BETWEEN 34 AND 44;
UPDATE `sop_step` SET `phase` = 'Phase V: Startup & Commissioning' WHERE `sop_id` = 'sop-gas-furnace-service' AND `position` BETWEEN 45 AND 62;
UPDATE `sop_step` SET `phase` = 'Phase VI: Final Inspection & Customer Handoff' WHERE `sop_id` = 'sop-gas-furnace-service' AND `position` BETWEEN 63 AND 74;
