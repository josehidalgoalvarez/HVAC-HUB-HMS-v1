-- Migration 058: Add ticket_relationship table for bidirectional related-ticket links
CREATE TABLE IF NOT EXISTS `ticket_relationship` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id` INT NOT NULL,
    `related_ticket_id` INT NOT NULL,
    `reason` TEXT NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_ticket_relationship_pair` (`ticket_id`, `related_ticket_id`),
    KEY `idx_tr_ticket_id` (`ticket_id`),
    KEY `idx_tr_related_ticket_id` (`related_ticket_id`),
    CONSTRAINT `fk_tr_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tr_related_ticket` FOREIGN KEY (`related_ticket_id`) REFERENCES `ticket` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
