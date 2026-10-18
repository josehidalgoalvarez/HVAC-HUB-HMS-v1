-- Migration 006: Phase 4 Parts Catalog, Stockpile Allocations, Shopping Lists, and Suppliers
-- Enhances part inventory with compatible models, price history, dynamic reorder flags, and harvest-first routing.

-- 1. Ensure supplier table has hours
CREATE TABLE IF NOT EXISTS `supplier` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `contact_name` VARCHAR(100) NULL,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(191) NULL,
  `address` VARCHAR(255) NULL,
  `hours` VARCHAR(255) NULL,
  `account_number` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Ensure stockpile table exists
CREATE TABLE IF NOT EXISTS `stockpile` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `building_id` BIGINT UNSIGNED NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stockpile_building_id` (`building_id`),
  CONSTRAINT `fk_stockpile_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ensure part table exists with all required v2 columns
CREATE TABLE IF NOT EXISTS `part` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `part_number` VARCHAR(100) NULL,
  `category` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `quantity_on_hand` INT NOT NULL DEFAULT 0,
  `min_quantity` INT NOT NULL DEFAULT 1,
  `reorder_point` INT NOT NULL DEFAULT 1,
  `unit_cost` DECIMAL(10,2) NULL,
  `compatible_models` JSON NULL,
  `price_history` JSON NULL,
  `stockpile_id` BIGINT UNSIGNED NULL,
  `preferred_supplier_id` BIGINT UNSIGNED NULL,
  `is_reorder` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_part_name` (`name`),
  KEY `idx_part_number` (`part_number`),
  KEY `idx_part_category` (`category`),
  KEY `idx_part_stockpile` (`stockpile_id`),
  KEY `idx_part_supplier` (`preferred_supplier_id`),
  CONSTRAINT `fk_part_stockpile` FOREIGN KEY (`stockpile_id`) REFERENCES `stockpile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_part_supplier` FOREIGN KEY (`preferred_supplier_id`) REFERENCES `supplier` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Multi-location stockpile tracking per part
CREATE TABLE IF NOT EXISTS `part_stockpile` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_id` BIGINT UNSIGNED NOT NULL,
  `stockpile_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'on_hold', 'in_use'
  `location_notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ps_part` (`part_id`),
  KEY `idx_ps_stockpile` (`stockpile_id`),
  CONSTRAINT `fk_ps_part` FOREIGN KEY (`part_id`) REFERENCES `part` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_stockpile` FOREIGN KEY (`stockpile_id`) REFERENCES `stockpile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Linking tickets with required parts for shopping list generation
CREATE TABLE IF NOT EXISTS `ticket_part` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` BIGINT UNSIGNED NOT NULL,
  `part_id` BIGINT UNSIGNED NULL,
  `part_number` VARCHAR(100) NULL,
  `part_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tp_ticket` (`ticket_id`),
  KEY `idx_tp_part` (`part_id`),
  CONSTRAINT `fk_tp_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tp_part` FOREIGN KEY (`part_id`) REFERENCES `part` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
