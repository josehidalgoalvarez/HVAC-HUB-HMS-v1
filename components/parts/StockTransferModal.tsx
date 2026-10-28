import React, { useState } from 'react';
import { apiClient } from '../../src/api/client';
import type { PartRecord, Stockpile } from '../../types/domain';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';

interface StockTransferModalProps {
  parts: PartRecord[];
  stockpiles: Stockpile[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  initialPartId?: number;
  initialSourceStockpileId?: number | string;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  parts,
  stockpiles,
  isOpen,
  onClose,
  onSuccess,
  initialPartId,
  initialSourceStockpileId,
}) => {
  const [selectedPartId, setSelectedPartId] = useState<string>(
    initialPartId ? String(initialPartId) : (parts[0] ? String(parts[0].id) : '')
  );
  const [sourceStockpileId, setSourceStockpileId] = useState<string>(
    initialSourceStockpileId
      ? String(initialSourceStockpileId)
      : (stockpiles[0] ? String(stockpiles[0].id) : '')
  );
  const otherStockpile = stockpiles.find(s => String(s.id) !== (initialSourceStockpileId ? String(initialSourceStockpileId) : String(stockpiles[0]?.id)));
  const [destStockpileId, setDestStockpileId] = useState<string>(
    otherStockpile ? String(otherStockpile.id) : (stockpiles[1] ? String(stockpiles[1].id) : (stockpiles[0] ? String(stockpiles[0].id) : ''))
  );
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [transferredBy, setTransferredBy] = useState<string>('Jose (Tech)');
  const [notes, setNotes] = useState<string>('');
  const [ticketId, setTicketId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPart = parts.find(p => String(p.id) === selectedPartId);
  const sourceStockpileAlloc = currentPart?.stockpiles?.find(
    sp => String(sp.stockpile_id) === sourceStockpileId
  );
  const availableQtyAtSource = sourceStockpileAlloc ? sourceStockpileAlloc.quantity : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sId = parseInt(sourceStockpileId, 10);
    const dId = parseInt(destStockpileId, 10);
    const pId = parseInt(selectedPartId, 10);

    if (sId === dId) {
      setError('Source and destination stockpiles cannot be identical');
      return;
    }

    const numericQty = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10);
    if (!numericQty || isNaN(numericQty) || numericQty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (availableQtyAtSource < numericQty) {
      setError(`Insufficient quantity at source stockpile (${availableQtyAtSource} available, ${numericQty} requested)`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        source_type: 'stockpile',
        source_stockpile_id: sId,
        destination_type: 'stockpile',
        destination_stockpile_id: dId,
        part_id: pId,
        quantity,
        transferred_by: transferredBy.trim() || 'Jose (Tech)',
        notes: notes.trim() || `Generalized stock transfer between stockpiles (#${sId} -> #${dId})`,
        ticket_id: ticketId.trim() ? parseInt(ticketId.trim(), 10) : undefined,
      };

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
          <span className="material-symbols-outlined text-primary text-xl">move_down</span>
          <div>
            <h2 className="text-base font-bold text-brand-black dark:text-white">
              Stockpile Stock Transfer
            </h2>
            <p className="text-[11px] text-gray-500">Move inventory between depots with provenance audit</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-100 text-red-900 border border-red-200 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Part Selection */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
            Part to Transfer <span className="text-brand-red">*</span>
          </label>
          <select
            value={selectedPartId}
            onChange={e => setSelectedPartId(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
            required
          >
            {parts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.part_number ? `(#${p.part_number})` : ''} — Qty: {p.quantity_on_hand}
              </option>
            ))}
          </select>
        </div>

        {/* Source and Destination Stockpiles */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Source Stockpile <span className="text-brand-red">*</span>
            </label>
            <select
              value={sourceStockpileId}
              onChange={e => setSourceStockpileId(e.target.value)}
              className="w-full min-h-[44px] px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-xs"
              required
            >
              {stockpiles.map(sp => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
            <span className="block mt-1 text-[10px] text-gray-500">
              Avail: <strong className="text-brand-black dark:text-white font-mono">{availableQtyAtSource}</strong>
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Destination Stockpile <span className="text-brand-red">*</span>
            </label>
            <select
              value={destStockpileId}
              onChange={e => setDestStockpileId(e.target.value)}
              className="w-full min-h-[44px] px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-xs"
              required
            >
              {stockpiles.map(sp => (
                <option key={sp.id} value={sp.id} disabled={String(sp.id) === sourceStockpileId}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity and Transferred By */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Transfer Qty <span className="text-brand-red">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={availableQtyAtSource > 0 ? availableQtyAtSource : 99}
              value={quantity}
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setQuantity('');
                } else {
                  const num = parseInt(val, 10);
                  setQuantity(isNaN(num) ? '' : num);
                }
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono font-bold"
              required
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

        {/* Optional Ticket ID */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
            Work Order / Ticket # (Optional)
          </label>
          <input
            type="text"
            value={ticketId}
            onChange={e => setTicketId(e.target.value)}
            placeholder="e.g. 104"
            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
            Transfer Notes / Audit Reason
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Staging for upcoming maintenance run, balancing depot stock..."
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
            className="flex-1 min-h-[44px] py-2 font-bold bg-primary hover:bg-primary/90 shadow-sm"
            disabled={loading}
          >
            {loading ? 'Transferring...' : 'Execute Transfer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
