-- Migration 042: Blank unsourced Dependable Appliances fields
-- Background: migration 041 seeded Dependable Appliances with phone + hours taken from the app's Buy List (legitimate, keep them),
-- but also with three values that appear nowhere in any repo source: contact_name 'Parts Desk', address 'Kingston, ON', account_number 'DEP-HVAC-9941'.
-- Those three are unsourced and must not stand as facts.
-- Guarded idempotent UPDATE: only blank the fields if they still equal their seeded unsourced values.
-- NEVER touch name, phone, or hours.

UPDATE `supplier`
SET
  `contact_name` = CASE WHEN `contact_name` = 'Parts Desk' THEN NULL ELSE `contact_name` END,
  `address` = CASE WHEN `address` = 'Kingston, ON' THEN NULL ELSE `address` END,
  `account_number` = CASE WHEN `account_number` = 'DEP-HVAC-9941' THEN NULL ELSE `account_number` END,
  `updated_at` = CURRENT_TIMESTAMP
WHERE `name` = 'Dependable Appliances';
