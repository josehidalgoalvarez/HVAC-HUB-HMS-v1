# SOP Library Drafts (from past WOs)

Status: DRAFTS for Jose to correct. Nothing here is verified field procedure until Jose signs it off.

## Sources and rules used

- The 21 reconciled tickets in `migrations/030_reconcile_tickets_with_verified_portfolio.sql` and `RESIDENTIAL_TICKETS` in `residential_constants.tsx`.
- Verified appliance, building, and unit notes in `cli/seed_portfolio.php` and `residential_constants.tsx`.
- Format from the gas-furnace SOP (`sop_constants.ts`, migrations 033 and 037).
- Standing rule 5 from `CLAUDE.md` for the 24h notice gate.

Rules applied to every draft:
- Tools and parts are listed only where a WO or note names them. The WO is cited.
- Steps are listed only where a WO or note names the action. The order is the order of the WO text. Anything else is marked `[JOSE: confirm]`.
- Model numbers, serials, and measurements not in the sources are not filled in.

## Caveat on WO identifiers

Eight of the 21 tickets carry test-style identifiers: `WO-E2E-101`, `WO-E2E-102`, `WO-E2E-201`, `WO-E2E-301`, `WO-E2E-302`, `WO-E2E-SW1`, `WO-E2E-SW2`, and `WO-E2E-SW3`. The repo's own end-to-end tests create these identifiers: `tests/test_phase2_e2e.mjs` (101, 201, 301) and `tests/test_phase4_e2e.mjs` (SW1, SW2, SW3). `tests/verify_ticket_portfolio_reconciliation.php` and `cli/seed_portfolio.php` also list them. So they are most likely test fixtures, not field work orders. They are cited below and marked **(E2E ID)**. SOP-D rests entirely on them, and SOP-A rests on WO-E2E-302 for its main steps. Jose must confirm these are real jobs, or drop those drafts, before use.

## Patterns found

