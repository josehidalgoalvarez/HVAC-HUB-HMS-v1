import type { Ticket, TicketVisit, WatchRecord } from '../types/domain';

// Read-only patterns computed at render time from ticket history.
// Every insight is correlation only: it reports which tickets it was computed from.

const CLOSED_STATES = new Set(['done', 'closed', 'closed-elsewhere', 'resolved']);
const REPEAT_ACCESS_WINDOW_DAYS = 90;
const REPEAT_ACCESS_MIN_VISITS = 2;
const PART_WAIT_AGE_DAYS = 14;
const MIN_PATTERN_TICKETS = 2;
const TOP_N = 5;
const AGING_LIMIT = 10;
const DAY_MS = 86400000;

// Symptom keyword groups. A ticket is matched when its title or scope text matches the pattern.
export const SYMPTOM_KEYWORDS: { label: string; pattern: RegExp }[] = [
  { label: 'drain / condensate', pattern: /drain|condensate/i },
  { label: 'leak / weep', pattern: /leak|weep/i },
  { label: 'noise / squeal / vibration', pattern: /noise|squeal|vibrat/i },
  { label: 'water heater', pattern: /water heater|eco trip/i },
  { label: 'blower', pattern: /blower/i },
  { label: 'freezer', pattern: /freezer/i },
  { label: 'fridge / refrigerator', pattern: /fridge|refrigerator/i },
  { label: 'stove / burner / switch', pattern: /stove|burner|switch|range/i },
  { label: 'filter / airflow', pattern: /filter|airflow/i },
  { label: 'breaker trip', pattern: /breaker/i },
];

export interface EvidenceTicket {
  id: string;
  wo: string | null;
  title: string;
  state: string;
  createdAt: string | null;
}

export interface RepeatProblemInsight {
  key: string;
  label: string;
  buildingLabel: string;
  count: number;
  tickets: EvidenceTicket[];
}

export interface RepeatAccessInsight {
  key: string;
  label: string;
  count: number;
  visitDates: string[];
  tickets: EvidenceTicket[];
}

export interface AgingTicketItem {
  ticket: EvidenceTicket;
  ageDays: number;
}

export interface AgingWatchItem {
  watchId: number;
  partName: string | null;
  ageDays: number;
  tickets: EvidenceTicket[];
}

export interface CountInsight {
  key: string;
  label: string;
  count: number;
  tickets: EvidenceTicket[];
}

export interface InsightSet {
  repeatProblems: RepeatProblemInsight[];
  repeatAccess: RepeatAccessInsight[];
  aging: { openTickets: AgingTicketItem[]; partWaitWatches: AgingWatchItem[] };
  mostTicketed: { units: CountInsight[]; buildings: CountInsight[] };
  omittedSingleGroups: number;
  visitHistoryMissingFor: number;
}

export interface InsightInput {
  tickets: Ticket[];
  visitsByTicket: Record<string, TicketVisit[]>;
  visitHistoryMissingFor: number;
  partWaitWatches: WatchRecord[];
  now: number;
}

const ticketCreated = (t: Ticket): string | null =>
  t.createdAt ?? (t as Ticket & { created_at?: string }).created_at ?? null;

const ageDaysFrom = (iso: string | null, now: number): number | null => {
  if (!iso) return null;
  const ms = new Date(iso.replace(' ', 'T')).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor((now - ms) / DAY_MS);
};

const toEvidence = (t: Ticket): EvidenceTicket => ({
  id: String(t.id),
  wo: t.wo_number ?? null,
  title: t.title,
  state: String(t.state ?? t.status ?? ''),
  createdAt: ticketCreated(t),
});

const buildingKey = (t: Ticket): string => String(t.building_id ?? t.buildingId ?? '');
const unitKey = (t: Ticket): string => String(t.unit_id ?? t.unitId ?? '');

const buildingLabel = (t: Ticket): string =>
  t.buildingName ?? t.building_name ?? t.propertyName ?? `Building ${buildingKey(t)}`;

const unitLabel = (t: Ticket): string => {
  const unit = t.unitNumber ?? t.unit_number ?? unitKey(t);
  return `${buildingLabel(t)} · Unit ${unit}`;
};

const ticketText = (t: Ticket): string =>
  [t.title, t.description, t.verbatim_text, t.verified_scope].filter(Boolean).join(' ');

const sortByNewest = <T extends { createdAt: string | null }>(xs: T[]): T[] =>
  [...xs].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

