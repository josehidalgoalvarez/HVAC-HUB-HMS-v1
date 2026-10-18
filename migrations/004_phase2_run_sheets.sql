-- Migration 004: Phase 2 Run Sheets and Run Sheet Blocks
-- Day-Plan travel blocks, legal gate status linkage, e-bike carry checks, and actual minutes

CREATE TABLE IF NOT EXISTS `run_sheet` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tech_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NULL,
  `run_date` DATE NOT NULL,
  `status` ENUM('draft', 'active', 'completed') NOT NULL DEFAULT 'active',
  `route_order` JSON NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_run_sheet_tech_id` (`tech_id`),
  KEY `idx_run_sheet_date` (`run_date`),
  CONSTRAINT `fk_run_sheet_tech_user` FOREIGN KEY (`tech_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `run_sheet_block` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `run_sheet_id` BIGINT UNSIGNED NOT NULL,
  `ticket_id` BIGINT UNSIGNED NULL,
  `building_id` BIGINT UNSIGNED NULL,
  `unit_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `notes` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 1,
  `status` ENUM('pending', 'in_progress', 'completed', 'skipped') NOT NULL DEFAULT 'pending',
  `start_time` VARCHAR(20) NULL,
  `end_time` VARCHAR(20) NULL,
  `estimated_minutes` INT NOT NULL DEFAULT 45,
  `actual_minutes` INT NULL,
  `required_tools` TEXT NULL,
  `required_parts` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_block_run_sheet_id` (`run_sheet_id`),
  KEY `idx_block_ticket_id` (`ticket_id`),
  KEY `idx_block_sort_order` (`sort_order`),
  CONSTRAINT `fk_block_run_sheet` FOREIGN KEY (`run_sheet_id`) REFERENCES `run_sheet` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_block_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_block_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_block_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
