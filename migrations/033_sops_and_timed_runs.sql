-- 033: SOPs in-app (library + timed checklist runs)
-- SOP definitions are reference data. Runs are INSERT-ONLY (append-only): a completed run is
-- never edited or deleted; a correction is a new run / new timeline event.
-- Unknown values are stored as NULL / empty and flagged todo_verify. Nothing here is invented.

CREATE TABLE IF NOT EXISTS `sop` (
  `id` TEXT PRIMARY KEY,
  `title` TEXT NOT NULL,
  `category` TEXT NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `required_tools` TEXT NOT NULL DEFAULT '[]',        -- JSON array of strings
  `required_parts` TEXT NOT NULL DEFAULT '[]',        -- JSON array of strings
  `access_requirements` TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  `compliance_gates` TEXT NOT NULL DEFAULT '[]',      -- JSON array of {id,label,reference,requirement}
  `weather_exposure` TEXT NULL,                       -- 'indoor' | 'exterior' | 'exterior_ladder' | NULL (unknown)
  `two_person` INTEGER NULL,                          -- 1 | 0 | NULL (unknown)
  `todo_verify` INTEGER NOT NULL DEFAULT 0,           -- 1 = shell / unverified content
  `source_note` TEXT NULL,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `sop_step` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `sop_id` TEXT NOT NULL,
  `position` INTEGER NOT NULL,
  `instruction` TEXT NOT NULL,
  `est_minutes` INTEGER NULL,                         -- NULL = unknown
  `todo_verify` INTEGER NOT NULL DEFAULT 0,
  UNIQUE (`sop_id`, `position`)
);

CREATE TABLE IF NOT EXISTS `sop_run` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `sop_id` TEXT NOT NULL,
  `sop_version` INTEGER NOT NULL DEFAULT 1,
  `sop_title` TEXT NOT NULL,                          -- snapshot
  `ticket_id` INTEGER NULL,
  `technician` TEXT NOT NULL,
  `started_at` TEXT NOT NULL,
  `finished_at` TEXT NOT NULL,
  `total_seconds` INTEGER NOT NULL,
  `notes` TEXT NULL,
  `acknowledged_gates` TEXT NOT NULL DEFAULT '[]',    -- JSON array of gate ids
  `weather_warnings` TEXT NOT NULL DEFAULT '[]',      -- JSON array of strings shown at start
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `sop_run_step` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `run_id` INTEGER NOT NULL,
  `position` INTEGER NOT NULL,
  `instruction` TEXT NOT NULL,                        -- snapshot of the step text at run time
  `started_at` TEXT NOT NULL,
  `completed_at` TEXT NOT NULL,
  `duration_seconds` INTEGER NOT NULL,
  `note` TEXT NULL,
  `deviation` INTEGER NOT NULL DEFAULT 0,
  UNIQUE (`run_id`, `position`)
);

CREATE INDEX IF NOT EXISTS `idx_sop_run_ticket` ON `sop_run` (`ticket_id`);
CREATE INDEX IF NOT EXISTS `idx_sop_run_sop` ON `sop_run` (`sop_id`);

-- Seed: Gas furnace service. NO existing SOP content was found in the repo, so this is a
-- clearly-marked SHELL. Every step is a TODO-verify placeholder; nothing is presented as verified.
-- Mirror of SEED_SOPS in sop_constants.ts.
INSERT OR IGNORE INTO `sop`
  (`id`, `title`, `category`, `version`, `required_tools`, `required_parts`, `access_requirements`,
   `compliance_gates`, `weather_exposure`, `two_person`, `todo_verify`, `source_note`)
VALUES
  ('sop-gas-furnace-service',
   'Gas furnace service (CSA B149.1-25 / TSSA)',
   'Gas / HVAC',
   1,
   '[]',
   '[]',
   '[]',
   '[{"id":"csa-b149-1-25","label":"CSA B149.1-25","reference":"CSA B149.1-25 (natural gas and propane installation code)","requirement":"TODO-verify: applicable clauses not yet provided"},{"id":"tssa-gas","label":"TSSA","reference":"TSSA (Technical Standards and Safety Authority, Ontario)","requirement":"TODO-verify: applicable requirements not yet provided"}]',
   NULL,
   NULL,
   1,
   'SHELL - no gas-furnace SOP content existed in the repo. Steps, tools, parts, access, weather and two-person flag are TODO-verify until Jose supplies the procedure.');

INSERT OR IGNORE INTO `sop_step` (`sop_id`, `position`, `instruction`, `est_minutes`, `todo_verify`) VALUES
  ('sop-gas-furnace-service', 1, 'TODO-verify: step 1 not yet provided', NULL, 1),
  ('sop-gas-furnace-service', 2, 'TODO-verify: step 2 not yet provided', NULL, 1),
  ('sop-gas-furnace-service', 3, 'TODO-verify: step 3 not yet provided', NULL, 1);
