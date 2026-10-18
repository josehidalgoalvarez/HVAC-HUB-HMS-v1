-- Migration 007: Phase 6 Proactive Watches, Digest & Quiet Hours
-- Establishes watch engine schema for notice deadlines, weather freeze, reply waiting, and scheduled tasks.

CREATE TABLE IF NOT EXISTS `watch` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL,
  `watch_type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `target_type` VARCHAR(50) NULL,
  `target_id` BIGINT UNSIGNED NULL,
  `state` VARCHAR(30) NOT NULL DEFAULT 'active',
  `config` LONGTEXT NULL,
  `snoozed_until` DATETIME NULL,
  `last_evaluated_at` DATETIME NULL,
  `last_triggered_at` DATETIME NULL,
  `acknowledged_at` DATETIME NULL,
  `resolved_at` DATETIME NULL,
  `latest_trigger_reason` TEXT NULL,
  `latest_trigger_data` LONGTEXT NULL,
  `quiet_hours_delayed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_watch_user` (`user_id`),
  KEY `idx_watch_type` (`watch_type`),
  KEY `idx_watch_state` (`state`),
  KEY `idx_watch_target` (`target_type`, `target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
