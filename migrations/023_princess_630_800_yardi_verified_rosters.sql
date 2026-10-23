-- Migration 023: Verified 630 and 800 Princess Unit Rosters from Yardi Extract (2026-10-22)
-- Replaces pattern-generated units for 630 Princess St and 800 Princess St with verified rosters:
-- 630 Princess (ID 62): 26 units across F1 (102, 104, 106), F2 (201, 203–207), F3 (301, 303–307), F4 (401–405, 407), F5 (501, 503–505, 507)
-- 800 Princess (ID 64): 51 units across F2 (201–209, 211–218), F3 (301–309, 311–318), F4 (401–409, 411–418) - no 210, 310, 410
-- 800 Princess Annex (ID 94): 4 units (100, 101A, 301, 302)
-- Prompt Total: 81 units (26 + 51 + 4)

-- 1. Update 630 Princess St (ID 62)
UPDATE `building` SET
  `name` = '630 Princess St',
  `comments` = 'Under construction (Oct 2026); roster as listed in Yardi.'
WHERE `id` = 62;

-- 2. Update 800 Princess St (ID 64)
UPDATE `building` SET
  `name` = '800 Princess St',
  `aliases` = 'The 800'
WHERE `id` = 64;

-- 3. Insert 800 Princess St — annex (ID 94)
INSERT OR REPLACE INTO `building` (`id`, `name`, `address`, `comments`, `complex_id`, `external_ids`, `yardi_codes`, `status`, `is_3d_ready`)
VALUES (94, '800 Princess St — annex', '800 Princess St, Kingston, ON', 'TODO-verify: second Yardi record at 800 Princess; its 301/302 are distinct from the main building''s 301/302 until verified.', 4, '800prin', '800prin', 'active', 0);

-- 4. Update Princess Complex building count to 8
UPDATE `complex` SET `building_count` = 8 WHERE `id` = 'complex-princess';

-- 5. Purge old pattern units for buildings 62, 64, 94
DELETE FROM `unit` WHERE `building_id` IN (62, 64, 94);

-- 6. Insert 630 Princess St (ID 62) — 26 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  -- Floor 1 (3 units: 102, 104, 106)
  (62, "102", "First Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "104", "First Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "106", "First Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  -- Floor 2 (6 units: 201, 203, 204, 205, 206, 207)
  (62, "201", "Second Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "203", "Second Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "204", "Second Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "205", "Second Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "206", "Second Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "207", "Second Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  -- Floor 3 (6 units: 301, 303, 304, 305, 306, 307)
  (62, "301", "Third Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "303", "Third Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "304", "Third Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "305", "Third Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "306", "Third Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "307", "Third Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  -- Floor 4 (6 units: 401, 402, 403, 404, 405, 407)
  (62, "401", "Fourth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "402", "Fourth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "403", "Fourth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "404", "Fourth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "405", "Fourth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "407", "Fourth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  -- Floor 5 (5 units: 501, 503, 504, 505, 507)
  (62, "501", "Fifth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "503", "Fifth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "504", "Fifth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "505", "Fifth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22"),
  (62, "507", "Fifth Floor", "630 Princess St apartment (base unit, ignores Yardi letter room suffixes)", "verified — Yardi extract 2026-10-22");

-- 7. Insert 800 Princess St (ID 64) — 51 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  -- Floor 2 (17 units: 201–209, 211–218)
  (64, "201", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "202", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "203", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "204", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "205", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "206", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "207", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "208", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "209", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "211", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "212", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "213", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "214", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "215", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "216", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "217", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "218", "Second Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  -- Floor 3 (17 units: 301–309, 311–318)
  (64, "301", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "302", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "303", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "304", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "305", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "306", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "307", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "308", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "309", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "311", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "312", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "313", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "314", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "315", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "316", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "317", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "318", "Third Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  -- Floor 4 (17 units: 401–409, 411–418)
  (64, "401", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "402", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "403", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "404", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "405", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "406", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "407", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "408", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "409", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "411", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "412", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "413", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "414", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "415", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "416", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "417", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22"),
  (64, "418", "Fourth Floor", "800 Princess St apartment", "verified — Yardi extract 2026-10-22");

-- 8. Insert 800 Princess St — annex (ID 94) — 4 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (94, "100", "First Floor", "800 Princess annex unit (Yardi property 800prin)", "verified — Yardi extract 2026-10-22"),
  (94, "101A", "First Floor", "800 Princess annex unit (Yardi property 800prin)", "verified — Yardi extract 2026-10-22"),
  (94, "301", "Third Floor", "800 Princess annex unit (Yardi property 800prin, distinct from main 301)", "verified — Yardi extract 2026-10-22"),
  (94, "302", "Third Floor", "800 Princess annex unit (Yardi property 800prin, distinct from main 302)", "verified — Yardi extract 2026-10-22");
