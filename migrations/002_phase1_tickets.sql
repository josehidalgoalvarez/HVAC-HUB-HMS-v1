-- Migration 002: Phase 1 Ticket Domain, States, and Yardi Sightings
-- Adds Phase 1 columns: verbatim_text, verified_scope, photo_url, blocker_reason, last_seen_in_yardi
-- Supports ticket states: new, verified, in-progress, blocked, on-hold, done, closed, closed-elsewhere

ALTER TABLE `ticket`
  MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'new',
  ADD COLUMN `verbatim_text` TEXT NULL AFTER `description`,
  ADD COLUMN `verified_scope` TEXT NULL AFTER `verbatim_text`,
  ADD COLUMN `photo_url` VARCHAR(500) NULL AFTER `verified_scope`,
  ADD COLUMN `blocker_reason` TEXT NULL AFTER `photo_url`,
  ADD COLUMN `last_seen_in_yardi` DATETIME NULL AFTER `blocker_reason`;

-- Index for Yardi stale queries and state queries
CREATE INDEX `idx_ticket_last_seen_yardi` ON `ticket` (`last_seen_in_yardi`);
CREATE INDEX `idx_ticket_state_priority` ON `ticket` (`status`, `priority`);

-- Enhance yardi_sightings with ticket_id link
ALTER TABLE `yardi_sightings`
  ADD COLUMN `ticket_id` BIGINT UNSIGNED NULL AFTER `id`,
  ADD INDEX `idx_yardi_ticket_id` (`ticket_id`);
