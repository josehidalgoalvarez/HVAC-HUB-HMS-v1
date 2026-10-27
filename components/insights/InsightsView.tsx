import React, { useEffect, useState } from 'react';
import { apiClient } from '../../src/api/client';
import type { TicketVisit, WatchRecord } from '../../types/domain';
import {
  computeInsights,
  type EvidenceTicket,
  type InsightSet,
} from '../../utils/insights';

interface InsightsViewProps {
  onBack?: () => void;
}

const VERIFY_LINE = 'Computed from ticket history — verify before acting.';

const EvidenceList: React.FC<{ tickets: EvidenceTicket[] }> = ({ tickets }) => (
  <ul className="space-y-1.5">
    {tickets.map((t) => (
      <li key={t.id} className="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-primary">{t.wo ?? 'no WO#'}</span>
          <span className="font-mono text-gray-500">ID {t.id}</span>
          <span className="text-gray-500">{t.state}</span>
        </div>
        <p className="text-brand-black dark:text-white font-semibold mt-0.5">{t.title}</p>
      </li>
    ))}
  </ul>
);

const InsightCard: React.FC<{
  headline: string;
  detail: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}> = ({ headline, detail, expanded, onToggle, children }) => (
  <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className="w-full min-h-[44px] text-left p-4 flex items-start gap-3"
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-brand-black dark:text-white">{headline}</h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-bold">
            <span className="material-symbols-outlined text-xs" aria-hidden="true">science</span>
            Inferred
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300">{detail}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{VERIFY_LINE}</p>
      </div>
      <span className="material-symbols-outlined text-gray-400 shrink-0" aria-hidden="true">
        {expanded ? 'expand_less' : 'expand_more'}
      </span>
    </button>
    {expanded && children && <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800">{children}</div>}
  </div>
);

const SectionHeading: React.FC<{ icon: string; title: string; count: number }> = ({ icon, title, count }) => (
  <div className="flex items-center gap-2">
    <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">{icon}</span>
    <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">{title}</h2>
    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{count}</span>
  </div>
);

const EmptyLine: React.FC<{ text: string }> = ({ text }) => (
  <p className="p-3 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">{text}</p>
);

export const InsightsView: React.FC<InsightsViewProps> = ({ onBack }) => {
  const [data, setData] = useState<InsightSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tickets, watches] = await Promise.all([
        apiClient.getTickets(),
        apiClient.getWatches({ watch_type: 'part_wait' }).catch((): WatchRecord[] => []),
      ]);
      const visitResults = await Promise.all(
        tickets.map((t) =>
          apiClient
            .getTicketVisits(t.id)
            .then((v: TicketVisit[]) => ({ id: String(t.id), visits: v, ok: true }))
            .catch(() => ({ id: String(t.id), visits: [] as TicketVisit[], ok: false }))
        )
      );
      const visitsByTicket: Record<string, TicketVisit[]> = {};
      let missing = 0;
      for (const r of visitResults) {
        visitsByTicket[r.id] = r.visits;
        if (!r.ok) missing++;
      }
      setData(
        computeInsights({
          tickets,
          visitsByTicket,
          visitHistoryMissingFor: missing,
          partWaitWatches: watches,
          now: Date.now(),
        })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (key: string) => setExpandedKey((cur) => (cur === key ? null : key));

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5 pb-28">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 flex items-center justify-center"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-brand-black dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">insights</span>
            Insights
          </h1>
          <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
            Patterns in ticket history. Correlation only, read-only.
          </p>
        </div>
      </div>

      {loading && !data && <EmptyLine text="Computing patterns from ticket history..." />}

      {error && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
          <span className="material-symbols-outlined text-base" aria-hidden="true">error</span>
          <span className="flex-1 min-w-0">Could not load ticket history: {error}</span>
          <button type="button" onClick={load} className="min-h-[44px] px-3 font-bold text-primary">Retry</button>
        </div>
      )}

      {data && (
        <>
          {/* Repeat problems */}
          <section className="space-y-3">
            <SectionHeading icon="repeat" title="Repeat problems" count={data.repeatProblems.length} />
            {data.repeatProblems.length === 0 && (
              <EmptyLine text="No building and symptom pair appears in 2 or more tickets." />
            )}
            {data.repeatProblems.map((p) => {
              const key = `repeat:${p.key}`;
              return (
                <InsightCard
                  key={key}
                  headline={`${p.label} · ${p.buildingLabel}`}
                  detail={`Recurs with this building: appears in ${p.count} tickets.`}
                  expanded={expandedKey === key}
                  onToggle={() => toggle(key)}
                >
                  <EvidenceList tickets={p.tickets} />
                </InsightCard>
              );
            })}
          </section>

          {/* Repeat access */}
          <section className="space-y-3">
            <SectionHeading icon="door_front" title="Repeat access problems" count={data.repeatAccess.length} />
            {data.repeatAccess.length === 0 && (
              <EmptyLine text="No unit has 2 or more failed-access visits in the last 90 days." />
            )}
            {data.repeatAccess.map((a) => {
              const key = `access:${a.key}`;
              return (
                <InsightCard
                  key={key}
                  headline={a.label}
                  detail={`Seen together: ${a.count} failed-access visits in the last 90 days, across ${a.tickets.length} ${a.tickets.length === 1 ? 'ticket' : 'tickets'}.`}
                  expanded={expandedKey === key}
                  onToggle={() => toggle(key)}
                >
                  <p className="text-xs text-gray-500 mb-2">Visit dates: {a.visitDates.join(', ')}</p>
                  <EvidenceList tickets={a.tickets} />
                </InsightCard>
              );
            })}
          </section>

          {/* Aging */}
          <section className="space-y-3">
            <SectionHeading icon="schedule" title="Aging" count={data.aging.openTickets.length + data.aging.partWaitWatches.length} />
            {data.aging.openTickets.map((o) => {
              const key = `aging-ticket:${o.ticket.id}`;
              return (
                <InsightCard
                  key={key}
                  headline={`Open ticket · ${o.ticket.wo ?? `ID ${o.ticket.id}`}`}
                  detail={`Open ${o.ageDays} days: ${o.ticket.title}`}
                  expanded={expandedKey === key}
                  onToggle={() => toggle(key)}
                >
                  <EvidenceList tickets={[o.ticket]} />
                </InsightCard>
              );
            })}
            {data.aging.partWaitWatches.map((w) => {
              const key = `aging-watch:${w.watchId}`;
              return (
                <InsightCard
                  key={key}
                  headline={`Part wait · ${w.partName ?? 'part not recorded'}`}
                  detail={`Waiting ${w.ageDays} days on part watch #${w.watchId}.`}
                  expanded={expandedKey === key}
                  onToggle={() => toggle(key)}
                >
                  {w.tickets.length > 0 ? <EvidenceList tickets={w.tickets} /> : <p className="text-xs text-gray-400">No linked ticket.</p>}
                </InsightCard>
              );
            })}
            {data.aging.openTickets.length === 0 && data.aging.partWaitWatches.length === 0 && (
              <EmptyLine text="No open tickets or part waits older than the threshold." />
            )}
          </section>

          {/* Most ticketed */}
          <section className="space-y-3">
            <SectionHeading icon="bar_chart" title="Most ticketed" count={data.mostTicketed.units.length + data.mostTicketed.buildings.length} />
            {data.mostTicketed.units.map((u) => {
              const key = `unit:${u.key}`;
              return (
                <InsightCard
                  key={key}
                  headline={u.label}
                  detail={`Top unit: appears in ${u.count} tickets.`}
                  expanded={expandedKey === key}
                  onToggle={() => toggle(key)}
                >
                  <EvidenceList tickets={u.tickets} />
                </InsightCard>
              );
            })}
            {data.mostTicketed.buildings.map((b) => {
              const key = `building:${b.key}`;
              return (
                <InsightCard
                  key={key}
                  headline={b.label}
                  detail={`Top building: appears in ${b.count} tickets.`}
                  expanded={expandedKey === key}
                  onToggle={() => toggle(key)}
                >
                  <EvidenceList tickets={b.tickets} />
                </InsightCard>
              );
            })}
          </section>

          <div className="space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            <p>Omitted: {data.omittedSingleGroups} single-ticket groups (not patterns).</p>
            {data.visitHistoryMissingFor > 0 && (
              <p>Visit history could not be loaded for {data.visitHistoryMissingFor} tickets; repeat-access results may be incomplete.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InsightsView;
