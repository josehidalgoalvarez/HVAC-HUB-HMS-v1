-- Migration 012: Portfolio Reseed with Verified Data
-- Reseeds building, unit, and appliance tables with Jose's 12 verified Kingston properties and 6 verified appliances.
-- Retires unverified prototype buildings (1727 and 1735 Bath Rd) and fabricated prototype appliances.
-- Only 1723 Bath Rd has verified postal code K7M 4Y9; all other postal codes, serials, and unverified models remain NULL.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Remove old prototype appliances and reseed with verified units
DELETE FROM `appliance`;

-- 2. Clean old prototype units and buildings
DELETE FROM `unit`;
DELETE FROM `building`;

-- 3. Seed Verified Portfolio Buildings (12 properties)
INSERT INTO `building` (`id`, `name`, `address`, `comments`, `is_3d_ready`) VALUES
  (1, '1719 Bath Road', '1719 Bath Rd, Kingston, ON', 'Multi-unit residential complex. Stockpile: donor appliances on site at 1719 Bath.', 0),
  (2, '1721 Bath Road', '1721 Bath Rd, Kingston, ON', 'Multi-unit residential complex.', 0),
  (3, '1723 Bath Road', '1723 Bath Rd, Kingston, ON K7M 4Y9', 'Multi-unit residential complex.', 0),
  (4, '1725 Bath Road', '1725 Bath Rd, Kingston, ON', 'Multi-unit residential complex.', 0),
  (5, '1731 Bath Road', '1731 Bath Rd, Kingston, ON', 'Multi-unit complex. Note: building drain stack has recurring blockages.', 0),
  (6, '1733 Bath Road', '1733 Bath Rd, Kingston, ON', 'Multi-unit residential complex.', 0),
  (7, '1737 Bath Road', '1737 Bath Rd, Kingston, ON', 'End-of-block multi-family property.', 0),
  (8, '505 Days Road', '505 Days Rd, Kingston, ON', 'Days Road residential complex. Stockpiles nearby: 511 Days Rd storage (holds spare Askoll pump), 509 Days Rd storage rooms.', 0),
  (9, '507 Days Road', '507 Days Rd, Kingston, ON', 'Residential apartments. Stockpiles nearby: 509 & 511 Days Rd storage rooms.', 0),
  (10, '137 Amherst Drive', '137 Amherst Dr, Kingston, ON', 'Residential units. Stockpiles nearby: 107 Amherst and 539 Armstrong.', 0),
  (11, '415 Albert Street', '415 Albert St, Kingston, ON', 'Multi-unit residential property.', 0),
  (12, '265 Ontario Street', '265 Ontario St, Kingston, ON', 'Residential property.', 0);

-- 4. Seed Verified Units
INSERT INTO `unit` (`id`, `building_id`, `unit_number`, `floor`, `comments`) VALUES
  (1, 1, '273', 'Basement', 'Unit 273 with basement mechanical access'),
  (2, 2, '268', 'Second Floor', 'Verified residential unit'),
  (3, 2, '266', 'Second Floor', 'Verified residential unit'),
  (4, 3, '266', 'Second Floor', 'Verified unit with Frigidaire dishwasher'),
  (5, 3, '67', 'Main Floor', 'Verified residential unit'),
  (6, 5, 'G63', 'Ground Floor', 'Verified residential unit'),
  (7, 5, '161', 'First Floor', 'Verified residential unit'),
  (8, 8, '103', 'First Floor', 'Verified unit with freezer noise complaint'),
  (9, 9, '32', 'Main Floor', 'Verified residential unit'),
  (10, 10, '137', 'Main Floor', 'Verified residential unit with range and water heater'),
  (11, 11, '415B', 'Main Floor', 'Verified residential unit'),
  (12, 11, '415E', 'Second Floor', 'Verified residential unit'),
  (13, 12, '2', 'Main Floor', 'Verified residential unit');

-- 5. Seed 6 Verified Appliances
INSERT INTO `appliance` (
  `id`, `property_id`, `building_id`, `unit_id`, `name`, `brand`, `type`, `category`, `status`,
  `last_service`, `model_number`, `serial_number`, `room`, `unit_number`, `location`,
  `image_url`, `rating_plate_url`, `notes`, `specs`
) VALUES
  (
    1, 'prop-bath-1723', 3, 4, 'Dishwasher', 'Frigidaire', 'Dishwasher', 'Kitchen', 'operational',
    '2026-10-15', 'FFCD2418US3A', NULL, 'Kitchen', '266', '1723 Bath Rd · Unit 266 · Kitchen',
    'https://frigidaire.bynder.com/transform/e1966ae3-49aa-4b00-86e2-92f2e0ebf80e/FFCD2418US-HOV_824-psd?preset=three-bears', NULL,
    'Drain pump Askoll M376 (part A16944601) replaced 2026-10-15; status operational, load test pending.',
    '{"capacity":"14 Place Settings","volts":"120V","room":"Kitchen","location":"1723 Bath Rd · Unit 266 · Kitchen"}'
  ),
  (
    2, 'prop-amherst-137', 10, 10, 'Electric Range', 'Frigidaire', 'Range', 'Kitchen', 'needs_service',
    NULL, NULL, NULL, 'Kitchen', '137', '137 Amherst Dr · Unit 137 · Kitchen',
    NULL, NULL,
    'Gray electric range. Burner infinite switch WB24T10025 (order by model #). Status: needs repair (on hold).',
    '{"room":"Kitchen","location":"137 Amherst Dr · Unit 137 · Kitchen"}'
  ),
  (
    3, 'prop-amherst-137', 10, 10, 'Water Heater', 'Rheem', 'Heater', 'Water Heating', 'needs_service',
    NULL, NULL, NULL, NULL, '137', '137 Amherst Dr · Unit 137',
    NULL, NULL,
    'No hot water since ~2026-10-08. Status: needs repair (on hold).',
    '{"location":"137 Amherst Dr · Unit 137"}'
  ),
  (
    4, 'prop-bath-1731', 5, NULL, 'Water Heater (Laundry)', '', 'Heater', 'Water Heating', 'operational',
    NULL, NULL, NULL, 'Laundry Room', 'Common', '1731 Bath Rd · Laundry Room',
    NULL, NULL,
    '1/2" copper supply (16–17mm OD); SharkBite 1/2" push-fit ball valve planned. Building drain stack has recurring blockages.',
    '{"room":"Laundry Room","location":"1731 Bath Rd · Laundry Room"}'
  ),
  (
    5, 'prop-bath-1719', 1, 1, 'Refrigerator', '', 'Refrigerator', 'Kitchen', 'needs_service',
    NULL, NULL, NULL, 'Kitchen', '273', '1719 Bath Rd · Unit 273 · Kitchen',
    NULL, NULL,
    'Needs crisper drawer + door shelf, ordered via Dependable Appliances once the model is known. Rating-plate photo pending.',
    '{"room":"Kitchen","location":"1719 Bath Rd · Unit 273 · Kitchen"}'
  ),
  (
    6, 'prop-days-505', 8, 8, 'Freezer', '', 'Freezer', 'Kitchen', 'needs_service',
    NULL, NULL, NULL, NULL, '103', '505 Days Rd · Unit 103',
    NULL, NULL,
    'Recurring noise complaint (WO 19255).',
    '{"location":"505 Days Rd · Unit 103"}'
  );

SET FOREIGN_KEY_CHECKS = 1;
