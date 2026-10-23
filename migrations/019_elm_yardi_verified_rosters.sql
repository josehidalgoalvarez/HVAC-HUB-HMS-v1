-- Migration 019: Verified Elm Unit Rosters from Yardi Extract (2026-10-22)
-- Replaces pattern-generated units for 18 Elm St and 24 Elm St with verified rosters:
-- 18 Elm St: 17 units (101P, 111–114, 211–214, 311–314, 411–414)
-- 24 Elm St: 14 units (101–104, 201–204, 301–303, 401–403; stored without 24- prefix)
-- Elm complex total for 18 & 24 Elm: 31 units

-- 1. Update building notes for 18 Elm and 24 Elm
UPDATE `building` SET
  `comments` = 'Sits right behind 203 Colborne St. Small-storage role (water heaters).'
WHERE `id` = 78;

UPDATE `building` SET
  `comments` = 'Sits right behind 203 Colborne St. TODO-verify: 304/404 absent in Yardi; 303D/403D may be the physical 4th units on floors 3–4.'
WHERE `id` = 79;

-- 2. Remove old pattern units for 18 and 24 Elm
DELETE FROM `unit` WHERE `building_id` IN (78, 79);

-- 3. Insert Verified Units for 18 Elm Street (ID 78) - 17 units
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (78, "101P", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "111", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "112", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "113", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "114", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "211", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "212", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "213", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "214", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "311", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "312", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "313", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "314", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "411", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "412", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "413", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (78, "414", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");

-- 4. Insert Verified Units for 24 Elm Street (ID 79) - 14 units (no 24- prefix)
INSERT INTO `unit` (`building_id`, `unit_number`, `floor`, `comments`, `provenance`) VALUES
  (79, "101", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "102", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "103", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "104", "First Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "201", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "202", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "203", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "204", "Second Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "301", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "302", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "303", "Third Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "401", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "402", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22"),
  (79, "403", "Fourth Floor", "verified — Yardi extract 2026-10-22", "verified — Yardi extract 2026-10-22");
