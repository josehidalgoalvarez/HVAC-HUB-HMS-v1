import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { apiClient } from '../../src/api/client';
import type { Notice } from '../../types/domain';

interface DraftNoticeModalProps {
  onClose: () => void;
  onSuccess: (notice: Notice) => void;
  ticketId?: string | number | null;
  buildingId?: string | number;
  unitId?: string | number | null;
  defaultTitle?: string;
}

export const DraftNoticeModal: React.FC<DraftNoticeModalProps> = ({
  onClose,
  onSuccess,
  ticketId,
  buildingId = 1,
  unitId,
  defaultTitle = '24-Hour Notice of Entry for HVAC Maintenance',
}) => {
  // Default entry window: tomorrow or upcoming Friday at 11:00
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // 2 days out
    return d.toISOString().split('T')[0];
  };

  const [entryDate, setEntryDate] = useState(getDefaultDate());
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('13:00');
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(
    'Notice is hereby given that management and HVAC technicians will enter the premises during the specified window to perform necessary heating/cooling repairs and inspection.'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute 24-hour serve-by deadline preview dynamically
  const calculatedDeadlinePreview = useMemo(() => {
    if (!entryDate || !startTime) return null;
    const startIso = `${entryDate}T${startTime}:00`;
    const dt = new Date(startIso);
    if (isNaN(dt.getTime())) return null;

    // Subtract 24 hours
    dt.setTime(dt.getTime() - 24 * 60 * 60 * 1000);
    return dt.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [entryDate, startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDate || !startTime) {
      setError('Entry date and start time are required.');
      return;
    }

    setLoading(true);
    setError(null);

    const entryStartStr = `${entryDate} ${startTime}:00`;
    const entryEndStr = endTime ? `${entryDate} ${endTime}:00` : `${entryDate} ${startTime}:00`;

    try {
      const created = await apiClient.createNotice({
        ticket_id: ticketId ? Number(ticketId) : null,
        building_id: Number(buildingId) || 1,
        unit_id: unitId ? Number(unitId) : null,
        title: title.trim(),
        content: content.trim(),
        entry_start: entryStartStr,
        entry_end: entryEndStr,
        notice_type: 'entry',
      });
      onSuccess(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to draft notice';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
          <div>
            <h2 className="text-base font-bold text-brand-black dark:text-white">Draft Notice of Entry</h2>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
              24-Hour Legal Gate for Tenant Entry
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-brand-red flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark mb-1">
            Notice Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white font-medium"
            required
          />
        </div>

        {/* Entry Window Picker */}
        <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-primary block">
            Entry Window
          </span>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Entry Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white font-mono"
              />
            </div>
          </div>

          {/* 24-Hour Rule Live Calculation Banner */}
          {calculatedDeadlinePreview && (
            <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 p-2.5 rounded-xl text-xs text-primary flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-base">gavel</span>
                <span>Serve-By Deadline (24h Rule):</span>
              </div>
              <span className="font-mono font-extrabold">{calculatedDeadlinePreview}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark mb-1">
            Notice Details & Scope
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white"
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 py-2.5 text-xs shadow-md"
            disabled={loading}
          >
            {loading ? 'Drafting...' : 'Save & Calculate Deadline'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
