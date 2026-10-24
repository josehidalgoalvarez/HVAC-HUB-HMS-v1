-- Migration 032: Field Workflow Layer — Ticket Timeline, Visit Outcomes, Parts Rework, Vacancy Sourcing
-- Append-only ticket timeline events
CREATE TABLE IF NOT EXISTS `ticket_timeline` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `ticket_id` INTEGER NOT NULL,
  `event_type` TEXT NOT NULL, -- 'submitted', 'visit_logged', 'appliance_identified', 'part_needed', 'part_ordered', 'part_arrived', 'return_visit', 'completed', 'note'
  `actor` TEXT NOT NULL DEFAULT 'Tech',
  `note` TEXT NULL,
  `metadata` TEXT NULL, -- JSON formatted metadata: {supplier, order_ref, photo_url, rating_plate_url, manual_url, etc.}
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_ticket_timeline_ticket_id` ON `ticket_timeline` (`ticket_id`);
CREATE INDEX IF NOT EXISTS `idx_ticket_timeline_created_at` ON `ticket_timeline` (`created_at`);

-- Ticket visits with outcome tracking and notice state snapshot
CREATE TABLE IF NOT EXISTS `ticket_visit` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `ticket_id` INTEGER NOT NULL,
  `building_id` INTEGER NOT NULL,
  `unit_id` INTEGER NULL,
  `tech_id` INTEGER NULL,
  `tech_name` TEXT NULL DEFAULT 'Jose',
  `visited_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `outcome` TEXT NOT NULL, -- 'completed', 'partial', 'failed_access'
  `failure_reason` TEXT NULL, -- 'tenant_absent', 'no_answer', 'refused_entry', 'key_or_lock_issue', 'access_blocked', 'unsafe', 'other'
  `notes` TEXT NULL,
  `notice_needed_snapshot` INTEGER NOT NULL DEFAULT 0,
  `notice_sent_at_snapshot` TEXT NULL,
  `notice_confirmed_by_snapshot` TEXT NULL,
  `is_our_miss` INTEGER NOT NULL DEFAULT 0,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_ticket_visit_ticket_id` ON `ticket_visit` (`ticket_id`);
CREATE INDEX IF NOT EXISTS `idx_ticket_visit_unit_id` ON `ticket_visit` (`unit_id`);
CREATE INDEX IF NOT EXISTS `idx_ticket_visit_building_id` ON `ticket_visit` (`building_id`);
CREATE INDEX IF NOT EXISTS `idx_ticket_visit_outcome` ON `ticket_visit` (`outcome`);
CREATE INDEX IF NOT EXISTS `idx_ticket_visit_visited_at` ON `ticket_visit` (`visited_at`);

-- Enhance ticket_part with appliance linkage, supplier, order ref, and status
-- SQLite ALTER TABLE ADD COLUMN statements
-- (Will also be protected with try-catch in PHP Db initialization)
ALTER TABLE `ticket_part` ADD COLUMN `building_id` INTEGER NULL;
ALTER TABLE `ticket_part` ADD COLUMN `unit_id` INTEGER NULL;
ALTER TABLE `ticket_part` ADD COLUMN `appliance_id` INTEGER NULL;
ALTER TABLE `ticket_part` ADD COLUMN `appliance_type` TEXT NULL;
ALTER TABLE `ticket_part` ADD COLUMN `supplier` TEXT NULL;
ALTER TABLE `ticket_part` ADD COLUMN `order_ref` TEXT NULL;
ALTER TABLE `ticket_part` ADD COLUMN `status` TEXT NOT NULL DEFAULT 'needed';
ALTER TABLE `ticket_part` ADD COLUMN `watch_id` INTEGER NULL;
ALTER TABLE `ticket_part` ADD COLUMN `ordered_at` TEXT NULL;
ALTER TABLE `ticket_part` ADD COLUMN `arrived_at` TEXT NULL;
ALTER TABLE `ticket_part` ADD COLUMN `unit_cost` REAL NULL;
ALTER TABLE `ticket_part` ADD COLUMN `notes` TEXT NULL;

-- Stock transfer table for vacancy parts harvesting and transfer provenance
CREATE TABLE IF NOT EXISTS `stock_transfer` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `source_type` TEXT NOT NULL, -- 'vacant_unit', 'stockpile'
  `source_unit_id` INTEGER NULL,
  `source_building_id` INTEGER NULL,
  `source_stockpile_id` INTEGER NULL,
  `destination_type` TEXT NOT NULL, -- 'unit', 'stockpile'
  `destination_unit_id` INTEGER NULL,
  `destination_building_id` INTEGER NULL,
  `destination_stockpile_id` INTEGER NULL,
  `appliance_id` INTEGER NULL,
  `part_id` INTEGER NULL,
  `item_name` TEXT NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `transferred_by` TEXT NOT NULL DEFAULT 'Tech',
  `notes` TEXT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `idx_stock_transfer_appliance` ON `stock_transfer` (`appliance_id`);
CREATE INDEX IF NOT EXISTS `idx_stock_transfer_source_unit` ON `stock_transfer` (`source_unit_id`);
