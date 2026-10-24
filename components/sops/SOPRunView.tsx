import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { SEED_SOPS } from '../../sop_constants';
import type { SOP, SOPRun, SOPRunStep, Ticket } from '../../types/domain';

interface SOPRunViewProps {
  sopId: string;
  ticketId?: number | string | null;
  onBack: () => void;
  onRunFinished: (run: SOPRun) => void;
}

type RunStage = 'pre_check' | 'active_run' | 'completed';

interface StepTimerState {
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  note: string;
  deviation: boolean;
  completed: boolean;
}

export const SOPRunView: React.FC<SOPRunViewProps> = ({
  sopId,
  ticketId,
  onBack,
  onRunFinished,
}) => {
  const [sop, setSop] = useState<SOP | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<RunStage>('pre_check');

  // Pre-check gate states
  const [acknowledgedGates, setAcknowledgedGates] = useState<Record<string, boolean>>({});
  const [weatherWarnings, setWeatherWarnings] = useState<string[]>([]);
  const [technician, setTechnician] = useState('Jose (Tech)');

  // Run execution states
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState<string>('');
  const [runFinishedAt, setRunFinishedAt] = useState<string>('');
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [stepStates, setStepStates] = useState<Record<number, StepTimerState>>({});
  const [overallNotes, setOverallNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const activeStepStartTimeRef = useRef<number>(Date.now());

  // Load SOP and optional ticket
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch SOP
        let foundSop: SOP | null = null;
        try {
          foundSop = await apiClient.getSop(sopId);
        } catch {
          const cached = (await appCache.get<SOP[]>('sops')) || SEED_SOPS;
          foundSop = cached.find((s) => s.id === sopId) || null;
        }

        if (!foundSop) {
          foundSop = SEED_SOPS.find((s) => s.id === sopId) || null;
        }
        setSop(foundSop);

        // Fetch Ticket if linked
        if (ticketId) {
          try {
            const t = await apiClient.getTicket(Number(ticketId));
            setTicket(t);

            // Weather exposure mismatch check
            const warnings: string[] = [];
            const ticketExposure = t.work_exposure || 'indoor';
            const sopExposure = foundSop?.weather_exposure;

            if (sopExposure && sopExposure !== 'indoor' && ticketExposure === 'indoor') {
              warnings.push(
                `Ticket is classified as '${ticketExposure}', but this SOP involves '${sopExposure.replace('_', ' ')}'. Ensure site safety.`
              );
            }

            // Check rain forecast for outdoor jobs
            if (ticketExposure !== 'indoor' || (sopExposure && sopExposure !== 'indoor')) {
              try {
                const isRaining = await apiClient.checkRainExpected();
                if (isRaining) {
                  warnings.push(
                    'Rain is forecast for today. Exterior work or ladder usage may present electrical or slip hazards.'
                  );
                }
              } catch {
                // Ignore rain check failure
              }
            }
            setWeatherWarnings(warnings);
          } catch {
            // Non-fatal if ticket fetch fails
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sopId, ticketId]);

  // Total timer ticker during active run
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (stage === 'active_run') {
      interval = setInterval(() => {
        setTotalElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage]);

  // Format seconds into mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading || !sop) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-xs text-gray-400">
        Loading SOP run environment...
      </div>
    );
  }

  const steps = sop.steps || [];
  const complianceGates = sop.compliance_gates || [];
  const allGatesAcknowledged = complianceGates.every((g) => acknowledgedGates[g.id]);

  // Start the run
  const handleStartRun = () => {
    const nowIso = new Date().toISOString();
    setRunStartedAt(nowIso);
    activeStepStartTimeRef.current = Date.now();

    // Initialize step timer states
    const init: Record<number, StepTimerState> = {};
    steps.forEach((st, idx) => {
      init[idx] = {
        startedAt: idx === 0 ? nowIso : '',
        durationSeconds: 0,
        note: '',
        deviation: false,
        completed: false,
      };
    });
    setStepStates(init);
    setCurrentStepIdx(0);
    setTotalElapsedSeconds(0);
    setStage('active_run');
  };

  // Check off current step and advance
  const handleCompleteCurrentStep = (isDeviation: boolean = false) => {
    const now = Date.now();
    const duration = Math.max(1, Math.round((now - activeStepStartTimeRef.current) / 1000));
    const nowIso = new Date().toISOString();

    setStepStates((prev) => {
      const cur = prev[currentStepIdx] || {
        startedAt: nowIso,
        durationSeconds: 0,
        note: '',
        deviation: false,
        completed: false,
      };
      return {
        ...prev,
        [currentStepIdx]: {
          ...cur,
          completedAt: nowIso,
          durationSeconds: cur.durationSeconds + duration,
          deviation: isDeviation || cur.deviation,
          completed: true,
        },
        // Start next step if available
        ...(currentStepIdx + 1 < steps.length
          ? {
              [currentStepIdx + 1]: {
                ...(prev[currentStepIdx + 1] || {}),
                startedAt: nowIso,
                durationSeconds: 0,
                note: '',
                deviation: false,
                completed: false,
              },
            }
          : {}),
      };
    });

    if (currentStepIdx + 1 < steps.length) {
      setCurrentStepIdx((prev) => prev + 1);
      activeStepStartTimeRef.current = Date.now();
    } else {
      // Completed all steps!
      setRunFinishedAt(nowIso);
      setStage('completed');
    }
  };

  // Submit Run to Server / Storage
  const handleSubmitRun = async () => {
    try {
      setIsSubmitting(true);
      setSubmissionError(null);

      const runSteps: SOPRunStep[] = steps.map((st, idx) => {
        const state = stepStates[idx] || {
          startedAt: runStartedAt,
          completedAt: runFinishedAt,
          durationSeconds: 0,
          note: '',
          deviation: false,
          completed: true,
        };
        return {
          position: st.position,
          instruction: st.instruction,
          started_at: state.startedAt || runStartedAt,
          completed_at: state.completedAt || runFinishedAt,
          duration_seconds: state.durationSeconds,
          note: state.note || null,
          deviation: state.deviation,
        };
      });

      const payload: Partial<SOPRun> = {
        sop_id: sop.id,
        sop_version: sop.version,
        sop_title: sop.title,
        ticket_id: ticketId ? Number(ticketId) : null,
        technician: technician.trim() || 'Jose (Tech)',
        started_at: runStartedAt,
        finished_at: runFinishedAt || new Date().toISOString(),
        total_seconds: totalElapsedSeconds,
        notes: overallNotes.trim() || null,
        acknowledged_gates: Object.keys(acknowledgedGates).filter((k) => acknowledgedGates[k]),
        weather_warnings: weatherWarnings,
        steps: runSteps,
      };

      const result = await apiClient.recordSopRun(payload);
      onRunFinished(result);
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : 'Failed to record SOP run');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // STAGE 1: Pre-Run Gate Screen
  // ----------------------------------------------------
  if (stage === 'pre_check') {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-28">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="text-right">
            <span className="text-[11px] font-mono text-gray-400">Step 1 of 3: Pre-Run Readiness</span>
          </div>
        </div>

        {/* Title & Metadata Header */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
              {sop.category}
            </span>
            {Boolean(sop.todo_verify) && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                TODO-verify Shell
              </span>
            )}
            {ticket && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-primary/10 text-primary border border-primary/20">
                Ticket #{ticket.id} {ticket.wo_number ? `(${ticket.wo_number})` : ''}
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-brand-black dark:text-white leading-tight">
            {sop.title}
          </h1>
          {sop.source_note && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {sop.source_note}
            </p>
          )}
        </div>

        {/* Weather Exposure Conflicts & Advisories */}
        {weatherWarnings.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
              <span className="material-symbols-outlined text-base">warning</span>
              Weather & Environmental Advisory (Non-blocking)
            </div>
            <ul className="space-y-1 pl-5 list-disc text-xs text-amber-800 dark:text-amber-300">
              {weatherWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Technician Name Input */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-2 shadow-xs">
          <label className="block text-xs font-bold text-brand-black dark:text-white">
            Lead Technician
          </label>
          <input
            type="text"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
          />
        </div>

        {/* Constraints Cards: Required Tools, Parts, Access */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Tools */}
          <div className="bg-white dark:bg-card-dark rounded-2xl p-3.5 border border-gray-100 dark:border-gray-800 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-black dark:text-white">
              <span className="material-symbols-outlined text-primary text-base">construction</span>
              Required Tools
            </div>
            {sop.required_tools.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">None specified / TODO-verify</p>
            ) : (
              <ul className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                {sop.required_tools.map((t, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-gray-400">check</span>
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Parts */}
          <div className="bg-white dark:bg-card-dark rounded-2xl p-3.5 border border-gray-100 dark:border-gray-800 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-black dark:text-white">
              <span className="material-symbols-outlined text-amber-500 text-base">inventory_2</span>
              Required Parts
            </div>
            {sop.required_parts.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">None specified / TODO-verify</p>
            ) : (
              <ul className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                {sop.required_parts.map((p, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-gray-400">check</span>
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Access & Crew */}
          <div className="bg-white dark:bg-card-dark rounded-2xl p-3.5 border border-gray-100 dark:border-gray-800 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-black dark:text-white">
              <span className="material-symbols-outlined text-purple-500 text-base">key</span>
              Access & Crew
            </div>
            <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
              <p>Crew: {sop.two_person ? '2-Person Required' : 'Single Tech / Solo'}</p>
              <p>Exposure: {sop.weather_exposure ? sop.weather_exposure.replace('_', ' ') : 'Indoor / Unit'}</p>
              {sop.access_requirements.length > 0 && (
                <div className="pt-1">
                  {sop.access_requirements.map((a, idx) => (
                    <span key={idx} className="block text-[11px] text-gray-500">• {a}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compliance Gates (MANDATORY ACKNOWLEDGEMENT) */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">verified</span>
              <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">
                Mandatory Compliance Gates
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">
              {Object.values(acknowledgedGates).filter(Boolean).length} of {complianceGates.length} checked
            </span>
          </div>

          {complianceGates.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No compliance gates registered for this procedure.</p>
          ) : (
            <div className="space-y-2">
              {complianceGates.map((gate) => {
                const checked = Boolean(acknowledgedGates[gate.id]);
                return (
                  <label
                    key={gate.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      checked
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setAcknowledgedGates((prev) => ({
                          ...prev,
                          [gate.id]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary shrink-0"
                    />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-brand-black dark:text-white">
                          {gate.label}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          [{gate.reference}]
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
                        {gate.requirement}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Start Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!allGatesAcknowledged}
            onClick={handleStartRun}
            className={`w-full min-h-[48px] py-3 px-4 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all ${
              allGatesAcknowledged
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-200 dark:bg-neutral-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-lg">play_arrow</span>
            {allGatesAcknowledged ? 'Begin Timed Checklist Run' : 'Acknowledge All Gates to Begin'}
          </button>
          {!allGatesAcknowledged && (
            <p className="text-[11px] text-center text-gray-400 mt-2">
              Regulatory compliance gates must be acknowledged prior to procedure execution.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STAGE 2: Active Timed Run Screen
  // ----------------------------------------------------
  if (stage === 'active_run') {
    const curStep = steps[currentStepIdx];
    const curStepState = stepStates[currentStepIdx] || {
      startedAt: '',
      durationSeconds: 0,
      note: '',
      deviation: false,
      completed: false,
    };

    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-28">
        {/* Header Ticker */}
        <div className="bg-primary text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
              Total Elapsed Time
            </span>
            <div className="text-2xl font-mono font-bold tracking-wider">
              {formatTime(totalElapsedSeconds)}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Progress</span>
            <div className="text-sm font-bold">
              Step {currentStepIdx + 1} of {steps.length}
            </div>
          </div>
        </div>

        {/* Active Step Hero Card */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-primary/30 shadow-md space-y-4 ring-1 ring-primary/20">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary uppercase tracking-wider">
              Current Active Step #{curStep?.position}
            </span>
            <span className="text-xs font-mono text-gray-400">
              Est: {curStep?.est_minutes ? `${curStep.est_minutes} min` : 'TODO-verify'}
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-brand-black dark:text-white leading-relaxed">
              {curStep?.instruction}
            </h2>
            {Boolean(curStep?.todo_verify) && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                [TODO-verify placeholder: verify physical condition & standard]
              </span>
            )}
          </div>

          {/* Step Note / Deviation Input */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <label className="block text-xs font-bold text-brand-black dark:text-white">
              Step Observation / Deviation Note (optional)
            </label>
            <input
              type="text"
              value={curStepState.note}
              onChange={(e) => {
                const val = e.target.value;
                setStepStates((prev) => ({
                  ...prev,
                  [currentStepIdx]: {
                    ...prev[currentStepIdx],
                    note: val,
                  },
                }));
              }}
              placeholder="e.g. pressure slightly elevated, cleaned contacts, deviated from sequence..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Action Buttons for Current Step */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleCompleteCurrentStep(false)}
              className="flex-1 min-h-[48px] px-4 py-3 bg-primary text-white hover:bg-primary/90 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
              {currentStepIdx + 1 === steps.length ? 'Complete Final Step' : 'Step Complete (Next)'}
            </button>

            <button
              type="button"
              onClick={() => handleCompleteCurrentStep(true)}
              className="min-h-[48px] px-3.5 py-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
              title="Record that this step deviated from standard procedure"
            >
              <span className="material-symbols-outlined text-base">report_problem</span>
              Deviation
            </button>
          </div>
        </div>

        {/* Step Progress Checklist */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">
            All Steps Checklist
          </h3>
          <div className="space-y-2">
            {steps.map((st, idx) => {
              const state = stepStates[idx];
              const isCurrent = idx === currentStepIdx;
              const isDone = state?.completed;

              return (
                <div
                  key={st.position}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    isCurrent
                      ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                      : isDone
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-gray-50 dark:bg-neutral-800/60 border-gray-100 dark:border-gray-800 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 dark:bg-neutral-700 text-gray-500'
                      }`}
                    >
                      {isDone ? (
                        <span className="material-symbols-outlined text-sm">check</span>
                      ) : (
                        st.position
                      )}
                    </div>
                    <span
                      className={`truncate ${
                        isDone
                          ? 'text-gray-600 dark:text-gray-300 line-through'
                          : isCurrent
                          ? 'font-bold text-brand-black dark:text-white'
                          : 'text-gray-500'
                      }`}
                    >
                      {st.instruction}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {state?.deviation && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Deviation
                      </span>
                    )}
                    {state?.durationSeconds ? (
                      <span className="text-[11px] font-mono text-gray-400">
                        {formatTime(state.durationSeconds)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STAGE 3: Run Completed / Review & Submit
  // ----------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-28">
      {/* Completion Header */}
      <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-sm space-y-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl">task_alt</span>
          <h2 className="text-lg font-bold">Checklist Run Completed</h2>
        </div>
        <p className="text-xs opacity-90">
          All {steps.length} procedure steps executed. Review timing summary and record into append-only log.
        </p>
      </div>

      {submissionError && (
        <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-xs text-brand-red font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {submissionError}
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-xs">
        <h3 className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider">
          Run Timing Breakdown
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800">
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Duration</span>
            <span className="text-lg font-mono font-bold text-brand-black dark:text-white">
              {formatTime(totalElapsedSeconds)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800">
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Technician</span>
            <span className="text-sm font-bold text-brand-black dark:text-white truncate block">
              {technician}
            </span>
          </div>
        </div>

        {/* Per-step table */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
          {steps.map((st, idx) => {
            const state = stepStates[idx];
            return (
              <div
                key={st.position}
                className="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {st.position}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand-black dark:text-white">
                      {st.instruction}
                    </p>
                    {state?.note && (
                      <p className="text-[10px] text-gray-500 italic truncate">Note: {state.note}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {state?.deviation && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Deviation
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                    {formatTime(state?.durationSeconds || 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Run Notes */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-2 shadow-xs">
        <label className="block text-xs font-bold text-brand-black dark:text-white">
          Overall Procedure Notes / Post-Service Findings (optional)
        </label>
        <textarea
          rows={3}
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          placeholder="e.g. system tested operational, customer informed, clean filter installed..."
          className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Submit / Finish Button */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmitRun}
          className="w-full min-h-[48px] py-3 px-4 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">save</span>
          {isSubmitting ? 'Recording SOP Run...' : 'Save & Append to Timeline'}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full min-h-[44px] py-2.5 px-4 text-xs font-bold bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-xl transition-all text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SOPRunView;
