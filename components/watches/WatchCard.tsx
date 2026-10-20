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
      case 'weather_freeze':
        return {
          label: 'Freeze Alert',
          icon: 'ac_unit',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
      case 'weather_manual':
        return {
          label: 'Weather Outlook',
          icon: 'partly_cloudy_day',
          bg: 'bg-sky-950/60 text-sky-300 border-sky-800',
        };
      case 'notice_deadline':
        return {
          label: 'Notice Deadline',
          icon: 'event_busy',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
      case 'notice_handoff':
        return {
          label: 'Handoff Alert',
          icon: 'outgoing_mail',
          bg: 'bg-amber-950/60 text-amber-300 border-amber-800',
        };
      case 'reply_waiting':
        return {
          label: 'Reply Waiting',
          icon: 'hourglass_empty',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
      case 'scheduled_task':
        return {
          label: 'Scheduled Task',
          icon: 'assignment_late',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
      default:
        return {
          label: type,
          icon: 'notifications',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const getStatePill = (state: WatchState) => {
    switch (state) {
      case 'triggered':
        return {
          label: 'TRIGGERED',
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
        };
      case 'snoozed':
        return {
          label: 'SNOOZED',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'acknowledged':
        return {
          label: 'ACKNOWLEDGED',
          bg: 'bg-primary/20 text-blue-300 border-primary/40',
        };
      case 'resolved':
        return {
          label: 'RESOLVED',
          bg: 'bg-slate-800 text-slate-400 border-slate-700/60',
        };
      case 'active':
      default:
        return {
          label: 'ACTIVE',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const badge = getTypeBadge(watch.watch_type);
  const statePill = getStatePill(watch.state);

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-200 border ${
        isTriggered
          ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
          : isSnoozed
          ? 'bg-amber-950/10 border-amber-500/30'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
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
      <h3 className="text-base font-semibold text-white mb-1">{watch.title}</h3>

      {watch.description && (
        <p className="text-xs text-slate-400 mb-2">{watch.description}</p>
      )}

      {/* Target Linkage */}
      {watch.target_type && watch.target_id && (
        <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-3">
          <span className="text-slate-500">Target:</span>
          <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
            {watch.target_type} #{watch.target_id}
          </span>
        </div>
      )}

      {/* Manual Weather Outlook Card Box */}
      {watch.watch_type === 'weather_manual' && (
        <div className="mt-2 mb-3 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-sky-400 text-base leading-none shrink-0 mt-0.5">partly_cloudy_day</span>
            <div className="flex-1 text-xs space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-white text-[13px] truncate">
                  {watch.config?.building_name || watch.latest_trigger_data?.building_name ? (
                    <>
                      {watch.config?.building_name || watch.latest_trigger_data?.building_name}
                      {(watch.config?.unit_number || watch.latest_trigger_data?.unit_number) && (
                        <span className="text-sky-300 font-normal ml-1">
                          • Unit {watch.config?.unit_number || watch.latest_trigger_data?.unit_number}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Ticket #{watch.target_id} Exterior Work</span>
                  )}
                </span>
                {(watch.config?.wo_number || watch.latest_trigger_data?.wo_number) && (
                  <span className="font-mono text-[10px] bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 rounded text-sky-300 shrink-0">
                    WO: {watch.config?.wo_number || watch.latest_trigger_data?.wo_number}
                  </span>
                )}
              </div>
              <p className="text-sky-100 text-xs italic font-medium leading-relaxed">
                "{watch.description || watch.config?.weather_note || watch.latest_trigger_data?.weather_note || 'Exterior weather planning note'}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Alert Box (if triggered) */}
      {isTriggered && watch.latest_trigger_reason && (
        <div className="mt-2 mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-rose-400 text-sm leading-none shrink-0 mt-0.5">warning</span>
            <div className="flex-1 text-xs">
              <p className="font-medium">{watch.latest_trigger_reason}</p>
              {watch.latest_trigger_data?.coldest_date && (
                <div className="mt-1 flex items-center gap-3 text-rose-300 text-[11px]">
                  <span>Coldest: <strong>{watch.latest_trigger_data.min_temp}°C</strong></span>
                  <span>Date: <strong>{watch.latest_trigger_data.coldest_date}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Snoozed State Info */}
      {isSnoozed && watch.snoozed_until && (
        <div className="mt-2 mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-sm leading-none">snooze</span>
          <span>Silenced until: <strong>{new Date(watch.snoozed_until).toLocaleString()}</strong></span>
        </div>
      )}

      {/* Timestamps Row */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 mb-3">
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
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
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
            className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm leading-none">notifications_active</span>
            <span>Un-snooze</span>
          </button>
        )}

        {!isResolved ? (
          <button
            onClick={() => onResolve(watch)}
            className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 active:scale-[0.98] transition-all"
          >
            Resolve
          </button>
        ) : (
          onReactivate && (
            <button
              onClick={() => onReactivate(watch)}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 active:scale-[0.98] transition-all"
            >
              Reactivate
            </button>
          )
        )}
      </div>
    </div>
  );
};
