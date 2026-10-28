import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { apiClient } from '../../src/api/client';
import type { PartRecord, Stockpile } from '../../types/domain';

interface AddPartModalProps {
  isOpen: boolean;
  stockpiles: Stockpile[];
  onClose: () => void;
  onSuccess: (part: PartRecord) => void;
  initialStockpileId?: number | string;
}

export const AddPartModal: React.FC<AddPartModalProps> = ({
  isOpen,
  stockpiles,
  onClose,
  onSuccess,
  initialStockpileId,
}) => {
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [quantityOnHand, setQuantityOnHand] = useState<number | ''>(1);
  const [reorderPoint, setReorderPoint] = useState<number | ''>(1);
  const [unitCost, setUnitCost] = useState<string>('');
  const [stockpileId, setStockpileId] = useState<string>(
    initialStockpileId
      ? String(initialStockpileId)
      : (stockpiles.length > 0 ? String(stockpiles[0].id) : '1')
  );
  const [compatibleModels, setCompatibleModels] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Part name is required');
      return;
    }

    const numQty = typeof quantityOnHand === 'number' ? quantityOnHand : parseInt(String(quantityOnHand), 10);
    if (isNaN(numQty) || numQty < 0) {
      setError('Please enter a valid initial quantity (0 or greater)');
      return;
    }

    let numReorder: number | undefined = undefined;
    if (reorderPoint !== '') {
      const parsedReorder = typeof reorderPoint === 'number' ? reorderPoint : parseInt(String(reorderPoint), 10);
      if (isNaN(parsedReorder) || parsedReorder < 0) {
        setError('Reorder point must be 0 or greater if specified');
        return;
      }
      numReorder = parsedReorder;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const modelsArray = compatibleModels
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        part_number: partNumber.trim() || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        quantity_on_hand: numQty,
        min_quantity: numReorder,
        reorder_point: numReorder,
        unit_cost: unitCost ? parseFloat(unitCost) : undefined,
        stockpile_id: stockpileId ? parseInt(stockpileId, 10) : undefined,
        compatible_models: modelsArray.length > 0 ? modelsArray : undefined,
      };

      const createdPart = await apiClient.createPart(payload);
      onSuccess(createdPart);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add part to stash');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
            <h2 className="text-lg font-bold text-brand-black dark:text-white">Add Part</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Part Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Part Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Robertshaw Infinite Switch"
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* Part Number & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Part Number / SKU
              </label>
              <input
                type="text"
                value={partNumber}
                onChange={e => setPartNumber(e.target.value)}
                placeholder="e.g. WB24T10025"
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="">Select Category...</option>
                <option value="Electric Range">Electric Range</option>
                <option value="Gas Range">Gas Range</option>
                <option value="HVAC / Heating">HVAC / Heating</option>
                <option value="Laundry">Laundry</option>
                <option value="Refrigeration">Refrigeration</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="General Appliance">General Appliance</option>
              </select>
            </div>
          </div>

          {/* Quantity & Stockpile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Initial Qty *
              </label>
              <input
                type="number"
                min="0"
                value={quantityOnHand}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setQuantityOnHand('');
                  } else {
                    const num = parseInt(val, 10);
                    setQuantityOnHand(isNaN(num) ? '' : num);
                  }
                }}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Min / Reorder Point
              </label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setReorderPoint('');
                  } else {
                    const num = parseInt(val, 10);
                    setReorderPoint(isNaN(num) ? '' : num);
                  }
                }}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                placeholder="42.50"
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Target Stockpile */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Stockpile Depot
            </label>
            <select
              value={stockpileId}
              onChange={e => setStockpileId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
            >
              {stockpiles.map(sp => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} ({sp.location})
                </option>
              ))}
            </select>
          </div>

          {/* Compatible Models */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Compatible Models (comma-separated)
            </label>
            <input
              type="text"
              value={compatibleModels}
              onChange={e => setCompatibleModels(e.target.value)}
              placeholder="e.g. GE JBP24, Hotpoint RB525, Kenmore 911"
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Salvaged donor switch tested OK, stored on shelf A"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1 min-h-[44px]"
          >
            {isSubmitting ? 'Saving to Stash...' : 'Save to Stash'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPartModal;
