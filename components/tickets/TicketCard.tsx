import React, { useState } from 'react';
import type { Ticket, TicketState } from '../../types/domain';
import { getUnitContextChips } from '../../utils/unitContextUtils';
import { formatAge } from '../../utils/dateUtils';

interface TicketCardProps {
  ticket: Ticket;
  onSelect: (ticket: Ticket) => void;
  onQuickStateChange?: (ticketId: string, newState: TicketState) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onSelect,
  onQuickStateChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-brand-red text-white flex items-center gap-1 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] leading-none">warning</span>
            URGENT
          </span>
        );
      case 'high':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500 text-white shadow-2xs">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            NORMAL
          </span>
        );
      case 'low':
      default:
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (stateOrStatus: string) => {
    const s = (stateOrStatus || 'new').toLowerCase();
    switch (s) {
      case 'in-progress':
      case 'in_progress':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-primary/10 text-primary border border-primary/30 dark:bg-primary/20 dark:text-sky-300">
            IN-PROGRESS
          </span>
        );
      case 'verified':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            VERIFIED
          </span>
        );
      case 'blocked':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            BLOCKED
          </span>
        );
      case 'on-hold':
      case 'on_hold':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            ON-HOLD
          </span>
        );
      case 'done':
      case 'resolved':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border border-green-300 dark:border-green-800">
            DONE
          </span>
        );
      case 'closed':
      case 'closed-elsewhere':
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            CLOSED
          </span>
        );
      case 'new':
      default:
        return (
          <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            NEW
          </span>
        );
    }
  };

  // Location string: Building + Unit (biggest text after title)
  const building = ticket.buildingName || ticket.building_name || ticket.propertyName || 'Property';
  const unit = ticket.unitNumber || ticket.unit_number;
  const locationText = unit ? `${building} · Unit ${unit}` : building;

  // Age string
  const ageStr = formatAge(ticket.createdAt || (ticket as any).created_at);

  // Issue summary text
  const issueSummary =
    ticket.verified_scope ||
    ticket.description ||
    ticket.verbatim_text ||
    ticket.title ||
    'No issue description provided';

  // Blocker / waiting status checks
  const blocker = ticket.blocker_reason?.toLowerCase() || '';
  const isPartWait = blocker.includes('part') || blocker.includes('order');
  const isReplyWait = blocker.includes('reply') || blocker.includes('tenant') || blocker.includes('wait') || blocker.includes('pending');

  // Work exposure
  const isLadder = ticket.work_exposure === 'exterior_ladder';
  const isExterior = ticket.work_exposure === 'exterior' || ticket.exterior_work;

  // Rain badge: ONLY when (exterior or ladder) AND rain_expected
  const showRain = (isLadder || isExterior) && Boolean(ticket.rain_expected);

  // Notice status
  const isVacant = ticket.unit_occupancy_status === 'vacant' || ticket.unit?.occupancy_status === 'vacant';
  const isGateOpen = (ticket.notice_gate_status as string) === 'gate_open' || (ticket.notice_gate_status as string) === 'open';
  const isNoticeSent = Boolean(ticket.notice_sent_at || (ticket.notice_status as string) === 'sent');
  const isNoticeNeeded = !isVacant && Boolean(ticket.notice_needed || (ticket.notice_status as string) === 'needed');

  // Unit context chips (Vacant, Recent move-in, Renovated)
  const unitContextChips = getUnitContextChips(ticket.unit || ticket);
  const hasRepeatAccessProblem = Boolean(
    ticket.has_repeat_access_problem ||
    ticket.repeat_access_problem ||
    ticket.unit?.has_repeat_access_problem ||
    ticket.unit?.repeat_access_problem ||
    ((ticket.unit_failed_visits_count ?? 0) >= 2) ||
    ((ticket.unit?.failed_visits_count ?? 0) >= 2)
  );

  return (
    <article
      onClick={() => onSelect(ticket)}
      className={`group rounded-2xl border transition-all cursor-pointer select-none p-3.5 flex flex-col gap-2.5 active:scale-[0.99] ${
        ticket.priority === 'urgent'
          ? 'bg-white dark:bg-card-dark border-red-300 dark:border-red-900/80 shadow-xs hover:border-brand-red'
          : 'bg-white dark:bg-card-dark border-gray-200 dark:border-gray-800 shadow-xs hover:border-primary/50'
      }`}
    >
      {/* 1. PRIORITY / STATUS BAND */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ticket.wo_number ? (
            <span className="shrink-0 px-2 py-0.5 text-xs font-mono font-bold bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 rounded-md border border-primary/25">
              {ticket.wo_number.toUpperCase().startsWith('WO-') ? `[${ticket.wo_number.toUpperCase()}]` : `[WO-${ticket.wo_number}]`}
            </span>
          ) : (
            <span className="shrink-0 px-2 py-0.5 text-xs font-mono font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-md border border-dashed border-gray-300 dark:border-gray-700">
              [NO WO]
            </span>
          )}

          {getPriorityBadge(ticket.priority)}
          {getStatusBadge(ticket.status || ticket.state)}
          {hasRepeatAccessProblem && (
            <span
              data-testid="repeat-access-problem-flag"
              className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[12px] leading-none text-amber-600 dark:text-amber-400">warning</span>
              Repeat access problem
            </span>
          )}
        </div>

        {ageStr && (
          <span className="shrink-0 text-[11px] font-mono text-text-sub-light dark:text-text-sub-dark flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[13px] leading-none text-gray-400">schedule</span>
            {ageStr}
          </span>
        )}
      </div>

      {/* 2. BUILDING + UNIT (THE LOCATION - BIGGEST TEXT AFTER TITLE) */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <h2 className="text-base font-bold text-brand-black dark:text-white uppercase tracking-tight leading-snug group-hover:text-primary transition-colors">
            {locationText}
          </h2>
          <div className="flex items-center gap-1 flex-wrap">
            {hasRepeatAccessProblem && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700"
              >
                <span className="material-symbols-outlined text-[11px] leading-none text-amber-600 dark:text-amber-400">warning</span>
                Repeat access problem
              </span>
            )}
            {unitContextChips.length > 0 && unitContextChips.map(chip => (
              <span
                key={chip.key}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md ${chip.className}`}
              >
                <span className="material-symbols-outlined text-[11px] leading-none">{chip.icon}</span>
                {chip.label}
              </span>
            ))}
          </div>
        </div>
        {ticket.title && (
          <p className="text-xs font-medium text-text-sub-light dark:text-text-sub-dark line-clamp-1">
            {ticket.title}
          </p>
        )}
      </div>

      {/* 3. ISSUE SUMMARY IN 2-3 LINES WITH ONE-TAP EXPAND */}
      <div
        className={`border-l-2 pl-2.5 py-0.5 transition-colors ${
          ticket.priority === 'urgent' ? 'border-brand-red' : 'border-primary'
        }`}
      >
        <p
          className={`text-xs text-brand-black dark:text-gray-200 leading-relaxed ${
            isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'
          }`}
        >
          {issueSummary}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-1 min-h-[44px] w-full text-left text-[11px] font-bold text-primary dark:text-sky-400 hover:opacity-80 flex items-center justify-between py-1 border-t border-gray-100 dark:border-gray-800/80 uppercase tracking-wider"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? '[COLLAPSE ISSUE]' : '[SHOW FULL ISSUE]'}</span>
          <span className="material-symbols-outlined text-base leading-none transition-transform duration-200">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {/* Extended information visible when expanded */}
        {isExpanded && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700/80 space-y-2 text-xs animate-fadeIn cursor-default"
          >
            {ticket.verified_scope && ticket.description && ticket.verified_scope !== ticket.description && (
              <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-2 border border-primary/20">
                <span className="font-bold text-primary flex items-center gap-1 mb-0.5">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Verified Scope:
                </span>
                <p className="text-brand-black dark:text-white">{ticket.verified_scope}</p>
              </div>
            )}

            {ticket.verbatim_text && ticket.verbatim_text !== ticket.description && (
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <span className="font-bold text-gray-500 dark:text-gray-400 block mb-0.5">Intake Text:</span>
                <p className="italic">"{ticket.verbatim_text}"</p>
              </div>
            )}

            {ticket.blocker_reason && (
              <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-2 text-brand-red dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                <span className="font-bold block mb-0.5">Blocker Reason:</span>
                <p>{ticket.blocker_reason}</p>
              </div>
            )}

            {onQuickStateChange && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark">
                  Quick State:
                </span>
                <select
                  value={ticket.status || ticket.state}
                  onChange={(e) => onQuickStateChange(ticket.id, e.target.value as TicketState)}
                  className="min-h-[44px] py-1 px-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white"
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
            )}
          </div>
        )}
      </div>

      {/* 4. COMPACT META ROW OF CHIPS/BADGES (FLEX-WRAP, NO HORIZONTAL CLIPPING) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-800/80 text-[11px]">
        {/* Exposure Badge */}
        {isLadder ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
            <span className="material-symbols-outlined text-[13px] leading-none">stairs</span>
            Ladder
          </span>
        ) : isExterior ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200 border border-sky-300 dark:border-sky-700">
            <span className="material-symbols-outlined text-[13px] leading-none">wb_sunny</span>
            Exterior
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            <span className="material-symbols-outlined text-[13px] leading-none text-gray-500">roofing</span>
            Indoor
          </span>
        )}

        {/* Rain Badge: ONLY when exterior or ladder AND rain expected - Strictly Material Symbols, NO emoji! */}
        {showRain && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-blue-600 text-white shadow-2xs">
            <span className="material-symbols-outlined text-[13px] leading-none">rainy</span>
            Rain Alert
          </span>
        )}

        {/* Notice State Badges */}
        {isGateOpen ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <span className="material-symbols-outlined text-[13px] leading-none">lock_open</span>
            Gate Open
          </span>
        ) : isNoticeSent ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="material-symbols-outlined text-[13px] leading-none">mark_email_read</span>
            Notice Sent
          </span>
        ) : isNoticeNeeded ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
            <span className="material-symbols-outlined text-[13px] leading-none">notification_important</span>
            Notice Needed
          </span>
        ) : null}

        {/* Part-wait or reply-waiting indicator */}
        {isPartWait ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <span className="material-symbols-outlined text-[13px] leading-none">inventory_2</span>
            Part Wait
          </span>
        ) : isReplyWait ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="material-symbols-outlined text-[13px] leading-none">hourglass_top</span>
            Reply Waiting
          </span>
        ) : ticket.blocker_reason ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <span className="material-symbols-outlined text-[13px] leading-none">block</span>
            Blocked
          </span>
        ) : null}

        {/* Yardi Stale Warning */}
        {ticket.is_stale_yardi && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-amber-500 text-white shadow-2xs">
            <span className="material-symbols-outlined text-[13px] leading-none">warning</span>
            Yardi 7+d
          </span>
        )}

        {/* Sub-jobs count */}
        {ticket.childrenCount && ticket.childrenCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold rounded-md bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 border border-primary/20">
            <span className="material-symbols-outlined text-[13px] leading-none">account_tree</span>
            {ticket.childrenCount} sub-jobs
          </span>
        ) : null}
      </div>
    </article>
  );
};
