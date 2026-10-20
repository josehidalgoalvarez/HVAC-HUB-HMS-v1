import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import type { PartRecord, Stockpile } from '../../types/domain';

export interface LogPartUseResult {
  mode: 'use' | 'restock';
  quantity: number;
  job_id?: number;
  stockpile_id?: number;
  reason?: string;
}

interface LogPartUseModalProps {
  part: PartRecord;
  stockpiles: Stockpile[];
  initialMode?: 'use' | 'restock';
  onClose: () => void;
  onSuccess: (result: LogPartUseResult) => void;
}

export const LogPartUseModal: React.FC<LogPartUseModalProps> = ({
  part,
  stockpiles,
  initialMode = 'use',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'use' | 'restock'>(initialMode);
  const [quantity, setQuantity] = useState<number>(1);
  const [jobId, setJobId] = useState<string>('');
  const [stockpileId, setStockpileId] = useState<string>(
    part.stockpiles && part.stockpiles.length > 0 ? String(part.stockpiles[0].stockpile_id) : '1'
  );
  const [reason, setReason] = useState<string>(
    initialMode === 'restock'
      ? 'Restocked inventory / salvaged spare'
      : 'Installed part during service visit'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (mode === 'use' && quantity > part.quantity_on_hand) {
      setError(`Cannot use more than current stock (${part.quantity_on_hand} pcs)`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: LogPartUseResult = {
        mode,
        quantity,
        reason,
      };

      if (jobId.trim() !== '') {
        payload.job_id = parseInt(jobId.trim(), 10);
      }
      if (stockpileId) {
        payload.stockpile_id = parseInt(stockpileId, 10);
      }

      onSuccess(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to update part');
      setSubmitting(false);
    }
  };

  const willReorder = mode === 'use' && (part.quantity_on_hand - quantity) <= part.reorder_point;
  const newStockPreview = mode === 'restock'
    ? part.quantity_on_hand + quantity
    : Math.max(0, part.quantity_on_hand - quantity);

  return (
    <Modal onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">
              {mode === 'restock' ? 'add_box' : 'handyman'}
            </span>
            <h2 className="text-lg font-bold text-brand-black dark:text-white">
              {mode === 'restock' ? 'Restock Part' : 'Use Part'}
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'restock'
              ? `Add units of ${part.name} to stash.`
              : `Record units of ${part.name} used on job.`}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-gray-100 dark:bg-neutral-800 p-1 border border-gray-200/60 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              setMode('use');
              setReason('Installed part during service visit');
            }}
            className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'use'
                ? 'bg-white dark:bg-card-dark text-primary shadow-xs'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">build</span>
            Use Part
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('restock');
              setReason('Restocked inventory / salvaged spare');
            }}
            className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'restock'
                ? 'bg-white dark:bg-card-dark text-primary shadow-xs'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_box</span>
            Restock
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-xl">
            {error}
          </div>
        )}

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Current Stock:</span>
            <span className="font-bold">{part.quantity_on_hand} available</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              {mode === 'restock' ? 'New Stock After Add:' : 'Stock After Usage:'}
            </span>
            <span className={`font-mono font-bold ${mode === 'restock' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              {newStockPreview} pcs
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Reorder Threshold:</span>
            <span className="font-bold">{part.reorder_point} pcs</span>
          </div>
          {willReorder && (
            <div className="pt-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Usage will trigger reorder flag (Remaining: {newStockPreview} ≤ {part.reorder_point})
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Stockpile Location
          </label>
          <select
            value={stockpileId}
            onChange={e => setStockpileId(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white"
          >
            {stockpiles.map(sp => (
              <option key={sp.id} value={sp.id}>
                {sp.name} ({sp.location})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              {mode === 'restock' ? 'Quantity to Add' : 'Quantity Used'}
            </label>
            <input
              type="number"
              min="1"
              max={mode === 'use' ? Math.max(1, part.quantity_on_hand) : undefined}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Job ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 1"
              value={jobId}
              onChange={e => setJobId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            {mode === 'restock' ? 'Restock Note / Audit' : 'Usage Reason / Audit Note'}
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white"
            required
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting} className="flex-1 min-h-[44px]">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting} className="flex-1 min-h-[44px]">
            {submitting
              ? (mode === 'restock' ? 'Adding to Stash...' : 'Recording...')
              : (mode === 'restock' ? 'Add to Stash' : 'Record Usage')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

