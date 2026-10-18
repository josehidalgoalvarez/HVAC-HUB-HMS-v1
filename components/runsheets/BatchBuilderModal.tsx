import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { apiClient } from '../../src/api/client';
import type { Ticket, RunSheetBlock, BatchSuggestionResult, RunSheet } from '../../types/domain';

interface BatchBuilderModalProps {
  onClose: () => void;
  onSuccess: (newRunSheet: RunSheet) => void;
  defaultRunDate?: string;
}

export const BatchBuilderModal: React.FC<BatchBuilderModalProps> = ({
  onClose,
  onSuccess,
  defaultRunDate = new Date().toISOString().split('T')[0],
}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggestion Result state
  const [suggestion, setSuggestion] = useState<BatchSuggestionResult | null>(null);
  const [reorderedBlocks, setReorderedBlocks] = useState<RunSheetBlock[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [runDate, setRunDate] = useState(defaultRunDate);

  // Step 1 = Pick tickets, Step 2 = Review & reorder suggested travel blocks
  const [step, setStep] = useState<'pick' | 'review'>('pick');

  useEffect(() => {
    loadOpenTickets();
  }, []);

  const loadOpenTickets = async () => {
    try {
      setLoadingTickets(true);
      setError(null);
      const data = await apiClient.getTickets();
      // Filter to actionable open/verified/in-progress tickets
      const actionable = (data || []).filter(
        (t) => t.status !== 'closed' && t.status !== 'closed-elsewhere' && t.status !== 'done'
      );
      setTickets(actionable);
      // Pre-select all by default
      setSelectedTicketIds(actionable.map((t) => String(t.id)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  const toggleTicket = (id: string) => {
    setSelectedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedTicketIds(tickets.map((t) => String(t.id)));
  };

  const deselectAll = () => {
    setSelectedTicketIds([]);
  };

  const handleGenerateSuggestion = async () => {
    if (selectedTicketIds.length === 0) {
      setError('Please select at least 1 ticket to batch.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const result = await apiClient.suggestRunSheetBatch({
        ticket_ids: selectedTicketIds,
        start_time: startTime,
      });
      setSuggestion(result);
      setReorderedBlocks(result.blocks || []);
      setStep('review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate batch plan');
    } finally {
      setGenerating(false);
    }
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === reorderedBlocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...reorderedBlocks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Re-assign sort order
    const reindexed = updated.map((b, idx) => ({
      ...b,
      sort_order: idx + 1,
    }));
    setReorderedBlocks(reindexed);
  };

  const handleAcceptPlan = async () => {
    if (reorderedBlocks.length === 0) return;

    setCreating(true);
    setError(null);

    try {
      const newSheet = await apiClient.createRunSheet({
        run_date: runDate,
        status: 'active',
        notes: `Batch scheduled with ${reorderedBlocks.length} travel-clustered blocks`,
        blocks: reorderedBlocks,
      });
      onSuccess(newSheet);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create run sheet');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal onClose={onClose} className="max-w-2xl max-h-[90vh] overflow-y-auto">
      {/* Modal Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-card-dark z-10">
        <div>
          <h2 className="text-base font-bold text-brand-black dark:text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-xl">route</span>
            Smart Batch Day-Plan Builder
          </h2>
          <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
            {step === 'pick'
              ? 'Step 1: Select tickets to cluster by site proximity'
              : 'Step 2: Review travel sequence, notice gates & e-bike carry capacity'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-brand-red font-semibold">
          {error}
        </div>
      )}

      {/* STEP 1: PICK OPEN TICKETS */}
      {step === 'pick' && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-bold text-gray-600 dark:text-gray-300">Start Time:</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark font-mono font-bold"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-gray-600 dark:text-gray-300">Run Date:</label>
              <input
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark font-mono font-bold"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-2 py-1 text-xs text-primary font-bold hover:underline"
              >
                Select All ({tickets.length})
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2 py-1 text-xs text-gray-500 font-medium hover:underline"
              >
                Deselect
              </button>
            </div>
          </div>

          {loadingTickets ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
              <p className="text-xs">Loading open tickets across properties...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <p className="text-sm font-semibold text-gray-500">No open tickets available to schedule.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {tickets.map((t) => {
                const isSelected = selectedTicketIds.includes(String(t.id));
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTicket(String(t.id))}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 shadow-xs'
                        : 'bg-white dark:bg-card-dark border-gray-100 dark:border-gray-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-primary border-gray-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {t.wo_number || `WO #${t.id}`}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500 truncate">
                            {t.buildingName || 'Property'} {t.unitNumber ? `• Unit ${t.unitNumber}` : ''}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-brand-black dark:text-white truncate mt-0.5">
                          {t.title}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        t.priority === 'urgent'
                          ? 'bg-brand-red text-white'
                          : t.priority === 'high'
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-2.5 text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={generating || selectedTicketIds.length === 0}
              onClick={handleGenerateSuggestion}
              className="flex-1 py-2.5 text-xs shadow-md flex items-center justify-center gap-1.5"
            >
              {generating ? (
                'Optimizing Route...'
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">alt_route</span>
                  Calculate Proximity Order ({selectedTicketIds.length} Tickets)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW & REORDER SUGGESTED BATCH */}
      {step === 'review' && (
        <div className="mt-4 space-y-4">
          {/* Summary Metric Header */}
          {suggestion && (
            <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Tickets</span>
                <span className="text-sm font-extrabold text-primary">{suggestion.total_tickets}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Sites (Clusters)</span>
                <span className="text-sm font-extrabold text-brand-black dark:text-white">{suggestion.total_sites}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Work Time</span>
                <span className="text-sm font-bold text-brand-black dark:text-white">{suggestion.estimated_work_minutes}m</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Travel Buffer</span>
                <span className="text-sm font-bold text-emerald-600">+{suggestion.estimated_travel_minutes}m</span>
              </div>
            </div>
          )}

          <div className="text-xs text-text-sub-light dark:text-text-sub-dark flex items-center justify-between">
            <span>Blocks sorted by travel proximity. Reorder manually with &uarr; &darr; arrows.</span>
            <button
              onClick={() => setStep('pick')}
              className="text-primary font-bold hover:underline flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit Selection
            </button>
          </div>

          {/* Ordered Block Cards */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {reorderedBlocks.map((block, index) => {
              const gate = block.notice_gate_status || 'green';
              const exceedsCarry = !!block.exceeds_carry_capacity;

              return (
                <div key={block.sort_order} className="space-y-1">
                  {/* Site Transit Header Indicator */}
                  {block.is_site_transition && (
                    <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 my-1.5">
                      <span className="material-symbols-outlined text-[14px]">directions_bike</span>
                      Travel transit to {block.building_name} (+{block.travel_buffer_before_minutes || 20}m buffer)
                    </div>
                  )}

                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      exceedsCarry
                        ? 'border-amber-400 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'bg-white dark:bg-card-dark border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-primary">
                            {block.start_time} - {block.end_time} ({block.estimated_minutes}m)
                          </span>
                          <h4 className="text-xs font-bold text-brand-black dark:text-white truncate">
                            {block.title}
                          </h4>
                          <span className="text-[11px] text-gray-500 block">
                            {block.building_name} {block.unit_number ? `• Unit ${block.unit_number}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Notice Legal Gate Pill */}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-lg shrink-0 flex items-center gap-1 ${
                          gate === 'green'
                            ? 'bg-emerald-500 text-white'
                            : gate === 'red'
                            ? 'bg-brand-red text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          {gate === 'green' ? 'check_circle' : gate === 'red' ? 'gavel' : 'timer'}
                        </span>
                        {gate === 'green' ? 'CLEARED' : gate === 'red' ? 'OVERDUE' : 'PENDING 24H'}
                      </span>
                    </div>

                    {/* E-Bike Carry Capacity Alert Pill */}
                    {exceedsCarry && (
                      <div className="mt-2 p-2 bg-amber-500/10 border border-amber-400/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-amber-600 text-base shrink-0">
                          warning
                        </span>
                        <span>{block.carry_warning || 'exceeds carry capacity — split or reschedule'}</span>
                      </div>
                    )}

                    {/* Tools and Parts List */}
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                      {block.required_tools_list?.map((tool, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium"
                        >
                          🛠️ {tool}
                        </span>
                      ))}
                      {block.required_parts_list?.map((part, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
                        >
                          📦 {part}
                        </span>
                      ))}
                    </div>

                    {/* Reordering Buttons */}
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-gray-400">Position #{index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveBlock(index, 'up')}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          disabled={index === reorderedBlocks.length - 1}
                          onClick={() => moveBlock(index, 'down')}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="secondary" onClick={() => setStep('pick')} className="py-2.5 px-4 text-xs">
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={creating || reorderedBlocks.length === 0}
              onClick={handleAcceptPlan}
              className="flex-1 py-2.5 text-xs shadow-md bg-primary hover:bg-blue-600 flex items-center justify-center gap-1.5"
            >
              {creating ? (
                'Saving Day-Plan...'
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Accept & Create Day-Plan ({reorderedBlocks.length} Blocks)
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
