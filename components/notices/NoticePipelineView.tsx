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

  // State advancement modal
  const [advancingNotice, setAdvancingNotice] = useState<Notice | null>(null);
  const [targetStatus, setTargetStatus] = useState<NoticeStatus>('handed_off');
  const [handedOffTo, setHandedOffTo] = useState('');
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
    setHandedOffTo(notice.handed_off_to || notice.handedOffTo || '');
    setServedMethod('Door Post (Taped)');
    setAdvanceReason(
      nextStatus === 'handed_off'
        ? 'Notice handed off for delivery'
        : nextStatus === 'sent'
        ? 'Notice sent to tenant — starting 24h legal clock'
        : nextStatus === 'scheduled'
        ? 'Job scheduled following legal notice clearance'
        : `Advanced notice status to ${nextStatus}`
    );
  };

  const handleConfirmAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advancingNotice) return;

    if (targetStatus === 'handed_off' && !handedOffTo.trim()) {
      alert('Please specify who the notice was handed off to.');
      return;
    }

    setAdvancing(true);
    try {
      const payload: Partial<Notice> & { reason: string } = {
        status: targetStatus,
        reason: advanceReason.trim() || `Advanced status to ${targetStatus}`,
      };
      if (targetStatus === 'handed_off') {
        payload.handed_off_to = handedOffTo.trim();
      }
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

                {/* Handed-Off Alert Chip */}
                {notice.status === 'handed_off' && (
                  <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-amber-500 text-base animate-pulse shrink-0">notification_important</span>
                      <span className="truncate">
                        Handoff Alert: Handed to <strong className="font-bold underline">{notice.handed_off_to || notice.handedOffTo || 'staff'}</strong> — Pending Send
                      </span>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 shrink-0 font-bold">
                      Watch Alert Active
                    </span>
                  </div>
                )}

                {/* 24-Hour Legal Clock Anchored at sent_at */}
                {notice.sent_at && (
                  (() => {
                    const sentTs = new Date(notice.sent_at).getTime();
                    const nowTs = Date.now();
                    const isElapsed = nowTs >= sentTs + 24 * 60 * 60 * 1000;
                    const hoursLeft = Math.max(0, Math.ceil((sentTs + 24 * 60 * 60 * 1000 - nowTs) / (60 * 60 * 1000)));

                    return (
                      <div className={`mt-2.5 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between border transition-all ${
                        isElapsed
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300'
                      }`}>
                        <div className="flex items-center gap-1.5 truncate mr-2">
                          <span className="material-symbols-outlined text-[16px] shrink-0">
                            {isElapsed ? 'verified' : 'timelapse'}
                          </span>
                          <span className="truncate">
                            24h Legal Clock: {isElapsed ? (
                              <strong>24h Elapsed — Entry Window Legally Valid</strong>
                            ) : (
                              <>Running (Valid in <strong>~{hoursLeft}h</strong>)</>
                            )}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold shrink-0 ${
                          isElapsed
                            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                            : 'bg-blue-500/20 text-blue-800 dark:text-blue-200'
                        }`}>
                          {isElapsed ? 'ENTRY VALID' : 'WAITING 24H'}
                        </span>
                      </div>
                    );
                  })()
                )}

                {/* 4-Step Pipeline Progression Tracker: draft -> handed_off -> sent -> scheduled */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-sub-light dark:text-text-sub-dark block mb-2">
                    Progression Pipeline (Draft → Handed Off → Sent → Scheduled)
                  </span>

                  <div className="grid grid-cols-4 gap-1 text-center">
                    {/* 1. Draft */}
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-primary"></div>
                      <span className="text-[11px] font-bold text-primary block">Draft</span>
                      <span className="text-[9px] text-gray-400 block truncate">
                        {notice.drafted_at
                          ? new Date(notice.drafted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Done'}
                      </span>
                    </div>

                    {/* 2. Handed Off */}
                    {(() => {
                      const isReached = ['handed_off', 'sent', 'scheduled', 'served', 'verified'].includes(notice.status) || !!notice.handed_off_at;
                      return (
                        <div className="space-y-1">
                          <div
                            className={`h-2 rounded-full ${
                              isReached ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          ></div>
                          <span
                            className={`text-[11px] font-bold block ${
                              isReached ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'
                            }`}
                          >
                            Handed Off
                          </span>
                          <span className="text-[9px] text-gray-400 block truncate" title={notice.handed_off_to || undefined}>
                            {notice.handed_off_at
                              ? new Date(notice.handed_off_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* 3. Sent */}
                    {(() => {
                      const isReached = ['sent', 'scheduled', 'served', 'verified'].includes(notice.status) || !!notice.sent_at;
                      return (
                        <div className="space-y-1">
                          <div
                            className={`h-2 rounded-full ${
                              isReached ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          ></div>
                          <span
                            className={`text-[11px] font-bold block ${
                              isReached ? 'text-primary' : 'text-gray-400'
                            }`}
                          >
                            Sent
                          </span>
                          <span className="text-[9px] text-gray-400 block truncate">
                            {notice.sent_at
                              ? new Date(notice.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '-'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* 4. Scheduled */}
                    {(() => {
                      const isReached = ['scheduled', 'verified'].includes(notice.status) || !!notice.scheduled_at;
                      return (
                        <div className="space-y-1">
                          <div
                            className={`h-2 rounded-full ${
                              isReached ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          ></div>
                          <span
                            className={`text-[11px] font-bold block ${
                              isReached ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                            }`}
                          >
                            Scheduled
                          </span>
                          <span className="text-[9px] text-gray-400 block truncate">
                            {notice.scheduled_at
                              ? new Date(notice.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : (notice.verified_at ? new Date(notice.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-')}
                          </span>
                        </div>
                      );
                    })()}
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
                        onClick={() => openAdvanceModal(notice, 'handed_off')}
                        className="py-1.5 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">handshake</span>
                        Hand Off
                      </button>
                    )}

                    {notice.status === 'handed_off' && (
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
                        onClick={() => openAdvanceModal(notice, 'scheduled')}
                        className="py-1.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">event_available</span>
                        Schedule Job
                      </button>
                    )}

                    {notice.status === 'scheduled' && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Job Scheduled
                      </span>
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
            {targetStatus === 'handed_off' && (
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Handed Off To (Name / Role) <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  value={handedOffTo}
                  onChange={(e) => setHandedOffTo(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Property Manager)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark font-medium"
                  required
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-gray-400 self-center mr-1">Quick pick:</span>
                  {['Sarah Jenkins (Property Mgr)', 'Building Superintendent', 'Concierge / Front Desk', 'Tenant in Person'].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setHandedOffTo(name)}
                      className="px-2 py-0.5 text-[11px] rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 border border-gray-200 dark:border-gray-700 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="p-2.5 mt-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-amber-500 shrink-0">notification_important</span>
                  <span>Raises a proactive Watch alert to monitor delivery until marked sent.</span>
                </div>
              </div>
            )}

            {targetStatus === 'sent' && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Starts 24-Hour Legal Clock
                </div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                  Marking this notice sent clears the handoff alert and immediately anchors the 24-hour legal waiting period at the current time.
                </p>
              </div>
            )}

            {targetStatus === 'scheduled' && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">event_available</span>
                  Schedule Work Order
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-relaxed">
                  The entry window validates only after 24 hours have elapsed since the notice was sent.
                </p>
              </div>
            )}

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
