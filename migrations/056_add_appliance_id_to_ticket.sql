-- Migration 056: Add appliance_id column to ticket table and index
-- Explicit linkage from a ticket to the specific appliance serviced.
-- NULLABLE: tickets without an appliance remain completely valid.

ALTER TABLE `ticket`
  ADD COLUMN `appliance_id` BIGINT UNSIGNED NULL AFTER `unit_id`;

CREATE INDEX `idx_ticket_appliance_id` ON `ticket` (`appliance_id`);
