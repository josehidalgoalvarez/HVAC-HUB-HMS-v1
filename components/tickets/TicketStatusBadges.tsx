import React from 'react';
import { ClosedByParty } from '../../types/domain';
import { ExplainableTerm } from '../common/ExplainableTerm';

export function closedByPartyLabel(party?: ClosedByParty | string | null): string | null {
  return party === 'coworker' ? 'Coworker' : null;
}

interface TicketStatusBadgeProps {
  status: string;
  closedByParty?: ClosedByParty | string | null;
  variant: 'card' | 'detail';
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({
  status,
  closedByParty,
  variant,
}) => {
  const s = (status || 'new').toLowerCase();

  if (variant === 'detail') {
    const badgeClass =
      s === 'done' || s === 'resolved'
        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
        : s === 'blocked'
        ? 'bg-rose-600 text-white border-rose-600 font-bold'
        : s === 'in-progress' || s === 'in_progress'
        ? 'bg-primary text-white border-primary font-bold'
        : s === 'on-hold' || s === 'on_hold'
        ? 'bg-amber-500 text-white border-amber-500 font-bold'
        : 'bg-primary/10 text-primary border-primary/20 font-bold';

    let displayStatus: string = status || 'new';
    if (s === 'closed-elsewhere') {
      const partyLabel = closedByPartyLabel(closedByParty);
      displayStatus = partyLabel ? `Closed — ${partyLabel}` : 'Closed elsewhere';
    }

    return (
      <span className={`px-2.5 py-0.5 text-xs rounded-lg uppercase tracking-wide border shadow-2xs ${badgeClass}`}>
        <ExplainableTerm term={s}>{displayStatus}</ExplainableTerm>
      </span>
    );
  }

  // variant === 'card'
  switch (s) {
    case 'in-progress':
    case 'in_progress':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-primary/10 text-primary border border-primary/30 dark:bg-primary/20 dark:text-sky-300">
          <ExplainableTerm term={s}>IN-PROGRESS</ExplainableTerm>
        </span>
      );
    case 'verified':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <ExplainableTerm term={s}>VERIFIED</ExplainableTerm>
        </span>
      );
    case 'blocked':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <ExplainableTerm term={s}>BLOCKED</ExplainableTerm>
        </span>
      );
    case 'on-hold':
    case 'on_hold':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <ExplainableTerm term={s}>ON-HOLD</ExplainableTerm>
        </span>
      );
    case 'done':
    case 'resolved':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border border-green-300 dark:border-green-800">
          <ExplainableTerm term={s}>DONE</ExplainableTerm>
        </span>
      );
    case 'closed':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
          <ExplainableTerm term={s}>CLOSED</ExplainableTerm>
        </span>
      );
    case 'closed-elsewhere': {
      const partyLabel = closedByPartyLabel(closedByParty);
      const displayLabel = partyLabel ? `Closed — ${partyLabel}` : 'Closed elsewhere';
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
          <ExplainableTerm term={s}>{displayLabel}</ExplainableTerm>
        </span>
      );
    }
    case 'new':
    default:
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
          <ExplainableTerm term={s}>{s.toUpperCase()}</ExplainableTerm>
        </span>
      );
  }
};

interface TicketPriorityBadgeProps {
  priority: string;
  variant: 'card' | 'detail';
}

export const TicketPriorityBadge: React.FC<TicketPriorityBadgeProps> = ({
  priority,
  variant,
}) => {
  if (variant === 'detail') {
    return (
      <span
        className={`px-2.5 py-0.5 text-xs font-bold rounded-lg uppercase tracking-wide shadow-2xs ${
          priority === 'urgent'
            ? 'bg-brand-red text-white border border-brand-red ring-1 ring-brand-red/30'
            : priority === 'high'
            ? 'bg-amber-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
      >
        <ExplainableTerm term={priority}>{priority}</ExplainableTerm>
      </span>
    );
  }

  switch (priority) {
    case 'urgent':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-brand-red text-white flex items-center gap-1 shadow-2xs">
          <span aria-hidden="true" className="material-symbols-outlined text-[13px] leading-none">warning</span>
          <ExplainableTerm term="urgent">URGENT</ExplainableTerm>
        </span>
      );
    case 'high':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-amber-500 text-white shadow-2xs">
          <ExplainableTerm term="high">HIGH</ExplainableTerm>
        </span>
      );
    case 'medium':
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <ExplainableTerm term="medium">NORMAL</ExplainableTerm>
        </span>
      );
    case 'low':
    default:
      return (
        <span className="shrink-0 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
          <ExplainableTerm term="low">LOW</ExplainableTerm>
        </span>
      );
  }
};
