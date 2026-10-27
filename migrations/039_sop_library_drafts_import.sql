-- Import of WO-derived SOP library drafts (from SOP_LIBRARY_DRAFTS.md).
-- All rows are DRAFTS: todo_verify = 1 on every SOP and every step, awaiting Jose's correction.
-- Every [JOSE: confirm] gap from the doc is kept verbatim in a step, part, or access row.
-- SOP-D (dropped) and the WO-E2E-based drafts are not imported. Gas-furnace SOP rows are not touched.

INSERT INTO `sop` (`id`, `title`, `category`, `version`, `required_tools`, `required_parts`, `access_requirements`, `compliance_gates`, `weather_exposure`, `two_person`, `todo_verify`, `source_note`) VALUES ('sop-condensate-and-drain-line-clearing', 'DRAFT: Condensate and drain line clearing', 'Unassigned [JOSE: confirm]', 1, '[]', '[]', '[]', '[]', NULL, NULL, 1, 'DRAFT imported from SOP_LIBRARY_DRAFTS.md (WO-derived); awaiting Jose''s correction; todo_verify until approved.');
INSERT INTO `sop_step` (`sop_id`, `position`, `instruction`, `est_minutes`, `todo_verify`) VALUES
  ('sop-condensate-and-drain-line-clearing', 1, 'Clear the condensate drain line (ticket 10 verified scope). [JOSE: confirm] how the line is cleared.', NULL, 1),
  ('sop-condensate-and-drain-line-clearing', 2, '[JOSE: confirm] how drainage is verified after clearing.', NULL, 1),
  ('sop-condensate-and-drain-line-clearing', 3, '[JOSE: confirm] whether the 1731/1733 main stack is cleared from the mechanical room or only the trap.', NULL, 1),
  ('sop-condensate-and-drain-line-clearing', 4, 'CONTEXT — When it applies: Symptom: AC leaking water (ticket 10: "AC leaking water at 509 Frontenac St unit 204", building 76, unit 759).', NULL, 1),
  ('sop-condensate-and-drain-line-clearing', 5, 'CONTEXT — When it applies: Recurring blockage in the 1731/1733 shared mechanical room drain stack (appliance note, no WO#).', NULL, 1),
  ('sop-condensate-and-drain-line-clearing', 6, 'GAP — Tools and parts: None named in the sources. [JOSE: confirm].', NULL, 1),
  ('sop-condensate-and-drain-line-clearing', 7, 'GAP — Safety and compliance: None evidenced. [JOSE: confirm].', NULL, 1),
  ('sop-condensate-and-drain-line-clearing', 8, 'NOT TO DO — Not evidenced in sources. Do not add a rule without Jose''s correction.', NULL, 1);

