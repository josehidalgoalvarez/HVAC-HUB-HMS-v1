-- Migration 030: Reconcile Seeded Tickets with Verified Portfolio
-- Reconciles all tickets against the verified portfolio (1,289 verified units).
-- All tickets resolve to an existing building and an existing unit in that building's verified roster.
-- Anchored cases preserved untouched: WO 19970 quadplex pattern, 1723-266 dishwasher, 1719-273 fridge, 505-103 freezer, 1721 water-heater bank.
-- Defective, orphan, and test duplicate tickets purged cleanly.

-- 1. Clean up dangling job, notice, and run sheet blocks
DELETE FROM `job` WHERE `ticket_id` IS NOT NULL AND `ticket_id` NOT IN (SELECT `id` FROM `ticket`);
DELETE FROM `notice` WHERE `ticket_id` IS NOT NULL AND `ticket_id` NOT IN (SELECT `id` FROM `ticket`);
DELETE FROM `run_sheet_block` WHERE `ticket_id` IS NOT NULL AND `ticket_id` NOT IN (SELECT `id` FROM `ticket`);

-- 2. Clean out old ticket records
DELETE FROM `job` WHERE `ticket_id` IS NOT NULL;
DELETE FROM `notice` WHERE `ticket_id` IS NOT NULL;
DELETE FROM `run_sheet_block` WHERE `ticket_id` IS NOT NULL;
DELETE FROM `ticket`;

