-- Migration 041: Add title to run_sheet and bootstrap audit sync
-- Issue 1: run-sheet save on live failed with "Unknown column 'title' in 'INSERT INTO'"
-- because migration 001 originally created run_sheet without title.
-- Issue 3: Ensure Dependable Appliances supplier is seeded in supplier directory.

-- 1. Guarded ALTER TABLE for run_sheet.title
SET @dbname = DATABASE();
SET @tablename = 'run_sheet';
SET @columnname = 'title';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE `run_sheet` ADD COLUMN `title` VARCHAR(255) NULL AFTER `tech_id`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Seed Dependable Appliances supplier if missing
INSERT INTO `supplier` (`name`, `contact_name`, `phone`, `email`, `address`, `hours`, `account_number`, `created_at`, `updated_at`)
SELECT 'Dependable Appliances', 'Parts Desk', '613-542-8822', '', 'Kingston, ON', 'Mon–Fri 8:30–5', 'DEP-HVAC-9941', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `supplier` WHERE `name` = 'Dependable Appliances');
