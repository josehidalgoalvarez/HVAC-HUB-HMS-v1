import React, { useState } from 'react';
import type { Ticket, TicketState } from '../../types/domain';

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

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-brand-red text-white font-extrabold animate-pulse';
      case 'high':
        return 'bg-amber-500 text-white font-bold';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold';
      case 'low':
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStateBadgeClass = (state: string) => {
    switch (state) {
      case 'verified':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
      case 'in-progress':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
      case 'blocked':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700';
      case 'on-hold':
      case 'on_hold':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
      case 'done':
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border border-green-300 dark:border-green-700';
      case 'closed':
      case 'closed-elsewhere':
        return 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'new':
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl transition-all border p-4 cursor-pointer select-none ${
        ticket.priority === 'urgent'
          ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900 shadow-sm'
          : 'bg-white dark:bg-card-dark border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Row 1: WO Number badge, Title, Priority Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {ticket.wo_number ? (
            <span className="shrink-0 px-2 py-0.5 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20">
              {ticket.wo_number}
            </span>
          ) : (
            <span className="shrink-0 px-2 py-0.5 text-xs font-mono font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              No WO #
            </span>
          )}
          <h3 className="text-sm font-bold text-brand-black dark:text-white truncate">
            {ticket.title}
          </h3>
        </div>

        <span className={`shrink-0 px-2.5 py-0.5 text-[11px] uppercase tracking-wider rounded-full ${getPriorityBadgeClass(ticket.priority)}`}>
          {ticket.priority}
        </span>
      </div>

      {/* Row 2: Location, Exposure Chip, Rain Badge, Status Badge, Yardi Sighting Warning */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-text-sub-light dark:text-text-sub-dark">
          <span className="material-symbols-outlined text-[16px] text-gray-400">location_on</span>
          <span className="font-medium truncate max-w-[160px]">
            {ticket.buildingName || 'Property'} {ticket.unitNumber ? `• Unit ${ticket.unitNumber}` : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Work Exposure Chip */}
          {ticket.work_exposure === 'exterior_ladder' ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">stairs</span>
              Ladder
            </span>
          ) : ticket.work_exposure === 'exterior' ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">wb_sunny</span>
              Exterior
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">roofing</span>
              Indoor
            </span>
          )}

          {/* Rain Badge: ONLY when exterior or ladder AND rain expected */}
          {(ticket.work_exposure === 'exterior' || ticket.work_exposure === 'exterior_ladder') && ticket.rain_expected && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500 text-white flex items-center gap-1 shadow-sm">
              <span>🌧️</span>
              Rain Expected
            </span>
          )}

          {/* Yardi Staleness Amber Pill (only when >= 7 days unseen) */}
          {ticket.is_stale_yardi && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-md flex items-center gap-1 shadow-sm">
              <span className="material-symbols-outlined text-[12px]">warning</span>
              Unseen Yardi 7+d
            </span>
          )}

          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg ${getStateBadgeClass(ticket.status || ticket.state)}`}>
            {ticket.status || ticket.state}
          </span>
        </div>
      </div>

      {/* Row 3: Scope snippet or Sub-jobs indicator + Tap to Expand hint */}
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs text-text-sub-light dark:text-text-sub-dark">
        <div className="truncate flex-1 pr-2">
          {ticket.childrenCount && ticket.childrenCount > 0 ? (
            <span className="font-semibold text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">account_tree</span>
              {ticket.childrenCount} sub-jobs
            </span>
          ) : ticket.verified_scope ? (
            <span className="truncate block italic text-gray-600 dark:text-gray-300">
              "{ticket.verified_scope}"
            </span>
          ) : ticket.description ? (
            <span className="truncate block">
              {ticket.description}
            </span>
          ) : (
            <span className="text-gray-400">No notes</span>
          )}
        </div>

        <span className="shrink-0 material-symbols-outlined text-gray-400 text-sm transition-transform duration-200">
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700/80 space-y-3 animate-fadeIn"
        >
          {/* Verified Scope Section */}
          {ticket.verified_scope && (
            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-2.5 border border-primary/20 text-xs">
              <span className="font-bold text-primary flex items-center gap-1 mb-0.5">
                <span className="material-symbols-outlined text-sm">verified</span>
                Verified Scope:
              </span>
              <p className="text-brand-black dark:text-white">{ticket.verified_scope}</p>
            </div>
          )}

          {/* Verbatim Screenshot Text */}
          {ticket.verbatim_text && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-2.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-500 block mb-0.5">Intake Text:</span>
              <p className="italic">"{ticket.verbatim_text}"</p>
            </div>
          )}

          {/* Blocker Reason if Blocked */}
          {ticket.blocker_reason && (
            <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-2.5 text-xs text-brand-red border border-rose-200 dark:border-rose-900">
              <span className="font-bold block mb-0.5">Blocker:</span>
              <p>{ticket.blocker_reason}</p>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onSelect(ticket)}
              className="flex-1 py-2 px-3 text-xs font-bold bg-primary text-white rounded-xl shadow-sm hover:bg-primary/90 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              View Ticket
            </button>

            {onQuickStateChange && (
              <select
                value={ticket.status || ticket.state}
                onChange={(e) => onQuickStateChange(ticket.id, e.target.value as TicketState)}
                className="py-2 px-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white"
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
