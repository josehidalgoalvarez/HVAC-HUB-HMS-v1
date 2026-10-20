import React, { useState, useEffect } from 'react';
import { apiClient } from '../../src/api/client';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { DraftNoticeModal } from '../notices/DraftNoticeModal';
import type { Ticket, TicketState, TicketPriority, Correction, Notice, NoticeStatus, WatchRecord } from '../../types/domain';

interface TicketDetailViewProps {
  ticketId: string;
  onBack: () => void;
  onOpenTicket?: (id: string) => void;
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticketId,
  onBack,
  onOpenTicket,
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exterior Work & Weather Outlook State
  const [isExterior, setIsExterior] = useState(false);
  const [weatherNote, setWeatherNote] = useState('');
  const [weatherWatch, setWeatherWatch] = useState<WatchRecord | null>(null);
  const [savingWeather, setSavingWeather] = useState(false);
  const [weatherFeedback, setWeatherFeedback] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editWoNumber, setEditWoNumber] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
  const [editState, setEditState] = useState<TicketState>('new');
  const [editScope, setEditScope] = useState('');
  const [editBlocker, setEditBlocker] = useState('');
  const [editExterior, setEditExterior] = useState(false);
  const [editWeatherNote, setEditWeatherNote] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Add Child Modal State
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const [childState, setChildState] = useState<TicketState>('in-progress');
  const [childPriority, setChildPriority] = useState<TicketPriority>('medium');
  const [childBlocker, setChildBlocker] = useState('');
  const [childSaving, setChildSaving] = useState(false);

  // Sighting Stamp State
  const [sightingStamping, setSightingStamping] = useState(false);
  const [sightingSuccessMsg, setSightingSuccessMsg] = useState<string | null>(null);

  // Notice State
  const [isDraftNoticeOpen, setIsDraftNoticeOpen] = useState(false);
  const [noticeAdvancing, setNoticeAdvancing] = useState(false);

  const handleAdvanceNotice = async (noticeId: number | string, nextStatus: NoticeStatus) => {
    setNoticeAdvancing(true);
    try {
      await apiClient.updateNotice(noticeId, {
        status: nextStatus,
        reason: `Advanced notice from ticket detail to ${nextStatus}`,
      });
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to advance notice');
    } finally {
      setNoticeAdvancing(false);
    }
  };

  const loadTicketData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tData, cData, watchesData] = await Promise.all([
        apiClient.getTicket(ticketId),
        apiClient.getTicketCorrections(ticketId),
        apiClient.getWatches({ target_type: 'ticket', target_id: ticketId, watch_type: 'weather_manual' }).catch(() => [] as WatchRecord[]),
      ]);
      setTicket(tData);
      setCorrections(cData || []);
      const activeWatch = watchesData?.find((w: WatchRecord) => w.state !== 'resolved') || null;
      setWeatherWatch(activeWatch);
      setIsExterior(!!tData?.exterior_work);
      setWeatherNote(tData?.weather_note || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load ticket details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);

  const handleToggleExterior = async (newVal: boolean) => {
    setIsExterior(newVal);
    setSavingWeather(true);
    try {
      if (!newVal) {
        // Toggled OFF: dismiss active watch and clear weather_note
        if (weatherWatch && weatherWatch.state !== 'resolved') {
          await apiClient.resolveWatch(weatherWatch.id).catch(() => {});
          setWeatherWatch(null);
        }
        const updated = await apiClient.updateTicket(ticketId, {
          exterior_work: false,
          weather_note: null,
          reason: 'Toggled exterior work off — dismissed weather watch',
        });
        setTicket(updated);
        setWeatherNote('');
        setWeatherFeedback('Exterior work toggled off • Weather watch dismissed');
      } else {
        // Toggled ON
        const updated = await apiClient.updateTicket(ticketId, {
          exterior_work: true,
          reason: 'Toggled exterior work on',
        });
        setTicket(updated);
        setWeatherFeedback('Exterior work enabled. Add a week outlook note to raise a watch.');
      }
      setTimeout(() => setWeatherFeedback(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update exterior work status');
    } finally {
      setSavingWeather(false);
    }
  };

  const handleSaveWeatherNote = async (noteToSave?: string) => {
    const text = (noteToSave !== undefined ? noteToSave : weatherNote).trim();
    if (!text) {
      await handleClearWeatherNote();
      return;
    }

    setSavingWeather(true);
    try {
      // 1. Update ticket
      const updated = await apiClient.updateTicket(ticketId, {
        exterior_work: true,
        weather_note: text,
        reason: 'Updated exterior weather outlook note',
      });
      setTicket(updated);
      setIsExterior(true);

      // 2. Create or update watch
      let activeWatch = weatherWatch;
      if (!activeWatch || activeWatch.state === 'resolved') {
        const title = `Weather: ${updated.building_name || 'Building'}${updated.unit_number ? ' #' + updated.unit_number : ''} (WO: ${updated.wo_number || '#' + updated.id})`;
        const newWatch = await apiClient.createWatch({
          watch_type: 'weather_manual',
          title,
          description: text,
          target_type: 'ticket',
          target_id: Number(ticketId),
          state: 'triggered',
          config: {
            ticket_id: Number(ticketId),
            wo_number: updated.wo_number,
            building_name: updated.building_name,
            unit_number: updated.unit_number,
            weather_note: text,
          },
        });
        setWeatherWatch(newWatch);
      } else {
        const updatedWatch = await apiClient.updateWatch(activeWatch.id, {
          description: text,
          state: 'triggered',
          latest_trigger_reason: `Exterior work outlook: ${text}`,
          config: {
            ...(activeWatch.config || {}),
            ticket_id: Number(ticketId),
            wo_number: updated.wo_number,
            building_name: updated.building_name,
            unit_number: updated.unit_number,
            weather_note: text,
          },
          reason: 'Updated weather outlook note',
        });
        setWeatherWatch(updatedWatch);
      }

      setWeatherFeedback('Outlook saved • Active watch card in Watches section');
      setTimeout(() => setWeatherFeedback(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save weather outlook');
    } finally {
      setSavingWeather(false);
    }
  };

  const handleClearWeatherNote = async () => {
    setSavingWeather(true);
    try {
      if (weatherWatch && weatherWatch.state !== 'resolved') {
        await apiClient.resolveWatch(weatherWatch.id).catch(() => {});
        setWeatherWatch(null);
      }
      const updated = await apiClient.updateTicket(ticketId, {
        weather_note: null,
        reason: 'Cleared weather outlook note — watch dismissed',
      });
      setTicket(updated);
      setWeatherNote('');
      setWeatherFeedback('Outlook note cleared • Weather watch dismissed');
      setTimeout(() => setWeatherFeedback(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to clear weather note');
    } finally {
      setSavingWeather(false);
    }
  };

  const openEditModal = () => {
    if (!ticket) return;
    setEditTitle(ticket.title || '');
    setEditWoNumber(ticket.wo_number || '');
    setEditPriority(ticket.priority || 'medium');
    setEditState((ticket.status || ticket.state || 'new') as TicketState);
    setEditScope(ticket.verified_scope || '');
    setEditBlocker(ticket.blocker_reason || '');
    setEditExterior(!!ticket.exterior_work);
    setEditWeatherNote(ticket.weather_note || '');
    setEditReason('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    setEditSaving(true);
    try {
      const payload: Partial<Ticket> & { reason: string } = {
        title: editTitle.trim(),
        wo_number: editWoNumber.trim() || null,
        priority: editPriority,
        status: editState,
        verified_scope: editScope.trim() || null,
        blocker_reason: editState === 'blocked' ? editBlocker.trim() : null,
        exterior_work: editExterior,
        weather_note: editExterior ? (editWeatherNote.trim() || null) : null,
        reason: editReason.trim() || 'Updated ticket details',
      };

      const updated = await apiClient.updateTicket(ticket.id, payload);
      setTicket(updated);

      // Sync weather watch if needed
      if (!editExterior || !editWeatherNote.trim()) {
        if (weatherWatch && weatherWatch.state !== 'resolved') {
          await apiClient.resolveWatch(weatherWatch.id).catch(() => {});
          setWeatherWatch(null);
        }
      } else if (editExterior && editWeatherNote.trim()) {
        if (!weatherWatch || weatherWatch.state === 'resolved') {
          const title = `Weather: ${updated.building_name || 'Building'}${updated.unit_number ? ' #' + updated.unit_number : ''} (WO: ${updated.wo_number || '#' + updated.id})`;
          const newW = await apiClient.createWatch({
            watch_type: 'weather_manual',
            title,
            description: editWeatherNote.trim(),
            target_type: 'ticket',
            target_id: Number(ticket.id),
            state: 'triggered',
            config: {
              ticket_id: Number(ticket.id),
              wo_number: updated.wo_number,
              building_name: updated.building_name,
              unit_number: updated.unit_number,
              weather_note: editWeatherNote.trim(),
            },
          }).catch(() => null);
          if (newW) setWeatherWatch(newW);
        } else {
          const updatedW = await apiClient.updateWatch(weatherWatch.id, {
            description: editWeatherNote.trim(),
            state: 'triggered',
            latest_trigger_reason: `Exterior work outlook: ${editWeatherNote.trim()}`,
            config: {
              ...(weatherWatch.config || {}),
              ticket_id: Number(ticket.id),
              wo_number: updated.wo_number,
              building_name: updated.building_name,
              unit_number: updated.unit_number,
              weather_note: editWeatherNote.trim(),
            },
            reason: 'Updated weather outlook note',
          }).catch(() => null);
          if (updatedW) setWeatherWatch(updatedW);
        }
      }
      setIsExterior(editExterior);
      setWeatherNote(editExterior ? editWeatherNote.trim() : '');

      setIsEditModalOpen(false);

      // Refresh correction history
      const freshCorrections = await apiClient.getTicketCorrections(ticket.id);
      setCorrections(freshCorrections || []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    if (!childTitle.trim()) return;

    setChildSaving(true);
    try {
      await apiClient.createChildTicket(ticket.id, {
        title: childTitle.trim(),
        status: childState,
        priority: childPriority,
        blocker_reason: childState === 'blocked' ? childBlocker.trim() : null,
      });

      setIsAddChildOpen(false);
      setChildTitle('');
      setChildBlocker('');

      // Reload ticket hierarchy and rollup
      await loadTicketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create child ticket');
    } finally {
      setChildSaving(false);
    }
  };

  const handleStampYardiSighting = async () => {
    if (!ticket) return;
    setSightingStamping(true);
    setSightingSuccessMsg(null);
    try {
      const res = await apiClient.recordYardiSighting(ticket.id, {
        wo_number: ticket.wo_number || 'UNKNOWN',
        description: ticket.title,
        status: 'Active in Yardi',
      });
      setSightingSuccessMsg(`Yardi sighting stamped at ${new Date(res.sighted_at).toLocaleTimeString()}`);
      await loadTicketData();
      setTimeout(() => setSightingSuccessMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to stamp Yardi sighting');
    } finally {
      setSightingStamping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
        <p className="text-sm font-medium">Loading ticket details & hierarchy...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900 text-brand-red text-sm">
          {error || 'Ticket not found.'}
        </div>
        <Button variant="secondary" onClick={onBack} fullWidth>
          Back to Tickets
        </Button>
      </div>
    );
  }

  const rollup = ticket.childrenRollup || (ticket as any).rollup;
  const children = ticket.children || [];

  return (
    <div className="pb-safe max-w-xl mx-auto px-4 py-4 space-y-5 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-black dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {ticket.wo_number ? (
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20">
                {ticket.wo_number}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-mono font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                Unassigned WO
              </span>
            )}
            <span className="text-xs text-gray-400">ID #{ticket.id}</span>
          </div>
          <h1 className="text-base font-bold text-brand-black dark:text-white truncate">
            {ticket.title}
          </h1>
        </div>

        <button
          onClick={openEditModal}
          className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded-xl flex items-center gap-1 shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          Edit
        </button>
      </div>

      {/* Yardi Sighting Status Bar */}
      <div className="rounded-2xl p-4 border bg-gray-50/80 dark:bg-card-dark border-gray-200 dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-gray-500">visibility</span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              Yardi Mirror (Read-Only)
            </span>
          </div>

          <button
            onClick={handleStampYardiSighting}
            disabled={sightingStamping}
            className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">history</span>
            {sightingStamping ? 'Stamping...' : 'Stamp Sighting'}
          </button>
        </div>

        {sightingSuccessMsg && (
          <div className="text-xs text-emerald-600 font-medium">{sightingSuccessMsg}</div>
        )}

        {/* Warning if unseen >= 7 days */}
        {ticket.is_stale_yardi ? (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
            <div>
              <span className="font-bold">Flagged: Possibly closed or reassigned</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {ticket.yardi_warning || 'Unseen in Yardi for 7+ days. Full local history is preserved.'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
            {ticket.last_seen_in_yardi
              ? `Last verified in Yardi: ${new Date(ticket.last_seen_in_yardi).toLocaleString()}`
              : 'Status: Not yet verified in Yardi (Neutral on intake)'}
          </p>
        )}
      </div>

      {/* Notice of Entry Card (24-Hour Legal Gate) */}
      <div className="rounded-2xl p-4 border bg-gray-50/80 dark:bg-card-dark border-gray-200 dark:border-gray-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              24-Hour Notice of Entry (Legal Gate)
            </span>
          </div>

          {ticket.notice ? (
            <span
              className={`px-2 py-0.5 text-[11px] font-bold rounded-lg ${
                ticket.notice_gate_status === 'green'
                  ? 'bg-emerald-500 text-white'
                  : ticket.notice_gate_status === 'red'
                  ? 'bg-brand-red text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {ticket.notice_gate_status === 'green'
                ? 'CLEARED'
                : ticket.notice_gate_status === 'red'
                ? 'OVERDUE / BLOCKED'
                : 'PENDING 24H'}
            </span>
          ) : (
            <button
              onClick={() => setIsDraftNoticeOpen(true)}
              className="px-2.5 py-1 text-xs font-bold bg-primary text-white rounded-lg shadow-sm hover:bg-primary/90 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Draft Notice
            </button>
          )}
        </div>

        {ticket.notice ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-bold text-brand-black dark:text-white block">
                  Status: <span className="uppercase text-primary">{ticket.notice.status}</span>
                </span>
                <span className="text-[11px] text-gray-500 block truncate">
                  Serve-by Deadline: {ticket.notice.serve_by_deadline ? new Date(ticket.notice.serve_by_deadline).toLocaleString() : 'Pending'}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {ticket.notice.status === 'drafted' && (
                  <button
                    onClick={() => handleAdvanceNotice(ticket.notice!.id, 'sent')}
                    disabled={noticeAdvancing}
                    className="px-2.5 py-1 bg-primary text-white text-[11px] font-bold rounded-lg shadow-sm hover:bg-blue-600 active:scale-95 transition-all"
                  >
                    Mark Sent
                  </button>
                )}
                {ticket.notice.status === 'sent' && (
                  <button
                    onClick={() => handleAdvanceNotice(ticket.notice!.id, 'served')}
                    disabled={noticeAdvancing}
                    className="px-2.5 py-1 bg-primary text-white text-[11px] font-bold rounded-lg shadow-sm hover:bg-blue-600 active:scale-95 transition-all"
                  >
                    Mark Served
                  </button>
                )}
                {ticket.notice.status === 'served' && (
                  <button
                    onClick={() => handleAdvanceNotice(ticket.notice!.id, 'verified')}
                    disabled={noticeAdvancing}
                    className="px-2.5 py-1 bg-primary text-white text-[11px] font-bold rounded-lg shadow-sm hover:bg-blue-600 active:scale-95 transition-all"
                  >
                    Verify Entry
                  </button>
                )}
                {ticket.notice.status === 'verified' && (
                  <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Legally Cleared
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
            No notice of entry drafted yet. Tenant entry requires 24h advance notice service.
          </p>
        )}
      </div>

      {/* Exterior Work & Weather Outlook Card */}
      <div className="rounded-2xl p-4 border bg-gray-50/80 dark:bg-card-dark border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-sky-500">
              {isExterior ? 'partly_cloudy_day' : 'roofing'}
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark block">
                Exterior Work & Rain Planning
              </span>
              <span className="text-[11px] text-gray-500">
                {isExterior ? 'Outdoor work requiring dry weather window' : 'Indoor job — no weather watch needed'}
              </span>
            </div>
          </div>

          {/* Exterior Work Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isExterior}
            onClick={() => handleToggleExterior(!isExterior)}
            disabled={savingWeather}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isExterior ? 'bg-sky-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isExterior ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {weatherFeedback && (
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs flex items-center gap-1.5 animate-fadeIn">
            <span className="material-symbols-outlined text-sm leading-none text-sky-500">info</span>
            <span>{weatherFeedback}</span>
          </div>
        )}

        {/* When Exterior is ON: show week outlook text input */}
        {isExterior && (
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-brand-black dark:text-white flex items-center gap-1">
                  <span>Week Outlook</span>
                  {weatherWatch && weatherWatch.state !== 'resolved' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                      Watch Active
                    </span>
                  )}
                </label>
                {weatherWatch && weatherWatch.state !== 'resolved' && (
                  <button
                    type="button"
                    onClick={handleClearWeatherNote}
                    disabled={savingWeather}
                    className="text-[11px] text-rose-500 hover:text-rose-600 font-medium hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">delete</span>
                    Dismiss Watch
                  </button>
                )}
              </div>

              <input
                type="text"
                value={weatherNote}
                onChange={(e) => setWeatherNote(e.target.value)}
                placeholder='e.g. "might rain Wed–Thu", "ideal: Mon–Tue"'
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-brand-black dark:text-white text-xs sm:text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Quick-pick Outlook Chips for field techs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400 mr-1">Quick pick:</span>
              {[
                'might rain Wed–Thu',
                'ideal: Mon–Tue',
                'Dry window: Fri afternoon',
                'Avoid rain Mon, re-check Tue',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setWeatherNote(chip);
                    handleSaveWeatherNote(chip);
                  }}
                  disabled={savingWeather}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-sky-400 hover:text-sky-500 transition-all active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Save / Update Button */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {weatherNote && (
                <button
                  type="button"
                  onClick={handleClearWeatherNote}
                  disabled={savingWeather}
                  className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear Note
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSaveWeatherNote()}
                disabled={savingWeather || !weatherNote.trim()}
                className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">cloud_done</span>
                <span>{savingWeather ? 'Saving...' : weatherWatch && weatherWatch.state !== 'resolved' ? 'Update Outlook' : 'Save Outlook & Raise Watch'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary Details Card */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Status:</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-primary/10 text-primary border border-primary/20">
              {ticket.status || ticket.state}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Priority:</span>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-lg uppercase ${
                ticket.priority === 'urgent'
                  ? 'bg-brand-red text-white'
                  : ticket.priority === 'high'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {ticket.priority}
            </span>
          </div>
        </div>

        {/* Verified Scope Section */}
        {ticket.verified_scope ? (
          <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 border border-primary/20">
            <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
              <span className="material-symbols-outlined text-sm">verified</span>
              Confirmed Job Scope (Human Verified):
            </span>
            <p className="text-sm font-medium text-brand-black dark:text-white">
              {ticket.verified_scope}
            </p>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 italic">No verified scope recorded yet.</span>
            <button
              onClick={openEditModal}
              className="text-xs font-bold text-primary hover:underline"
            >
              + Confirm Scope
            </button>
          </div>
        )}

        {/* Verbatim Screenshot Text */}
        {ticket.verbatim_text && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
            <span className="text-xs font-bold text-gray-500 block mb-1">
              Verbatim Screenshot Text:
            </span>
            <p className="text-xs text-gray-700 dark:text-gray-300 italic">
              "{ticket.verbatim_text}"
            </p>
          </div>
        )}

        {/* Blocker Reason if present */}
        {ticket.blocker_reason && (
          <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-3 border border-rose-200 dark:border-rose-900 text-xs text-brand-red">
            <span className="font-bold block mb-1">Active Blocker:</span>
            <p>{ticket.blocker_reason}</p>
          </div>
        )}

        {/* Photo attachment preview */}
        {ticket.photo_url && (
          <div>
            <span className="text-xs font-bold text-gray-500 block mb-1.5">Intake Screenshot Photo:</span>
            <img
              src={ticket.photo_url}
              alt="Intake Screenshot"
              className="max-h-48 rounded-xl object-contain border border-gray-200 dark:border-gray-700 shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Parent-Child Hierarchy (WO 19970 Pattern) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Sub-Jobs & Children
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold">
              {children.length}
            </span>
          </div>

          <button
            onClick={() => setIsAddChildOpen(true)}
            className="px-2.5 py-1 text-xs font-bold bg-primary text-white rounded-xl shadow-sm hover:bg-primary/90 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
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
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Total</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {rollup.in_progress ?? 0}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">In Progress</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-rose-600 dark:text-rose-400">
                {rollup.blocked ?? 0}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Blocked</span>
            </div>
            <div>
              <span className="block text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {rollup.done ?? 0}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Done</span>
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
                    <p className="text-[11px] text-brand-red truncate">
                      ⚠ Blocker: {child.blocker_reason}
                    </p>
                  )}
                  {child.assigned_tech_name && (
                    <p className="text-[10px] text-gray-400">
                      Tech: {child.assigned_tech_name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
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
                  <span className="material-symbols-outlined text-gray-400 text-sm">
                    chevron_right
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Append-Only Correction Audit Log Timeline */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">history_edu</span>
          <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
            Correction History (Append-Only Audit)
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold">
            {corrections.length}
          </span>
        </div>

        {corrections.length === 0 ? (
          <div className="p-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
            No edits made to this ticket yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
            {corrections.map((corr) => (
              <div
                key={corr.id}
                className="text-xs pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0 space-y-1"
              >
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span className="font-mono font-bold text-primary">
                    field: {corr.fieldName || (corr as any).field_name}
                  </span>
                  <span>{new Date(corr.createdAt || (corr as any).created_at).toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                  <span className="text-red-500 line-through truncate max-w-[140px]">
                    {corr.oldValue ?? (corr as any).old_value ?? 'null'}
                  </span>
                  <span className="material-symbols-outlined text-xs text-gray-400">arrow_forward</span>
                  <span className="text-emerald-500 font-bold truncate max-w-[140px]">
                    {corr.newValue ?? (corr as any).new_value ?? 'null'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    By: {corr.changedBy || (corr as any).changed_by_name || 'System / Tech'}
                  </span>
                  {corr.reason && <span className="italic">"{corr.reason}"</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Field Modal */}
      {isEditModalOpen && (
        <Modal onClose={() => setIsEditModalOpen(false)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-brand-black dark:text-white">Edit Ticket Details</h2>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              <span className="material-symbols-outlined">close</span>
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
                  value={editState}
                  onChange={(e) => setEditState(e.target.value as TicketState)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-semibold"
                >
                  <option value="new">New</option>
                  <option value="verified">Verified</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="on-hold">On-Hold</option>
                  <option value="done">Done</option>
                  <option value="closed">Closed</option>
                  <option value="closed-elsewhere">Closed-Elsewhere</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {editState === 'blocked' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-brand-red mb-1">Blocker Reason</label>
                  <input
                    type="text"
                    value={editBlocker}
                    onChange={(e) => setEditBlocker(e.target.value)}
                    placeholder="e.g. Parts on order"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-red-300 dark:border-red-800 bg-red-50/50"
                  />
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

            {/* Exterior Work & Weather Outlook in Edit Modal */}
            <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editExterior}
                  onChange={(e) => setEditExterior(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-400 w-4 h-4"
                />
                <span className="text-xs font-bold text-brand-black dark:text-white">
                  Exterior Work (Requires dry weather window)
                </span>
              </label>

              {editExterior && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Week Outlook Note
                  </label>
                  <input
                    type="text"
                    value={editWeatherNote}
                    onChange={(e) => setEditWeatherNote(e.target.value)}
                    placeholder='e.g. "might rain Wed–Thu", "ideal: Mon–Tue"'
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                </div>
              )}
            </div>

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
              <span className="text-[10px] text-gray-400">
                Required: every change is permanently logged in the correction audit trail.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditModalOpen(false)}
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
      )}

      {/* Add Child Ticket Modal */}
      {isAddChildOpen && (
        <Modal onClose={() => setIsAddChildOpen(false)} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Add Sub-Job</h2>
              <p className="text-xs text-gray-400">Parent: {ticket.wo_number || `#${ticket.id}`}</p>
            </div>
            <button
              onClick={() => setIsAddChildOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              <span className="material-symbols-outlined">close</span>
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
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
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
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
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
                <label className="block text-xs font-bold uppercase text-brand-red mb-1">Blocker Reason</label>
                <input
                  type="text"
                  value={childBlocker}
                  onChange={(e) => setChildBlocker(e.target.value)}
                  placeholder="e.g. Waiting on refrigerant shipment"
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

      {/* Draft Notice Modal */}
      {isDraftNoticeOpen && (
        <DraftNoticeModal
          onClose={() => setIsDraftNoticeOpen(false)}
          onSuccess={async () => {
            setIsDraftNoticeOpen(false);
            await loadTicketData();
          }}
          ticketId={ticket.id}
          buildingId={ticket.buildingId}
          unitId={ticket.unitId}
          defaultTitle={`24-Hour Notice of Entry: ${ticket.title}`}
        />
      )}
    </div>
  );
};