INSERT INTO `sop` (`id`, `title`, `category`, `version`, `required_tools`, `required_parts`, `access_requirements`, `compliance_gates`, `weather_exposure`, `two_person`, `todo_verify`, `source_note`) VALUES ('sop-water-heater-element-thermostat-and-tee-joint', 'DRAFT: Water heater element, thermostat, and tee joint', 'Unassigned [JOSE: confirm]', 1, '[]', '["4500W/240V screw-in element (WO-20316)", "Gasket for the element (WO-20316)", "Upper thermostat (WO-20316)", "Lower thermostat (WO-20316)"]', '[]', '[]', NULL, NULL, 1, 'DRAFT imported from SOP_LIBRARY_DRAFTS.md (WO-derived); awaiting Jose''s correction; todo_verify until approved.');
INSERT INTO `sop_step` (`sop_id`, `position`, `instruction`, `est_minutes`, `todo_verify`) VALUES
  ('sop-water-heater-element-thermostat-and-tee-joint', 1, 'Trip the breaker when an element is shorted to ground (WO-FIELD-900).', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 2, 'Replace the scaled lower element with a 4500W/240V screw-in element and gasket (WO-20316).', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 3, 'Replace the upper and lower thermostats (WO-20316).', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 4, 'Tighten the weeping tee joint (WO-20316).', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 5, 'For a full heater swap: drain and swap the 50-gal electric heater (WO-NOTICE-2026). [JOSE: confirm] the rest of the swap sequence.', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 6, '[JOSE: confirm] electrical isolation before element or thermostat work. No source names a lockout step.', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 7, '[JOSE: confirm] how ECO trips are checked after the work.', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 8, 'CONTEXT — When it applies: Weeping at the tee joint, ECO trips every few days, scaled lower element (WO-20316, 1721 Bath shared bank, building 2, unit 339).', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 9, 'CONTEXT — When it applies: Lower 4500W element shorted to ground, breaker trips (WO-FIELD-900, 1719-273, unit 326).', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 10, 'CONTEXT — When it applies: Drain and swap a 50-gal electric heater in the utility closet, 24h entry notice needed (WO-NOTICE-2026, 1719-273).', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 11, 'CONTEXT — Where seen: 1721 Bath shared mechanical room: 7 heaters (3 operational, 2 valved off holding stagnant water, 2 disconnected and rotting). Source: building note.', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 12, 'CONTEXT — Where seen: 1721 Bath AO Smith 46-gal, valved off, still holding stagnant water. Flags: drain, management health note. Source: appliance note.', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 13, 'GAP — Tools: None named in WOs. [JOSE: confirm].', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 14, 'GAP — Safety and compliance: Breaker trip on ground fault is evidenced (WO-FIELD-900). No other safety rule is evidenced. [JOSE: confirm].', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 15, 'NOT TO DO — Do not treat valved-off or disconnected heaters in the 1721 bank as in service. Source: building and appliance notes.', NULL, 1),
  ('sop-water-heater-element-thermostat-and-tee-joint', 16, 'NOT TO DO — Do not leave the stagnant-water AO Smith undrained. Source: appliance note flags "drain + management health note".', NULL, 1);

INSERT INTO `sop` (`id`, `title`, `category`, `version`, `required_tools`, `required_parts`, `access_requirements`, `compliance_gates`, `weather_exposure`, `two_person`, `todo_verify`, `source_note`) VALUES ('sop-freezer-noise-complaint-505-103', 'DRAFT: Freezer noise complaint (505-103)', 'Unassigned [JOSE: confirm]', 1, '[]', '[]', '[]', '[]', NULL, NULL, 1, 'DRAFT imported from SOP_LIBRARY_DRAFTS.md (WO-derived); awaiting Jose''s correction; todo_verify until approved.');
INSERT INTO `sop_step` (`sop_id`, `position`, `instruction`, `est_minutes`, `todo_verify`) VALUES
  ('sop-freezer-noise-complaint-505-103', 1, 'Tenant is called first before the visit (WO-19255 note).', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 2, 'Inspect the evaporator fan motor (WO-19255 scope).', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 3, 'Inspect the compressor mounting grommets (WO-19255 scope).', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 4, '[JOSE: confirm] the fix for each finding and how the noise is confirmed gone.', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 5, '[JOSE: confirm] any cooling check. The sources do not support one.', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 6, 'CONTEXT — When it applies: Recurring freezer noise complaint (WO-19255, 505 Days Rd, unit 103, building 8, unit 270).', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 7, 'CONTEXT — When it applies: Freezer brand and model are unknown in the sources (TODO-verify). Do not fill them in.', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 8, 'GAP — Tools and parts: None named in WO-19255. [JOSE: confirm].', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 9, 'GAP — Safety and compliance: None evidenced. [JOSE: confirm].', NULL, 1),
  ('sop-freezer-noise-complaint-505-103', 10, 'NOT TO DO — Not evidenced in sources. Do not add a rule without Jose''s correction.', NULL, 1);