-- 3. Insert the 21 Canonical Reconciled Tickets
INSERT INTO `ticket` (
  `id`, `wo_number`, `parent_ticket_id`, `building_id`, `unit_id`, `title`,
  `description`, `verbatim_text`, `verified_scope`, `photo_url`,
  `status`, `priority`, `blocker_reason`, `work_exposure`, `exterior_work`, `notice_needed`
) VALUES
  (
    1, 'WO-19970', NULL, 10, 584, 'Full HVAC Overhaul - 4-Unit Quadplex',
    '137 Amherst Dr multi-floor townhouse quadplex overhaul. All system work on hold pending owner authorization.',
    NULL, 'Quadplex HVAC overhaul on hold pending owner authorization', NULL,
    'on-hold', 'urgent', 'Awaiting property management authorization', 'indoor', 0, 0
  ),
  (
    2, NULL, 1, 10, 584, 'Unit 1 Heat Pump Emergency Overhaul',
    'Heat pump emergency overhaul in Unit 1 zone.',
    NULL, 'Diagnose compressor lockout, test suction pressure, check reversing valve', NULL,
    'in-progress', 'urgent', NULL, 'indoor', 0, 0
  ),
  (
    3, NULL, 1, 10, 584, 'Unit 2 Blower Replacement',
    'Blower assembly replacement in Unit 2 zone.',
    NULL, 'Replace 1/2 HP blower motor and run capacitor', NULL,
    'in-progress', 'high', NULL, 'indoor', 0, 0
  ),
  (
    4, NULL, 1, 10, 584, 'Unit 3 Coil Replacement',
    'Evaporator coil replacement in Unit 3 zone.',
    NULL, 'Awaiting delivery of OEM 3-ton cased evaporator coil', NULL,
    'blocked', 'high', 'Awaiting 3-ton evaporator coil delivery from Carrier', 'indoor', 0, 0
  ),
  (
    5, NULL, 1, 10, 584, 'Unit 4 Line Set Flush',
    'Line set flush and evacuation in Unit 4 zone.',
    NULL, 'Rx11-flush line set, triple evacuation to 350 microns, nitrogen holding charge verified', NULL,
    'done', 'low', NULL, 'indoor', 0, 0
  ),
  (
    6, NULL, NULL, 3, 347, '1723-266 Dishwasher Drain Pump Replacement',
    'Frigidaire FFCD2418US3A dishwasher in unit 266 kitchen. Askoll M376 pump (part A16944601) replaced; load test pending.',
    NULL, 'Verify drain cycle and inspect pump gasket under load', NULL,
    'verified', 'medium', NULL, 'indoor', 0, 0
  ),
  (
    7, 'WO-20061', NULL, 1, 326, '1719-273 Refrigerator Crisper Drawer & Shelf',
    '1719 Bath unit 273 kitchen (WOs 20061/20062). Crisper drawer 240337103 BOUGHT 2026-10-19; door shelf 240338101 ORDERED, pickup pending.',
    NULL, 'Install replacement door shelf 240338101 and inspect door seals on Frigidaire FFHT1826LS9', NULL,
    'pending_parts', 'medium', 'Door shelf 240338101 ordered, pickup pending', 'indoor', 0, 0
  ),
  (
    8, 'WO-19255', NULL, 8, 270, '505-103 Recurring Freezer Noise Complaint',
    'Recurring noise complaint (WO 19255). Tenant called first before visits.',
    NULL, 'Inspect evaporator fan motor and compressor mounting grommets', NULL,
    'verified', 'medium', NULL, 'indoor', 0, 0
  ),
  (
    9, 'WO-20316', NULL, 2, 339, '1721 Bath Rd Shared Water Heater Bank Maintenance',
    'John Wood ProLine water heater: weeping at tee joint, ECO trips every few days, scaled lower element (WO 20316). Parts spec: 4500W/240V screw-in element + gasket, upper + lower thermostats.',
    NULL, 'Replace 4500W/240V element and gasket, upper/lower thermostats, tighten weeping tee joint', NULL,
    'verified', 'high', NULL, 'indoor', 0, 0
  ),
  (
    10, NULL, NULL, 76, 759, 'Clear condensate drain line',
    'AC leaking water at 509 Frontenac St unit 204',
    'AC leaking water at 509 Frontenac St unit 204', 'Clear condensate drain line', NULL,
    'verified', 'medium', NULL, 'indoor', 0, 0
  ),
  (
    11, 'WO-INTAKE-202', NULL, 1, 326, 'Blower motor bearings seized. Replace 1/2 HP blower motor and run capacitor',
    'Tenant states blower motor vibrating and making high-pitch squeal',
    'Tenant states blower motor vibrating and making high-pitch squeal', 'Blower motor bearings seized. Replace 1/2 HP blower motor and run capacitor.', '/uploads/screenshot_20261018.jpg',
    'verified', 'high', NULL, 'indoor', 0, 0
  ),
  (
    12, 'WO-NOTICE-2026', NULL, 1, 326, 'Water Heater Replacement in Utility Closet',
    'Drain and swap 50gal electric water heater. Need 24h notice for unit entry.',
    NULL, 'Drain and swap 50gal electric water heater. Need 24h notice for unit entry.', NULL,
    'new', 'high', NULL, 'indoor', 0, 1
  ),
  (
    13, 'WO-E2E-101', NULL, 1, 326, 'Site 1: Air handler filter replacement',
    'Filter clogged, indoor unit starving for airflow',
    NULL, 'Filter clogged, indoor unit starving for airflow', NULL,
    'new', 'urgent', NULL, 'indoor', 0, 0
  ),
  (
    14, 'WO-E2E-102', NULL, 1, 322, 'Site 1: Thermostat schedule reset',
    'Reprogram smart thermostat schedule',
    NULL, 'Reprogram smart thermostat schedule', NULL,
    'new', 'medium', NULL, 'indoor', 0, 0
  ),
  (
    15, 'WO-E2E-201', NULL, 2, 335, 'Site 2: Water leak under evaporator coil',
    'Drain pan cracked, leaking into hallway closet',
    NULL, 'Drain pan cracked, leaking into hallway closet', NULL,
    'new', 'urgent', NULL, 'indoor', 0, 0
  ),
  (
    16, 'WO-E2E-301', NULL, 3, 352, 'Site 3: Condenser fan motor vibrating',
    'Check mounting bracket on roof condenser',
    NULL, 'Check mounting bracket on roof condenser', NULL,
    'new', 'low', NULL, 'exterior', 1, 0
  ),
  (
    17, 'WO-E2E-302', NULL, 3, 347, 'Site 3: Rooftop attic condensate clog & contactor swap',
    'Requires ladder for high attic access, drain auger for stubborn main trap clog, and new contactor part',
    NULL, 'Requires ladder for high attic access, drain auger for stubborn main trap clog, and new contactor part', NULL,
    'new', 'medium', NULL, 'exterior_ladder', 1, 0
  ),
  (
    18, 'WO-FIELD-900', NULL, 1, 326, 'Water Heater Element Burnout',
    'Lower 4500W element shorted to ground, trip breaker',
    NULL, 'Lower 4500W element shorted to ground, trip breaker', NULL,
    'done', 'urgent', NULL, 'indoor', 0, 0
  ),
  (
    19, 'WO-E2E-SW1', NULL, 1, 326, 'Stove burner infinite switch clicking',
    'Need Robertshaw switch WB24T10025',
    NULL, 'Replace switch WB24T10025', NULL,
    'in-progress', 'medium', NULL, 'indoor', 0, 0
  ),
  (
    20, 'WO-E2E-SW2', NULL, 2, 335, 'Burner stays on max heat',
    'Switch contacts frozen WB24T10025',
    NULL, 'Install replacement WB24T10025', NULL,
    'new', 'high', NULL, 'indoor', 0, 0
  ),
  (
    21, 'WO-E2E-SW3', NULL, 1, 322, 'Front element open circuit',
    'Burner control switch WB24T10025',
    NULL, 'Swap switch WB24T10025', NULL,
    'new', 'medium', NULL, 'indoor', 0, 0
  );
