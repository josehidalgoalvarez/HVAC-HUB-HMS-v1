-- Migration 027: Gathered-Context Regrouping, Aliases & Storage Network
-- Applies field-verified data batch:
-- 1. Regroupings: Frontenac-Alfred quadrant complex, Armstrong / Skyfall complex, 630 Princess standalone.
-- 2. 501 Frontenac aliases extension and alias addresses note.
-- 3. Building role flags ('standard' | 'storage' | 'mechanical' | 'office') and responsibility flags ('internal' | 'external').
-- 4. Storage network stockpiles (12 storage locations).
-- 5. Supplier: Home Depot (Gardiners Rd, Kingston).

-- Step 1: Add role and responsibility columns to building
ALTER TABLE building ADD COLUMN role VARCHAR(30) DEFAULT 'standard';
ALTER TABLE building ADD COLUMN responsibility VARCHAR(30) DEFAULT 'internal';

-- Step 2: Complex renames and creations
UPDATE complexes SET name = 'BD — Bath & Days' WHERE slug = 'bd';
UPDATE complex SET name = 'BD — Bath & Days' WHERE id = 'bd';

-- Create Frontenac–Alfred Quadrant complex (ID 9 / slug 'frontenac-alfred')
INSERT OR IGNORE INTO complexes (id, name, slug, notes, created_at, updated_at)
VALUES (9, 'Frontenac–Alfred Quadrant', 'frontenac-alfred', 'Frontenac and Alfred street cluster + 565 Princess St in Kingston, ON.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO complex (id, code, name, description, address, building_count, created_at, updated_at)
VALUES ('frontenac-alfred', 'FRONTENAC-ALFRED', 'Frontenac–Alfred Quadrant', 'Frontenac and Alfred street cluster + 565 Princess St in Kingston, ON.', 'Frontenac St & Alfred St, Kingston, ON', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Create Armstrong / Skyfall complex (ID 10 / slug 'armstrong-skyfall')
INSERT OR IGNORE INTO complexes (id, name, slug, notes, created_at, updated_at)
VALUES (10, 'Armstrong / Skyfall', 'armstrong-skyfall', 'Adjacent group: 539 Armstrong Rd, 300 Skyfall Lane (Le Santé), and 2274 Princess St.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO complex (id, code, name, description, address, building_count, created_at, updated_at)
VALUES ('armstrong-skyfall', 'ARMSTRONG-SKYFALL', 'Armstrong / Skyfall', 'Adjacent group: 539 Armstrong Rd, 300 Skyfall Lane (Le Santé), and 2274 Princess St.', 'Armstrong Rd & Skyfall Lane, Kingston, ON', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 3: Regroup buildings
-- Move 501 Frontenac (76), 520 Frontenac (77), 353-394 Alfred (70-75), and 565 Princess (60) to Frontenac-Alfred (9)
UPDATE building SET complex_id = '9' WHERE id IN (60, 70, 71, 72, 73, 74, 75, 76, 77);

-- 630 Princess (62) is standalone (under construction)
UPDATE building SET complex_id = NULL WHERE id = 62;

-- Move 539 Armstrong (87), 2274 Princess (95), Le Santé / 300 Skyfall (96) to Armstrong / Skyfall (10)
UPDATE building SET complex_id = '10' WHERE id IN (87, 95, 96);

-- 847 Development (88): external responsibility
UPDATE building SET responsibility = 'external', comments = 'Project entry, not an address. External responsibility (has own superintendent; not Jose).' WHERE id = 88;

-- Step 4: Add 181 Hillendale Ave storage building (ID 97)
INSERT OR IGNORE INTO building (id, name, address, complex_id, status, is_3d_ready, comments, role, responsibility, created_at, updated_at)
VALUES (97, '181 Hillendale Ave', '181 Hillendale Ave, Kingston, ON', NULL, 'active', 0, 'Hillendale storage depot location.', 'storage', 'internal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 5: 501 Frontenac aliases extension & note
UPDATE building
SET aliases = '495 Frontenac St, 495 Frontenac Street, 503 Frontenac St, 505 Frontenac St, 507 Frontenac St, 509 Frontenac St, The Frontenac',
    comments = 'Frontenac condos — single building; 495–509 are alias addresses. Mixed ownership: some units belong to other companies, not Patry/Kenlar. Yardi letter suffixes (B/C/D/P) are rooms/spaces inside the apartment, not units.'
WHERE id = 76;

-- Step 6: Special-role flags on buildings
UPDATE building SET role = 'storage' WHERE id = 15; -- 511 Days
UPDATE building SET role = 'storage' WHERE id = 58; -- 107 Amherst
UPDATE building SET role = 'mechanical' WHERE id = 2; -- 1721 Bath
UPDATE building SET role = 'storage' WHERE id = 75; -- 394 Alfred
UPDATE building SET role = 'storage' WHERE id = 87; -- 539 Armstrong
UPDATE building SET role = 'storage' WHERE id = 82; -- 810 Blackburn Mews
UPDATE building SET role = 'storage' WHERE id = 83; -- 85 Park St
UPDATE building SET role = 'storage' WHERE id = 97; -- 181 Hillendale Ave
UPDATE building SET role = 'storage' WHERE id = 78; -- 18 Elm St
UPDATE building SET role = 'storage' WHERE id = 12; -- 265 Ontario St
UPDATE building SET role = 'office' WHERE id = 89; -- 698 McKay St

-- 511 Days keeps central storage building note
UPDATE building SET comments = 'Central storage building. Distribution hub and spare parts/materials storage.' WHERE id = 15;

-- Step 7: Storage Network Stockpiles
-- Remap existing part_stockpile references to 1
UPDATE part_stockpile SET stockpile_id = 1 WHERE stockpile_id > 2;
UPDATE part SET stockpile_id = 1 WHERE stockpile_id > 2;
DELETE FROM stockpile;

INSERT INTO stockpile (id, name, location, building_id, notes, created_at, updated_at) VALUES
(1, '511 Days Rd Storage', '511 Days Rd', 15, 'Central storage building and main distribution hub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, '107 Amherst Storage', '107 Amherst Dr', 58, 'Amherst cluster storage depot', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, '539 Armstrong Stockpile', '539 Armstrong Rd', 87, 'Riverstone storage location', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, '394 Alfred Storage', '394 Alfred St', 75, 'Alfred cluster storage building', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, '810 Blackburn Mews Storage', '810 Blackburn Mews', 82, 'Stonecrest storage stockpile', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, '85 Park St Storage', '85 Park St', 83, 'Park St storage location', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, '181 Hillendale Ave Storage', '181 Hillendale Ave', 97, 'Hillendale storage depot', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, '18 Elm St Storage', '18 Elm St', 78, 'Elm cluster storage stockpile', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, '265 Ontario St Upstairs Storage', '265 Ontario St (Upstairs)', 12, '265 Ontario St upstairs storage room', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, '265 Ontario St Basement Storage', '265 Ontario St (Basement)', 12, '265 Ontario St basement storage room', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, '698 McKay St Warehouse', '698 McKay St', 89, '698 McKay St main warehouse storage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, '698 McKay Sea Containers', '698 McKay St (Yard)', 89, '698 McKay exterior sea container storage units', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 8: Supplier - Home Depot (Gardiners Rd, Kingston)
INSERT INTO supplier (name, contact_name, phone, email, address, hours, account_number, created_at, updated_at)
VALUES ('Home Depot (Gardiners Rd, Kingston)', 'Pro Desk', '613-389-8800', '', '605 Gardiners Rd, Kingston, ON K7M 3Y4', 'Mon–Sat 6am–9pm, Sun 8am–7pm', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
