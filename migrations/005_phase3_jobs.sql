-- Migration 005: Phase 3 Field Jobs, Parts Used, Job Notes, and Offline Sync
-- Tracks field execution sessions, parts consumption, technician notes, and job close-out.

CREATE TABLE IF NOT EXISTS `job` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` BIGINT UNSIGNED NULL,
  `run_sheet_block_id` BIGINT UNSIGNED NULL,
  `building_id` BIGINT UNSIGNED NULL,
  `unit_id` BIGINT UNSIGNED NULL,
  `tech_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `status` ENUM('in_progress', 'completed', 'canceled') NOT NULL DEFAULT 'in_progress',
  `start_time` DATETIME NULL,
  `end_time` DATETIME NULL,
  `estimated_minutes` INT NOT NULL DEFAULT 45,
  `actual_minutes` INT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_ticket_id` (`ticket_id`),
  KEY `idx_job_block_id` (`run_sheet_block_id`),
  KEY `idx_job_tech_id` (`tech_id`),
  KEY `idx_job_status` (`status`),
  CONSTRAINT `fk_job_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_job_block` FOREIGN KEY (`run_sheet_block_id`) REFERENCES `run_sheet_block` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_job_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_job_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_job_tech` FOREIGN KEY (`tech_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_part` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id` BIGINT UNSIGNED NOT NULL,
  `part_name` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'pcs',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_part_job_id` (`job_id`),
  CONSTRAINT `fk_job_part_job` FOREIGN KEY (`job_id`) REFERENCES `job` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_note` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id` BIGINT UNSIGNED NOT NULL,
  `tech_id` BIGINT UNSIGNED NULL,
  `note_text` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_note_job_id` (`job_id`),
  CONSTRAINT `fk_job_note_job` FOREIGN KEY (`job_id`) REFERENCES `job` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_note_tech` FOREIGN KEY (`tech_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
