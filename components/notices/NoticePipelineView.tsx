import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { PullToRefresh } from '../common/PullToRefresh';
import { DraftNoticeModal } from './DraftNoticeModal';
import Button from '../ui/Button';
import { Modal } from '../ui/Modal';
import type { Notice, NoticeStatus } from '../../types/domain';

interface NoticePipelineViewProps {
  onBack?: () => void;
  onOpenTicket?: (ticketId: string) => void;
}

export const NoticePipelineView: React.FC<NoticePipelineViewProps> = ({
  onBack,
  onOpenTicket,
}) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdated, setIsUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'red' | 'amber' | 'green'>('all');

  // State advancement modal (for served method)
  const [advancingNotice, setAdvancingNotice] = useState<Notice | null>(null);
  const [targetStatus, setTargetStatus] = useState<NoticeStatus>('sent');
  const [servedMethod, setServedMethod] = useState('Door Post (Taped)');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advancing, setAdvancing] = useState(false);

  const loadNotices = async () => {
    try {
      if (notices.length === 0) setLoading(true);
      setError(null);
      const data = await apiClient.getNotices();
      if (data) {
        setNotices((prev) => {
          if (prev && prev.length > 0 && JSON.stringify(prev) !== JSON.stringify(data)) {
            setIsUpdated(true);
            setTimeout(() => setIsUpdated(false), 2500);
          }
          return data;
        });
        await appCache.set('notices', data);
      }
    } catch (err: unknown) {
      if (notices.length === 0) {
        const msg = err instanceof Error ? err.message : 'Failed to load notices';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Instant cache load
    appCache.get<Notice[]>('notices').then((cached) => {
      if (cached && cached.length) {
        setNotices(cached);
        setLoading(false);
      }
    });

    // 2. Background revalidation
    loadNotices();

    // 3. Global refresh listener
    const handleGlobalRefresh = () => loadNotices();
    window.addEventListener('hvachome:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('hvachome:refresh', handleGlobalRefresh);
  }, []);

  const openAdvanceModal = (notice: Notice, nextStatus: NoticeStatus) => {
    setAdvancingNotice(notice);
    setTargetStatus(nextStatus);
    setServedMethod('Door Post (Taped)');
    setAdvanceReason(`Advanced notice status to ${nextStatus}`);
  };

  const handleConfirmAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advancingNotice) return;

    setAdvancing(true);
    try {
      const payload: Partial<Notice> & { reason: string } = {
        status: targetStatus,
        reason: advanceReason.trim() || `Advanced status to ${targetStatus}`,
      };
      if (targetStatus === 'served') {
        payload.served_method = servedMethod;
      }

      const updated = await apiClient.updateNotice(advancingNotice.id, payload);
      setNotices((prev) =>
        prev.map((n) => (n.id === advancingNotice.id ? { ...n, ...updated } : n))
      );
      setAdvancingNotice(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update notice status');
    } finally {
      setAdvancing(false);
    }
  };

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const gate = n.gate_status || (n as any).gateStatus || 'amber';
      if (filter === 'red') return gate === 'red';
      if (filter === 'amber') return gate === 'amber';
      if (filter === 'green') return gate === 'green';
      return true;
    });
  }, [notices, filter]);

  const redCount = notices.filter((n) => (n.gate_status || (n as any).gateStatus) === 'red').length;
  const amberCount = notices.filter((n) => (n.gate_status || (n as any).gateStatus) === 'amber').length;
  const greenCount = notices.filter((n) => (n.gate_status || (n as any).gateStatus) === 'green').length;

  const getGateBadge = (gateStatus?: string) => {
    switch (gateStatus) {
      case 'green':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            LEGALLY CLEARED
          </span>
        );
      case 'red':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-brand-red text-white flex items-center gap-1 shadow-sm animate-pulse">
            <span className="material-symbols-outlined text-[15px]">gavel</span>
            OVERDUE / BLOCKED
          </span>
        );
      case 'amber':
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-500 text-white flex items-center gap-1 shadow-sm">
            <span className="material-symbols-outlined text-[15px]">timer</span>
            PENDING DEADLINE
          </span>
        );
    }
  };

  return (
    <div className="pb-safe max-w-xl mx-auto px-4 py-4 space-y-4 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-black dark:text-white"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-brand-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
              Notice of Entry
            </h1>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
              24-Hour Legal Gate Pipeline (Drafted → Sent → Served → Verified)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadNotices}
            disabled={loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            title="Refresh notices"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>

          <Button
            variant="primary"
            onClick={() => setIsDraftModalOpen(true)}
            className="py-2 px-3 text-xs shadow-md"
            icon="add"
          >
            Draft Notice
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            filter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          All ({notices.length})
        </button>

        <button
          onClick={() => setFilter('red')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            filter === 'red'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          <span className={`material-symbols-outlined text-xs ${filter === 'red' ? 'text-white' : 'text-brand-red'}`}>gavel</span>
          Overdue ({redCount})
        </button>

        <button
          onClick={() => setFilter('amber')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            filter === 'amber'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          <span className={`material-symbols-outlined text-xs ${filter === 'amber' ? 'text-white' : 'text-amber-500'}`}>timer</span>
          Pending ({amberCount})
        </button>

        <button
          onClick={() => setFilter('green')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
            filter === 'green'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          <span className={`material-symbols-outlined text-xs ${filter === 'green' ? 'text-white' : 'text-emerald-500'}`}>check_circle</span>
          Verified ({greenCount})
        </button>
      </div>

      {/* Subtle background updated indicator */}
      {isUpdated && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-lg animate-fadeIn flex items-center gap-1.5 pointer-events-none">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          <span>Notices updated</span>
        </div>
      )}

      {/* Notices List */}
      <PullToRefresh onRefresh={loadNotices}>
        {loading && notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
            <p className="text-xs font-semibold">Calculating 24-hour legal gates...</p>
          </div>
      ) : filteredNotices.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
          <span className="material-symbols-outlined text-4xl text-gray-300">verified_user</span>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No notices in this filter</p>
          <Button
            variant="primary"
            onClick={() => setIsDraftModalOpen(true)}
            className="py-2.5 px-4 text-xs mx-auto shadow-sm"
          >
            + Draft New Notice of Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            const gate = notice.gate_status || (notice as any).gateStatus || 'amber';
            const isRed = gate === 'red';
            const isGreen = gate === 'green';

            return (
              <div
                key={notice.id}
                className={`rounded-2xl p-4 border transition-all shadow-sm ${
                  isRed
                    ? 'bg-red-50/50 dark:bg-red-950/30 border-red-300 dark:border-red-900'
                    : isGreen
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                    : 'bg-white dark:bg-card-dark border-gray-100 dark:border-gray-800'
                }`}
              >
                {/* Header Row: Ticket Link + Title + Gate Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {notice.ticket_id || notice.ticketId ? (
                        <button
                          onClick={() => onOpenTicket?.(String(notice.ticket_id || notice.ticketId))}
                          className="px-2 py-0.5 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary/20 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">link</span>
                          {notice.wo_number || notice.woNumber || `WO #${notice.ticket_id || notice.ticketId}`}
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 rounded-lg">
                          No WO linked
                        </span>
                      )}
                      <span className="text-xs text-gray-400">Notice #{notice.id}</span>
                    </div>

                    <h3 className="text-sm font-bold text-brand-black dark:text-white truncate">
                      {notice.title}
                    </h3>
                  </div>

                  {getGateBadge(gate)}
                </div>

                {/* Entry Window & Serve-by Deadline Display */}
                <div className="mt-3 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                      Entry Window
                    </span>
                    <span className="font-semibold text-brand-black dark:text-white block truncate">
                      {notice.entry_start
                        ? new Date(notice.entry_start).toLocaleString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Unscheduled'}
                    </span>
                  </div>

                  <div className={isRed ? 'text-brand-red font-bold' : ''}>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                      Serve-By Deadline (24h)
                    </span>
                    <span className="font-mono font-bold block truncate">
                      {notice.serve_by_deadline
                        ? new Date(notice.serve_by_deadline).toLocaleString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Pending Window'}
                    </span>
                  </div>
                </div>

                {/* 4-Step Pipeline Progression Tracker */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-sub-light dark:text-text-sub-dark block mb-2">
                    Progression Pipeline
                  </span>

                  <div className="grid grid-cols-4 gap-1 text-center">
                    {/* 1. Drafted */}
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-primary"></div>
                      <span className="text-[11px] font-bold text-primary block">Drafted</span>
                      <span className="text-[9px] text-gray-400 block">
                        {notice.drafted_at
                          ? new Date(notice.drafted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Done'}
                      </span>
                    </div>

                    {/* 2. Sent */}
                    <div className="space-y-1">
                      <div
                        className={`h-2 rounded-full ${
                          ['sent', 'served', 'verified'].includes(notice.status) ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      ></div>
                      <span
                        className={`text-[11px] font-bold block ${
                          ['sent', 'served', 'verified'].includes(notice.status) ? 'text-primary' : 'text-gray-400'
                        }`}
                      >
                        Sent
                      </span>
                      <span className="text-[9px] text-gray-400 block">
                        {notice.sent_at
                          ? new Date(notice.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </span>
                    </div>

                    {/* 3. Served */}
                    <div className="space-y-1">
                      <div
                        className={`h-2 rounded-full ${
                          ['served', 'verified'].includes(notice.status) ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      ></div>
                      <span
                        className={`text-[11px] font-bold block ${
                          ['served', 'verified'].includes(notice.status) ? 'text-primary' : 'text-gray-400'
                        }`}
                      >
                        Served
                      </span>
                      <span className="text-[9px] text-gray-400 block">
                        {notice.served_at
                          ? new Date(notice.served_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </span>
                    </div>

                    {/* 4. Verified */}
                    <div className="space-y-1">
                      <div
                        className={`h-2 rounded-full ${
                          notice.status === 'verified' ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      ></div>
                      <span
                        className={`text-[11px] font-bold block ${
                          notice.status === 'verified' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                        }`}
                      >
                        Verified
                      </span>
                      <span className="text-[9px] text-gray-400 block">
                        {notice.verified_at
                          ? new Date(notice.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* State Advance Action Buttons */}
                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-gray-500 truncate flex-1">
                    {notice.gate_reason || (notice as any).gateReason}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {notice.status === 'drafted' && (
                      <button
                        onClick={() => openAdvanceModal(notice, 'sent')}
                        className="py-1.5 px-3 text-xs font-bold bg-primary text-white rounded-xl shadow-sm hover:bg-blue-600 flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">send</span>
                        Mark Sent
                      </button>
                    )}

                    {notice.status === 'sent' && (
                      <button
                        onClick={() => openAdvanceModal(notice, 'served')}
                        className="py-1.5 px-3 text-xs font-bold bg-primary text-white rounded-xl shadow-sm hover:bg-blue-600 flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">door_front</span>
                        Mark Served
                      </button>
                    )}

                    {notice.status === 'served' && (
                      <button
                        onClick={() => openAdvanceModal(notice, 'verified')}
                        className="py-1.5 px-3 text-xs font-bold bg-primary text-white rounded-xl shadow-sm hover:bg-blue-600 flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Verify Entry
                      </button>
                    )}

                    {notice.status === 'verified' && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">done_all</span>
                        Cleared
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </PullToRefresh>

      {/* Advance Status Modal */}
      {advancingNotice && (
        <Modal onClose={() => setAdvancingNotice(null)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-brand-black dark:text-white">
                Advance Notice #{advancingNotice.id}
              </h2>
              <p className="text-xs text-primary font-semibold uppercase">
                Transition to: {targetStatus}
              </p>
            </div>
            <button
              onClick={() => setAdvancingNotice(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleConfirmAdvance} className="mt-4 space-y-3">
            {targetStatus === 'served' && (
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Service Method <span className="text-brand-red">*</span>
                </label>
                <select
                  value={servedMethod}
                  onChange={(e) => setServedMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                >
                  <option value="Door Post (Taped)">Door Post (Taped to primary entry)</option>
                  <option value="Handed Directly to Tenant">Handed Directly to Tenant / Occupant</option>
                  <option value="Mail Slot / Under Door">Mail Slot / Under Entry Door</option>
                  <option value="Certified Mail">Certified Mail (Signature Requested)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Reason for change (Append-Only Audit) <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={advanceReason}
                onChange={(e) => setAdvanceReason(e.target.value)}
                placeholder="e.g. Notice physically posted on unit door by technician"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                required
              />
              <span className="text-[10px] text-gray-400">
                Required: every state transition writes an append-only row to the correction table.
              </span>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAdvancingNotice(null)}
                className="flex-1 py-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 py-2.5 text-xs shadow-md"
                disabled={advancing}
              >
                {advancing ? 'Stamping...' : `Confirm & Advance to ${targetStatus}`}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Draft Notice Modal */}
      {isDraftModalOpen && (
        <DraftNoticeModal
          onClose={() => setIsDraftModalOpen(false)}
          onSuccess={(newNotice) => {
            setIsDraftModalOpen(false);
            setNotices((prev) => [newNotice, ...prev]);
          }}
        />
      )}
    </div>
  );
};
