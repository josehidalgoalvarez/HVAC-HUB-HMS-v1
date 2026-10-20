import React, { useState } from 'react';
import type { WatchRecord } from '../../types/domain';

interface SnoozeModalProps {
  watch: WatchRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSnooze: (watchId: number, duration: '1h' | '4h' | 'tomorrow' | string) => Promise<void>;
}

export const SnoozeModal: React.FC<SnoozeModalProps> = ({
  watch,
  isOpen,
  onClose,
  onConfirmSnooze,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<'1h' | '4h' | 'tomorrow'>('1h');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !watch) return null;

  const handleSnooze = async (duration: '1h' | '4h' | 'tomorrow') => {
    setIsSubmitting(true);
    try {
      await onConfirmSnooze(watch.id, duration);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl leading-none">snooze</span>
            <h2 className="text-lg font-bold text-brand-black dark:text-white">Snooze Watch</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Watch summary */}
        <div className="mt-4 p-3 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
          <p className="text-sm font-semibold text-brand-black dark:text-white">{watch.title}</p>
          {watch.latest_trigger_reason && (
            <p className="text-xs text-rose-600 dark:text-rose-300 mt-1 line-clamp-2">
              {watch.latest_trigger_reason}
            </p>
          )}
        </div>

        <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-4 mb-3 font-medium">
          Select silence duration:
        </p>

        {/* Quick Presets (Gloves-on, min 44px touch target) */}
        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSnooze('1h')}
            className="min-h-[48px] px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50 active:scale-[0.98] transition-all flex items-center justify-between text-left group"
          >
            <div>
              <div className="text-sm font-semibold text-brand-black dark:text-white group-hover:text-primary transition-colors">1 Hour</div>
              <div className="text-[11px] text-text-sub-light dark:text-text-sub-dark">Silences alerts for next 60 minutes</div>
            </div>
            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 group-hover:text-primary text-lg leading-none transition-colors">timer</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSnooze('4h')}
            className="min-h-[48px] px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50 active:scale-[0.98] transition-all flex items-center justify-between text-left group"
          >
            <div>
              <div className="text-sm font-semibold text-brand-black dark:text-white group-hover:text-primary transition-colors">4 Hours</div>
              <div className="text-[11px] text-text-sub-light dark:text-text-sub-dark">Postpone until afternoon or evening</div>
            </div>
            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 group-hover:text-primary text-lg leading-none transition-colors">hourglass_bottom</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSnooze('tomorrow')}
            className="min-h-[48px] px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50 active:scale-[0.98] transition-all flex items-center justify-between text-left group"
          >
            <div>
              <div className="text-sm font-semibold text-brand-black dark:text-white group-hover:text-primary transition-colors">Until Tomorrow Morning</div>
              <div className="text-[11px] text-text-sub-light dark:text-text-sub-dark">Silenced until 08:00 AM next day</div>
            </div>
            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 group-hover:text-primary text-lg leading-none transition-colors">wb_sunny</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium text-text-sub-light dark:text-text-sub-dark hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
