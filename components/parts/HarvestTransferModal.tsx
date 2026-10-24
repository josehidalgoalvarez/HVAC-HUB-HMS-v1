import React, { useState } from 'react';
import { apiClient } from '../../src/api/client';
import type { HarvestCandidate, Stockpile } from '../../types/domain';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';

interface HarvestTransferModalProps {
  candidate: HarvestCandidate;
  stockpiles?: Stockpile[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const HarvestTransferModal: React.FC<HarvestTransferModalProps> = ({
  candidate,
  stockpiles = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [destType, setDestType] = useState<'unit' | 'stockpile'>('stockpile');
  const [destBuildingId, setDestBuildingId] = useState<string>('');
  const [destUnitId, setDestUnitId] = useState<string>('');
  const [destStockpileId, setDestStockpileId] = useState<string>(
    stockpiles[0] ? String(stockpiles[0].id) : ''
  );
  const [ticketId, setTicketId] = useState<string>('');
  const [transferredBy, setTransferredBy] = useState<string>('Jose (Tech)');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        appliance_id: candidate.appliance_id || candidate.id,
        destination_type: destType,
        transferred_by: transferredBy.trim() || 'Jose (Tech)',
        notes: notes.trim() || `Harvested from vacant unit ${candidate.unit_number} (${candidate.building_name})`,
      };

      if (destType === 'unit') {
        if (!destUnitId) {
          throw new Error('Destination Unit ID is required when transferring to a unit');
        }
        payload.destination_unit_id = parseInt(destUnitId, 10);
        if (destBuildingId) {
          payload.destination_building_id = parseInt(destBuildingId, 10);
        }
      } else {
        if (destStockpileId) {
          payload.destination_stockpile_id = parseInt(destStockpileId, 10);
        }
      }

      if (ticketId.trim()) {
        payload.ticket_id = parseInt(ticketId.trim(), 10);
      }

      const res = await apiClient.recordStockTransfer(payload);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record stock transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600 text-xl">swap_horiz</span>
          <div>
            <h2 className="text-base font-bold text-brand-black dark:text-white">
              Harvest from Vacant Unit
            </h2>
            <p className="text-[11px] text-gray-500">Record stock transfer & provenance</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
        {/* Source Candidate Info Summary */}
        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-emerald-900 dark:text-emerald-200 text-xs">
              {candidate.name}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              {candidate.occupancy_label || 'Vacant unit'}
            </span>
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">apartment</span>
            <span>
              {candidate.building_name} • Unit {candidate.unit_number}
            </span>
            {candidate.model_number && (
              <span className="font-mono text-gray-500 dark:text-gray-400">
                (Model: {candidate.model_number})
              </span>
            )}
          </div>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
            Harvest-first policy: Free high-confidence stock prior to purchasing new parts.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-100 text-red-900 border border-red-200 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Destination Type Selector */}
        <div>
          <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1.5">
            Transfer Destination
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDestType('stockpile')}
              className={`p-2.5 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all ${
                destType === 'stockpile'
                  ? 'bg-primary/10 border-primary text-primary shadow-xs'
                  : 'bg-gray-50 dark:bg-card-dark border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">warehouse</span>
              Stockpile / Depot
            </button>
            <button
              type="button"
              onClick={() => setDestType('unit')}
              className={`p-2.5 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all ${
                destType === 'unit'
                  ? 'bg-primary/10 border-primary text-primary shadow-xs'
                  : 'bg-gray-50 dark:bg-card-dark border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">door_front</span>
              Specific Unit
            </button>
          </div>
        </div>

        {/* Destination Details */}
        {destType === 'unit' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                Dest Unit ID <span className="text-brand-red">*</span>
              </label>
              <input
                type="number"
                value={destUnitId}
                onChange={e => setDestUnitId(e.target.value)}
                placeholder="e.g. 104"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                Dest Building ID (Opt)
              </label>
              <input
                type="number"
                value={destBuildingId}
                onChange={e => setDestBuildingId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Select Stockpile Location
            </label>
            <select
              value={destStockpileId}
              onChange={e => setDestStockpileId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
            >
              {stockpiles.map(sp => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} ({sp.location || 'Depot'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Ticket ID & Transferred By */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Work Order / Ticket # (Opt)
            </label>
            <input
              type="text"
              value={ticketId}
              onChange={e => setTicketId(e.target.value)}
              placeholder="e.g. 42"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Transferred By
            </label>
            <input
              type="text"
              value={transferredBy}
              onChange={e => setTransferredBy(e.target.value)}
              placeholder="Jose (Tech)"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
            />
          </div>
        </div>

        {/* Transfer Notes */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
            Transfer Notes / Provenance
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reason for pulling from vacant unit, component condition, etc."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 min-h-[44px] py-2 font-bold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 min-h-[44px] py-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            disabled={loading}
          >
            {loading ? 'Recording...' : 'Confirm Stock Transfer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
