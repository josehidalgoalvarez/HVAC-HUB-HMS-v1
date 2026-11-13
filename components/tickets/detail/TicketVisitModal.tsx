import React, { useState } from 'react';
import { TicketVisitOutcome, TicketVisitReason } from '../../../types/domain';
import { formatDateTime } from '../../../utils/dateUtils';
import { apiClient } from '../../../src/api/client';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';

interface TicketVisitModalProps {
  ticketId: string;
  noticeNeeded?: boolean;
  noticeSentAt?: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export const TicketVisitModal: React.FC<TicketVisitModalProps> = ({
  ticketId,
  noticeNeeded,
  noticeSentAt,
  open,
  onClose,
  onSaved,
}) => {
  const [visitOutcome, setVisitOutcome] = useState<TicketVisitOutcome>('completed');
  const [visitReason, setVisitReason] = useState<TicketVisitReason>('tenant_absent');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitedAt, setVisitedAt] = useState('');
  const [visitTechName, setVisitTechName] = useState('Jose (Tech)');
  const [visitSaving, setVisitSaving] = useState(false);

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVisitSaving(true);
      await apiClient.logTicketVisit(ticketId, {
        outcome: visitOutcome,
        failure_reason: visitOutcome === 'failed_access' ? visitReason : undefined,
        notes: visitNotes.trim() || undefined,
        visited_at: visitedAt ? new Date(visitedAt).toISOString().slice(0, 19).replace('T', ' ') : undefined,
        tech_name: visitTechName.trim() || 'Jose (Tech)',
      });
      onClose();
      setVisitNotes('');
      setVisitedAt('');
      await onSaved();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to log visit');
    } finally {
      setVisitSaving(false);
    }
  };

  if (!open) return null;

  return (
        <Modal title="Log Field Visit" onClose={() => onClose()} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">assignment_turned_in</span>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Log Field Visit</h2>
            </div>
            <button
              onClick={() => onClose()}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
             aria-label="Close">
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleLogVisit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Visit Outcome <span className="text-brand-red">*</span>
              </label>
              <select
                value={visitOutcome}
                onChange={(e) => setVisitOutcome(e.target.value as TicketVisitOutcome)}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-semibold"
              >
                <option value="completed">Completed (Work finished, ready to close)</option>
                <option value="partial">Partial (In progress, requires return visit)</option>
                <option value="failed_access">Failed Access (Could not enter unit)</option>
              </select>
            </div>

            {/* If Failed Access: Select Reason and Snapshot Notice State */}
            {visitOutcome === 'failed_access' && (
              <div className="space-y-3 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold uppercase text-amber-900 dark:text-amber-200 mb-1">
                    Failed Access Reason <span className="text-brand-red">*</span>
                  </label>
                  <select
                    value={visitReason}
                    onChange={(e) => setVisitReason(e.target.value as TicketVisitReason)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-card-dark font-semibold"
                  >
                    <option value="tenant_absent">Tenant absent</option>
                    <option value="no_answer">No answer at door</option>
                    <option value="refused_entry">Tenant refused entry</option>
                    <option value="key_or_lock_issue">Key or lock issue</option>
                    <option value="access_blocked">Access physically blocked</option>
                    <option value="unsafe">Unsafe conditions</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>

                {/* Notice State Snapshot and Provenance Check */}
                {noticeNeeded && !noticeSentAt ? (
                  <div className="p-3 rounded-xl bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs flex items-start gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-base shrink-0 mt-0.5">error</span>
                    <div>
                      <strong className="block uppercase tracking-wider font-extrabold text-xs">[OUR MISS — MANAGEMENT/DISPATCH]</strong>
                      <p className="mt-0.5 text-xs leading-relaxed">
                        Notice was required on this unit but was never sent. This will display as <strong>OUR miss</strong>, not the tenant's refusal.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-800/60 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-brand-black dark:text-white">Notice Snapshot: </span>
                    {noticeNeeded
                      ? `Notice sent at ${noticeSentAt ? formatDateTime(noticeSentAt) : 'N/A'}`
                      : 'Notice not required (or vacant unit)'}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Visited Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={visitedAt}
                  onChange={(e) => setVisitedAt(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Technician
                </label>
                <input
                  type="text"
                  value={visitTechName}
                  onChange={(e) => setVisitTechName(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Visit Notes
              </label>
              <textarea
                rows={3}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Findings, diagnostics, or follow-up details..."
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
                disabled={visitSaving}
              >
                {visitSaving ? 'Recording...' : 'Log Visit'}
              </Button>
            </div>
          </form>
        </Modal>

  );
};
