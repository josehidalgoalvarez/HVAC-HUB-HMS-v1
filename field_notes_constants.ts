import type { FieldNote } from './types/domain';

// Mirror of the field_note rows (migration 039). Reference only; not runnable SOPs.
export const FIELD_NOTES: FieldNote[] = [
  {
    id: 'fn-condensate-drain-blockage',
    title: 'Condensate or drain blockage',
    applies_to: 'AC condensate drain: 509 Frontenac unit 204 (ticket 10); 1731/1733 shared drain',
    symptoms: ['AC leaking water (ticket 10, 509 Frontenac unit 204).'],
    checks: ['Cause: recurring stack blockage at the 1731/1733 shared drain (appliance note). Cause at 509 Frontenac not recorded.', 'WO scope: clear condensate drain line (ticket 10). Completion not recorded.', 'Check first: [JOSE: confirm] (not in the sources).'],
    wo_citations: ['Ticket 10 (no WO#)', '1731/1733 shared drain appliance note (no WO#)'],
    todo_verify: 1,
    source_note: 'From SOP_LIBRARY_DRAFTS.md common-problem notes (WO-derived); reference only, not a runnable SOP.'
  },
  {
    id: 'fn-water-heater-tee-eco-scaled-element',
    title: 'Water heater tee leak, ECO trips, scaled element',
    applies_to: '1721 Bath shared water heater bank (building 2, unit 339)',
    symptoms: ['Weeping tee, ECO trips every few days.'],
    checks: ['Cause (evidenced): scaled lower element (WO-20316).', 'WO scope: element, gasket, upper and lower thermostats, tee tightened (WO-20316). Status verified; work not itemized.', 'Check first: which heaters in the 1721 bank are in service (3 of 7).'],
    wo_citations: ['WO-20316'],
    todo_verify: 0,
    source_note: 'From SOP_LIBRARY_DRAFTS.md common-problem notes (WO-derived); reference only, not a runnable SOP.'
  },
  {
    id: 'fn-shorted-element-breaker-trip',
    title: 'Shorted element, breaker trip',
    applies_to: 'Lower water heater element (1719-273, unit 326)',
    symptoms: ['Breaker trips.'],
    checks: ['Cause (evidenced): lower element shorted to ground (WO-FIELD-900).', 'WO record: breaker trip; status done (WO-FIELD-900).', 'Check first: breaker, then ground fault on the lower element.'],
    wo_citations: ['WO-FIELD-900'],
    todo_verify: 0,
    source_note: 'From SOP_LIBRARY_DRAFTS.md common-problem notes (WO-derived); reference only, not a runnable SOP.'
  },
  {
    id: 'fn-blower-squeal-vibration',
    title: 'Blower squeal or vibration',
    applies_to: 'Blower motor (1719-273, unit 326; 137 Amherst Unit 2 zone)',
    symptoms: ['High-pitch squeal and vibration.'],
    checks: ['Cause (evidenced): seized bearings (WO-INTAKE-202).', 'WO scope: replace 1/2 HP blower motor and run capacitor (WO-INTAKE-202; ticket 3). Completion not recorded.', 'Check first: capacitor rating and motor fit before ordering [JOSE: confirm] (motor fit is not in any source).'],
    wo_citations: ['WO-INTAKE-202', 'Ticket 3 (child of WO-19970, no WO#)'],
    todo_verify: 1,
    source_note: 'From SOP_LIBRARY_DRAFTS.md common-problem notes (WO-derived); reference only, not a runnable SOP.'
  },
  {
    id: 'fn-freezer-noise',
    title: 'Freezer noise',
    applies_to: 'Freezer, 505 Days Rd unit 103 (505-103)',
    symptoms: ['Recurring freezer noise (505-103).'],
    checks: ['Cause: [JOSE: confirm]. Not evidenced beyond the complaint.', 'WO scope: inspect evaporator fan motor and compressor mounting grommets (WO-19255).', 'Check first: evaporator fan motor and compressor mounting grommets.'],
    wo_citations: ['WO-19255'],
    todo_verify: 1,
    source_note: 'From SOP_LIBRARY_DRAFTS.md common-problem notes (WO-derived); reference only, not a runnable SOP.'
  },
  {
    id: 'fn-entry-and-notice',
    title: 'Entry and notice',
    applies_to: 'Any unit entry that needs 24h notice (1719-273, WO-NOTICE-2026)',
    symptoms: ['Work that needs unit entry.'],
    checks: ['Cause (evidenced): 24h gate on entry (WO-NOTICE-2026; TicketDetailView notice gate; migration 011).', 'WO record: notice_needed set (WO-NOTICE-2026); tenant called first (WO-19255).', 'Check first: notice sent time and sender; hold status on the ticket.'],
    wo_citations: ['WO-NOTICE-2026', 'WO-19255'],
    todo_verify: 0,
    source_note: 'From SOP_LIBRARY_DRAFTS.md common-problem notes (WO-derived); reference only, not a runnable SOP.'
  },
];
