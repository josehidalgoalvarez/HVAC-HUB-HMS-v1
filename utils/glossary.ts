/**
 * Central glossary of domain statuses and labels across HVACHome.
 * Grounded in src/Models/Ticket.php, src/Models/RunSheet.php, types/domain.ts,
 * and unit context definitions.
 */

export interface GlossaryEntry {
  term: string;
  label: string;
  explanation: string;
  category: 'ticket_state' | 'ticket_priority' | 'block_state' | 'appliance_status' | 'unit_context';
}

export const STATUS_GLOSSARY: Record<string, GlossaryEntry> = {
  // --- Ticket States ---
  new: {
    term: 'new',
    label: 'New',
    explanation: 'Fresh intake work order awaiting technician inspection or triage.',
    category: 'ticket_state',
  },
  verified: {
    term: 'verified',
    label: 'Verified',
    explanation: 'Scope confirmed on-site by technician; ready to schedule or execute.',
    category: 'ticket_state',
  },
  'in-progress': {
    term: 'in-progress',
    label: 'In-Progress',
    explanation: 'Technician dispatched or actively servicing this work order.',
    category: 'ticket_state',
  },
  blocked: {
    term: 'blocked',
    label: 'Blocked',
    explanation: 'Cannot proceed due to external hurdle (e.g. rent hold, access lock); 30-day aging clock active.',
    category: 'ticket_state',
  },
  'archived-blocked': {
    term: 'archived-blocked',
    label: 'Archived-Blocked',
    explanation: 'Work order blocked 30+ days; scope and notes permanently recorded in unit history and ticket archived.',
    category: 'ticket_state',
  },
  'on-hold': {
    term: 'on-hold',
    label: 'On-Hold',
    explanation: 'Temporarily paused without an active blocking clock (e.g. scheduled for future seasonal window).',
    category: 'ticket_state',
  },
  done: {
    term: 'done',
    label: 'Done',
    explanation: 'Technician repairs complete on-site; work verified finished.',
    category: 'ticket_state',
  },
  closed: {
    term: 'closed',
    label: 'Closed',
    explanation: 'Formally closed and signed off in records.',
    category: 'ticket_state',
  },
  'closed-elsewhere': {
    term: 'closed-elsewhere',
    label: 'Closed Elsewhere',
    explanation: 'Completed by another party (Third party, Contractor, Handoff, or Coworker) rather than this technician.',
    category: 'ticket_state',
  },
  pending_parts: {
    term: 'pending_parts',
    label: 'Pending Parts',
    explanation: 'Work order paused awaiting delivery of ordered replacement parts.',
    category: 'ticket_state',
  },

  // --- Ticket Priorities ---
  urgent: {
    term: 'urgent',
    label: 'Urgent',
    explanation: 'Safety-critical, emergency, or heat/water outage requiring immediate technician dispatch.',
    category: 'ticket_priority',
  },
  high: {
    term: 'high',
    label: 'High',
    explanation: 'Time-sensitive issue requiring prioritized attention before standard queues.',
    category: 'ticket_priority',
  },
  medium: {
    term: 'medium',
    label: 'Medium / Normal',
    explanation: 'Standard maintenance work order handled in regular queue sequence.',
    category: 'ticket_priority',
  },
  low: {
    term: 'low',
    label: 'Low',
    explanation: 'Minor repair or aesthetic item addressed as schedule permits.',
    category: 'ticket_priority',
  },

  // --- Day Plan Block States ---
  completed: {
    term: 'completed',
    label: 'Completed',
    explanation: 'Route stop finished and work signed off.',
    category: 'block_state',
  },
  pending: {
    term: 'pending',
    label: 'Pending',
    explanation: "Scheduled stop awaiting technician arrival on today's route.",
    category: 'block_state',
  },
  skipped: {
    term: 'skipped',
    label: 'Skipped',
    explanation: 'Stop bypassed or rescheduled from today\'s run sheet.',
    category: 'block_state',
  },

  // --- Appliance Statuses ---
  stored: {
    term: 'stored',
    label: 'Stored',
    explanation: 'Appliance held in depot or warehouse inventory ready for redeployment.',
    category: 'appliance_status',
  },
  donor: {
    term: 'donor',
    label: 'Donor',
    explanation: 'Appliance preserved as a source for harvesting functional spare parts.',
    category: 'appliance_status',
  },
  operational: {
    term: 'operational',
    label: 'Operational',
    explanation: 'Appliance tested, connected, and functioning properly.',
    category: 'appliance_status',
  },
  needs_service: {
    term: 'needs_service',
    label: 'Needs Service',
    explanation: 'Appliance requiring diagnosis, repair, or maintenance before use.',
    category: 'appliance_status',
  },

  // --- Unit Context Labels ---
  renovated: {
    term: 'renovated',
    label: 'Renovated',
    explanation: 'Unit underwent verified renovation; fixtures and appliances updated to modernized standard.',
    category: 'unit_context',
  },
};

/**
 * Normalizes term lookup for case-insensitivity and common hyphen/underscore variants.
 */
export function getGlossaryEntry(rawTerm: string | null | undefined): GlossaryEntry | null {
  if (!rawTerm) return null;
  const key = rawTerm.toLowerCase().trim().replace(/_/g, '-');
  if (STATUS_GLOSSARY[key]) return STATUS_GLOSSARY[key];

  // Also check direct key with underscores if not found with hyphens
  const underKey = rawTerm.toLowerCase().trim().replace(/-/g, '_');
  if (STATUS_GLOSSARY[underKey]) return STATUS_GLOSSARY[underKey];

  // Specific alias mappings
  if (key === 'resolved') return STATUS_GLOSSARY['done'];
  if (key === 'open') return STATUS_GLOSSARY['new'];
  if (key === 'normal') return STATUS_GLOSSARY['medium'];

  return null;
}
