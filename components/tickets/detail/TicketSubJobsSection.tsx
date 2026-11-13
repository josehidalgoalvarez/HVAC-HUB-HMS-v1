import React, { useState } from 'react';
import { Ticket, TicketState, TicketPriority } from '../../../types/domain';
import { apiClient } from '../../../src/api/client';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';
import { TicketStatusBadge } from '../TicketStatusBadges';

interface TicketSubJobsSectionProps {
  ticket: Ticket;
  onOpenTicket: (id: string) => void;
  onChildCreated: () => Promise<void> | void;
}

export const TicketSubJobsSection: React.FC<TicketSubJobsSectionProps> = ({
  ticket,
  onOpenTicket,
  onChildCreated,
}) => {
  const children = ticket.children || [];
  const rollup = ticket.childrenRollup;
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const [childState, setChildState] = useState<TicketState>('in-progress');
  const [childPriority, setChildPriority] = useState<TicketPriority>('medium');
  const [childBlocker, setChildBlocker] = useState('');
  const [childSaving, setChildSaving] = useState(false);

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    if (!childTitle.trim()) return;

    if (childState === 'blocked' && !childBlocker.trim()) {
      alert('A blocker reason is strictly required when setting a sub-job to Blocked.');
      setChildSaving(false);
      return;
    }

    setChildSaving(true);
    try {
      await apiClient.createChildTicket(ticket.id, {
        title: childTitle.trim(),
        status: childState,
        priority: childPriority,
        blocker_reason: childState === 'blocked' ? childBlocker.trim() : null,
        blocked_reason: childState === 'blocked' ? childBlocker.trim() : null,
      });

      setIsAddChildOpen(false);
      setChildTitle('');
      setChildBlocker('');

      // Reload ticket hierarchy and rollup
      await onChildCreated();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create child ticket');
    } finally {
      setChildSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">account_tree</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Sub-Jobs
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold">
              {children.length}
            </span>
          </div>

          <button
            onClick={() => setIsAddChildOpen(true)}
            className="px-2.5 py-1 text-xs font-bold bg-primary text-white rounded-xl shadow-sm hover:bg-primary/90 flex items-center gap-1"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add</span>
            Add Sub-Job
          </button>
        </div>

        {/* Parent Rollup Summary Bar */}
        {rollup && rollup.total > 0 && (
          <div className="bg-primary/5 dark:bg-card-dark p-3 rounded-2xl border border-primary/20 flex items-center justify-around text-center text-xs">
            <div>
              <span className="block text-lg font-extrabold text-brand-black dark:text-white">
                {rollup.total}
              </span>
              <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {rollup.inProgress ?? 0}
              </span>
              <span className="text-xs text-gray-500 uppercase font-semibold">In Progress</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-rose-600 dark:text-rose-400">
                {rollup.blocked ?? 0}
              </span>
              <span className="text-xs text-gray-500 uppercase font-semibold">Blocked</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {rollup.done ?? 0}
              </span>
              <span className="text-xs text-gray-500 uppercase font-semibold">Done</span>
            </div>
          </div>
        )}

        {/* Children Tickets List */}
        {children.length === 0 ? (
          <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No sub-jobs attached. Tap "+ Add Sub-Job" to break this job down.
          </div>
        ) : (
          <div className="space-y-2">
            {children.map((child) => (
              <div
                key={child.id}
                onClick={() => onOpenTicket?.(child.id)}
                className="bg-white dark:bg-card-dark rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-2 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-brand-black dark:text-white truncate">
                      {child.title}
                    </span>
                  </div>
                  {child.blocker_reason && (
                    <p className="text-xs text-brand-red truncate flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[13px]">warning</span>
                      Blocker: {child.blocker_reason}
                    </p>
                  )}
                  {child.assigned_tech_name && (
                    <p className="text-xs text-gray-400">
                      Tech: {child.assigned_tech_name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                      child.status === 'done' || child.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : child.status === 'blocked'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : child.status === 'in-progress' || child.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {child.status || child.state}
                  </span>
                  <span aria-hidden="true" className="material-symbols-outlined text-gray-400 text-sm">
                    chevron_right
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAddChildOpen && (
        <Modal title="Add Sub-Job" onClose={() => setIsAddChildOpen(false)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Add Sub-Job</h2>
              <p className="text-xs text-gray-400">Parent: {ticket.wo_number || `#${ticket.id}`}</p>
            </div>
            <button
              onClick={() => setIsAddChildOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
             aria-label="Close">
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleCreateChild} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Sub-Job Title <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={childTitle}
                onChange={(e) => setChildTitle(e.target.value)}
                placeholder="e.g. Zone 2 Condenser Coil Replacement"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Initial State</label>
                <select
                  value={childState}
                  onChange={(e) => setChildState(e.target.value as TicketState)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border font-semibold ${
                    childState === 'done'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-500'
                      : childState === 'blocked'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-500'
                      : childState === 'in-progress'
                      ? 'border-primary/40 bg-primary/5 text-primary dark:border-primary/60 dark:bg-primary/20 dark:text-sky-300'
                      : childState === 'on-hold'
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
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Priority</label>
                <select
                  value={childPriority}
                  onChange={(e) => setChildPriority(e.target.value as TicketPriority)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border font-semibold ${
                    childPriority === 'urgent'
                      ? 'border-brand-red bg-rose-50 text-brand-red dark:bg-rose-950/50 dark:text-rose-200 dark:border-brand-red font-bold'
                      : childPriority === 'high'
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
            </div>

            {childState === 'blocked' && (
              <div>
                <label className="block text-xs font-bold uppercase text-brand-red mb-1">
                  Blocker Reason <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={childBlocker}
                  onChange={(e) => setChildBlocker(e.target.value)}
                  placeholder="Why is this blocked? (e.g. Waiting on owner approval)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-red-300 dark:border-red-800 bg-red-50/50"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddChildOpen(false)}
                className="flex-1 py-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 py-2.5 text-xs shadow-md"
                disabled={childSaving}
              >
                {childSaving ? 'Adding...' : 'Attach Sub-Job'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </>
  );
};
