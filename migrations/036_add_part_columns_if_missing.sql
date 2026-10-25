-- Migration 036: Add missing part columns if created via 001_initial_schema
ALTER TABLE `part`
  ADD COLUMN `reorder_point` INT NOT NULL DEFAULT 1 AFTER `min_quantity`,
  ADD COLUMN `compatible_models` JSON NULL AFTER `unit_cost`,
  ADD COLUMN `price_history` JSON NULL AFTER `compatible_models`,
  ADD COLUMN `stockpile_id` BIGINT UNSIGNED NULL AFTER `price_history`,
  ADD COLUMN `preferred_supplier_id` BIGINT UNSIGNED NULL AFTER `stockpile_id`,
  ADD COLUMN `is_reorder` TINYINT(1) NOT NULL DEFAULT 0 AFTER `preferred_supplier_id`;
