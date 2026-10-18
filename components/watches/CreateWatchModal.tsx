import React, { useState } from 'react';
import type { WatchRecord, WatchType } from '../../types/domain';

interface CreateWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWatch: (data: Partial<WatchRecord>) => Promise<void>;
}

export const CreateWatchModal: React.FC<CreateWatchModalProps> = ({
  isOpen,
  onClose,
  onCreateWatch,
}) => {
  const [watchType, setWatchType] = useState<WatchType>('notice_deadline');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetId, setTargetId] = useState('');
  const [hoursThreshold, setHoursThreshold] = useState('24');
  const [dueAt, setDueAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const config: Record<string, any> = {};

      if (watchType === 'weather_freeze') {
        config.latitude = 44.2312;
        config.longitude = -76.4860;
      } else if (watchType === 'reply_waiting') {
        config.hours_threshold = parseInt(hoursThreshold, 10) || 24;
      } else if (watchType === 'scheduled_task') {
        config.due_at = dueAt || new Date(Date.now() + 86400000).toISOString().slice(0, 19).replace('T', ' ');
      }

      await onCreateWatch({
        watch_type: watchType,
        title: title || undefined,
        description: description || undefined,
        target_id: targetId ? parseInt(targetId, 10) : undefined,
        config,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl pb-safe">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-xl leading-none">notifications_active</span>
            <h2 className="text-lg font-bold text-white">Create Proactive Watch</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Watch Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Watch Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWatchType('notice_deadline')}
                className={`min-h-[44px] p-2.5 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${
                  watchType === 'notice_deadline'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-200 font-bold'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">event_busy</span>
                <span>Notice Deadline</span>
              </button>
              <button
                type="button"
                onClick={() => setWatchType('weather_freeze')}
                className={`min-h-[44px] p-2.5 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${
                  watchType === 'weather_freeze'
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200 font-bold'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">ac_unit</span>
                <span>Weather Freeze</span>
              </button>
              <button
                type="button"
                onClick={() => setWatchType('reply_waiting')}
                className={`min-h-[44px] p-2.5 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${
                  watchType === 'reply_waiting'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-200 font-bold'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">hourglass_empty</span>
                <span>Reply Waiting</span>
              </button>
              <button
                type="button"
                onClick={() => setWatchType('scheduled_task')}
                className={`min-h-[44px] p-2.5 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${
                  watchType === 'scheduled_task'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">assignment_late</span>
                <span>Scheduled Task</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Title (Optional — Auto-generated if blank)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 174 Valve Inspection Watch"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Conditional Target Inputs */}
          {(watchType === 'notice_deadline' || watchType === 'reply_waiting') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notice ID
              </label>
              <input
                type="number"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {watchType === 'reply_waiting' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hours Threshold (Fire if unreplied after)
              </label>
              <input
                type="number"
                value={hoursThreshold}
                onChange={(e) => setHoursThreshold(e.target.value)}
                placeholder="24"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {watchType === 'weather_freeze' && (
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200">
              <span className="font-semibold block mb-0.5">Automated Open-Meteo Integration</span>
              Monitors hourly low temperatures across 48h for Kingston (44.23°N, -76.48°W). Triggers if low &le; 0°C.
            </div>
          )}

          {watchType === 'scheduled_task' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or special instructions..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-6 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Creating...' : 'Create Watch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
