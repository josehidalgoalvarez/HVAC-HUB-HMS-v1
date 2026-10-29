-- Migration 044: Buy list manual item persistence
-- Allows technicians and management to persist manual items in the Buy List on the server.
-- ticket_id is plain INT NULL with NO foreign key (avoids orphan errors if ticket is deleted).

CREATE TABLE IF NOT EXISTS `buy_list_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `part_number` VARCHAR(100) NULL,
  `supplier` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `ticket_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_buy_list_item_ticket_id` (`ticket_id`),
  KEY `idx_buy_list_item_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
