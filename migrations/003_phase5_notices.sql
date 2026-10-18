-- Migration 003: Phase 5 Notice of Entry Tracking & 24-Hour Legal Gate
-- Adds ticket linkage, 4-state workflow, entry window, serve-by deadline, and transition timestamps

ALTER TABLE `notice`
  ADD COLUMN `ticket_id` BIGINT UNSIGNED NULL AFTER `id`,
  ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'drafted' AFTER `content`,
  ADD COLUMN `entry_start` DATETIME NULL AFTER `entry_date`,
  ADD COLUMN `entry_end` DATETIME NULL AFTER `entry_start`,
  ADD COLUMN `serve_by_deadline` DATETIME NULL AFTER `entry_end`,
  ADD COLUMN `drafted_at` DATETIME NULL AFTER `serve_by_deadline`,
  ADD COLUMN `sent_at` DATETIME NULL AFTER `drafted_at`,
  ADD COLUMN `served_at` DATETIME NULL AFTER `sent_at`,
  ADD COLUMN `verified_at` DATETIME NULL AFTER `served_at`,
  ADD COLUMN `served_method` VARCHAR(100) NULL AFTER `verified_at`,
  ADD COLUMN `verified_by_user_id` BIGINT UNSIGNED NULL AFTER `served_method`;

-- Indexes for performance and gate status lookups
CREATE INDEX `idx_notice_ticket_id` ON `notice` (`ticket_id`);
CREATE INDEX `idx_notice_status_deadline` ON `notice` (`status`, `serve_by_deadline`);
CREATE INDEX `idx_notice_entry_start` ON `notice` (`entry_start`);
