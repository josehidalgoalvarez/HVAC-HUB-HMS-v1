import React, { useState, useEffect } from 'react';
import { Appliance } from '../../../../types';
import type { Stockpile, Ticket } from '../../../../types/domain';
import { apiClient } from '../../../../src/api/client';
import { appCache } from '../../../../src/offline/cache';
import { SEED_STOCKPILES } from '../../../parts/partsSeedData';
import { Modal } from '../../../ui/Modal';
import Button from '../../../ui/Button';

interface RecordApplianceMoveModalProps {
  appliance: Appliance;
  onClose: () => void;
  onSuccess: (updatedAppliance?: Partial<Appliance>) => void;
}

export const RecordApplianceMoveModal: React.FC<RecordApplianceMoveModalProps> = ({
  appliance,
  onClose,
  onSuccess,
}) => {
  // Dispositions: 'installed' | 'staged' | 'stored' | 'harvested' | 'disposed'
  const [disposition, setDisposition] = useState<'installed' | 'staged' | 'stored' | 'harvested' | 'disposed'>('installed');

  // Form Fields
  const [moveDate, setMoveDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedStockpileId, setSelectedStockpileId] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [movedBy, setMovedBy] = useState<string>('Tech');

  // Confirmation dialog state for irreversible/destructive dispositions
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Data Options
  const [stockpiles, setStockpiles] = useState<Stockpile[]>(() => {
    return appCache.getSync<Stockpile[]>('stockpiles') || SEED_STOCKPILES;
  });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [unitsList, setUnitsList] = useState<Array<{ id: number | string; label: string; buildingName: string; unitNumber: string }>>([]);

  // Loading & Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch reference lists (units, stockpiles, tickets)
  useEffect(() => {
    let isMounted = true;

    // Load stockpiles
    apiClient
      .getStockpiles()
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setStockpiles(res);
          appCache.set('stockpiles', res);
        }
      })
      .catch((err) => console.warn('Could not load stockpiles:', err));

    // Load active/open tickets
    apiClient
      .getTickets()
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          // Sort newest tickets first
          const sorted = [...res].sort((a, b) => Number(b.id) - Number(a.id));
          setTickets(sorted);
        }
      })
      .catch((err) => console.warn('Could not load tickets:', err));

    // Load inventory to build units picker by NAME
    apiClient
      .getInventory()
      .then((inv) => {
        if (!isMounted || !inv) return;
        const bMap = new Map<number, string>();
        if (Array.isArray(inv.buildings)) {
          inv.buildings.forEach((b: any) => {
            bMap.set(Number(b.id), b.name || b.address || `Building #${b.id}`);
          });
        }
        if (Array.isArray(inv.units)) {
          const list = inv.units.map((u: any) => {
            const bName = bMap.get(Number(u.building_id)) || 'Property';
            return {
              id: u.id,
              label: `${bName} · Unit ${u.unit_number}`,
              buildingName: bName,
              unitNumber: String(u.unit_number),
            };
          });
          // Sort by building name then unit number
          list.sort((a: any, b: any) => a.label.localeCompare(b.label, undefined, { numeric: true }));
          setUnitsList(list);
        }
      })
      .catch((err) => console.warn('Could not load units list:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute read-only current location
  const currentLocationLabel = React.useMemo(() => {
    if (appliance.unitNumber) {
      return `Unit ${appliance.unitNumber}${appliance.location ? ` (${appliance.location})` : ''}`;
    }
    if (appliance.stockpileId) {
      const sp = stockpiles.find((s) => Number(s.id) === Number(appliance.stockpileId));
      return sp ? sp.name : `Stockpile #${appliance.stockpileId}`;
    }
    return appliance.location || 'Unknown / Unassigned';
  }, [appliance, stockpiles]);

  // Form Validation Rule Check
  const validate = (): string | null => {
    // Validate moveDate: must not be in the future
    if (moveDate) {
      const today = new Date().toISOString().split('T')[0];
      if (moveDate > today) {
        return `Future move date rejected: cannot record moves in the future (${moveDate}).`;
      }
    }

    if (disposition === 'installed') {
      if (!selectedUnitId) {
        return 'Installed disposition requires selecting a destination unit.';
      }
      if (selectedStockpileId) {
        return 'Invalid selection: installed disposition cannot have a stockpile destination.';
      }
    } else if (disposition === 'staged') {
      if (!selectedUnitId) {
        return 'Staged disposition requires selecting a destination unit.';
      }
      if (selectedStockpileId) {
        return 'Invalid selection: staged disposition cannot have a stockpile destination.';
      }
    } else if (disposition === 'stored') {
      if (!selectedStockpileId) {
        return 'Stored disposition requires selecting a destination stockpile.';
      }
      if (selectedUnitId) {
        return 'Invalid selection: stored disposition cannot have a unit destination.';
      }
    } else if (disposition === 'harvested' || disposition === 'disposed') {
      if (selectedUnitId || selectedStockpileId) {
        return `${disposition.charAt(0).toUpperCase() + disposition.slice(1)} disposition cannot have a destination selected.`;
      }
    }
    return null;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valError = validate();
    if (valError) {
      setErrorMessage(valError);
      return;
    }
    setErrorMessage(null);

    // If harvested or disposed, prompt confirmation dialog
    if (disposition === 'harvested' || disposition === 'disposed') {
      setShowConfirmModal(true);
      return;
    }

    executeMove();
  };

  const executeMove = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, any> = {
        disposition,
        movement_date: moveDate || undefined,
        moved_by: movedBy.trim() || 'Tech',
        notes: notes.trim(),
      };

      if (disposition === 'installed' || disposition === 'staged') {
        payload.to_unit_id = Number(selectedUnitId);
      } else if (disposition === 'stored') {
        payload.to_stockpile_id = Number(selectedStockpileId);
      }

      if (selectedTicketId) {
        payload.ticket_id = Number(selectedTicketId);
      }

      await apiClient.moveAppliance(appliance.id, payload);

      // Derive updated appliance state for parent
      let updatedStatus: Appliance['status'] = appliance.status;
      let updatedUnitNumber = appliance.unitNumber;
      let updatedStockpileId = appliance.stockpileId;
      let updatedLocation = appliance.location;

      if (disposition === 'installed') {
        updatedStatus = 'operational';
        const matchedUnit = unitsList.find((u) => String(u.id) === String(selectedUnitId));
        updatedUnitNumber = matchedUnit ? matchedUnit.unitNumber : appliance.unitNumber;
        updatedStockpileId = null;
        updatedLocation = matchedUnit ? matchedUnit.label : `Unit ${selectedUnitId}`;
      } else if (disposition === 'staged') {
        updatedStatus = 'staged';
        const matchedUnit = unitsList.find((u) => String(u.id) === String(selectedUnitId));
        updatedUnitNumber = matchedUnit ? matchedUnit.unitNumber : appliance.unitNumber;
        updatedStockpileId = null;
        updatedLocation = matchedUnit ? `Staged at ${matchedUnit.label}` : `Staged at Unit ${selectedUnitId}`;
      } else if (disposition === 'stored') {
        updatedStatus = 'stored';
        updatedUnitNumber = undefined;
        updatedStockpileId = Number(selectedStockpileId);
        const matchedSp = stockpiles.find((s) => Number(s.id) === Number(selectedStockpileId));
        updatedLocation = matchedSp ? matchedSp.name : 'Stockpile';
      } else if (disposition === 'harvested') {
        updatedStatus = 'donor';
      } else if (disposition === 'disposed') {
        updatedStatus = 'disposed';
        updatedUnitNumber = undefined;
        updatedStockpileId = null;
        updatedLocation = 'Disposed';
      }

      onSuccess({
        status: updatedStatus,
        unitNumber: updatedUnitNumber,
        stockpileId: updatedStockpileId,
        location: updatedLocation,
      });
    } catch (err: any) {
      console.error('Failed to move appliance:', err);
      setErrorMessage(err?.message || 'Failed to record appliance movement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal onClose={onClose} className="max-w-lg">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">swap_horiz</span>
              <h3 className="text-base font-bold text-brand-black dark:text-white">Record Appliance Move</h3>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-primary">
              {moveDate === new Date().toISOString().split('T')[0] ? 'Move date: Today' : `Move date: ${moveDate}`}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Move Date Field (Backdating support) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">
                Move Date <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400">
                Defaults to today; past dates accepted.
              </span>
            </div>
            <input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-brand-black dark:text-white outline-none focus:border-primary font-medium"
              required
            />
          </div>

          {/* Current Location (Read-Only Confirmation) */}
          <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <span className="block text-[11px] uppercase tracking-wider font-bold text-text-sub-light dark:text-text-sub-dark mb-0.5">
              Current Location (From)
            </span>
            <p className="text-sm font-semibold text-brand-black dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-gray-400">location_on</span>
              {currentLocationLabel}
            </p>
          </div>

          {/* Disposition Selector */}
          <div>
            <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1.5">
              Movement Disposition
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDisposition('installed');
                  setSelectedStockpileId('');
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  disposition === 'installed'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">home</span>
                Installed (To Unit)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisposition('staged');
                  setSelectedStockpileId('');
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  disposition === 'staged'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">pending_actions</span>
                Staged at Unit
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisposition('stored');
                  setSelectedUnitId('');
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  disposition === 'stored'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">warehouse</span>
                Stored (To Stockpile)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisposition('harvested');
                  setSelectedUnitId('');
                  setSelectedStockpileId('');
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  disposition === 'harvested'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">handyman</span>
                Harvested (Donor)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisposition('disposed');
                  setSelectedUnitId('');
                  setSelectedStockpileId('');
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  disposition === 'disposed'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Disposed (Scrapped)
              </button>
            </div>
          </div>

          {/* Destination: Unit Picker (when Installed or Staged) */}
          {(disposition === 'installed' || disposition === 'staged') && (
            <div>
              <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1.5">
                {disposition === 'staged' ? 'Staged Destination Unit' : 'Destination Unit'} <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-brand-black dark:text-white outline-none"
                required
              >
                <option value="">Select destination unit...</option>
                {unitsList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
              {disposition === 'staged' && (
                <p className="mt-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Appliance will be recorded at this unit with status 'Staged' (placed at unit, not installed).
                </p>
              )}
            </div>
          )}

          {/* Destination: Stockpile Picker (when Stored) */}
          {disposition === 'stored' && (
            <div>
              <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1.5">
                Destination Stockpile <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStockpileId}
                onChange={(e) => setSelectedStockpileId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-brand-black dark:text-white outline-none"
                required
              >
                <option value="">Select destination stockpile...</option>
                {stockpiles.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} {sp.location ? `(${sp.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional Ticket Link Picker */}
          <div>
            <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1.5">
              Linked Work Order / Ticket <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <select
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-brand-black dark:text-white outline-none"
            >
              <option value="">None (no linked ticket)</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.wo_number ? `WO #${t.wo_number} — ` : `Ticket #${t.id} — `}
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Moved By */}
          <div>
            <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1.5">
              Moved By
            </label>
            <input
              type="text"
              value={movedBy}
              onChange={(e) => setMovedBy(e.target.value)}
              placeholder="Tech"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-brand-black dark:text-white outline-none"
            />
          </div>

          {/* Movement Notes */}
          <div>
            <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1.5">
              Movement Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Swapped with unit 266; operational check passed."
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-brand-black dark:text-white outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Move'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Harvested / Disposed */}
      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)} className="max-w-sm">
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                disposition === 'disposed'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
              }`}
            >
              <span className="material-symbols-outlined text-[28px]">
                {disposition === 'disposed' ? 'delete_forever' : 'warning'}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-brand-black dark:text-white">
                Confirm {disposition.charAt(0).toUpperCase() + disposition.slice(1)}?
              </h3>
              <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-1 leading-relaxed">
                This will change the appliance status to{' '}
                <span className="font-bold text-brand-black dark:text-white">
                  {disposition === 'harvested' ? 'donor' : 'disposed'}
                </span>
                . This action cannot be undone by this form.
              </p>
            </div>

            <div className="flex gap-2 w-full mt-2">
              <Button type="button" variant="secondary" onClick={() => setShowConfirmModal(false)} fullWidth>
                Cancel
              </Button>
              <Button
                type="button"
                variant={disposition === 'disposed' ? 'danger' : 'primary'}
                onClick={executeMove}
                fullWidth
                disabled={submitting}
              >
                {submitting ? 'Confirming...' : 'Yes, Confirm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
