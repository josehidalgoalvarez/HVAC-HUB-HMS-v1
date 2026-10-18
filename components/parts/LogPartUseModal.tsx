import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import type { PartRecord, Stockpile } from '../../types/domain';

interface LogPartUseModalProps {
  part: PartRecord;
  stockpiles: Stockpile[];
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const LogPartUseModal: React.FC<LogPartUseModalProps> = ({
  part,
  stockpiles,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [jobId, setJobId] = useState<string>('');
  const [stockpileId, setStockpileId] = useState<string>(
    part.stockpiles && part.stockpiles.length > 0 ? String(part.stockpiles[0].stockpile_id) : '1'
  );
  const [reason, setReason] = useState<string>('Installed part during service visit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: {
        quantity: number;
        job_id?: number;
        stockpile_id?: number;
        reason?: string;
      } = {
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
      setError(err.message || 'Failed to log part usage');
      setSubmitting(false);
    }
  };

  const willReorder = (part.quantity_on_hand - quantity) <= part.reorder_point;

  return (
    <Modal onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">handyman</span>
            <h2 className="text-lg font-bold text-brand-black dark:text-white">Log Part Usage</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Consume {part.name} ({part.part_number}) from stockpile and link to work record.
          </p>
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
            <span className="text-gray-500">Reorder Threshold:</span>
            <span className="font-bold">{part.reorder_point} pcs</span>
          </div>
          {willReorder && (
            <div className="pt-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Usage will trigger reorder flag (Remaining: {Math.max(0, part.quantity_on_hand - quantity)} ≤ {part.reorder_point})
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
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
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
              Quantity Used
            </label>
            <input
              type="number"
              min="1"
              max={Math.max(1, part.quantity_on_hand)}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Usage Reason / Audit Note
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
            required
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
            {submitting ? 'Recording...' : 'Record Usage'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
