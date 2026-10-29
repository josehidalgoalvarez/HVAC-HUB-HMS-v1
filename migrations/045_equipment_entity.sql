-- Migration 045: Equipment entity table
-- Provides a first-class home for tools/equipment (key machines, power tools, ladders, vacs, saws, telehandlers)
-- which fit neither consumable parts nor installed appliances.

CREATE TABLE IF NOT EXISTS `equipment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NULL,
  `stockpile_id` BIGINT UNSIGNED NULL,
  `status` ENUM('available', 'needs_service', 'out_of_service', 'unknown') NOT NULL DEFAULT 'unknown',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_equipment_stockpile_id` (`stockpile_id`),
  KEY `idx_equipment_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
