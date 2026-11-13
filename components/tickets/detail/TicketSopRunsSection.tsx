import React, { useEffect, useState } from 'react';
import { SOPRun } from '../../../types/domain';
import { apiClient } from '../../../src/api/client';
import { formatDateTime } from '../../../utils/dateUtils';

const formatRunDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatRunDate = (iso: string): string => {
  return formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' }) || iso;
};

interface TicketSopRunsSectionProps {
  ticketId: string;
  onRunSop?: (sopId: string, ticketId?: string, runId?: string) => void;
}

export const TicketSopRunsSection: React.FC<TicketSopRunsSectionProps> = ({ ticketId, onRunSop }) => {
  const [sopRuns, setSopRuns] = useState<SOPRun[]>([]);
  const [sopRunsLoading, setSopRunsLoading] = useState(false);
  const [sopRunsError, setSopRunsError] = useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  const loadSopRuns = async () => {
    try {
      setSopRunsLoading(true);
      setSopRunsError(null);
      const runs = await apiClient.getSopRuns({ ticket_id: ticketId });
      setSopRuns(runs || []);
    } catch (err: unknown) {
      setSopRunsError(err instanceof Error ? err.message : 'Failed to load SOP runs');
    } finally {
      setSopRunsLoading(false);
    }
  };


  useEffect(() => {
    loadSopRuns();
  }, [ticketId]);

  return (
    <>
      {/* SOP Runs on this ticket (renders nothing when there are none) */}
      {(sopRunsLoading || sopRunsError || sopRuns.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">fact_check</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              SOP runs
            </h2>
            {sopRuns.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {sopRuns.length}
              </span>
            )}
          </div>

          {sopRunsLoading && sopRuns.length === 0 && (
            <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
              Loading SOP runs...
            </div>
          )}

          {sopRunsError && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              <span className="material-symbols-outlined text-base" aria-hidden="true">error</span>
              <span className="flex-1 min-w-0">Could not load SOP runs: {sopRunsError}</span>
              <button
                type="button"
                onClick={loadSopRuns}
                className="min-h-[44px] px-3 font-bold text-primary"
              >
                Retry
              </button>
            </div>
          )}

          {sopRuns.map((run, runIdx) => {
            const expanded = run.id !== undefined && expandedRunId === run.id;
            const steps = run.steps || [];
            const deviationCount = steps.filter((s) => s.deviation).length;
            const gateCount = (run.acknowledged_gates || []).length;
            return (
              <div
                key={run.id ?? runIdx}
                className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedRunId(expanded ? null : (run.id ?? null))}
                  className="w-full min-h-[44px] text-left p-4 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-bold text-brand-black dark:text-white truncate">{run.sop_title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRunDate(run.started_at)} · {run.technician}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">timer</span>
                        {formatRunDuration(run.total_seconds)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">checklist</span>
                        {steps.length} steps
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          deviationCount > 0
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">warning</span>
                        {deviationCount} {deviationCount === 1 ? 'deviation' : 'deviations'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">verified</span>
                        {gateCount} {gateCount === 1 ? 'gate' : 'gates'} acknowledged
                      </span>
                    </div>
                    {run.notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{run.notes}</p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-gray-400 shrink-0" aria-hidden="true">
                    {expanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 pt-3 space-y-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Steps</h3>
                      {steps.length === 0 && (
                        <p className="text-xs text-gray-400">No step records for this run.</p>
                      )}
                      {steps.map((step) => (
                        <div
                          key={step.id ?? step.position}
                          className={`p-3 rounded-xl border ${
                            step.deviation
                              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30'
                              : 'border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-neutral-800/50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-bold text-primary shrink-0">{step.position}.</span>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm text-brand-black dark:text-white">{step.instruction}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs" aria-hidden="true">timer</span>
                                  {formatRunDuration(step.duration_seconds)}
                                </span>
                                {step.deviation && (
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                                    <span className="material-symbols-outlined text-xs" aria-hidden="true">warning</span>
                                    Deviation
                                  </span>
                                )}
                              </div>
                              {step.note && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">Note: {step.note}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Gates acknowledged</h3>
                      {gateCount === 0 ? (
                        <p className="text-xs text-gray-400">None recorded.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {run.acknowledged_gates.map((gate) => (
                            <span key={gate} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono">
                              {gate}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {(run.weather_warnings || []).length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Weather warnings at start</h3>
                        <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-200 list-disc pl-5">
                          {run.weather_warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {run.notes && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">Overall notes</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{run.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </>
  );
};
