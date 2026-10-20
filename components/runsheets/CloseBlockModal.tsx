import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { apiClient } from '../../src/api/client';
import type { RunSheetBlock } from '../../types/domain';

interface CloseBlockModalProps {
  runSheetId: string | number;
  block: RunSheetBlock;
  onClose: () => void;
  onSuccess: (updatedBlock: RunSheetBlock) => void;
}

export const CloseBlockModal: React.FC<CloseBlockModalProps> = ({
  runSheetId,
  block,
  onClose,
  onSuccess,
}) => {
  const [actualMinutes, setActualMinutes] = useState<number>(
    block.actual_minutes ?? block.estimated_minutes ?? 45
  );
  const [reason, setReason] = useState('Completed scheduled visit block');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [15, 30, 45, 60, 90, 120];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualMinutes <= 0) {
      setError('Actual minutes must be greater than 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await apiClient.updateRunSheetBlock(runSheetId, block.id, {
        status: 'completed',
        actual_minutes: actualMinutes,
        reason: reason.trim() || 'Block closed with actual minutes',
      });
      onSuccess(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close block';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const est = block.estimated_minutes ?? 45;
  const variance = actualMinutes - est;

  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-base font-bold text-brand-black dark:text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            Complete Block
          </h2>
          <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate max-w-[280px]">
            {block.title}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-brand-red font-semibold">
            {error}
          </div>
        )}

        {/* Estimate vs Actual Summary Box */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Estimated</span>
            <span className="text-sm font-bold text-brand-black dark:text-white">{est} min</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Actual</span>
            <span className="text-sm font-extrabold text-primary">{actualMinutes} min</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Variance</span>
            <span
              className={`text-sm font-bold ${
                variance > 0 ? 'text-amber-600' : variance < 0 ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              {variance > 0 ? `+${variance}m` : variance < 0 ? `${variance}m` : '0m'}
            </span>
          </div>
        </div>

        {/* Quick Presets (Gloves-On One-Thumb) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Duration (minutes)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {presets.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setActualMinutes(min)}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  actualMinutes === min
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white dark:bg-card-dark border-gray-200 dark:border-gray-700 text-brand-black dark:text-white hover:bg-gray-50'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            Exact minutes
          </label>
          <input
            type="number"
            min={1}
            max={720}
            value={actualMinutes}
            onChange={(e) => setActualMinutes(parseInt(e.target.value, 10) || 0)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark font-mono text-sm font-bold"
            required
          />
        </div>

        {/* Audit Reason */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            Notes
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Completed filter swap and condenser coil rinse"
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex-1 py-2.5 text-xs shadow-md bg-primary hover:bg-blue-600"
          >
            {loading ? 'Saving...' : 'Complete Block'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
