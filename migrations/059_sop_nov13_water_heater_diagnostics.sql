-- Migration 059: Draft SOPs from Nov 13, 2026 water-heater field diagnostics.
-- Note: 058 was taken by migrations/058_add_ticket_relationship_table.sql (unit history).
-- All rows are DRAFTS: todo_verify = 1 on every SOP and every step, awaiting Jose's correction.

INSERT INTO `sop` (`id`, `title`, `category`, `version`, `required_tools`, `required_parts`, `access_requirements`, `compliance_gates`, `weather_exposure`, `two_person`, `todo_verify`, `source_note`) VALUES (
  'sop-water-heater-breaker-safety-margin',
  'DRAFT: Water heater breaker safety margin and warm-breaker diagnosis',
  'Unassigned [JOSE: confirm]',
  1,
  '["Clamp meter", "Multimeter / resistance meter", "Megger (leakage check)"]',
  '["Homeline HOM220, 20 A 2-pole, common trip breaker"]',
  '[]',
  '["80% continuous-load ceiling (16 A max on a 20 A breaker)", "125% sizing rule (breaker >= load x 1.25)", "140F minimum storage setpoint (Legionella)"]',
  NULL,
  NULL,
  1,
  'DRAFT from Nov 13, 2026 field diagnostics, 565 Princess unit 401 (Ticket 46); awaiting Jose''s correction; todo_verify until approved.'
);