INSERT INTO `sop` (`id`, `title`, `category`, `version`, `required_tools`, `required_parts`, `access_requirements`, `compliance_gates`, `weather_exposure`, `two_person`, `todo_verify`, `source_note`) VALUES ('sop-blower-motor-and-run-capacitor-swap', 'DRAFT: Blower motor and run capacitor swap', 'Unassigned [JOSE: confirm]', 1, '[]', '["1/2 HP blower motor (WO-INTAKE-202; ticket 3)", "Run capacitor (WO-INTAKE-202; ticket 3); rating [JOSE: confirm]"]', '[]', '[]', NULL, NULL, 1, 'DRAFT imported from SOP_LIBRARY_DRAFTS.md (WO-derived); awaiting Jose''s correction; todo_verify until approved.');
INSERT INTO `sop_step` (`sop_id`, `position`, `instruction`, `est_minutes`, `todo_verify`) VALUES
  ('sop-blower-motor-and-run-capacitor-swap', 1, 'Confirm the vibration and high-pitch squeal reported by the tenant (WO-INTAKE-202).', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 2, 'Replace the 1/2 HP blower motor (WO-INTAKE-202; ticket 3).', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 3, 'Replace the run capacitor (WO-INTAKE-202; ticket 3).', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 4, '[JOSE: confirm] wiring, test run, and verification.', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 5, 'CONTEXT — When it applies: Blower motor vibrating with a high-pitch squeal, bearings seized (WO-INTAKE-202, 1719-273, unit 326).', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 6, 'CONTEXT — When it applies: Unit 2 blower replacement in the 137 Amherst quadplex (ticket 3, child of WO-19970, 137 Amherst Dr building 10, unit 584, Unit 2 zone).', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 7, 'CONTEXT — Note: WO-19970 is on hold pending owner authorization. Ticket 3 is in progress. [JOSE: confirm] whether ticket 3 can proceed while the parent is on hold.', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 8, 'GAP — Tools: None named in WOs. [JOSE: confirm].', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 9, 'GAP — Safety and compliance: None evidenced. [JOSE: confirm].', NULL, 1),
  ('sop-blower-motor-and-run-capacitor-swap', 10, 'NOT TO DO — Not evidenced in sources. Do not add a rule without Jose''s correction.', NULL, 1);

INSERT INTO `sop` (`id`, `title`, `category`, `version`, `required_tools`, `required_parts`, `access_requirements`, `compliance_gates`, `weather_exposure`, `two_person`, `todo_verify`, `source_note`) VALUES ('sop-entry-and-24h-notice-coordination', 'DRAFT: Entry and 24h notice coordination', 'Unassigned [JOSE: confirm]', 1, '[]', '[]', '["24h notice before unit entry (WO-NOTICE-2026: \"Need 24h notice for unit entry\")", "Tenant contact before visits (WO-19255: \"Tenant called first before visits\")"]', '[{"id": "notice-24h-entry-gate", "label": "24h entry gate", "reference": "TicketDetailView Notice of Entry card; migration 011 (notice_sent_at)", "requirement": "24h entry gate from notice_sent_at. \"ENTRY BLOCKED\" while notice is required but not yet sent."}]', NULL, NULL, 1, 'DRAFT imported from SOP_LIBRARY_DRAFTS.md (WO-derived); awaiting Jose''s correction; todo_verify until approved.');
INSERT INTO `sop_step` (`sop_id`, `position`, `instruction`, `est_minutes`, `todo_verify`) VALUES
  ('sop-entry-and-24h-notice-coordination', 1, 'Flag notice needed on the ticket (WO-NOTICE-2026, notice_needed set).', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 2, '[JOSE: confirm] who sends the notice. The team does not draft or send 24h notices; migration 011 records only who confirmed the notice (notice_confirmed_by), and no repo source states this rule.', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 3, 'Record when the notice was sent and by whom (migration 011: notice_sent_at, notice_confirmed_by).', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 4, 'Wait for the 24h gate measured from notice_sent_at before entry (TicketDetailView: "24h countdown active" after notice is marked sent).', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 5, 'Check the ticket''s hold status before dispatch (WO-19970 on hold).', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 6, 'CONTEXT — When it applies: Any work needing unit entry. WO-NOTICE-2026 says "Need 24h notice for unit entry" (1719-273, notice_needed set).', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 7, 'CONTEXT — When it applies: Tenant contact before visits (WO-19255: "Tenant called first before visits").', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 8, 'CONTEXT — When it applies: Work on hold pending owner authorization (WO-19970).', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 9, 'NOT TO DO — Do not enter the unit before the 24h gate passes (TicketDetailView: "Tenant entry prohibited" until notice is sent; WO-NOTICE-2026).', NULL, 1),
  ('sop-entry-and-24h-notice-coordination', 10, 'NOT TO DO — Do not draft or send a 24h notice as a team. No repo source states this rule; it is kept as Jose''s stated rule.', NULL, 1);
