-- Migration 053: Add blocked_at column to ticket table for 30-day aging clock
-- Stamped when ticket transitions to status 'blocked', cleared when it leaves 'blocked'.
-- Existing blocked tickets get backfilled with their blocked transition timestamp from correction/timeline or current migration timestamp.

ALTER TABLE `ticket`
  ADD COLUMN `blocked_at` DATETIME NULL AFTER `blocked_reason`;

-- Backfill existing blocked ticket(s) from best evidence (e.g. ticket #3 blocked at 2026-11-05 23:11:24)
UPDATE `ticket`
  SET `blocked_at` = '2026-11-05 23:11:24'
  WHERE `status` = 'blocked' AND `id` = 3;

-- For any other blocked tickets without exact correction evidence, backfill with current migration timestamp
UPDATE `ticket`
  SET `blocked_at` = CURRENT_TIMESTAMP
  WHERE `status` = 'blocked' AND `blocked_at` IS NULL;
