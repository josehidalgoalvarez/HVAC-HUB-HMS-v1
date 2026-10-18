-- Migration: 001_initial_schema.sql
-- HVACHome v2 Initial Schema for Hostinger MySQL (InnoDB, utf8mb4)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. users
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('tech', 'management') NOT NULL DEFAULT 'tech',
  `api_token` VARCHAR(128) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_api_token` (`api_token`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. building
CREATE TABLE IF NOT EXISTS `building` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `comments` TEXT NULL,
  `is_3d_ready` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_building_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. unit
CREATE TABLE IF NOT EXISTS `unit` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `building_id` BIGINT UNSIGNED NOT NULL,
  `unit_number` VARCHAR(50) NOT NULL,
  `floor` VARCHAR(50) NULL,
  `comments` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_unit_building_number` (`building_id`, `unit_number`),
  KEY `idx_unit_building_id` (`building_id`),
  CONSTRAINT `fk_unit_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ticket (wo_number NULLABLE, parent_ticket_id NULLABLE)
CREATE TABLE IF NOT EXISTS `ticket` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `wo_number` VARCHAR(100) NULL,
  `parent_ticket_id` BIGINT UNSIGNED NULL,
  `building_id` BIGINT UNSIGNED NOT NULL,
  `unit_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('open', 'in_progress', 'pending_parts', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `created_by_user_id` BIGINT UNSIGNED NULL,
  `assigned_tech_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_wo_number` (`wo_number`),
  KEY `idx_ticket_parent_id` (`parent_ticket_id`),
  KEY `idx_ticket_building_id` (`building_id`),
  KEY `idx_ticket_unit_id` (`unit_id`),
  KEY `idx_ticket_status` (`status`),
  KEY `idx_ticket_assigned_tech` (`assigned_tech_id`),
  CONSTRAINT `fk_ticket_parent` FOREIGN KEY (`parent_ticket_id`) REFERENCES `ticket` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ticket_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ticket_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ticket_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ticket_tech` FOREIGN KEY (`assigned_tech_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. job
CREATE TABLE IF NOT EXISTS `job` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` BIGINT UNSIGNED NOT NULL,
  `assigned_tech_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  `scheduled_at` DATETIME NULL,
  `started_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `work_summary` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_ticket_id` (`ticket_id`),
  KEY `idx_job_tech_id` (`assigned_tech_id`),
  KEY `idx_job_status` (`status`),
  CONSTRAINT `fk_job_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_tech` FOREIGN KEY (`assigned_tech_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. run_sheet
CREATE TABLE IF NOT EXISTS `run_sheet` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tech_id` BIGINT UNSIGNED NOT NULL,
  `run_date` DATE NOT NULL,
  `status` ENUM('draft', 'active', 'completed') NOT NULL DEFAULT 'draft',
  `route_order` JSON NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_run_sheet_tech_date` (`tech_id`, `run_date`),
  KEY `idx_run_sheet_tech_id` (`tech_id`),
  KEY `idx_run_sheet_date` (`run_date`),
  CONSTRAINT `fk_run_sheet_tech` FOREIGN KEY (`tech_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. notice
CREATE TABLE IF NOT EXISTS `notice` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `building_id` BIGINT UNSIGNED NOT NULL,
  `unit_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `notice_type` VARCHAR(50) NOT NULL DEFAULT 'entry',
  `entry_date` DATE NULL,
  `posted_at` DATETIME NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notice_building_id` (`building_id`),
  KEY `idx_notice_unit_id` (`unit_id`),
  CONSTRAINT `fk_notice_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notice_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notice_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. part
CREATE TABLE IF NOT EXISTS `part` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `part_number` VARCHAR(100) NULL,
  `category` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `quantity_on_hand` INT NOT NULL DEFAULT 0,
  `min_quantity` INT NOT NULL DEFAULT 1,
  `unit_cost` DECIMAL(10,2) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_part_name` (`name`),
  KEY `idx_part_number` (`part_number`),
  KEY `idx_part_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. stockpile
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

-- 10. supplier
CREATE TABLE IF NOT EXISTS `supplier` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `contact_name` VARCHAR(100) NULL,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(191) NULL,
  `address` VARCHAR(255) NULL,
  `account_number` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. photo
CREATE TABLE IF NOT EXISTS `photo` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` BIGINT UNSIGNED NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_size_bytes` INT UNSIGNED NOT NULL,
  `mime_type` VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
  `caption` VARCHAR(255) NULL,
  `taken_by_user_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_photo_entity` (`entity_type`, `entity_id`),
  KEY `idx_photo_taken_by` (`taken_by_user_id`),
  CONSTRAINT `fk_photo_user` FOREIGN KEY (`taken_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. correction (APPEND-ONLY audit table: INSERT only, no UPDATE, no DELETE)
CREATE TABLE IF NOT EXISTS `correction` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` BIGINT UNSIGNED NOT NULL,
  `field_name` VARCHAR(100) NOT NULL,
  `old_value` TEXT NULL,
  `new_value` TEXT NULL,
  `changed_by_user_id` BIGINT UNSIGNED NULL,
  `reason` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_correction_entity` (`entity_type`, `entity_id`),
  KEY `idx_correction_user` (`changed_by_user_id`),
  KEY `idx_correction_created_at` (`created_at`),
  CONSTRAINT `fk_correction_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. watch
CREATE TABLE IF NOT EXISTS `watch` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` BIGINT UNSIGNED NOT NULL,
  `trigger_condition` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_checked_at` DATETIME NULL,
  `last_triggered_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_watch_user` (`user_id`),
  KEY `idx_watch_entity` (`entity_type`, `entity_id`),
  KEY `idx_watch_active` (`is_active`),
  CONSTRAINT `fk_watch_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. reminder
CREATE TABLE IF NOT EXISTS `reminder` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `due_at` DATETIME NOT NULL,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reminder_user_due` (`user_id`, `due_at`),
  KEY `idx_reminder_completed` (`is_completed`),
  CONSTRAINT `fk_reminder_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. building_note
CREATE TABLE IF NOT EXISTS `building_note` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `building_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `note` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_building_note_building` (`building_id`),
  KEY `idx_building_note_user` (`user_id`),
  CONSTRAINT `fk_bn_building` FOREIGN KEY (`building_id`) REFERENCES `building` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bn_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. vehicle_profile
CREATE TABLE IF NOT EXISTS `vehicle_profile` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `tech_id` BIGINT UNSIGNED NULL,
  `license_plate` VARCHAR(50) NULL,
  `make_model` VARCHAR(100) NULL,
  `inventory_notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vp_tech_id` (`tech_id`),
  CONSTRAINT `fk_vp_tech` FOREIGN KEY (`tech_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. yardi_sightings
CREATE TABLE IF NOT EXISTS `yardi_sightings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `wo_number` VARCHAR(100) NOT NULL,
  `unit_raw` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `status` VARCHAR(50) NULL,
  `sighted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payload` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_yardi_wo` (`wo_number`),
  KEY `idx_yardi_sighted_at` (`sighted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