INSERT INTO `sop_step` (`sop_id`, `position`, `instruction`, `est_minutes`, `todo_verify`) VALUES
  ('sop-water-heater-breaker-safety-margin', 1, 'Clamp the element lead while the tank is heating and record amps and supply voltage. (565-401, Nov 13: bottom element 13.78 A at 206 V.)', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 2, 'Do the load math: load amps = watts / volts. A 3000 W element at 208 V draws 14.42 A nominal.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 3, 'Apply the 80% continuous-load ceiling: a breaker on a continuous load (3+ hours, which a water heater is) may carry at most 80% of its rating. On a 20 A breaker that is 16 A max.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 4, 'Apply the 125% rule the other way: the breaker must be rated at least load x 1.25 (14.42 x 1.25 = 18 A), so 20 A is the next standard size up — the exact minimum. There is no spare margin.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 5, 'A warm breaker with a NORMAL current reading points at the breaker and its connections, not the tank. Breakers trip on heat, not just current.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 6, 'Clamp the TOP element lead while the bottom is drawing — this is the decider. Top reads 0: the interlock works, the fault is the breaker or a connection. Top also draws ~14 A: both elements are on together (~28 A on a 20 A breaker) and the upper thermostat changeover contact is stuck.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 7, 'Verify the wiring is non-simultaneous per diagram A-6: the changeover contact on the upper thermostat (terminal 4) sends power to the upper element OR down to the lower thermostat, never both.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 8, 'Verify the circuit is isolated: kill the breaker and check nothing else loses power (recirc pump, closet light, receptacle tapped in would add amps).', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 9, 'Check the quad-breaker common-trip pairing: the heater''s two hot wires must land on a common-trip 2-pole pair, not on two independent single poles — a 240 V load on two singles is wrong, since one leg could trip while the other stays live.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 10, 'Panel check with the breaker off: terminal screws tight, no discoloration or heat marks on the breaker or the bus, bus stab free of pitting. Note dust on the breakers (it insulates them) and heat from neighbouring breakers.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 11, 'Tank-top junction box (the tank sits in a closet): open it and look for damp, corrosion, loose wire nuts, or scorching. The closet traps humidity — that is where it matters.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 12, 'Check leakage current: megger each element to ground, or clamp the ground wire while heating. Any steady ground current adds to what the breaker sees.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 13, 'Swap spec: same type, Homeline HOM220, 20 A 2-pole, common trip. Do NOT upsize to 25 A unless the wire is 10 AWG — 12 AWG means 20 A is the max.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 14, 'After the swap, run a full recovery and feel the new breaker. If it also runs almost hot, the heat is coming from the bus or the neighbour — next step is the bus stab, or moving the 20 A to a slot away from the 40 A if the panel allows it.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 15, 'Builder-deficiency flag: on units 2–3 months old, a breaker running almost hot at normal current is a DEFECTIVE breaker or a bad connection from install (loose bus stab or terminal), not wear — thermal fatigue is dead on a new breaker. Route it as a deficiency claim, not maintenance, and check whether other units trip the same way (same batch of breakers = building-wide install issue).', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 16, 'Setpoint: restore to 140F minimum once the trip is fixed (Legionella floor). Lowering the setpoint to 130F does NOT change current draw and does not fix trips.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 17, 'CONTEXT — When it applies: 20 A double-pole breaker trips sometimes, randomly, or after a shower; bottom element 13.78 A at 206 V, elements test good (13.8 / 14 ohm), wiring verified non-simultaneous (565 Princess unit 401, Ticket 46, Nov 13, 2026).', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 18, 'CONTEXT — Where seen: John Wood E50TE-30208 250, SN 2616147864072, 48 gal, 3000 W @ 208 V, Circuit A6 (565-401).', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 19, 'GAP — [JOSE: confirm] what the neighbouring 40 A breaker feeds. The sources say only "a 40 Amp breaker beside it" — do not record it as the range without confirmation.', NULL, 1),
  ('sop-water-heater-breaker-safety-margin', 20, 'NOT TO DO — Do not upsize the breaker without confirming the wire gauge. Do not treat a warm breaker as proof the tank is faulty when the current reading is normal.', NULL, 1);

INSERT INTO `sop` (`id`, `title`, `category`, `version`, `required_tools`, `required_parts`, `access_requirements`, `compliance_gates`, `weather_exposure`, `two_person`, `todo_verify`, `source_note`) VALUES (
  'sop-eco-trip-diagnosis-and-monitoring',
  'DRAFT: Electric water heater ECO-trip diagnosis and monitoring',
  'Unassigned [JOSE: confirm]',
  1,
  '["Multimeter / resistance meter", "Clamp meter", "Megger (leakage check)", "Hose + drain (full tank flush)"]',
  '["Element + gasket (spec per rating plate — E50TE 3000 W / 208 V screw-in; E80TE 4500 W)", "Upper thermostat / ECO assembly (if in doubt)", "Anode rod (inspect, replace if depleted)"]',
  '[]',
  '["140F minimum storage setpoint (Legionella)"]',
  NULL,
  NULL,
  1,
  'DRAFT from Nov 13, 2026 field diagnostics, 1721/1723 Bath Rd plant (WO 20316 / WO 20583, Ticket 38) + Bay Electric element swap Nov 13, 2026; awaiting Jose''s correction; todo_verify until approved.'
);

INSERT INTO `sop_step` (`sop_id`, `position`, `instruction`, `est_minutes`, `todo_verify`) VALUES
  ('sop-eco-trip-diagnosis-and-monitoring', 1, 'Reset-only does NOT fix a recurring ECO trip. A reset buys days, not a repair — do not close the file on a reset.', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 2, 'Full fix sequence: test both thermostats (replace the upper thermostat / ECO assembly if in doubt), full tank flush, dip-tube and anode inspection while the tank is open, element + gasket swap. An element + gasket swap ALONE will not break the cycle.', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 3, 'Element spec is per-tank — read the rating plate, do not carry a spec across tanks. E50TE = 3000 W / 208 V screw-in. E80TE = 4500 W elements (verify voltage on the plate).', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 4, 'Setpoint 140F, never below (Legionella floor).', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 5, 'After any fix, MONITOR — do not call it fixed on swap day. The ECO used to trip every few days, so a few days WITHOUT a trip is the actual test.', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 6, 'Identify the tank FIRST: photograph the rating plate (model + serial) before ordering parts or recording anything. Two tanks in one room can look alike, and a serial filed for the wrong tank stays wrong until a plate proves otherwise.', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 7, 'Record who did the work, the date, and the WO number. A swap under a completed WO with no number on file is an open record, not a closed one — leave the number blank until it surfaces, never guess it.', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 8, 'CONTEXT — When it applies: ECO trips every few days, reset restores hot water temporarily, problem keeps returning (1721/1723 Bath Rd shared plant, WO 20316 / WO 20583, Ticket 38).', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 9, 'CONTEXT — Where seen: 1721/1723 plant room holds 2x John Wood E80TE 75.7-gal (SN 2137126116538 and SN 2142126637300) plus one E50TE 48-gal whose real serial is UNKNOWN until its plate is photographed. Bay Electric changed both elements on the E80TE SN 2137126116538 on Nov 13, 2026; status is MONITORING, not fixed.', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 10, 'CONTEXT — Correction to the existing draft: the existing SOP sop-water-heater-element-thermostat-and-tee-joint (migration 039) step 2 and required_parts carry a 4500 W / 240 V element spec from WO-20316. That spec matches the E80TE, NOT the E50TE (3000 W / 208 V). [JOSE: confirm] the correction on that SOP — this SOP does not edit it.', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 11, 'GAP — [JOSE: confirm] which WO the Nov 13 Bay Electric element swap was under (completed WO, number unknown).', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 12, 'GAP — [JOSE: confirm] the 1721 E50TE''s real serial (plate photograph still owed).', NULL, 1),
  ('sop-eco-trip-diagnosis-and-monitoring', 13, 'NOT TO DO — Do not record a serial from one tank onto another. Do not close an ECO-trip file on the day of a repair — monitor first. Do not treat a reset as a fix.', NULL, 1);