export function computeInsights(input: InsightInput): InsightSet {
  const { tickets, visitsByTicket, now } = input;
  const byId = new Map(tickets.map((t) => [String(t.id), t]));
  let omittedSingleGroups = 0;

  // (a) Repeat problems: same building + same symptom keyword in 2+ tickets.
  const groups = new Map<string, { label: string; buildingLabel: string; ids: Set<string> }>();
  for (const t of tickets) {
    const text = ticketText(t);
    for (const kw of SYMPTOM_KEYWORDS) {
      if (!kw.pattern.test(text)) continue;
      const key = `${buildingKey(t)}|${kw.label}`;
      const g = groups.get(key) ?? { label: kw.label, buildingLabel: buildingLabel(t), ids: new Set<string>() };
      g.ids.add(String(t.id));
      groups.set(key, g);
    }
  }
  const repeatProblems: RepeatProblemInsight[] = [];
  for (const [key, g] of groups) {
    if (g.ids.size < MIN_PATTERN_TICKETS) {
      omittedSingleGroups++;
      continue;
    }
    const evidence = [...g.ids].map((id) => byId.get(id)).filter((t): t is Ticket => !!t).map(toEvidence);
    repeatProblems.push({ key, label: g.label, buildingLabel: g.buildingLabel, count: g.ids.size, tickets: sortByNewest(evidence) });
  }
  repeatProblems.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  // (b) Repeat access: 2+ failed_access visits in the last 90 days per unit (existing rule).
  const cutoff = now - REPEAT_ACCESS_WINDOW_DAYS * DAY_MS;
  const seenVisits = new Set<string>();
  const failedByUnit = new Map<string, { visitDates: string[]; ticketIds: Set<string>; label: string }>();
  for (const [ticketId, visits] of Object.entries(visitsByTicket)) {
    for (const v of visits) {
      const vid = String(v.id);
      if (seenVisits.has(vid) || v.outcome !== 'failed_access') continue;
      seenVisits.add(vid);
      const when = new Date(String(v.visited_at).replace(' ', 'T')).getTime();
      if (Number.isNaN(when) || when < cutoff) continue;
      const t = byId.get(ticketId);
      const uk = String(v.unit_id ?? (t ? unitKey(t) : ''));
      if (!uk) continue;
      const entry = failedByUnit.get(uk) ?? { visitDates: [], ticketIds: new Set<string>(), label: t ? unitLabel(t) : `Unit ${uk}` };
      entry.visitDates.push(String(v.visited_at));
      entry.ticketIds.add(ticketId);
      failedByUnit.set(uk, entry);
    }
  }
  const repeatAccess: RepeatAccessInsight[] = [];
  for (const [key, e] of failedByUnit) {
    if (e.visitDates.length < REPEAT_ACCESS_MIN_VISITS) continue;
    const evidence = [...e.ticketIds].map((id) => byId.get(id)).filter((t): t is Ticket => !!t).map(toEvidence);
    repeatAccess.push({ key, label: e.label, count: e.visitDates.length, visitDates: [...e.visitDates].sort().reverse(), tickets: sortByNewest(evidence) });
  }
  repeatAccess.sort((a, b) => b.count - a.count);

  // (c) Aging: oldest open tickets, and part-wait watches older than 14 days.
  const openTickets: AgingTicketItem[] = [];
  for (const t of tickets) {
    if (CLOSED_STATES.has(String(t.state ?? t.status ?? ''))) continue;
    const age = ageDaysFrom(ticketCreated(t), now);
    if (age === null) continue;
    openTickets.push({ ticket: toEvidence(t), ageDays: age });
  }
  openTickets.sort((a, b) => b.ageDays - a.ageDays);

  const partWaitWatches: AgingWatchItem[] = [];
  for (const w of input.partWaitWatches) {
    if (w.state === 'resolved') continue;
    const age = ageDaysFrom(w.created_at ?? null, now);
    if (age === null || age < PART_WAIT_AGE_DAYS) continue;
    const cfg = typeof w.config === 'string' ? safeParse(w.config) : (w.config ?? {});
    const ticket = w.target_id != null ? byId.get(String(w.target_id)) : undefined;
    partWaitWatches.push({
      watchId: w.id,
      partName: typeof cfg.part_name === 'string' ? cfg.part_name : null,
      ageDays: age,
      tickets: ticket ? [toEvidence(ticket)] : [],
    });
  }
  partWaitWatches.sort((a, b) => b.ageDays - a.ageDays);

  // (d) Most-ticketed units and buildings (2+ tickets only).
  const countBy = (keyFn: (t: Ticket) => string, labelFn: (t: Ticket) => string) => {
    const m = new Map<string, { label: string; ids: Ticket[] }>();
    for (const t of tickets) {
      const k = keyFn(t);
      if (!k) continue;
      const e = m.get(k) ?? { label: labelFn(t), ids: [] };
      e.ids.push(t);
      m.set(k, e);
    }
    const out: CountInsight[] = [];
    for (const [key, e] of m) {
      if (e.ids.length < MIN_PATTERN_TICKETS) {
        omittedSingleGroups++;
        continue;
      }
      out.push({ key, label: e.label, count: e.ids.length, tickets: sortByNewest(e.ids.map(toEvidence)) });
    }
    return out.sort((a, b) => b.count - a.count).slice(0, TOP_N);
  };

  return {
    repeatProblems,
    repeatAccess,
    aging: { openTickets: openTickets.slice(0, AGING_LIMIT), partWaitWatches: partWaitWatches.slice(0, AGING_LIMIT) },
    mostTicketed: {
      units: countBy(unitKey, unitLabel),
      buildings: countBy(buildingKey, buildingLabel),
    },
    omittedSingleGroups,
    visitHistoryMissingFor: input.visitHistoryMissingFor,
  };
}

function safeParse(s: string): Record<string, any> {
  try {
    return JSON.parse(s) ?? {};
  } catch {
    return {};
  }
}
