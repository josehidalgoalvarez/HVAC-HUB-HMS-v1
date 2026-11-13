import React, { useState, useEffect } from 'react';
import { Ticket, TicketState, TicketPriority, ClosedByParty, Appliance } from '../../../types/domain';
import { apiClient } from '../../../src/api/client';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';

interface TicketEditModalProps {
  ticket: Ticket;
  unitAppliances: Appliance[];
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export const TicketEditModal: React.FC<TicketEditModalProps> = ({
  ticket,
  unitAppliances,
  open,
  onClose,
  onSaved,
}) => {
  const [editTitle, setEditTitle] = useState('');
  const [editWoNumber, setEditWoNumber] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
  const [editState, setEditState] = useState<TicketState>('new');
  const [editParty, setEditParty] = useState<ClosedByParty | null>(null);
  const [editScope, setEditScope] = useState('');
  const [editBlocker, setEditBlocker] = useState('');
  const [editExposure, setEditExposure] = useState<'indoor' | 'exterior' | 'exterior_ladder'>('indoor');
  const [editApplianceId, setEditApplianceId] = useState<string | number | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const openEditModal = () => {
    if (!ticket) return;
    setEditTitle(ticket.title || '');
    setEditWoNumber(ticket.wo_number || '');
    setEditPriority(ticket.priority || 'medium');
    setEditState((ticket.status || ticket.state || 'new') as TicketState);
    setEditParty((ticket.closed_by_party as ClosedByParty) || null);
    setEditScope(ticket.verified_scope || '');
    setEditBlocker(ticket.blocked_reason || ticket.blocker_reason || '');
    setEditExposure((ticket.work_exposure || (ticket.exterior_work ? 'exterior' : 'indoor')) as 'indoor' | 'exterior' | 'exterior_ladder');
    setEditApplianceId(ticket.appliance_id ?? null);
    setEditReason('');
    
  };

  useEffect(() => {
    if (open) {
      openEditModal();
    }
  }, [open]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    setEditSaving(true);
    if (editState === 'blocked' && !editBlocker.trim()) {
      alert('A blocker reason is strictly required when setting a ticket to Blocked.');
      setEditSaving(false);
      return;
    }

    try {
      const payload: Partial<Ticket> & { reason: string } = {
        title: editTitle.trim(),
        wo_number: editWoNumber.trim() || null,
        priority: editPriority,
        status: editState,
        closed_by_party: editState === 'closed-elsewhere' ? editParty : null,
        verified_scope: editScope.trim() || null,
        blocker_reason: editState === 'blocked' ? editBlocker.trim() : null,
        blocked_reason: editState === 'blocked' ? editBlocker.trim() : null,
        work_exposure: editExposure,
        exterior_work: editExposure !== 'indoor',
        appliance_id: editApplianceId,
        reason: editReason.trim() || 'Updated ticket details',
      };

      await apiClient.updateTicket(ticket.id, payload);
      await onSaved();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  if (!open) return null;

  return (
        <Modal title="Edit Ticket" onClose={() => onClose()} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-brand-black dark:text-white">Edit Ticket</h2>
            <button
              onClick={() => onClose()}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
             aria-label="Close">
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">WO Number</label>
                <input
                  type="text"
                  value={editWoNumber}
                  onChange={(e) => setEditWoNumber(e.target.value)}
                  placeholder="e.g. WO-19970"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">State</label>
                <select
                  value={
                    editState === 'closed-elsewhere' && editParty
                      ? `closed-elsewhere:${editParty}`
                      : editState
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('closed-elsewhere:')) {
                      setEditState('closed-elsewhere');
                      setEditParty(val.split(':')[1] as ClosedByParty);
                    } else if (val === 'closed-elsewhere') {
                      setEditState('closed-elsewhere');
                      setEditParty(null);
                    } else {
                      setEditState(val as TicketState);
                      setEditParty(null);
                    }
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-xl border font-semibold ${
                    editState === 'done'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-500'
                      : editState === 'blocked'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-500'
                      : editState === 'in-progress'
                      ? 'border-primary/40 bg-primary/5 text-primary dark:border-primary/60 dark:bg-primary/20 dark:text-sky-300'
                      : editState === 'on-hold'
                      ? 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-600'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white'
                  }`}
                >
                  <option value="new">New</option>
                  <option value="verified">Verified</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="on-hold">On-Hold</option>
                  <option value="done">Done</option>
                  <option value="closed">Closed</option>
                  <option value="closed-elsewhere:coworker">Closed — Coworker</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border font-semibold ${
                    editPriority === 'urgent'
                      ? 'border-brand-red bg-rose-50 text-brand-red dark:bg-rose-950/50 dark:text-rose-200 dark:border-brand-red font-bold'
                      : editPriority === 'high'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-500'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white'
                  }`}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {editState === 'blocked' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-brand-red mb-1">
                    Blocker Reason <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editBlocker}
                    onChange={(e) => setEditBlocker(e.target.value)}
                    placeholder="Why is this blocked? (e.g. Awaiting owner authorization / rent hold)"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-red-300 dark:border-red-800 bg-red-50/50"
                  />
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    Distinction: on-hold = waiting on next expected step; blocked = outside tech control.
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-primary mb-1">
                Verified Scope (Confirmed Description)
              </label>
              <textarea
                value={editScope}
                onChange={(e) => setEditScope(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-primary/40 bg-primary/5 dark:bg-primary/10"
              />
            </div>

            {/* Work Exposure Selector in Edit Modal */}
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Work Exposure
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditExposure('indoor')}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
                    editExposure === 'indoor'
                      ? 'bg-white dark:bg-gray-700 text-brand-black dark:text-white border-primary shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">roofing</span>
                  <span>Indoor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditExposure('exterior')}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
                    editExposure === 'exterior'
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">wb_sunny</span>
                  <span>Exterior</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditExposure('exterior_ladder')}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
                    editExposure === 'exterior_ladder'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">stairs</span>
                  <span>Ladder</span>
                </button>
              </div>
            </div>

            {/* Appliance Selector in Edit Modal */}
            {unitAppliances.length > 0 && (
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-2">
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                  Target Appliance
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditApplianceId(null)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      editApplianceId === null
                        ? 'bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent font-bold'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    None / General
                  </button>
                  {unitAppliances.map((app) => {
                    const isSelected = editApplianceId !== null && String(editApplianceId) === String(app.id);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setEditApplianceId(isSelected ? null : app.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-blue-400'
                        }`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[13px]">kitchen</span>
                        <span>{app.name || app.type}</span>
                        {app.modelNumber && (
                          <span className="font-mono text-xs opacity-80">({app.modelNumber})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MANDATORY REASON FOR EDIT */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold uppercase text-brand-black dark:text-white mb-1">
                Reason for change <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Why is this field being modified? (e.g. Scope confirmed on site)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                required
              />
              <span className="text-xs text-gray-400">
                Required: every change is permanently logged in the correction audit trail.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onClose()}
                className="flex-1 py-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 py-2.5 text-xs shadow-md"
                disabled={editSaving}
              >
                {editSaving ? 'Saving...' : 'Save & Log Correction'}
              </Button>
            </div>
          </form>
        </Modal>

  );
};
