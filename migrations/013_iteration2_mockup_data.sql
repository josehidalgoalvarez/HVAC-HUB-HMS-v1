-- Migration 013: Iteration 2 Mockup Data — Complexes, Clusters, and Full Kingston Portfolio Roster
-- Structure: Complex -> Building -> Unit -> Appliance
-- 10 Complexes: BD (13 entries incl. inactive pool), Amherst (43 buildings), Princess (7), Victoria (4),
-- Alfred (6), Frontenac (2), Elm & Colborne (3), Manitou (1 property, 1-58 townhouses), Singles (9), Office (1).
-- Total 89 Properties. No 1735 Bath Rd, no outliers (Eagle, 150 Marketplace, 268 Talbot, 2 Metcalfe).
-- Provenance: 'verified' vs 'pattern'. Only 1723 Bath Rd has verified postal code K7M 4Y9.
-- Storage inventories: 511 Days basement, 107 Amherst, 1719 Bath basement, 539 Armstrong stockpile.
-- 8 Verified appliances with provenance 'verified' on the right units and rooms.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create Complex table if not exists
CREATE TABLE IF NOT EXISTS `complex` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `address` VARCHAR(255) NULL,
  `building_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Extend building table with complex, cluster, status, and ensure is_3d_ready exists
ALTER TABLE `building` ADD `complex_id` VARCHAR(50) NULL;
ALTER TABLE `building` ADD `cluster_id` VARCHAR(50) NULL;
ALTER TABLE `building` ADD `status` VARCHAR(50) NOT NULL DEFAULT 'active';
ALTER TABLE `building` ADD `is_3d_ready` TINYINT(1) NOT NULL DEFAULT 0;

-- 3. Clear existing mock/seed data
DELETE FROM `appliance`;
DELETE FROM `unit`;
DELETE FROM `building`;
DELETE FROM `complex`;

-- 4. Seed 10 Complexes
INSERT INTO `complex` (`id`, `code`, `name`, `description`, `address`, `building_count`) VALUES
  ('complex-bd', 'BD', 'BD Complex', 'Bath Road & Days Road residential complex in Kingston, ON.', 'Bath Rd & Days Rd, Kingston, ON', 13),
  ('complex-amherst', 'AMHERST', 'Amherst Complex', 'Long row of 43 apartment buildings in Amherstview, ON (odd numbers 107–229).', 'Amherstview, ON', 43),
  ('complex-princess', 'PRINCESS', 'Princess Complex', 'Princess Street multi-unit properties in Kingston, ON.', 'Princess St, Kingston, ON', 7),
  ('complex-victoria', 'VICTORIA', 'Victoria Complex', 'Victoria Street residential properties in Kingston, ON.', 'Victoria St, Kingston, ON', 4),
  ('complex-alfred', 'ALFRED', 'Alfred Complex', 'Alfred Street residential multi-unit cluster in Kingston, ON.', 'Alfred St, Kingston, ON', 6),
  ('complex-frontenac', 'FRONTENAC', 'Frontenac Complex', 'Frontenac Street residential properties in Kingston, ON.', 'Frontenac St, Kingston, ON', 2),
  ('complex-elm', 'ELM', 'Elm & Colborne Complex', 'Proximity cluster: 18 & 24 Elm St directly behind 203 Colborne St.', 'Elm St & Colborne St, Kingston, ON', 3),
  ('complex-manitou', 'MANITOU', 'Manitou Complex', 'Manitou Crescent townhouse row (1–58 Manitou Cres).', 'Manitou Cres, Kingston, ON', 1),
  ('complex-singles', 'SINGLES', 'Singles & Standalone', 'Individual standalone properties, stockpiles, and project entries across Kingston.', 'Various locations, Kingston, ON', 9),
  ('complex-office', 'OFFICE', 'Operations & Office', 'Company headquarters and route dispatch origin (not a rental property).', '698 McKay St, Kingston, ON', 1);

-- 5. Seed 89 Verified Kingston Properties
-- BD Complex (13 entries)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (1, 'complex-bd', 'cluster-bd-1719-1723', '1719 Bath Road', '1719 Bath Rd, Kingston, ON', 'active', 'Attached trio (1719-1721-1723), SHARED electrical + water heating at 1721. Laundry: sink YES. 1719 basement storage: 3-4 white coil stoves + 2-3 fridges + Danby AC.'),
  (2, 'complex-bd', 'cluster-bd-1719-1723', '1721 Bath Road', '1721 Bath Rd, Kingston, ON', 'active', 'Attached trio hub: shared mechanical room containing 7 water heaters (3 working, 2 valved-off stagnant, 2 disconnected rotting), fiber connections, electrical shutoffs. Laundry: sink NO.'),
  (3, 'complex-bd', 'cluster-bd-1719-1723', '1723 Bath Road', '1723 Bath Rd, Kingston, ON K7M 4Y9', 'active', 'Attached trio with 1719 & 1721. Shared electrical & water heating from 1721. Laundry: sink YES. Verified postal code: K7M 4Y9.'),
  (4, 'complex-bd', NULL, '1725 Bath Road', '1725 Bath Rd, Kingston, ON', 'active', 'Apartments with inner hallways. Laundry contains Bell cable setup + 1 water heater (believed // TODO-verify). Automated timer lights. NO electrical room located.'),
  (5, 'complex-bd', 'cluster-bd-1731-1733', '1731 Bath Road', '1731 Bath Rd, Kingston, ON', 'active', 'Attached pair with 1733, SHARED electrical. Shared mechanical room between them: 1 electric water heater + 2 donor fridges. Laundry: WITH sink. Building drain stack recurring blockages.'),
  (6, 'complex-bd', 'cluster-bd-1731-1733', '1733 Bath Road', '1733 Bath Rd, Kingston, ON', 'active', 'Attached pair with 1731, SHARED electrical. Laundry in basement: without sink.'),
  (7, 'complex-bd', NULL, '1737 Bath Road', '1737 Bath Rd, Kingston, ON', 'active', 'TOWNHOUSES (count 4-6 // TODO-verify), no hallway, no communal laundry. 2-digit unit numbers.'),
  (8, 'complex-bd', NULL, '505 Days Road', '505 Days Rd, Kingston, ON', 'active', 'STANDALONE electrical (the exception in BD complex), different layout/floors, nothing stored here.'),
  (9, 'complex-bd', NULL, '507 Days Road', '507 Days Rd, Kingston, ON', 'active', 'TOWNHOUSES: 3 stories (2 floors + basement), 2 washrooms, own water heater per unit (believed // TODO-verify), laundry WITH sink, NO storage. 2-digit unit numbers.'),
  (13, 'complex-bd', NULL, '505 Days Pool', '505 Days Rd, Kingston, ON', 'permanently_out_of_order', 'PERMANENTLY OUT OF ORDER (inactive record, no watches/SOPs).'),
  (14, 'complex-bd', 'cluster-bd-509-511', '509 Days Road', '509 Days Rd, Kingston, ON', 'active', 'Attached pair with 511 Days Rd. Shared mechanical room with 511. Laundry: no sink (believed // TODO-verify).'),
  (15, 'complex-bd', 'cluster-bd-509-511', '511 Days Road', '511 Days Rd, Kingston, ON', 'active', 'Attached pair with 509 Days Rd, SHARED mechanical room. Complex storage node in 511 basement. Laundry: WITH sink.'),
  (16, 'complex-bd', NULL, '1727 Bath Road', '1727 Bath Rd, Kingston, ON', 'active', 'TOWNHOUSES, no hallway, no communal laundry. 2-digit unit numbers. Restored verified property.');

-- Amherst Complex (43 buildings, odd 107–229)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (10, 'complex-amherst', NULL, '137 Amherst Drive', '137 Amherst Dr, Amherstview, ON', 'active', 'Residential unit building. Verified unit 137 (range, water heater).'),
  (17, 'complex-amherst', NULL, '229 Amherst Drive', '229 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (18, 'complex-amherst', NULL, '225 Amherst Drive', '225 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (19, 'complex-amherst', NULL, '219 Amherst Drive', '219 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (20, 'complex-amherst', NULL, '217 Amherst Drive', '217 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (21, 'complex-amherst', NULL, '213 Amherst Drive', '213 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (22, 'complex-amherst', NULL, '211 Amherst Drive', '211 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (23, 'complex-amherst', NULL, '209 Amherst Drive', '209 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (24, 'complex-amherst', NULL, '207 Amherst Drive', '207 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (25, 'complex-amherst', NULL, '205 Amherst Drive', '205 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (26, 'complex-amherst', NULL, '201 Amherst Drive', '201 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (27, 'complex-amherst', NULL, '199 Amherst Drive', '199 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (28, 'complex-amherst', NULL, '197 Amherst Drive', '197 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (29, 'complex-amherst', NULL, '195 Amherst Drive', '195 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (30, 'complex-amherst', NULL, '193 Amherst Drive', '193 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (31, 'complex-amherst', NULL, '191 Amherst Drive', '191 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (32, 'complex-amherst', NULL, '187 Amherst Drive', '187 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (33, 'complex-amherst', NULL, '183 Amherst Drive', '183 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (34, 'complex-amherst', NULL, '179 Amherst Drive', '179 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (35, 'complex-amherst', NULL, '177 Amherst Drive', '177 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (36, 'complex-amherst', NULL, '175 Amherst Drive', '175 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (37, 'complex-amherst', NULL, '173 Amherst Drive', '173 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (38, 'complex-amherst', NULL, '171 Amherst Drive', '171 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (39, 'complex-amherst', NULL, '169 Amherst Drive', '169 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (40, 'complex-amherst', NULL, '167 Amherst Drive', '167 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (41, 'complex-amherst', NULL, '165 Amherst Drive', '165 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (42, 'complex-amherst', NULL, '161 Amherst Drive', '161 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (43, 'complex-amherst', NULL, '157 Amherst Drive', '157 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (44, 'complex-amherst', NULL, '153 Amherst Drive', '153 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (45, 'complex-amherst', NULL, '149 Amherst Drive', '149 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (46, 'complex-amherst', NULL, '145 Amherst Drive', '145 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (47, 'complex-amherst', NULL, '141 Amherst Drive', '141 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (48, 'complex-amherst', NULL, '135 Amherst Drive', '135 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (49, 'complex-amherst', NULL, '133 Amherst Drive', '133 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (50, 'complex-amherst', NULL, '131 Amherst Drive', '131 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (51, 'complex-amherst', NULL, '129 Amherst Drive', '129 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (52, 'complex-amherst', NULL, '127 Amherst Drive', '127 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (53, 'complex-amherst', NULL, '125 Amherst Drive', '125 Amherst Dr, Amherstview, ON', 'active', 'Amherst Townhouse building in the time tracking system.'),
  (54, 'complex-amherst', NULL, '123 Amherst Drive', '123 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (55, 'complex-amherst', NULL, '119 Amherst Drive', '119 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (56, 'complex-amherst', NULL, '115 Amherst Drive', '115 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (57, 'complex-amherst', NULL, '111 Amherst Drive', '111 Amherst Dr, Amherstview, ON', 'active', 'Apartment building in Amherst row (odd numbers 107-229).'),
  (58, 'complex-amherst', NULL, '107 Amherst Drive', '107 Amherst Dr, Amherstview, ON', 'active', 'Storage node for Amherst complex (supplies, tools, 2 white coil stoves). Unit pattern: 101-112, 201-212, 301-312 (36 units).');

-- Princess Complex (7 buildings)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (59, 'complex-princess', NULL, '563 Princess Street', '563 Princess St, Kingston, ON', 'active', 'Princess Street multi-unit property.'),
  (60, 'complex-princess', NULL, '565 Princess Street', '565 Princess St, Kingston, ON', 'active', 'Princess Street multi-unit property.'),
  (61, 'complex-princess', NULL, '567 Princess Street', '567 Princess St, Kingston, ON', 'active', 'Princess Street multi-unit property.'),
  (62, 'complex-princess', NULL, '630 Princess Street', '630 Princess St, Kingston, ON', 'active', 'Princess Street multi-unit property.'),
  (63, 'complex-princess', NULL, '655 Princess Street', '655 Princess St, Kingston, ON', 'active', 'Princess Street multi-unit property.'),
  (64, 'complex-princess', NULL, '800 Princess Street', '800 Princess St, Kingston, ON', 'active', 'Princess Street multi-unit property.'),
  (65, 'complex-princess', NULL, '837 Princess Street', '837 Princess St, Kingston, ON', 'active', 'Princess Street multi-unit property.');

-- Victoria Complex (4 buildings)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (66, 'complex-victoria', NULL, '585 Victoria Street', '585 Victoria St, Kingston, ON', 'active', 'Victoria Street residential property.'),
  (67, 'complex-victoria', NULL, '614 Victoria Street', '614 Victoria St, Kingston, ON', 'active', 'Victoria Street residential property.'),
  (68, 'complex-victoria', NULL, '616 Victoria Street', '616 Victoria St, Kingston, ON', 'active', 'Victoria Street residential property.'),
  (69, 'complex-victoria', NULL, '620 Victoria Street', '620 Victoria St, Kingston, ON', 'active', 'Victoria Street residential property.');

-- Alfred Complex (6 buildings)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (70, 'complex-alfred', NULL, '353 Alfred Street', '353 Alfred St, Kingston, ON', 'active', 'Alfred Street residential multi-unit cluster.'),
  (71, 'complex-alfred', NULL, '359 Alfred Street', '359 Alfred St, Kingston, ON', 'active', 'Alfred Street residential multi-unit cluster.'),
  (72, 'complex-alfred', NULL, '361 Alfred Street', '361 Alfred St, Kingston, ON', 'active', 'Alfred Street residential multi-unit cluster.'),
  (73, 'complex-alfred', NULL, '376 Alfred Street', '376 Alfred St, Kingston, ON', 'active', 'Alfred Street residential multi-unit cluster.'),
  (74, 'complex-alfred', NULL, '378 Alfred Street', '378 Alfred St, Kingston, ON', 'active', 'Alfred Street residential multi-unit cluster.'),
  (75, 'complex-alfred', NULL, '394 Alfred Street', '394 Alfred St, Kingston, ON', 'active', 'Alfred Street residential multi-unit cluster.');

-- Frontenac Complex (2 buildings)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (76, 'complex-frontenac', NULL, '501 Frontenac Street', '501 Frontenac St, Kingston, ON', 'active', 'Frontenac Street residential property.'),
  (77, 'complex-frontenac', NULL, '520 Frontenac Street', '520 Frontenac St, Kingston, ON', 'active', 'Frontenac Street residential property.');

-- Elm & Colborne Complex (3 buildings)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (78, 'complex-elm', 'cluster-elm-colborne', '18 Elm Street', '18 Elm St, Kingston, ON', 'active', 'Sits right behind 203 Colborne St.'),
  (79, 'complex-elm', 'cluster-elm-colborne', '24 Elm Street', '24 Elm St, Kingston, ON', 'active', 'Sits right behind 203 Colborne St.'),
  (80, 'complex-elm', 'cluster-elm-colborne', '203 Colborne Street', '203 Colborne St, Kingston, ON', 'active', 'Front building facing Colborne, 18 and 24 Elm sit directly behind.');

-- Manitou Complex (1 entry, 1–58 Manitou Cres)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (81, 'complex-manitou', NULL, 'Manitou Crescent Townhouses', '1–58 Manitou Cres, Kingston, ON', 'active', 'Townhouses, 1-58 Manitou Cres (top of range TODO-verify).');

-- Singles & Standalone (9 entries)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (11, 'complex-singles', NULL, '415 Albert Street', '415 Albert St, Kingston, ON', 'active', 'Multi-unit residential property. Units 415B, 415E verified.'),
  (12, 'complex-singles', NULL, '265 Ontario Street', '265 Ontario St, Kingston, ON', 'active', 'Residential property. Unit 2 verified.'),
  (82, 'complex-singles', NULL, '810 Blackburn Mews', '810 Blackburn Mews, Kingston, ON', 'active', 'Commercial / standalone unit.'),
  (83, 'complex-singles', NULL, '85 Park Street', '85 Park St, Kingston, ON', 'active', 'Residential standalone property.'),
  (84, 'complex-singles', NULL, '176 Railway Street', '176 Railway St, Kingston, ON', 'active', 'Residential standalone property.'),
  (85, 'complex-singles', NULL, '55 Ontario Street', '55 Ontario St, Kingston, ON', 'active', 'Waterfront / downtown residential property.'),
  (86, 'complex-singles', NULL, '36 Durham Street', '36 Durham St, Kingston, ON', 'active', 'Standalone residential building.'),
  (87, 'complex-singles', NULL, '539 Armstrong Road', '539 Armstrong Rd, Kingston, ON', 'active', 'Stockpile location. White stoves rule everywhere: donor coils by SIZE only.'),
  (88, 'complex-singles', NULL, '847 Development', 'Kingston, ON', 'active', 'Project entry, not an address.');

-- Office (1 entry)
INSERT INTO `building` (`id`, `complex_id`, `cluster_id`, `name`, `address`, `status`, `comments`) VALUES
  (89, 'complex-office', NULL, '698 McKay Street (Office)', '698 McKay St, Kingston, ON', 'active', 'Location type office, not a rental property, route origin.');

-- 6. Seed Verified & Pattern Units
INSERT INTO `unit` (`id`, `building_id`, `unit_number`, `floor`, `comments`) VALUES
  -- 1719 Bath Rd (bld 1)
  (1, 1, '273', 'Basement', 'Verified unit with basement mechanical access and refrigerator'),
  (2, 1, '101', 'First Floor', 'Pattern apartment unit'),
  (3, 1, '102', 'First Floor', 'Pattern apartment unit'),
  (4, 1, '103', 'First Floor', 'Pattern apartment unit'),
  (5, 1, '104', 'First Floor', 'Pattern apartment unit'),
  (6, 1, '105', 'First Floor', 'Pattern apartment unit'),
  (7, 1, '106', 'First Floor', 'Pattern apartment unit'),

  -- 1721 Bath Rd (bld 2)
  (8, 2, '268', 'Second Floor', 'Verified residential unit'),
  (9, 2, '266', 'Second Floor', 'Verified residential unit'),

  -- 1723 Bath Rd (bld 3)
  (10, 3, '266', 'Second Floor', 'Verified unit with Frigidaire FFCD2418US3A dishwasher'),
  (11, 3, '67', 'Main Floor', 'Verified residential unit'),

  -- 1731 Bath Rd (bld 5)
  (12, 5, 'G63', 'Ground Floor', 'Verified residential unit'),
  (13, 5, '161', 'First Floor', 'Verified residential unit'),

  -- 505 Days Rd (bld 8)
  (14, 8, '103', 'First Floor', 'Verified unit with noisy freezer complaint (WO 19255)'),
  (15, 8, '101', 'First Floor', 'Pattern apartment unit'),
  (16, 8, '102', 'First Floor', 'Pattern apartment unit'),
  (17, 8, '104', 'First Floor', 'Pattern apartment unit'),
  (18, 8, '105', 'First Floor', 'Pattern apartment unit'),
  (19, 8, '106', 'First Floor', 'Pattern apartment unit'),

  -- 507 Days Rd (bld 9) Townhouses
  (20, 9, '32', 'Multi-Floor Townhouse', 'Verified townhouse unit'),
  (21, 9, '21', 'Multi-Floor Townhouse', 'Pattern townhouse unit (3 stories, 2 washrooms)'),
  (22, 9, '22', 'Multi-Floor Townhouse', 'Pattern townhouse unit (3 stories, 2 washrooms)'),
  (23, 9, '23', 'Multi-Floor Townhouse', 'Pattern townhouse unit (3 stories, 2 washrooms)'),

  -- 137 Amherst Dr (bld 10)
  (24, 10, '137', 'First Floor', 'Verified unit with Frigidaire range and Rheem water heater (WO on hold)'),
  (25, 10, '101', 'First Floor', 'Pattern apartment unit'),
  (26, 10, '102', 'First Floor', 'Pattern apartment unit'),

  -- 415 Albert St (bld 11)
  (27, 11, '415B', 'Main Floor', 'Verified residential unit'),
  (28, 11, '415E', 'Second Floor', 'Verified residential unit'),

  -- 265 Ontario St (bld 12)
  (29, 12, '2', 'Main Floor', 'Verified residential unit'),

  -- 107 Amherst Dr (bld 58) Storage Node & Pattern (36 units)
  (30, 58, '101', 'First Floor', 'Pattern apartment unit at complex storage node'),
  (31, 58, '102', 'First Floor', 'Pattern apartment unit at complex storage node'),
  (32, 58, '201', 'Second Floor', 'Pattern apartment unit at complex storage node'),
  (33, 58, '301', 'Third Floor', 'Pattern apartment unit at complex storage node'),

  -- Manitou Crescent (bld 81) Townhouses
  (34, 81, '1', 'Townhouse', 'Townhouse unit 1 of 58 (1-58 // TODO-verify)'),
  (35, 81, '2', 'Townhouse', 'Townhouse unit 2 of 58 (1-58 // TODO-verify)'),
  (36, 81, '3', 'Townhouse', 'Townhouse unit 3 of 58 (1-58 // TODO-verify)'),
  (37, 81, '58', 'Townhouse', 'Townhouse unit 58 of 58 (1-58 // TODO-verify)');

-- 7. Seed 8 Verified Appliances + 1721 Shared Water Heater Bank
INSERT INTO `appliance` (
  `id`, `property_id`, `building_id`, `unit_id`, `name`, `brand`, `type`, `category`, `status`,
  `last_service`, `model_number`, `serial_number`, `room`, `unit_number`, `location`,
  `image_url`, `rating_plate_url`, `notes`, `specs`
) VALUES
  -- 1. Dishwasher — Frigidaire FFCD2418US3A — 1723 Bath Rd, Unit 266, Kitchen
  (
    1, 'prop-bath-1723', 3, 10, 'Dishwasher', 'Frigidaire', 'Dishwasher', 'Kitchen', 'operational',
    '2026-10-15', 'FFCD2418US3A', NULL, 'Kitchen', '266', '1723 Bath Rd · Unit 266 · Kitchen',
    'https://frigidaire.bynder.com/transform/e1966ae3-49aa-4b00-86e2-92f2e0ebf80e/FFCD2418US-HOV_824-psd?preset=three-bears', NULL,
    'Drain pump Askoll M376 (part A16944601) replaced 2026-10-15, load test pending.',
    '{"capacity":"14 Place Settings","volts":"120V","room":"Kitchen","location":"1723 Bath Rd · Unit 266 · Kitchen"}'
  ),
  -- 2. Electric range, gray — Frigidaire, model UNKNOWN — 137 Amherst Dr, Unit 137, Kitchen
  (
    2, 'prop-amherst-137', 10, 24, 'Electric Range', 'Frigidaire', 'Range', 'Kitchen', 'needs_service',
    NULL, NULL, NULL, 'Kitchen', '137', '137 Amherst Dr · Unit 137 · Kitchen',
    NULL, NULL,
    'Gray electric range. Burner infinite switch WB24T10025 (order by model #). Status: needs repair (on hold).',
    '{"room":"Kitchen","location":"137 Amherst Dr · Unit 137 · Kitchen"}'
  ),
  -- 3. Water heater — Rheem, model UNKNOWN — 137 Amherst Dr, Unit 137
  (
    3, 'prop-amherst-137', 10, 24, 'Water Heater', 'Rheem', 'Heater', 'Water Heating', 'needs_service',
    NULL, NULL, NULL, NULL, '137', '137 Amherst Dr · Unit 137',
    NULL, NULL,
    'No hot water since ~2026-10-08, status on hold.',
    '{"location":"137 Amherst Dr · Unit 137"}'
  ),
  -- 4. John Wood ProLine water heater — 1721 mech room (shared trio)
  (
    4, 'prop-bath-1721', 2, NULL, 'Water Heater (ProLine)', 'John Wood', 'Heater', 'Water Heating', 'needs_service',
    '2026-10-18', 'ProLine', NULL, 'Mechanical Room', 'Common', '1721 Bath Rd · Shared Mechanical Room',
    NULL, NULL,
    'Issues: weeping at tee joint, ECO trips every few days, scaled lower element (WO 20316). Parts spec: 4500W/240V screw-in element + gasket, upper + lower thermostats.',
    '{"volts":"240V","watts":"4500W","room":"Mechanical Room","location":"1721 Bath Rd · Shared Mechanical Room"}'
  ),
  -- 5. Electric water heater — 1731/1733 shared mech room
  (
    5, 'prop-bath-1731', 5, NULL, 'Electric Water Heater', '', 'Heater', 'Water Heating', 'operational',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1731/1733 Shared Mechanical Room',
    NULL, NULL,
    '1/2 inch copper supply (16–17mm OD), SharkBite 1/2 inch push-fit ball valve planned. Building drain stack has recurring blockages.',
    '{"room":"Mechanical Room","location":"1731/1733 Shared Mechanical Room"}'
  ),
  -- 6. Refrigerator — Frigidaire FFHT1826LS9 — 1719 Bath Rd, Unit 273, Kitchen
  (
    6, 'prop-bath-1719', 1, 1, 'Refrigerator', 'Frigidaire', 'Refrigerator', 'Kitchen', 'needs_service',
    '2026-10-19', 'FFHT1826LS9', NULL, 'Kitchen', '273', '1719 Bath Rd · Unit 273 · Kitchen',
    NULL, NULL,
    '1719 Bath unit 273 kitchen (WOs 20061/20062). Crisper drawer 240337103 BOUGHT 2026-10-19, door shelf 240338101 ORDERED, pickup pending.',
    '{"room":"Kitchen","location":"1719 Bath Rd · Unit 273 · Kitchen"}'
  ),
  -- 7. Freezer — brand/model UNKNOWN — 505 Days Rd, Unit 103
  (
    7, 'prop-days-505', 8, 14, 'Freezer', '', 'Freezer', 'Kitchen', 'needs_service',
    NULL, NULL, NULL, NULL, '103', '505 Days Rd · Unit 103',
    NULL, NULL,
    'Recurring noise complaint (WO 19255).',
    '{"location":"505 Days Rd · Unit 103"}'
  ),
  -- 8. Donor fridges ×2 — 1731/1733 mech room
  (
    8, 'prop-bath-1731', 5, NULL, 'Donor Refrigerator #1', '', 'Refrigerator', 'Parts Source', 'donor',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1731/1733 Shared Mechanical Room',
    NULL, NULL,
    'Donor fridge #1 in shared mech room (parts source, not in service).',
    '{"room":"Mechanical Room","location":"1731/1733 Shared Mechanical Room"}'
  ),
  (
    9, 'prop-bath-1731', 5, NULL, 'Donor Refrigerator #2', '', 'Refrigerator', 'Parts Source', 'donor',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1731/1733 Shared Mechanical Room',
    NULL, NULL,
    'Donor fridge #2 in shared mech room (parts source, not in service).',
    '{"room":"Mechanical Room","location":"1731/1733 Shared Mechanical Room"}'
  ),
  -- Additional 1721 Shared Mechanical Room Water Heaters (total 7 in bank)
  (
    10, 'prop-bath-1721', 2, NULL, 'Water Heater (John Wood Working)', 'John Wood', 'Heater', 'Water Heating', 'operational',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1721 Bath Rd · Shared Mechanical Room',
    NULL, NULL,
    'Working water heater in 1721 shared bank (working ×3 group).',
    '{"room":"Mechanical Room","location":"1721 Bath Rd · Shared Mechanical Room"}'
  ),
  (
    11, 'prop-bath-1721', 2, NULL, 'Water Heater (AO Smith Working)', 'AO Smith', 'Heater', 'Water Heating', 'operational',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1721 Bath Rd · Shared Mechanical Room',
    NULL, NULL,
    'Working water heater in 1721 shared bank (working ×3 group).',
    '{"room":"Mechanical Room","location":"1721 Bath Rd · Shared Mechanical Room"}'
  ),
  (
    12, 'prop-bath-1721', 2, NULL, 'Water Heater (AO Smith 46-gal Valved-Off #1)', 'AO Smith', 'Heater', 'Water Heating', 'valved_off',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1721 Bath Rd · Shared Mechanical Room',
    NULL, NULL,
    'AO Smith 46-gal, still holding stagnant water — flag: drain + management health note.',
    '{"room":"Mechanical Room","location":"1721 Bath Rd · Shared Mechanical Room"}'
  ),
  (
    13, 'prop-bath-1721', 2, NULL, 'Water Heater (AO Smith 46-gal Valved-Off #2)', 'AO Smith', 'Heater', 'Water Heating', 'valved_off',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1721 Bath Rd · Shared Mechanical Room',
    NULL, NULL,
    'AO Smith 46-gal, still holding stagnant water — flag: drain + management health note.',
    '{"room":"Mechanical Room","location":"1721 Bath Rd · Shared Mechanical Room"}'
  ),
  (
    14, 'prop-bath-1721', 2, NULL, 'Disconnected Water Heater #1', '', 'Heater', 'Water Heating', 'disconnected',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1721 Bath Rd · Shared Mechanical Room',
    NULL, NULL,
    'Disconnected, rotting — flag: removal authorization pending.',
    '{"room":"Mechanical Room","location":"1721 Bath Rd · Shared Mechanical Room"}'
  ),
  (
    15, 'prop-bath-1721', 2, NULL, 'Disconnected Water Heater #2', '', 'Heater', 'Water Heating', 'disconnected',
    NULL, NULL, NULL, 'Mechanical Room', 'Common', '1721 Bath Rd · Shared Mechanical Room',
    NULL, NULL,
    'Disconnected, rotting — flag: removal authorization pending.',
    '{"room":"Mechanical Room","location":"1721 Bath Rd · Shared Mechanical Room"}'
  );

SET FOREIGN_KEY_CHECKS = 1;
