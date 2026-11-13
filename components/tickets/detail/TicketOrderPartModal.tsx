import React, { useState } from 'react';
import { apiClient } from '../../../src/api/client';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';

interface TicketOrderPartModalProps {
  ticketId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export const TicketOrderPartModal: React.FC<TicketOrderPartModalProps> = ({
  ticketId,
  open,
  onClose,
  onSaved,
}) => {
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partSupplier, setPartSupplier] = useState<'Dependable' | 'Home Depot Gardiners Rd' | 'other'>('Dependable');
  const [customSupplier, setCustomSupplier] = useState('');
  const [partOrderRef, setPartOrderRef] = useState('');
  const [partApplianceType, setPartApplianceType] = useState('Refrigerator');
  const [partQuantity, setPartQuantity] = useState<number | ''>(1);
  const [partUnitCost, setPartUnitCost] = useState('');
  const [partNotes, setPartNotes] = useState('');
  const [partSaving, setPartSaving] = useState(false);

  const handleOrderPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim()) {
      alert('Part name is required');
      return;
    }
    const numericQty = typeof partQuantity === 'number' ? partQuantity : parseInt(String(partQuantity), 10);
    if (!numericQty || isNaN(numericQty) || numericQty <= 0) {
      alert('Please enter a valid part quantity greater than zero');
      return;
    }
    const supplier = partSupplier === 'other' ? (customSupplier.trim() || 'Other Supplier') : partSupplier;
    try {
      setPartSaving(true);
      await apiClient.orderTicketPart(ticketId, {
        part_name: partName.trim(),
        part_number: partNumber.trim() || undefined,
        supplier,
        order_ref: partOrderRef.trim() || undefined,
        appliance_type: partApplianceType,
        quantity: numericQty,
        unit_cost: partUnitCost ? parseFloat(partUnitCost) : undefined,
        notes: partNotes.trim() || undefined,
      });
      onClose();
      setPartName('');
      setPartNumber('');
      setPartOrderRef('');
      setCustomSupplier('');
      setPartNotes('');
      await onSaved();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to order part');
    } finally {
      setPartSaving(false);
    }
  };

  if (!open) return null;

  return (
        <Modal title="Order Part" onClose={() => onClose()} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-amber-500 text-xl">shopping_cart</span>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Order Part</h2>
            </div>
            <button
              onClick={() => onClose()}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
             aria-label="Close">
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleOrderPart} className="mt-4 space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              💡 Ordering a part automatically logs a timeline event and creates a <strong>part-wait watch</strong>.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Appliance Type <span className="text-brand-red">*</span>
                </label>
                <select
                  value={partApplianceType}
                  onChange={(e) => setPartApplianceType(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                >
                  <option value="Refrigerator">Refrigerator</option>
                  <option value="Range / Stove">Range / Stove</option>
                  <option value="Dishwasher">Dishwasher</option>
                  <option value="HVAC / Heat Pump">HVAC / Heat Pump</option>
                  <option value="Water Heater">Water Heater</option>
                  <option value="Washer / Dryer">Washer / Dryer</option>
                  <option value="General Appliance">General Appliance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Supplier <span className="text-brand-red">*</span>
                </label>
                <select
                  value={partSupplier}
                  onChange={(e) => setPartSupplier(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                >
                  <option value="Dependable">Dependable</option>
                  <option value="Home Depot Gardiners Rd">Home Depot Gardiners Rd</option>
                  <option value="other">Other Supplier...</option>
                </select>
              </div>
            </div>

            {partSupplier === 'other' && (
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Custom Supplier Name
                </label>
                <input
                  type="text"
                  value={customSupplier}
                  onChange={(e) => setCustomSupplier(e.target.value)}
                  placeholder="e.g. Reliable Parts, WW Grainger"
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Part Name / Description <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g. Defrost timer, igniter coil, blower capacitor"
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Part # (Optional)
                </label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. WPW10366605"
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Order Ref (Optional)
                </label>
                <input
                  type="text"
                  value={partOrderRef}
                  onChange={(e) => setPartOrderRef(e.target.value)}
                  placeholder="Auto-generated if blank"
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={partQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setPartQuantity('');
                    } else {
                      const num = parseInt(val, 10);
                      setPartQuantity(isNaN(num) ? '' : num);
                    }
                  }}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Est. Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={partUnitCost}
                  onChange={(e) => setPartUnitCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                value={partNotes}
                onChange={(e) => setPartNotes(e.target.value)}
                placeholder="Shipping details, tracking #, or special instructions..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onClose()}
                className="flex-1 min-h-[44px] py-2 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 min-h-[44px] py-2 text-xs font-bold shadow-sm"
                disabled={partSaving}
              >
                {partSaving ? 'Ordering...' : 'Place Order & Watch'}
              </Button>
            </div>
          </form>
        </Modal>

  );
};
