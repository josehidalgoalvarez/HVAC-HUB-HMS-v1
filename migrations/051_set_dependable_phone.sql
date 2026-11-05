-- Migration 051: Set Dependable Appliances phone to Jose-confirmed winning number
-- Source: Jose confirmation Nov 4, 2026.
-- Winning number: 613-389-2421.
-- Replaces candidate number 613-542-8822.
-- Address, account_number, contact_name remain NULL (unsourced).
-- Hours remain 'Mon–Fri 8:30–5'.

UPDATE `supplier`
SET
  `phone` = '613-389-2421',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `name` = 'Dependable Appliances';
