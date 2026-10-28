-- Migration 043: Stored-appliance locations and movement history
-- Adds stockpile_id to appliance table for appliances kept in storage areas (not in a unit).
-- Creates appliance_movement table for append-only audit trail when stored appliances move.

-- 1. Guarded ALTER TABLE for appliance.stockpile_id
SET @dbname = DATABASE();
SET @tablename = 'appliance';
SET @columnname = 'stockpile_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE `appliance` ADD COLUMN `stockpile_id` BIGINT UNSIGNED NULL AFTER `unit_id`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Create appliance_movement table for append-only movement history
CREATE TABLE IF NOT EXISTS `appliance_movement` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `appliance_id` BIGINT UNSIGNED NOT NULL,
  `from_stockpile_id` BIGINT UNSIGNED NULL,
  `from_unit_id` BIGINT UNSIGNED NULL,
  `to_stockpile_id` BIGINT UNSIGNED NULL,
  `to_unit_id` BIGINT UNSIGNED NULL,
  `disposition` VARCHAR(50) NOT NULL DEFAULT 'stored', -- 'stored', 'installed', 'harvested', 'disposed'
  `movement_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ticket_id` BIGINT UNSIGNED NULL,
  `moved_by` VARCHAR(100) NOT NULL DEFAULT 'Tech',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appliance_movement_appliance` (`appliance_id`),
  KEY `idx_appliance_movement_from_sp` (`from_stockpile_id`),
  KEY `idx_appliance_movement_to_sp` (`to_stockpile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
