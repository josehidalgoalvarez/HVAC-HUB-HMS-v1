import React from 'react';
import type { WatchRecord, WatchType, WatchState } from '../../types/domain';

interface WatchCardProps {
  watch: WatchRecord;
  onSnooze: (watch: WatchRecord) => void;
  onAcknowledge: (watch: WatchRecord) => void;
  onResolve: (watch: WatchRecord) => void;
  onReactivate?: (watch: WatchRecord) => void;
}

export const WatchCard: React.FC<WatchCardProps> = ({
  watch,
  onSnooze,
  onAcknowledge,
  onResolve,
  onReactivate,
}) => {
  const isTriggered = watch.state === 'triggered';
  const isSnoozed = watch.state === 'snoozed';
  const isAcknowledged = watch.state === 'acknowledged';
  const isResolved = watch.state === 'resolved';

  const getTypeBadge = (type: WatchType) => {
    switch (type) {
      case 'notice_deadline':
        return {
          label: 'Notice Not Sent',
          icon: 'event_busy',
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'reply_waiting':
        return {
          label: 'Reply Waiting',
          icon: 'hourglass_empty',
          bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'part_wait':
        return {
          label: 'Part Wait',
          icon: 'hourglass_top',
          bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'scheduled_task':
        return {
          label: 'Scheduled Task',
          icon: 'assignment_late',
          bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        };
      default:
        return {
          label: type,
          icon: 'notifications',
          bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        };
    }
  };

  const getStatePill = (state: WatchState) => {
    switch (state) {
      case 'triggered':
        return {
          label: 'TRIGGERED',
          bg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30 animate-pulse',
        };
      case 'snoozed':
        return {
          label: 'SNOOZED',
          bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30',
        };
      case 'acknowledged':
        return {
          label: 'ACKNOWLEDGED',
          bg: 'bg-primary/10 dark:bg-primary/20 text-blue-600 dark:text-blue-300 border-primary/30',
        };
      case 'resolved':
        return {
          label: 'RESOLVED',
          bg: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
        };
      case 'active':
      default:
        return {
          label: 'ACTIVE',
          bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        };
    }
  };

  const badge = getTypeBadge(watch.watch_type);
  const statePill = getStatePill(watch.state);

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-200 border ${
        isTriggered
          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/40 shadow-sm dark:shadow-rose-950/20'
          : isSnoozed
          ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-500/30'
          : 'bg-white dark:bg-card-dark border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs'
      }`}
    >
      {/* Header with Type and State */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bg}`}
          >
            <span className="material-symbols-outlined text-[14px] leading-none">{badge.icon}</span>
            <span>{badge.label}</span>
          </span>
          {watch.quiet_hours_delayed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <span className="material-symbols-outlined text-[12px] leading-none">wb_twilight</span>
              <span>Morning Batch</span>
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wide ${statePill.bg}`}
        >
          {statePill.label}
        </span>
      </div>

      {/* Title & Target Info */}
      <h3 className="text-base font-semibold text-brand-black dark:text-white mb-1">{watch.title}</h3>

      {watch.description && (
        <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-2">{watch.description}</p>
      )}

      {/* Target Linkage */}
      {watch.target_type && watch.target_id && (
        <div className="text-xs text-text-sub-light dark:text-text-sub-dark flex items-center gap-1.5 mb-3">
          <span className="text-gray-500 dark:text-gray-400">Target:</span>
          <span className="font-mono text-brand-black dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200/60 dark:border-transparent">
            {watch.target_type} #{watch.target_id}
          </span>
        </div>
      )}

      {/* Trigger Alert Box (if triggered) */}
      {isTriggered && watch.latest_trigger_reason && (
        <div className="mt-2 mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-sm leading-none shrink-0 mt-0.5">warning</span>
            <div className="flex-1 text-xs">
              <p className="font-medium">{watch.latest_trigger_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Snoozed State Info */}
      {isSnoozed && watch.snoozed_until && (
        <div className="mt-2 mb-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm leading-none">snooze</span>
          <span>Silenced until: <strong>{new Date(watch.snoozed_until).toLocaleString()}</strong></span>
        </div>
      )}

      {/* Timestamps Row */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800 mb-3">
        <span>Evaluated: {watch.last_evaluated_at ? new Date(watch.last_evaluated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
        {watch.last_triggered_at && (
          <span>Triggered: {new Date(watch.last_triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>

      {/* Actions (Gloves-on, >=44px touch targets) */}
      <div className="flex flex-wrap items-center gap-2">
        {isTriggered && (
          <>
            <button
              onClick={() => onSnooze(watch)}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-brand-black dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm leading-none">snooze</span>
              <span>Snooze</span>
            </button>
            <button
              onClick={() => onAcknowledge(watch)}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-blue-600 text-white shadow-sm border border-primary active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm leading-none">check</span>
              <span>Acknowledge</span>
            </button>
          </>
        )}

        {isSnoozed && onReactivate && (
          <button
            onClick={() => onReactivate(watch)}
            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-brand-black dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm leading-none">notifications_active</span>
            <span>Un-snooze</span>
          </button>
        )}

        {!isResolved ? (
          <button
            onClick={() => onResolve(watch)}
            className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/80 active:scale-[0.98] transition-all"
          >
            Resolve
          </button>
        ) : (
          onReactivate && (
            <button
              onClick={() => onReactivate(watch)}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              Reactivate
            </button>
          )
        )}
      </div>
    </div>
  );
};
