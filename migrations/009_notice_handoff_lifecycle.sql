-- Migration 009: Notice Handoff Lifecycle (Batch A)
-- Adds handed_off_at, scheduled_at, and handed_off_to to support the 4-state handoff workflow:
-- draft -> handed_off -> sent -> scheduled

ALTER TABLE `notice`
  ADD `handed_off_at` DATETIME NULL,
  ADD `scheduled_at` DATETIME NULL,
  ADD `handed_off_to` VARCHAR(150) NULL;
