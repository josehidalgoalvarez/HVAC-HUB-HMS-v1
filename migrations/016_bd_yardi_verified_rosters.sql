-- Migration 016: Verified BD Unit Rosters from Yardi Extract (2026-10-22)
-- Replaces pattern-generated unit rosters in BD complex with exact Yardi verified rosters (130 units total).
-- Days: 505 (12), 509 (12), 511 (9), 507 townhouses (21) = 54 units
-- Bath: 1719 (9), 1721 (12), 1723 (10), 1731 (9), 1733 (12), 1727 townhouses (4), 1737 townhouses (8), 1725 (12) = 76 units

-- 0. Ensure provenance column exists on unit table
ALTER TABLE `unit` ADD COLUMN `provenance` TEXT DEFAULT 'verified';

-- 1. Remove all old BD units
DELETE FROM `unit` WHERE `building_id` IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15, 16);

-- 2. Update building comments with verified numbering pool notes and TODOs
UPDATE `building` SET `comments` = 'Days apartments share numbering pool (G1–G11 / 101–111 / 201–211). Standalone electrical (the exception in BD complex), different layout/floors, nothing stored here.' WHERE `id` = 8;
UPDATE `building` SET `comments` = 'TOWNHOUSES: 2-digit unit pool (11–32 continuous except 13). TODO-verify: units 1–10 and 13 unconfirmed in Yardi extract. 3 stories (2 floors + basement), 2 washrooms, own water heater per unit (believed // TODO-verify), laundry WITH sink, NO storage.' WHERE `id` = 9;
UPDATE `building` SET `comments` = 'Days apartments share numbering pool (G1–G11 / 101–111 / 201–211). Attached pair with 511 Days Rd. Shared mechanical room with 511. Laundry: no sink (believed // TODO-verify).' WHERE `id` = 14;
UPDATE `building` SET `comments` = 'Days apartments share numbering pool (G1–G11 / 101–111 / 201–211). Attached pair with 509 Days Rd, SHARED mechanical room. Complex storage node in 511 basement. Storage building. Laundry: WITH sink.' WHERE `id` = 15;
UPDATE `building` SET `comments` = 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached trio (1719-1721-1723), SHARED electrical + water heating at 1721. Laundry: sink YES. 1719 basement storage: 3-4 white coil stoves + 2-3 fridges + Danby AC.' WHERE `id` = 1;
UPDATE `building` SET `comments` = 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached trio hub: shared mechanical room containing 7 water heaters (3 working, 2 valved-off stagnant, 2 disconnected rotting), fiber connections, electrical shutoffs. Laundry: sink NO.' WHERE `id` = 2;
UPDATE `building` SET `comments` = 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached trio with 1719 & 1721. Shared electrical & water heating from 1721. Laundry: sink YES. Verified postal code: K7M 4Y9.' WHERE `id` = 3;
UPDATE `building` SET `comments` = '2-digit pool runs 33–56 across 1727/1737/1725 (1725 has apartments 45–56 continuous). Apartments with inner hallways. Laundry contains Bell cable setup + 1 water heater. Automated timer lights.' WHERE `id` = 4;
UPDATE `building` SET `comments` = 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached pair with 1733, SHARED electrical. Yardi picker conflict on 163/261/262 assigned to 1731. Shared mechanical room with 1733: 1 electric water heater + 2 donor fridges. Laundry: WITH sink.' WHERE `id` = 5;
UPDATE `building` SET `comments` = 'Bath apartments share numbering pool (G57–G74 / 157–174 / 257–274; 164 and 264 do not exist). Attached pair with 1731, SHARED electrical. Yardi picker conflict on 158/260 assigned to 1733. Laundry in basement: without sink.' WHERE `id` = 6;
UPDATE `building` SET `comments` = '2-digit pool runs 33–56 across 1727/1737/1725 (1737 has townhouses 37–44). 3 stories, 2 washrooms, dedicated water heater per unit. No communal laundry.' WHERE `id` = 7;
UPDATE `building` SET `comments` = '2-digit pool runs 33–56 across 1727/1737/1725 (1727 has townhouses 33–36). 3 stories, 2 washrooms, dedicated water heater per unit. No communal laundry.' WHERE `id` = 16;

