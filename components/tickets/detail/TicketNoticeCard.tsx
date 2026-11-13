import React, { useState } from 'react';
import { Ticket } from '../../../types/domain';
import { apiClient } from '../../../src/api/client';
import { parseDate, formatDateTime } from '../../../utils/dateUtils';

interface TicketNoticeCardProps {
  ticket: Ticket;
  onTicketChange: (next: Ticket) => void;
}

export const TicketNoticeCard: React.FC<TicketNoticeCardProps> = ({ ticket, onTicketChange }) => {
  // Notice Sent-Tracking State
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [isMarkingSent, setIsMarkingSent] = useState(false);
  const [markSentTime, setMarkSentTime] = useState<string>('');
  const [markConfirmedBy, setMarkConfirmedBy] = useState<string>('');
  const [noticeFeedback, setNoticeFeedback] = useState<string | null>(null);

  // SOP runs completed against this ticket

  const handleToggleNoticeNeeded = async (needed: boolean) => {
    if (!ticket) return;
    try {
      setNoticeSaving(true);
      setNoticeFeedback(null);
      const updated = await apiClient.updateTicket(ticket.id, {
        notice_needed: needed,
        reason: needed ? 'Toggled 24h notice needed ON' : 'Toggled 24h notice needed OFF',
      });
      onTicketChange({ ...ticket, ...updated, notice_needed: needed });
      setNoticeFeedback(needed ? '24h Notice required: entry blocked until marked sent.' : 'Notice requirement turned off: entry permitted.');
      setTimeout(() => setNoticeFeedback(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update notice status');
    } finally {
      setNoticeSaving(false);
    }
  };

  const handleSaveMarkSent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    if (!markConfirmedBy.trim()) {
      alert('Please enter who confirmed the notice was sent.');
      return;
    }

    try {
      setNoticeSaving(true);
      setNoticeFeedback(null);
      const sentIso = markSentTime ? new Date(markSentTime).toISOString() : new Date().toISOString();
      const confirmedName = markConfirmedBy.trim();

      const updated = await apiClient.updateTicket(ticket.id, {
        notice_sent_at: sentIso,
        notice_confirmed_by: confirmedName,
        reason: `Notice marked sent at ${sentIso} confirmed by ${confirmedName}`,
      });

      onTicketChange({
        ...ticket,
        ...updated,
        notice_sent_at: sentIso,
        notice_confirmed_by: confirmedName,
      });

      setIsMarkingSent(false);
      setMarkConfirmedBy('');
      setMarkSentTime('');
      setNoticeFeedback(`Notice marked sent! Confirmed by ${confirmedName}. 24h countdown active.`);
      setTimeout(() => setNoticeFeedback(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to record notice sent');
    } finally {
      setNoticeSaving(false);
    }
  };

  const handleClearNoticeSent = async () => {
    if (!ticket) return;
    if (!window.confirm('Clear notice sent status and reset the 24h entry gate?')) {
      return;
    }

    try {
      setNoticeSaving(true);
      setNoticeFeedback(null);
      const updated = await apiClient.updateTicket(ticket.id, {
        notice_sent_at: null,
        notice_confirmed_by: null,
        reason: 'Cleared 24h notice sent status (undo)',
      });

      onTicketChange({
        ...ticket,
        ...updated,
        notice_sent_at: null,
        notice_confirmed_by: null,
      });

      setNoticeFeedback('Notice sent status cleared. Entry gate reset to blocked.');
      setTimeout(() => setNoticeFeedback(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to clear notice sent status');
    } finally {
      setNoticeSaving(false);
    }
  };

        const isVacant = ticket.unit_occupancy_status === 'vacant' || ticket.unit?.occupancy_status === 'vacant';
        const isNoticeNeeded = !isVacant && !!ticket.notice_needed;
        const noticeSentAt = ticket.notice_sent_at || null;
        const noticeConfirmedBy = ticket.notice_confirmed_by || null;

        let gateBadge = {
          label: 'NO NOTICE REQUIRED',
          className: 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300',
          description: 'Entry permitted — no 24h notice required for this work order.',
          cleared: true,
        };

        if (isVacant) {
          gateBadge = {
            label: 'NOT APPLICABLE (VACANT)',
            className: 'bg-emerald-500 text-white',
            description: 'Unit is vacant — no tenant to notify. Entry legally cleared without 24h notice.',
            cleared: true,
          };
        } else if (isNoticeNeeded) {
          if (!noticeSentAt) {
            gateBadge = {
              label: 'ENTRY BLOCKED',
              className: 'bg-brand-red text-white',
              description: 'Notice required but not yet sent. Tenant entry prohibited.',
              cleared: false,
            };
          } else {
            const parsedSent = parseDate(noticeSentAt);
            const sentTime = parsedSent ? parsedSent.getTime() : NaN;
            if (!isNaN(sentTime)) {
              const hoursElapsed = (Date.now() - sentTime) / (1000 * 60 * 60);
              const validFrom = new Date(sentTime + 24 * 60 * 60 * 1000);
              const validFromFormatted = formatDateTime(validFrom, {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              if (hoursElapsed >= 24) {
                gateBadge = {
                  label: 'CLEARED (24H MET)',
                  className: 'bg-emerald-500 text-white',
                  description: `Entry window open since ${validFromFormatted} (${hoursElapsed.toFixed(1)}h elapsed).`,
                  cleared: true,
                };
              } else {
                const hoursRemaining = Math.max(0, 24 - hoursElapsed);
                gateBadge = {
                  label: `LOCKED (${Math.ceil(hoursRemaining)}H LEFT)`,
                  className: 'bg-amber-500 text-white',
                  description: `Entry permitted starting ${validFromFormatted} (${hoursRemaining.toFixed(1)}h remaining).`,
                  cleared: false,
                };
              }
            } else {
              gateBadge = {
                label: 'ENTRY BLOCKED',
                className: 'bg-brand-red text-white',
                description: 'Notice timestamp invalid. Re-confirm notice sent time.',
                cleared: false,
              };
            }
          }
        }

        return (
          <div className="rounded-2xl p-4 border bg-gray-50/80 dark:bg-card-dark border-gray-200 dark:border-gray-800 space-y-3">
            {/* Header row: Icon, Title, and Legal Gate Badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base text-primary">schedule</span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark block">
                    24h Notice of Entry
                  </span>
                  <span className="text-xs text-gray-500">
                    {isVacant
                      ? 'Vacant unit — no tenant to notify (entry permitted)'
                      : (isNoticeNeeded ? 'Tenant-occupied — 24h advance notice required' : 'Notice of entry not required')}
                  </span>
                </div>
              </div>

              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shrink-0 ${gateBadge.className}`}>
                {gateBadge.label}
              </span>
            </div>

            {/* Notice Needed Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
              <div className="flex-1 pr-3">
                <label htmlFor="notice-needed-toggle" className="text-xs font-bold text-brand-black dark:text-white block cursor-pointer">
                  Notice needed
                </label>
                <p className="text-xs text-gray-500">
                  {isVacant
                    ? 'Unit is vacant — 24h notice not applicable'
                    : isNoticeNeeded
                    ? 'Entry gated until 24h after management sends notice'
                    : 'Turn ON if unit requires 24h written notice'}
                </p>
              </div>

              <button
                id="notice-needed-toggle"
                type="button"
                role="switch"
                aria-checked={isNoticeNeeded}
                onClick={() => !isVacant && handleToggleNoticeNeeded(!isNoticeNeeded)}
                disabled={noticeSaving || isVacant}
                className={`relative inline-flex h-7 w-12 shrink-0 ${isVacant ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isNoticeNeeded ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isNoticeNeeded ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {noticeFeedback && (
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary dark:text-sky-300 text-xs flex items-center gap-1.5 animate-fadeIn">
                <span aria-hidden="true" className="material-symbols-outlined text-sm leading-none">info</span>
                <span>{noticeFeedback}</span>
              </div>
            )}

            {/* When Notice is Needed */}
            {isNoticeNeeded && (
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800 animate-fadeIn">
                {/* If Sent: Show sent details and clear/undo action */}
                {noticeSentAt ? (
                  <div className="p-3 rounded-xl bg-white dark:bg-neutral-800/80 border border-gray-200 dark:border-gray-700 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-black dark:text-white">
                          <span aria-hidden="true" className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
                          <span>
                            Sent — {formatDateTime(noticeSentAt, { dateStyle: 'short', timeStyle: 'short' })} — confirmed by <span className="text-primary">{noticeConfirmedBy || 'Management'}</span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 pl-5">
                          {gateBadge.description}
                        </p>
                      </div>

                      <button
                        onClick={handleClearNoticeSent}
                        disabled={noticeSaving}
                        className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-brand-red dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-300 rounded-xl transition-colors shrink-0"
                        title="Clear sent status (Undo)"
                      >
                        Clear / Undo
                      </button>
                    </div>
                  </div>
                ) : (
                  /* If Needed + Not Sent: Show Mark as sent action */
                  <div>
                    {!isMarkingSent ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-200 block">
                            Notice pending
                          </span>
                          <span className="text-xs text-amber-700 dark:text-amber-300">
                            Management sends notice. Mark sent here to start 24h clock.
                          </span>
                        </div>

                        <button
                          id="mark-notice-sent-btn"
                          onClick={() => {
                            setIsMarkingSent(true);
                            const now = new Date();
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                            setMarkSentTime(localNow);
                          }}
                          className="min-h-[44px] px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">send</span>
                          <span>Mark as sent</span>
                        </button>
                      </div>
                    ) : (
                      /* Form to capture sent timestamp & confirmed by */
                      <form onSubmit={handleSaveMarkSent} className="p-3.5 rounded-xl bg-white dark:bg-neutral-800/90 border border-primary/30 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-black dark:text-white flex items-center gap-1.5">
                            <span aria-hidden="true" className="material-symbols-outlined text-sm text-primary">mark_email_read</span>
                            Confirm Notice Sent
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsMarkingSent(false)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                           aria-label="Close">
                            <span aria-hidden="true" className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                              Sent Date & Time *
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={markSentTime}
                              onChange={e => setMarkSentTime(e.target.value)}
                              className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                              Confirmed by (Name) *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Maria (Management) / Jose"
                              value={markConfirmedBy}
                              onChange={e => setMarkConfirmedBy(e.target.value)}
                              className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsMarkingSent(false)}
                            disabled={noticeSaving}
                            className="flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={noticeSaving}
                            className="flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl bg-primary hover:bg-blue-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                           aria-label="Confirm">
                            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
                            <span>{noticeSaving ? 'Saving...' : 'Confirm Notice Sent'}</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

};
