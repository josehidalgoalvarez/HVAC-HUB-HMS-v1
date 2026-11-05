-- Migration 052: Add blocked_reason column to ticket table and sync with blocker_reason
-- The existing column was named `blocker_reason`. To support strict `blocked_reason`
-- naming per the specification while maintaining full backward compatibility,
-- we add `blocked_reason` and initialize it from `blocker_reason`.

ALTER TABLE `ticket`
  ADD COLUMN `blocked_reason` TEXT NULL AFTER `blocker_reason`;

UPDATE `ticket`
  SET `blocked_reason` = `blocker_reason`
  WHERE `blocker_reason` IS NOT NULL;
