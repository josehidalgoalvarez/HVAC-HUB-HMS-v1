import React, { useState } from 'react';
import { Job, JobCloseoutPayload } from '../../types/domain';
import apiClient from '../../src/api/client';
import { outbox } from '../../src/offline/outbox';

interface JobCloseoutModalProps {
  job: Job;
  onClose: () => void;
  onJobClosed: (updatedJob: Job) => void;
}

const COMMON_PARTS_PRESETS = [
  'Dual Run Capacitor 45/5',
  'Defrost Contactor 30A',
  'Air Filter 16x25x1 MERV 8',
  'Drain Line Gallon Flush',
  'Condensate Float Switch',
  'Blower Motor Run Capacitor 10uF',
];

const COMMON_NOTES_PRESETS = [
  'Replaced capacitor and verified compressor amps normal.',
  'Cleared clogged condensate trap and flushed with cleaner.',
  'Inspected contactor points and replaced pitted assembly.',
  'Checked refrigerant operating pressures and temperature split.',
  'Cleaned condenser coil and replaced air filter.',
];

export const JobCloseoutModal: React.FC<JobCloseoutModalProps> = ({
  job,
  onClose,
  onJobClosed,
}) => {
  const initialEst = job.estimated_minutes || 45;
  const [actualMinutes, setActualMinutes] = useState<number>(job.actual_minutes || initialEst);
  const [notes, setNotes] = useState<string>(job.notes || '');
  const [parts, setParts] = useState<Array<{ part_name: string; quantity: number; unit: string; notes?: string }>>(
    (job.parts_used || []).map((p) => ({
      part_name: p.part_name,
      quantity: p.quantity,
      unit: p.unit || 'pcs',
      notes: p.notes,
    }))
  );
  const [newPartName, setNewPartName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const variance = actualMinutes - initialEst;

  const handleAddPart = (partName: string) => {
    if (!partName.trim()) return;
    setParts((prev) => [...prev, { part_name: partName.trim(), quantity: 1, unit: 'pcs' }]);
    setNewPartName('');
  };

  const handleRemovePart = (index: number) => {
    setParts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCloseJob = async () => {
    if (actualMinutes <= 0) {
      setError('Actual minutes must be greater than zero');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: JobCloseoutPayload = {
      actual_minutes: actualMinutes,
      notes: notes.trim(),
      parts_used: parts,
    };

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      // Queue offline mutation in outbox
      try {
        await outbox.enqueue({
          type: 'close_job',
          endpoint: `/api/jobs/${job.id}/close`,
          method: 'POST',
          job_id: job.id,
          payload: {
            job_id: job.id,
            actual_minutes: actualMinutes,
            notes: notes.trim(),
            parts_used: parts,
          },
        });

        // Optimistically return completed job
        const optimisticJob: Job = {
          ...job,
          status: 'completed',
          actual_minutes: actualMinutes,
          variance_minutes: variance,
          notes: notes.trim(),
          parts_used: parts.map((p, idx) => ({ id: 9999 + idx, ...p })),
          ticket_status: 'done',
        };

        onJobClosed(optimisticJob);
        onClose();
        return;
      } catch (err: any) {
        setError(err.message || 'Failed to queue offline close-out');
        setSubmitting(false);
        return;
      }
    }

    // Direct online API close
    try {
      const closed = await apiClient.closeJob(job.id, payload);
      onJobClosed(closed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to close job on server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-card-dark rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-emerald-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-brand-black dark:text-white">
                Close Out Work Order
              </h2>
              <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                {job.wo_number ? `${job.wo_number} • ` : ''}
                {job.building_name || 'Site'} {job.unit_number ? `#${job.unit_number}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-brand-black dark:text-white">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Time Tracking Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                Actual Time vs. Estimate
              </label>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  variance > 0
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : variance < 0
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Est: {initialEst}m | Act: {actualMinutes}m ({variance > 0 ? `+${variance}m` : `${variance}m`})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(Math.max(5, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 font-mono text-lg font-bold text-center"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  minutes
                </span>
              </div>
            </div>

            {/* Quick time preset chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setActualMinutes(mins)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    actualMinutes === mins
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {mins}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActualMinutes((m) => Math.max(5, m - 15))}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
              >
                -15m
              </button>
              <button
                type="button"
                onClick={() => setActualMinutes((m) => m + 15)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
              >
                +15m
              </button>
            </div>
          </div>

          {/* Parts Used Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">build</span>
                Parts Installed / Replaced
              </label>
              <span className="text-[11px] font-mono text-gray-400">{parts.length} recorded</span>
            </div>

            {parts.length > 0 && (
              <div className="space-y-1.5">
                {parts.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs border border-gray-100 dark:border-gray-800"
                  >
                    <span className="font-semibold text-brand-black dark:text-white">
                      {p.quantity} {p.unit} &times; {p.part_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePart(idx)}
                      className="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick part presets */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PARTS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddPart(preset)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom part input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Or type custom part name..."
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPart(newPartName);
                  }
                }}
                className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              />
              <button
                type="button"
                onClick={() => handleAddPart(newPartName)}
                disabled={!newPartName.trim()}
                className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* Close-Out Field Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-emerald-500">notes</span>
              Work Completed Notes
            </label>

            <textarea
              rows={3}
              placeholder="Describe work completed, tests verified, or resolution notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 resize-none"
            />

            {/* Quick common note chips */}
            <div className="flex flex-wrap gap-1">
              {COMMON_NOTES_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNotes((prev) => (prev ? `${prev} ${preset}` : preset))}
                  className="px-2 py-1 rounded-lg text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-left line-clamp-1"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with One-Tap Action */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 flex items-center gap-3 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-300 active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCloseJob}
            disabled={submitting}
            className="flex-[2] h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl">task_alt</span>
            <span>{submitting ? 'Closing Out...' : 'Complete & Mark Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCloseoutModal;
