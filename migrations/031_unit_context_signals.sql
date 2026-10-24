-- Migration 031: Unit Context Signals (Renovated, Move-In, Vacancy)
-- Signals management weighs when deciding repair priority (Jose, Oct 20-22, 2026).
-- All fields are nullable; unknown stays empty; every unit starts unknown.

ALTER TABLE `unit` ADD COLUMN `renovated` INTEGER NULL;
ALTER TABLE `unit` ADD COLUMN `renovated_date` TEXT NULL;
ALTER TABLE `unit` ADD COLUMN `move_in_date` TEXT NULL;
ALTER TABLE `unit` ADD COLUMN `occupancy_status` TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE `unit` ADD COLUMN `vacant_since` TEXT NULL;
