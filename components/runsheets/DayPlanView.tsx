import React, { useState, useEffect } from 'react';
import { apiClient } from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { PullToRefresh } from '../common/PullToRefresh';
import { BatchBuilderModal } from './BatchBuilderModal';
import { CloseBlockModal } from './CloseBlockModal';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import type { RunSheet, RunSheetBlock } from '../../types/domain';

interface DayPlanViewProps {
  onBack?: () => void;
  onOpenTicket?: (ticketId: string) => void;
  onOpenQuickLog?: (block: RunSheetBlock) => void;
}

export const DayPlanView: React.FC<DayPlanViewProps> = ({
  onBack,
  onOpenTicket,
  onOpenQuickLog,
}) => {
  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeRunSheet, setActiveRunSheet] = useState<RunSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdated, setIsUpdated] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isBatchBuilderOpen, setIsBatchBuilderOpen] = useState(false);
  const [closingBlock, setClosingBlock] = useState<RunSheetBlock | null>(null);
  const [removingBlock, setRemovingBlock] = useState<RunSheetBlock | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const loadDayPlan = async (date: string) => {
    const cacheKey = `runsheet_${date}`;
    try {
      // 1. Instant check from cache if not already set
      const cached = await appCache.get<RunSheet>(cacheKey);
      if (cached) {
        setActiveRunSheet(cached);
        setLoading(false);
      }

      const sheets = await apiClient.getRunSheets({ run_date: date });
      if (sheets && sheets.length > 0) {
        // Fetch detailed sheet with blocks
        const detailed = await apiClient.getRunSheet(sheets[0].id);
        setActiveRunSheet((prev) => {
          if (prev && JSON.stringify(prev) !== JSON.stringify(detailed)) {
            setIsUpdated(true);
            setTimeout(() => setIsUpdated(false), 2500);
          }
          return detailed;
        });
        await appCache.set(cacheKey, detailed);
      } else {
        setActiveRunSheet(null);
      }
    } catch (err: unknown) {
      if (!activeRunSheet) {
        setError(err instanceof Error ? err.message : 'Failed to load day-plan');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDayPlan(currentDate);

    const handleGlobalRefresh = () => loadDayPlan(currentDate);
    window.addEventListener('hvachome:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('hvachome:refresh', handleGlobalRefresh);
  }, [currentDate]);

  const changeDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleBlockUpdated = (updatedBlock: RunSheetBlock) => {
    if (!activeRunSheet) return;
    setActiveRunSheet((prev) => {
      if (!prev || !prev.blocks) return prev;
      const updatedBlocks = prev.blocks.map((b) =>
        b.id === updatedBlock.id ? { ...b, ...updatedBlock } : b
      );
      return {
        ...prev,
        blocks: updatedBlocks,
      };
    });
    setClosingBlock(null);
  };

  const handleConfirmRemoveBlock = async () => {
    if (!activeRunSheet || !removingBlock) return;
    const targetBlock = removingBlock;
    setIsRemoving(true);
    setError(null);

    try {
      await apiClient.deleteRunSheetBlock(activeRunSheet.id, targetBlock.id);
      
      // Refresh the plan from API
      const cacheKey = `runsheet_${currentDate}`;
      const detailed = await apiClient.getRunSheet(activeRunSheet.id);
      setActiveRunSheet(detailed);
      await appCache.set(cacheKey, detailed);
      
      setRemovingBlock(null);
      setFeedbackMessage(`Job removed from Day Plan`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove job from Day Plan';
      setError(msg);
      setRemovingBlock(null);
    } finally {
      setIsRemoving(false);
    }
  };

  const getGateBadge = (gate?: string) => {
    switch (gate) {
      case 'green':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-500 text-white flex items-center gap-1 shadow-xs">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            CLEARED
          </span>
        );
      case 'red':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-brand-red text-white flex items-center gap-1 shadow-xs animate-pulse">
            <span className="material-symbols-outlined text-[13px]">gavel</span>
            OVERDUE / BLOCKED
          </span>
        );
      case 'amber':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-500 text-white flex items-center gap-1 shadow-xs">
            <span className="material-symbols-outlined text-[13px]">timer</span>
            PENDING 24H
          </span>
        );
    }
  };

  const rollup = activeRunSheet?.rollup;

  return (
    <div className="pb-safe pb-24 max-w-xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-black dark:text-white"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-brand-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
              Day Plan
            </h1>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
              Route order & legal entry gates
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsBatchBuilderOpen(true)}
          className="py-2 px-3 text-xs shadow-md shrink-0 flex items-center gap-1"
          icon="alt_route"
        >
          Plan Day
        </Button>
      </div>

      {/* Date Navigation Strip */}
      <div className="p-3 bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-xs">
        <button
          onClick={() => changeDate(-1)}
          className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200"
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">
            {new Date(currentDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}
          </span>
          <span className="text-sm font-extrabold text-brand-black dark:text-white font-mono">
            {currentDate}
          </span>
        </div>

        <button
          onClick={() => changeDate(1)}
          className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200"
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>

      {/* Rollup Summary Card */}
      {rollup && (
        <div className="p-3.5 bg-primary/5 dark:bg-card-dark border border-primary/20 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-brand-black dark:text-white">
              {rollup.completed_blocks} of {rollup.total_blocks} blocks completed ({rollup.progress_percentage}%)
            </span>
            <span className="font-mono text-gray-500 font-bold">
              Est: {rollup.total_estimated_minutes}m
              {rollup.total_actual_minutes > 0 ? ` | Act: ${rollup.total_actual_minutes}m` : ''}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${rollup.progress_percentage}%` }}
            ></div>
          </div>

          {/* Alert Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            {rollup.red_gate_count > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-red-100 text-brand-red font-bold flex items-center gap-1 border border-red-200">
                <span className="material-symbols-outlined text-xs">gavel</span>
                {rollup.red_gate_count} Overdue
              </span>
            )}
            {rollup.amber_gate_count > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center gap-1 border border-amber-200">
                <span className="material-symbols-outlined text-xs">timer</span>
                {rollup.amber_gate_count} Pending
              </span>
            )}
            {rollup.exceeds_capacity_count > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">warning</span>
                {rollup.exceeds_capacity_count} Overload
              </span>
            )}
          </div>
        </div>
      )}

      {/* Subtle background updated indicator */}
      {isUpdated && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-lg animate-fadeIn flex items-center gap-1.5 pointer-events-none">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          <span>Day Plan updated</span>
        </div>
      )}

      {/* Confirmation feedback toast */}
      {feedbackMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg animate-fadeIn flex items-center gap-1.5 pointer-events-none">
          <span className="material-symbols-outlined text-[14px]">check</span>
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Error alert banner */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-xs text-brand-red font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-gray-400 hover:text-brand-red text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Blocks List */}
      <PullToRefresh onRefresh={() => loadDayPlan(currentDate)}>
        {loading && !activeRunSheet ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
            <p className="text-xs font-semibold">Loading day-plan route blocks...</p>
          </div>
        ) : !activeRunSheet || !activeRunSheet.blocks || activeRunSheet.blocks.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
            <span className="material-symbols-outlined text-4xl text-gray-300">event_busy</span>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              No day plan scheduled for {currentDate}
            </p>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark max-w-sm mx-auto">
              Plan a daily route from open tickets grouped by site.
            </p>
            <Button
              variant="primary"
              onClick={() => setIsBatchBuilderOpen(true)}
              className="py-2.5 px-4 text-xs mx-auto shadow-sm"
              icon="alt_route"
            >
              Plan Day
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
          {activeRunSheet.blocks.map((block) => {
            const isCompleted = block.status === 'completed';
            const exceedsCarry = !!block.exceeds_carry_capacity;
            const gate = block.notice_gate_status || 'green';

            return (
              <div key={block.id} className="space-y-1">
                {/* Site Transition Indicator */}
                {block.is_site_transition && (
                  <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 my-2">
                    <span className="material-symbols-outlined text-[15px]">directions_bike</span>
                    Travel transit to {block.building_name} (+{block.travel_buffer_before_minutes || 20}m buffer)
                  </div>
                )}

                {/* Block Card */}
                <div
                  className={`rounded-2xl p-4 border transition-all shadow-xs ${
                    isCompleted
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                      : exceedsCarry
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-card-dark border-gray-100 dark:border-gray-800'
                  }`}
                >
                  {/* Row 1: Time Window + Order + Notice Gate Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {block.sort_order}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary">
                        {block.start_time ? `${block.start_time} - ${block.end_time || ''}` : 'Time Pending'}
                      </span>
                      <span className="text-xs text-gray-400">• {block.estimated_minutes} min est.</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Work Exposure Chip */}
                      {block.work_exposure === 'exterior_ladder' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">stairs</span>
                          Ladder
                        </span>
                      ) : block.work_exposure === 'exterior' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">wb_sunny</span>
                          Exterior
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">roofing</span>
                          Indoor
                        </span>
                      )}

                      {/* Rain Badge: ONLY when exterior or ladder AND rain expected */}
                      {(block.work_exposure === 'exterior' || block.work_exposure === 'exterior_ladder') && block.rain_expected && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500 text-white flex items-center gap-1 shadow-sm">
                          <span>🌧️</span>
                          Rain Expected
                        </span>
                      )}

                      {getGateBadge(gate)}
                    </div>
                  </div>

                  {/* Row 2: Title & Ticket Link */}
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      {block.ticket_id ? (
                        <button
                          onClick={() => onOpenTicket?.(String(block.ticket_id))}
                          className="px-2 py-0.5 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary/20 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">link</span>
                          {block.wo_number || `WO #${block.ticket_id}`}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-mono">Site Task</span>
                      )}
                      <h3 className="text-sm font-bold text-brand-black dark:text-white truncate">
                        {block.title}
                      </h3>
                    </div>

                    {/* Site Location */}
                    <div className="mt-1 flex items-center gap-1 text-xs text-text-sub-light dark:text-text-sub-dark">
                      <span className="material-symbols-outlined text-[15px] text-gray-400">location_on</span>
                      <span className="font-semibold text-brand-black dark:text-white">
                        {block.building_name || 'Site'}
                      </span>
                      {block.unit_number && <span>• Unit {block.unit_number}</span>}
                    </div>
                  </div>

                  {/* E-Bike Carry Capacity Alert Flag */}
                  {exceedsCarry && (
                    <div className="mt-2.5 p-2.5 bg-amber-500/10 border border-amber-400/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
                        <span className="uppercase text-[11px] tracking-wide">
                          {block.carry_warning || 'exceeds carry capacity — split or reschedule'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 pl-6">
                        {block.carry_reason || 'Requires Ladder + Drain Auger + Parts on e-bike. Exceeds single-trip cargo allowance.'}
                      </p>
                    </div>
                  )}

                  {/* Tools and Parts Pills */}
                  <div className="mt-2.5 flex flex-wrap gap-1 text-[11px]">
                    {block.required_tools_list?.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium inline-flex items-center"
                      >
                        <span className="material-symbols-outlined text-[13px] mr-1 text-gray-500">build</span>
                        {t}
                      </span>
                    ))}
                    {block.required_parts_list?.map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium inline-flex items-center"
                      >
                        <span className="material-symbols-outlined text-[13px] mr-1 text-primary">inventory_2</span>
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* Footer / Actions */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">done_all</span>
                          Completed
                        </span>
                        <span className="font-mono font-bold text-gray-600 dark:text-gray-300">
                          Est: {block.estimated_minutes}m | Act: {block.actual_minutes}m
                          {block.variance_minutes !== null && (
                            <span
                              className={`ml-1 font-bold ${
                                block.variance_minutes > 0 ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                            >
                              ({block.variance_minutes > 0 ? `+${block.variance_minutes}m` : `${block.variance_minutes}m`})
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        Status: <span className="uppercase font-semibold text-gray-500">{block.status}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      {/* Remove block button (one per job/block, asks confirmation) */}
                      <button
                        onClick={() => setRemovingBlock(block)}
                        className="py-1.5 px-3 min-h-[44px] text-xs font-bold text-brand-red hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                        title="Remove this job from the Day Plan"
                        aria-label={`Remove ${block.title} from Day Plan`}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Remove
                      </button>

                      {!isCompleted && onOpenQuickLog && (
                        <button
                          onClick={() => onOpenQuickLog(block)}
                          className="py-1.5 px-3 min-h-[44px] text-xs font-bold bg-gray-100 dark:bg-card-dark text-text-main-light dark:text-text-main-dark border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-800 flex items-center gap-1 active:scale-95 transition-all"
                          title="Open quick field logging session (<60s)"
                        >
                          <span className="material-symbols-outlined text-sm text-primary">bolt</span>
                          Quick Log
                        </button>
                      )}
                      {!isCompleted && (
                        <button
                          onClick={() => setClosingBlock(block)}
                          className="py-1.5 px-3 min-h-[44px] text-xs font-bold bg-primary text-white rounded-xl shadow-xs hover:bg-primary/90 flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Close Block
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </PullToRefresh>

      {/* Batch Builder Modal */}
      {isBatchBuilderOpen && (
        <BatchBuilderModal
          defaultRunDate={currentDate}
          onClose={() => setIsBatchBuilderOpen(false)}
          onSuccess={(sheet) => {
            setIsBatchBuilderOpen(false);
            setActiveRunSheet(sheet);
            if (sheet.run_date) {
              setCurrentDate(sheet.run_date);
            }
          }}
        />
      )}

      {/* Close Block Modal */}
      {closingBlock && activeRunSheet && (
        <CloseBlockModal
          runSheetId={activeRunSheet.id}
          block={closingBlock}
          onClose={() => setClosingBlock(null)}
          onSuccess={handleBlockUpdated}
        />
      )}

      {/* Remove Block Confirmation Modal */}
      {removingBlock && (
        <Modal onClose={() => !isRemoving && setRemovingBlock(null)} className="max-w-sm">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-brand-red mb-1">
              <span className="material-symbols-outlined text-[32px]">delete</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-black dark:text-white">
                Remove this job from the Day Plan?
              </h3>
              <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-2">
                <span className="font-bold text-brand-black dark:text-white block mb-1">
                  {removingBlock.title}
                </span>
                {removingBlock.building_name}
                {removingBlock.unit_number ? ` • Unit ${removingBlock.unit_number}` : ''}
              </p>
              <p className="text-[11px] text-gray-400 mt-2">
                The underlying ticket will remain open and untouched.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <Button
                onClick={() => setRemovingBlock(null)}
                variant="secondary"
                disabled={isRemoving}
                fullWidth
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRemoveBlock}
                variant="danger"
                disabled={isRemoving}
                fullWidth
                className="min-h-[44px]"
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