| Pattern | Supporting WOs and notes |
|---|---|
| (a) Drain and condensate blockages | WO-E2E-302 (E2E ID); ticket 10 "Clear condensate drain line" (no WO#, 509 Frontenac unit 204); 1731/1733 shared mechanical room note "Building drain stack has recurring blockages" (no WO#) |
| (b) Water heater element, thermostat, tee | WO-20316; WO-FIELD-900; WO-NOTICE-2026; 1721 shared heater bank note (no WO#) |
| (c) Freezer noise | WO-19255 (505-103); seed note "noisy freezer complaint (WO 19255)" |
| (d) Stove infinite switch WB24T10025 | WO-E2E-SW1, WO-E2E-SW2, WO-E2E-SW3 (all E2E IDs); 137 Amherst gray Frigidaire range note (no WO#) |
| (e) Blower motor and run capacitor | WO-INTAKE-202; ticket 3 "Unit 2 Blower Replacement" (child of WO-19970, no WO#) |
| (f) Entry and 24h notice | WO-NOTICE-2026; WO-19255 ("Tenant called first before visits"); WO-19970 (on hold pending owner authorization) |

Not drafted:
- **Cooling diagnosis for fridges or freezers.** The sources support only the freezer noise complaint.
- **Main-stack clearing method.** No source says how the 1731/1733 main stack is cleared.
- **Fridge door shelf and seal work (WO-20061).** Not a recurring pattern in the sources, so not drafted.
- **Dishwasher drain pump (ticket 6).** A single job, not a recurring pattern, so not drafted.

---

## SOP-A: Condensate and drain line clearing

Status: DRAFT — derived from WO-E2E-302 (E2E ID, likely test fixture), ticket 10 (no WO#), and the 1731/1733 drain stack note; awaiting Jose's correction.

When it applies:
- Symptom: AC leaking water (ticket 10: "AC leaking water at 509 Frontenac St unit 204").
- Symptom: attic condensate clog needing a drain auger (WO-E2E-302, 1723-266, building 3, unit 347, exterior-ladder work).
- Recurring blockage in the 1731/1733 shared mechanical room drain stack (appliance note, no WO#).

Tools (as named in WOs):
- Drain auger for the main trap clog (WO-E2E-302).
- Ladder for high attic access (WO-E2E-302).

Parts (as named in WOs):
- New contactor (WO-E2E-302). Part number and rating: `[JOSE: confirm]`.

Steps:
1. Access the attic by ladder (WO-E2E-302). `[JOSE: confirm]` fall protection or ladder setup is not in any source.
2. Clear the stubborn main trap clog with the drain auger (WO-E2E-302).
3. Replace the contactor (WO-E2E-302). `[JOSE: confirm]` whether this is done in the same visit or after the trap is clear.
4. `[JOSE: confirm]` how drainage is verified after clearing (no source records this).
5. `[JOSE: confirm]` whether the 1731/1733 main stack is cleared from the mechanical room or only the trap. No source says.

Safety and compliance:
- Ladder access is named in WO-E2E-302. No other safety rule is evidenced. `[JOSE: confirm]`.

What NOT to do:
- Not evidenced in sources. Do not add a rule without Jose's correction.

---

## SOP-B: Water heater element, thermostat, and tee joint

Status: DRAFT — derived from WOs WO-20316, WO-FIELD-900, WO-NOTICE-2026, and the 1721 shared heater bank note; awaiting Jose's correction.

When it applies:
- Weeping at the tee joint, ECO trips every few days, scaled lower element (WO-20316, 1721 Bath shared bank, building 2, unit 339).
- Lower 4500W element shorted to ground, breaker trips (WO-FIELD-900, 1719-273, unit 326).
- Drain and swap a 50-gal electric heater in the utility closet, 24h entry notice needed (WO-NOTICE-2026, 1719-273).

Where seen:
- 1721 Bath shared mechanical room: 7 heaters (3 operational, 2 valved off holding stagnant water, 2 disconnected and rotting). Source: building note.
- 1721 Bath AO Smith 46-gal, valved off, still holding stagnant water. Flags: drain, management health note. Source: appliance note.

Tools (as named in WOs):
- None named in WOs. `[JOSE: confirm]`.

Parts (WO-20316 parts spec):
- 4500W/240V screw-in element.
- Gasket for the element.
- Upper thermostat and lower thermostat.

Steps:
1. Trip the breaker when an element is shorted to ground (WO-FIELD-900).
2. Replace the scaled lower element with a 4500W/240V screw-in element and gasket (WO-20316).
3. Replace the upper and lower thermostats (WO-20316).
4. Tighten the weeping tee joint (WO-20316).
5. For a full heater swap: drain and swap the 50-gal electric heater (WO-NOTICE-2026). `[JOSE: confirm]` the rest of the swap sequence.
6. `[JOSE: confirm]` electrical isolation before element or thermostat work. No source names a lockout step.
7. `[JOSE: confirm]` how ECO trips are checked after the work.

Safety and compliance:
- Breaker trip on ground fault is evidenced (WO-FIELD-900). No other safety rule is evidenced. `[JOSE: confirm]`.

What NOT to do:
- Do not treat valved-off or disconnected heaters in the 1721 bank as in service. Source: building and appliance notes.
- Do not leave the stagnant-water AO Smith undrained. Source: appliance note flags "drain + management health note".

---

## SOP-C: Freezer noise complaint (505-103)

Status: DRAFT — derived from WO-19255; awaiting Jose's correction.

When it applies:
- Recurring freezer noise complaint (WO-19255, 505 Days Rd, unit 103, building 8, unit 270).
- Freezer brand and model are unknown in the sources (`TODO-verify`). Do not fill them in.

Tools and parts:
- None named in WO-19255. `[JOSE: confirm]`.

Steps:
1. Tenant is called first before the visit (WO-19255 note).
2. Inspect the evaporator fan motor (WO-19255 scope).
3. Inspect the compressor mounting grommets (WO-19255 scope).
4. `[JOSE: confirm]` the fix for each finding and how the noise is confirmed gone.
5. `[JOSE: confirm]` any cooling check. The sources do not support one.

Safety and compliance:
- None evidenced. `[JOSE: confirm]`.

What NOT to do:
- Not evidenced in sources. Do not add a rule without Jose's correction.

---

## SOP-D: Stove infinite switch replacement (WB24T10025)

Status: DRAFT — derived from WOs WO-E2E-SW1, WO-E2E-SW2, WO-E2E-SW3 (all E2E IDs, likely test fixtures) and the 137 Amherst range note; awaiting Jose's correction. Do not use until Jose confirms the WOs are real.

When it applies:
- Burner infinite switch clicking (WO-E2E-SW1, 1719-273, unit 326).
- Burner stays on max heat, switch contacts frozen (WO-E2E-SW2, 1721-268, unit 335).
- Front element open circuit, burner control switch (WO-E2E-SW3, 1719-172, unit 322).
- Gray Frigidaire range at 137 Amherst Dr, unit 137, on hold, switch WB24T10025 (appliance note, no WO#). Model is unknown (`TODO-verify`).

Tools:
- None named in WOs. `[JOSE: confirm]`.

Parts:
- Robertshaw infinite switch WB24T10025 (WO-E2E-SW1: "Need Robertshaw switch WB24T10025").
- Order by model number (seed note on the 137 Amherst range: "Burner infinite switch WB24T10025 (order by model #)").

Steps:
1. Order switch WB24T10025 by model number (seed note).
2. Replace the burner infinite switch (WO-E2E-SW1, WO-E2E-SW2, WO-E2E-SW3).
3. `[JOSE: confirm]` the wiring, test, and verification steps. No source records them.

Safety and compliance:
- None evidenced. `[JOSE: confirm]`.

What NOT to do:
- Do not install a white-stove donor switch into a gray Frigidaire stove. Sources: "White stoves rule everywhere: donor coils by SIZE only — never switches into gray Frigidaire stoves" (building note and stock note).

---

## SOP-E: Blower motor and run capacitor swap

Status: DRAFT — derived from WO-INTAKE-202 and ticket 3 (child of WO-19970, no WO#); awaiting Jose's correction.

When it applies:
- Blower motor vibrating with a high-pitch squeal, bearings seized (WO-INTAKE-202, 1719-273, unit 326).
- Unit 2 blower replacement in the 137 Amherst quadplex (ticket 3, child of WO-19970, 137 Amherst Dr building 10, unit 584, Unit 2 zone).
- Note: WO-19970 is on hold pending owner authorization. Ticket 3 is in progress. `[JOSE: confirm]` whether ticket 3 can proceed while the parent is on hold.

Tools:
- None named in WOs. `[JOSE: confirm]`.

Parts (as named in WOs):
- 1/2 HP blower motor (WO-INTAKE-202; ticket 3).
- Run capacitor (WO-INTAKE-202; ticket 3). Rating: `[JOSE: confirm]`.

Steps:
1. Confirm the vibration and high-pitch squeal reported by the tenant (WO-INTAKE-202).
2. Replace the 1/2 HP blower motor (WO-INTAKE-202; ticket 3).
3. Replace the run capacitor (WO-INTAKE-202; ticket 3).
4. `[JOSE: confirm]` wiring, test run, and verification.

Safety and compliance:
- None evidenced. `[JOSE: confirm]`.

What NOT to do:
- Not evidenced in sources. Do not add a rule without Jose's correction.

---

## SOP-F: Entry and 24h notice coordination

Status: DRAFT — derived from WO-NOTICE-2026, WO-19255, WO-19970, and CLAUDE.md standing rule 5; awaiting Jose's correction.

When it applies:
- Any work needing unit entry. WO-NOTICE-2026 says "Need 24h notice for unit entry" (1719-273, notice_needed set).
- Tenant contact before visits (WO-19255: "Tenant called first before visits").
- Work on hold pending owner authorization (WO-19970).

Steps:
1. Flag notice needed on the ticket (WO-NOTICE-2026, notice_needed set).
2. `[JOSE: confirm]` who sends the notice. CLAUDE.md rule 5 says the team does not draft or send 24h notices, so the sender is not evidenced.
3. Record when the notice was sent and by whom (CLAUDE.md rule 5: the app tracks `notice_sent_at`).
4. Wait for the 24h gate measured from `notice_sent_at` before entry (CLAUDE.md rule 5).
5. Check the ticket's hold status before dispatch (WO-19970 on hold).

Tools and parts:
- None. Not applicable.

Safety and compliance:
- CLAUDE.md rule 5: 24h entry gate from `notice_sent_at`.

What NOT to do:
- Do not enter the unit before the 24h gate passes (CLAUDE.md rule 5; WO-NOTICE-2026).
- Do not draft or send a 24h notice as a team (CLAUDE.md rule 5).

---

## Common problems

**Condensate or drain blockage**
- Symptom: AC leaking water; attic condensate clog.
- Cause (evidenced): main trap clog (WO-E2E-302); recurring stack blockage at 1731/1733.
- WO scope: drain auger on the main trap, then contactor (WO-E2E-302). Completion not recorded.
- Check first: trap and drain line access; ladder for attic work.

**Water heater tee leak, ECO trips, scaled element**
- Symptom: weeping tee, ECO trips every few days.
- Cause (evidenced): scaled lower element (WO-20316).
- WO scope: element, gasket, upper and lower thermostats, tee tightened (WO-20316). Status verified; work not itemized.
- Check first: which heaters in the 1721 bank are in service (3 of 7).

**Shorted element, breaker trip**
- Symptom: breaker trips.
- Cause (evidenced): lower element shorted to ground (WO-FIELD-900).
- WO record: breaker trip; status done (WO-FIELD-900).
- Check first: breaker, then ground fault on the lower element.

**Burner switch failures**
- Symptom: clicking; burner stuck on max heat; open front element.
- WO record: switch clicking, contacts frozen, open circuit on front element, each with a WB24T10025 switch named (WO-E2E-SW1, SW2, SW3). Cause not confirmed in the WOs.
- Work done: `[JOSE: confirm]`. WO statuses are in-progress, new, new.
- Check first: model number; never use a white-stove donor switch on a gray Frigidaire.

**Blower squeal or vibration**
- Symptom: high-pitch squeal and vibration.
- Cause (evidenced): seized bearings (WO-INTAKE-202).
- WO scope: replace 1/2 HP blower motor and run capacitor (WO-INTAKE-202; ticket 3). Completion not recorded.
- Check first: capacitor rating and motor fit before ordering `[JOSE: confirm]` (motor fit is not in any source).

**Freezer noise**
- Symptom: recurring freezer noise (505-103).
- Cause: `[JOSE: confirm]`. Not evidenced beyond the complaint.
- WO scope: inspect evaporator fan motor and compressor mounting grommets (WO-19255).
- Check first: evaporator fan motor and compressor mounting grommets.

**Entry and notice**
- Symptom: work that needs unit entry.
- Cause (evidenced): 24h gate on entry (WO-NOTICE-2026; CLAUDE.md rule 5).
- WO record: notice_needed set (WO-NOTICE-2026); tenant called first (WO-19255).
- Check first: notice sent time and sender; hold status on the ticket.

---

## Items marked [JOSE: confirm]

Count: 27 markers across the drafts and common-problem notes. Listed by section below.

- **SOP-A: Condensate and drain line clearing**: New contactor (WO-E2E-302). Part number and rating
- **SOP-A: Condensate and drain line clearing**: fall protection or ladder setup is not in any source
- **SOP-A: Condensate and drain line clearing**: whether this is done in the same visit or after the trap is clear
- **SOP-A: Condensate and drain line clearing**: how drainage is verified after clearing (no source records this
- **SOP-A: Condensate and drain line clearing**: whether the 1731/1733 main stack is cleared from the mechanical room or only the trap. No source says
- **SOP-A: Condensate and drain line clearing**: Ladder access is named in WO-E2E-302. No other safety rule is evidenced
- **SOP-B: Water heater element, thermostat, and tee joint**: None named in WOs
- **SOP-B: Water heater element, thermostat, and tee joint**: the rest of the swap sequence
- **SOP-B: Water heater element, thermostat, and tee joint**: electrical isolation before element or thermostat work. No source names a lockout step
- **SOP-B: Water heater element, thermostat, and tee joint**: how ECO trips are checked after the work
- **SOP-B: Water heater element, thermostat, and tee joint**: Breaker trip on ground fault is evidenced (WO-FIELD-900). No other safety rule is evidenced
- **SOP-C: Freezer noise complaint (505-103)**: None named in WO
- **SOP-C: Freezer noise complaint (505-103)**: the fix for each finding and how the noise is confirmed gone
- **SOP-C: Freezer noise complaint (505-103)**: any cooling check. The sources do not support one
- **SOP-C: Freezer noise complaint (505-103)**: None evidenced
- **SOP-D: Stove infinite switch replacement (WB24T10025)**: None named in WOs
- **SOP-D: Stove infinite switch replacement (WB24T10025)**: the wiring, test, and verification steps. No source records them
- **SOP-D: Stove infinite switch replacement (WB24T10025)**: None evidenced
- **SOP-E: Blower motor and run capacitor swap**: whether ticket 3 can proceed while the parent is on hold
- **SOP-E: Blower motor and run capacitor swap**: None named in WOs
- **SOP-E: Blower motor and run capacitor swap**: Run capacitor (WO-INTAKE-202; ticket 3). Rating
- **SOP-E: Blower motor and run capacitor swap**: wiring, test run, and verification
- **SOP-E: Blower motor and run capacitor swap**: None evidenced
- **SOP-F: Entry and 24h notice coordination**: who sends the notice. CLAUDE.md rule 5 says the team does not draft or send 24h notices, so the sender is not 
- **Common problems**: WO statuses are in-progress, new, new
- **Common problems**: motor fit is not in any source
- **Common problems**: Not evidenced beyond the complaint

Verification summary:
- Every WO number and key phrase in the drafts was checked against the in-repo sources (migration 030, residential_constants.tsx, cli/seed_portfolio.php). All traced.
- The WO-E2E identifiers are created by repo test files, so SOP-D and the E2E-based parts of SOP-A need Jose's confirmation before use.
- Common-problem notes describe WO scope and status, not completed work, unless the WO records completion.
- Unevidenced items are marked `[JOSE: confirm]`.
- No model numbers, serials, or measurements were added beyond those in the sources.
