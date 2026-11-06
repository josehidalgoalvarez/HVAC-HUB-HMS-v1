-- Migration 054: Add closed_by_party column to ticket table
-- Records the specific completing party when a ticket is closed elsewhere:
-- 'third-party', 'contractor', 'handoff', 'coworker', or NULL for older records.

ALTER TABLE `ticket`
  ADD COLUMN `closed_by_party` VARCHAR(50) NULL AFTER `blocked_at`;
