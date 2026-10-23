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
  const [partName, setPartName] = useState('');
  const [hoursThreshold, setHoursThreshold] = useState('24');
  const [dueAt, setDueAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const config: Record<string, any> = {};

      if (watchType === 'part_wait') {
        if (targetId) config.ticket_id = parseInt(targetId, 10);
        if (partName) config.part_name = partName;
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
      <div className="w-full sm:max-w-lg bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl pb-safe">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl leading-none">notifications_active</span>
            <h2 className="text-lg font-bold text-brand-black dark:text-white">New Watch</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Watch Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-brand-black dark:text-gray-200 mb-1.5">
              Watch Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWatchType('notice_deadline')}
                className={`min-h-[44px] p-2.5 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${watchType === 'notice_deadline'
                    ? 'border-primary bg-primary/20 text-blue-600 dark:text-blue-200 font-bold'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">event_busy</span>
                <span>Notice Deadline</span>
              </button>
              <button
                type="button"
                onClick={() => setWatchType('part_wait')}
                className={`min-h-[44px] p-2.5 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${watchType === 'part_wait'
                    ? 'border-primary bg-primary/20 text-blue-600 dark:text-blue-200 font-bold'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">hourglass_top</span>
                <span>Part Wait</span>
              </button>
              <button
                type="button"
                onClick={() => setWatchType('reply_waiting')}
                className={`min-h-[44px] p-2.5 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${watchType === 'reply_waiting'
                    ? 'border-primary bg-primary/20 text-blue-600 dark:text-blue-200 font-bold'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">hourglass_empty</span>
                <span>Reply Waiting</span>
              </button>
              <button
                type="button"
                onClick={() => setWatchType('scheduled_task')}
                className={`min-h-[44px] p-2.5 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition-all ${watchType === 'scheduled_task'
                    ? 'border-primary bg-primary/20 text-blue-600 dark:text-blue-200 font-bold'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">assignment_late</span>
                <span>Scheduled Task</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-brand-black dark:text-gray-200 mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 174 Valve Inspection"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-brand-black dark:text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Conditional Target Inputs */}
          {(watchType === 'notice_deadline' || watchType === 'reply_waiting') && (
            <div>
              <label className="block text-xs font-semibold text-brand-black dark:text-gray-200 mb-1">
                Notice ID
              </label>
              <input
                type="number"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-brand-black dark:text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {watchType === 'part_wait' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-brand-black dark:text-gray-200 mb-1">
                  Ticket ID
                </label>
                <input
                  type="number"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-brand-black dark:text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-black dark:text-gray-200 mb-1">
                  Part Name (Optional)
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g. 3/4in Zone Valve"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-brand-black dark:text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </>
          )}

          {watchType === 'reply_waiting' && (
            <div>
              <label className="block text-xs font-semibold text-brand-black dark:text-gray-200 mb-1">
                Hours Unreplied
              </label>
              <input
                type="number"
                value={hoursThreshold}
                onChange={(e) => setHoursThreshold(e.target.value)}
                placeholder="24"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-brand-black dark:text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {watchType === 'scheduled_task' && (
            <div>
              <label className="block text-xs font-semibold text-brand-black dark:text-gray-200 mb-1">
                Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-brand-black dark:text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-brand-black dark:text-gray-200 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or special instructions..."
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-brand-black dark:text-white text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium text-text-sub-light dark:text-text-sub-dark hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-6 py-2 rounded-xl text-sm font-bold bg-primary hover:bg-blue-600 text-white shadow-sm active:scale-[0.98] transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Creating...' : 'Create Watch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
