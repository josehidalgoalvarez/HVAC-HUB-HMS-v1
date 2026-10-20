import React from 'react';
import type { WatchDigestResponse, WatchRecord } from '../../types/domain';
import { WatchCard } from './WatchCard';

interface DigestSectionProps {
  digest: WatchDigestResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSnooze: (watch: WatchRecord) => void;
  onAcknowledge: (watch: WatchRecord) => void;
  onResolve: (watch: WatchRecord) => void;
}

export const DigestSection: React.FC<DigestSectionProps> = ({
  digest,
  isLoading,
  onRefresh,
  onSnooze,
  onAcknowledge,
  onResolve,
}) => {
  if (isLoading && !digest) {
    return (
      <div className="py-12 text-center text-text-sub-light dark:text-text-sub-dark">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Evaluating proactive engine & assembling digest...</p>
      </div>
    );
  }

  const items = digest?.items || [];
  const morningBatch = digest?.morning_batch || [];
  const isQuietHours = digest?.is_quiet_hours || false;

  return (
    <div className="space-y-4">
      {/* Quiet Hours Banner */}
      {isQuietHours && (
        <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 shadow-xs flex items-start gap-3">
          <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-xl leading-none shrink-0 mt-0.5">bedtime</span>
          <div className="flex-1 text-xs text-gray-700 dark:text-gray-300">
            <h4 className="font-bold text-sm text-brand-black dark:text-white mb-0.5">Quiet Hours Active (22:00 – 07:00)</h4>
            <p className="text-text-sub-light dark:text-text-sub-dark leading-relaxed">
              Triggers occurring during quiet hours are automatically queued for the morning digest at 07:00 instead of sending immediate notifications.
            </p>
            {morningBatch.length > 0 && (
              <div className="mt-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded inline-block">
                {morningBatch.length} {morningBatch.length === 1 ? 'alert' : 'alerts'} held for morning dispatch
              </div>
            )}
          </div>
        </div>
      )}

      {/* Digest Header Stats */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-brand-black dark:text-white flex items-center gap-2">
            <span>Today's Triggered Digest</span>
            {items.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                {items.length} active
              </span>
            )}
          </h2>
          <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5">
            Deduplicated daily alerts requiring field attention or scheduling
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-card-dark text-gray-700 dark:text-gray-300 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs transition-all active:scale-[0.98] flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm leading-none">refresh</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Active Triggered Watches List */}
      {items.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-card-dark/40 p-6">
          <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 text-4xl mb-2 block mx-auto">verified_user</span>
          <h3 className="text-sm font-semibold text-brand-black dark:text-white">All Clear — No Active Triggers</h3>
          <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-1 max-w-sm mx-auto">
            All notice deadlines, weather thresholds, and scheduled reminders are currently satisfied or snoozed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((watch) => (
            <WatchCard
              key={watch.id}
              watch={watch}
              onSnooze={onSnooze}
              onAcknowledge={onAcknowledge}
              onResolve={onResolve}
            />
          ))}
        </div>
      )}

      {/* Morning Batch Section (if any during quiet hours) */}
      {morningBatch.length > 0 && (
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="mb-3 px-1">
            <h3 className="text-sm font-bold text-brand-black dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-base leading-none">wb_twilight</span>
              <span>Morning Digest Queue</span>
              <span className="text-xs text-text-sub-light dark:text-text-sub-dark font-normal">
                ({morningBatch.length} batched during quiet hours)
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-90">
            {morningBatch.map((watch) => (
              <WatchCard
                key={watch.id}
                watch={watch}
                onSnooze={onSnooze}
                onAcknowledge={onAcknowledge}
                onResolve={onResolve}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
