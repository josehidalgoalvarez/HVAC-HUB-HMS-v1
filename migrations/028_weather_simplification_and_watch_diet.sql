-- Migration 028: Weather Simplification and Watch Diet
-- 1. Adds work_exposure ('indoor' | 'exterior' | 'exterior_ladder') to ticket table (default 'indoor')
-- 2. Backfills work_exposure from legacy exterior_work flag
-- 3. Purges retired watch types: weather_freeze, weather_manual, notice_handoff

ALTER TABLE `ticket` ADD COLUMN `work_exposure` VARCHAR(32) NOT NULL DEFAULT 'indoor';

UPDATE `ticket` SET `work_exposure` = 'exterior' WHERE `exterior_work` = 1;

DELETE FROM `watch` WHERE `watch_type` IN ('weather_freeze', 'weather_manual', 'notice_handoff');