-- 3. Insert 505 Days (12 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (8, '101', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, '102', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, '103', 'First Floor', 'Verified unit with noisy freezer complaint (WO 19255)', 'verified — Yardi extract 2026-10-22'),
  (8, '104', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, '201', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, '202', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, '203', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, '204', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, 'G1', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, 'G2', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, 'G3', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (8, 'G4', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 4. Insert 509 Days (12 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (14, '105', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, '106', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, '107', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, '108', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, '205', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, '206', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, '207', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, '208', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, 'G5', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, 'G6', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, 'G7', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (14, 'G8', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 5. Insert 511 Days (9 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (15, '109', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (15, '110', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (15, '111', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (15, '209', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (15, '210', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (15, '211', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (15, 'G9', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (15, 'G10', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (15, 'G11', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 6. Insert 507 Days Townhouses (21 units: 11, 12, 14–32 continuous except 13)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (9, '11', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '12', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '14', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '15', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '16', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '17', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '18', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '19', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '20', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '21', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '22', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '23', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '24', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '25', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '26', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '27', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '28', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '29', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '30', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '31', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (9, '32', 'Multi-Floor Townhouse', 'Verified unit 32 — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 7. Insert 1719 Bath (9 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (1, '172', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (1, '173', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (1, '174', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (1, '272', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (1, '273', 'Second Floor', 'Verified unit with basement mechanical access & refrigerator', 'verified — Yardi extract 2026-10-22'),
  (1, '274', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (1, 'G72', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (1, 'G73', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (1, 'G74', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 8. Insert 1721 Bath (12 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (2, '168', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, '169', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, '170', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, '171', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, '268', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, '269', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, '270', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, '271', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, 'G68', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, 'G69', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, 'G70', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (2, 'G71', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 9. Insert 1723 Bath (10 units: 164 and 264 do not exist)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (3, '165', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (3, '166', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (3, '167', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (3, '265', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (3, '266', 'Second Floor', 'Verified unit with Frigidaire FFCD2418US3A dishwasher', 'verified — Yardi extract 2026-10-22'),
  (3, '267', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (3, 'G64', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (3, 'G65', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (3, 'G66', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (3, 'G67', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 10. Insert 1731 Bath (9 units: label conflict on 163, 261, 262 assigned to 1731)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (5, '161', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (5, '162', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (5, '163', 'First Floor', 'Yardi label conflict: labeled 1723 Bath Road inside bd1731 picker -- assigned to 1731 (picker wins)', 'verified — Yardi extract 2026-10-22'),
  (5, '261', 'Second Floor', 'Yardi label conflict: labeled 1723 Bath Road inside bd1731 picker -- assigned to 1731 (picker wins)', 'verified — Yardi extract 2026-10-22'),
  (5, '262', 'Second Floor', 'Yardi label conflict: labeled 1723 Bath Road inside bd1731 picker -- assigned to 1731 (picker wins)', 'verified — Yardi extract 2026-10-22'),
  (5, '263', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (5, 'G61', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (5, 'G62', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (5, 'G63', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 11. Insert 1733 Bath (12 units: label conflict on 158, 260 assigned to 1733)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (6, '157', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, '158', 'First Floor', 'Yardi label conflict: labeled 1723 Bath Road inside bd1733 picker -- assigned to 1733 (picker wins)', 'verified — Yardi extract 2026-10-22'),
  (6, '159', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, '160', 'First Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, '257', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, '258', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, '259', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, '260', 'Second Floor', 'Yardi label conflict: labeled 1723 Bath Road inside bd1733 picker -- assigned to 1733 (picker wins)', 'verified — Yardi extract 2026-10-22'),
  (6, 'G57', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, 'G58', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, 'G59', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (6, 'G60', 'Ground Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 12. Insert 1727 Bath Townhouses (4 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (16, '33', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (16, '34', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (16, '35', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (16, '36', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 13. Insert 1737 Bath Townhouses (8 units)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (7, '37', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (7, '38', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (7, '39', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (7, '40', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (7, '41', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (7, '42', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (7, '43', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (7, '44', 'Multi-Floor Townhouse', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 14. Insert 1725 Bath (12 units: 45–56 continuous)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (4, '45', 'Main Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '46', 'Main Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '47', 'Main Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '48', 'Main Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '49', 'Main Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '50', 'Main Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '51', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '52', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '53', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '54', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '55', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22'),
  (4, '56', 'Second Floor', 'verified — Yardi extract 2026-10-22', 'verified — Yardi extract 2026-10-22');

-- 15. Re-anchor verified appliances to their new unit_id
UPDATE `appliance`
SET `unit_id` = (
  SELECT `id` FROM `unit` 
  WHERE `unit`.`building_id` = `appliance`.`building_id` 
    AND `unit`.`unit_number` = `appliance`.`unit_number`
  LIMIT 1
)
WHERE `building_id` IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15, 16)
  AND `unit_number` IS NOT NULL
  AND `unit_number` != 'Common';
