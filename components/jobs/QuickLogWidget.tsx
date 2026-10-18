import React, { useState, useEffect } from 'react';
import { Job, RunSheetBlock, Ticket } from '../../types/domain';
import apiClient from '../../src/api/client';
import { outbox } from '../../src/offline/outbox';
import { JobCloseoutModal } from './JobCloseoutModal';

interface QuickLogWidgetProps {
  block?: RunSheetBlock | null;
  ticket?: Ticket | null;
  onBack?: () => void;
  onJobUpdated?: (job: Job) => void;
}

const COMMON_OBSERVATIONS = [
  'Arrived on site, access verified',
  'Equipment operating within spec',
  'Dirty air filter replaced',
  'Condensate drain flushed clean',
  'Capacitor within ±5% tolerance',
  'Thermostat communication verified',
];

const COMMON_PARTS = [
  'Filter 16x25x1',
  'Dual Run Cap 45/5',
  'Contactor 30A',
  'Drain Cleaner (1 qt)',
  'Float Switch',
];

export const QuickLogWidget: React.FC<QuickLogWidgetProps> = ({
  block,
  ticket,
  onBack,
  onJobUpdated,
}) => {
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [noteInput, setNoteInput] = useState<string>('');
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Pre-filled context derived from block or ticket
  const siteName = block?.building_name || (ticket as any)?.building_name || 'Active Site';
  const unitNumber = block?.unit_number || (ticket as any)?.unit_number || 'Unit';
  const jobTitle = block?.title || ticket?.title || 'Field Service Session';
  const woNumber = block?.wo_number || ticket?.wo_number || 'Unnumbered';
  const ticketId = block?.ticket_id || ticket?.id || null;
  const blockId = block?.id || null;
  const buildingId = block?.building_id || ticket?.building_id || 1;
  const unitId = block?.unit_id || ticket?.unit_id || null;

  useEffect(() => {
    initJobSession();
  }, [block?.id, ticket?.id]);

  const initJobSession = async () => {
    setLoading(true);
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Check if an in-progress job session already exists for this ticket
    if (isOnline && ticketId) {
      try {
        const existingJobs = await apiClient.getJobs({ ticket_id: ticketId, status: 'in_progress' });
        if (existingJobs.length > 0) {
          setActiveJob(existingJobs[0]);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Could not check existing jobs online:', e);
      }
    }

    // Otherwise create new job session
    const jobPayload = {
      ticket_id: ticketId ? Number(ticketId) : null,
      run_sheet_block_id: blockId ? Number(blockId) : null,
      building_id: buildingId ? Number(buildingId) : 1,
      unit_id: unitId ? Number(unitId) : null,
      title: jobTitle,
      status: 'in_progress' as const,
      start_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      estimated_minutes: block?.estimated_minutes || 45,
    };

    if (isOnline) {
      try {
        const newJob = await apiClient.createJob(jobPayload);
        setActiveJob(newJob);
      } catch {
        // Fallback to offline creation
        createOfflineJobSession(jobPayload);
      }
    } else {
      createOfflineJobSession(jobPayload);
    }
    setLoading(false);
  };

  const createOfflineJobSession = async (payload: any) => {
    const mockId = Date.now();
    const offlineJob: Job = {
      id: mockId,
      ...payload,
      building_name: siteName,
      unit_number: unitNumber,
      wo_number: woNumber,
      ticket_title: jobTitle,
      parts_used: [],
      notes_list: [],
      photos: [],
    };
    setActiveJob(offlineJob);
    await outbox.enqueue({
      type: 'create_job',
      endpoint: '/api/jobs',
      method: 'POST',
      job_id: mockId,
      payload,
    });
    flashMessage('Started offline job session (queued in outbox)', 'info');
  };

  const flashMessage = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleAddNote = async (textToAdd?: string) => {
    const text = (textToAdd || noteInput).trim();
    if (!text || !activeJob) return;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      await outbox.enqueue({
        type: 'add_note',
        endpoint: `/api/jobs/${activeJob.id}/notes`,
        method: 'POST',
        job_id: activeJob.id,
        payload: { job_id: activeJob.id, note_text: text },
      });
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              notes_list: [...(prev.notes_list || []), { id: Date.now(), note_text: text, created_at: new Date().toISOString() }],
            }
          : prev
      );
      setNoteInput('');
      flashMessage('Note queued in offline outbox', 'info');
      return;
    }

    try {
      const added = await apiClient.addJobNote(activeJob.id, text);
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              notes_list: [...(prev.notes_list || []), added],
            }
          : prev
      );
      setNoteInput('');
      flashMessage('Field note saved', 'success');
    } catch (e: any) {
      flashMessage(e.message || 'Error saving note', 'error');
    }
  };

  const handleAddPartChip = async (partName: string) => {
    if (!activeJob) return;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      await outbox.enqueue({
        type: 'add_part_used',
        endpoint: `/api/jobs/${activeJob.id}/parts-used`,
        method: 'POST',
        job_id: activeJob.id,
        payload: { job_id: activeJob.id, part_name: partName, quantity: 1, unit: 'pcs' },
      });
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              parts_used: [...(prev.parts_used || []), { id: Date.now(), part_name: partName, quantity: 1, unit: 'pcs' }],
            }
          : prev
      );
      flashMessage(`Part ${partName} queued in outbox`, 'info');
      return;
    }

    try {
      const added = await apiClient.addJobPartUsed(activeJob.id, { part_name: partName, quantity: 1, unit: 'pcs' });
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              parts_used: [...(prev.parts_used || []), added],
            }
          : prev
      );
      flashMessage(`Part recorded: ${partName}`, 'success');
    } catch (e: any) {
      flashMessage(e.message || 'Error recording part', 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJob) return;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      // Offline: simulate photo path and queue
      const mockPhotoPath = `/uploads/offline_${Date.now()}_${file.name}`;
      await outbox.enqueue({
        type: 'add_photo',
        endpoint: `/api/jobs/${activeJob.id}/photos`,
        method: 'POST',
        job_id: activeJob.id,
        payload: { job_id: activeJob.id, file_path: mockPhotoPath, caption: file.name },
      });
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              photos: [...(prev.photos || []), { id: Date.now(), file_path: mockPhotoPath, caption: file.name }],
            }
          : prev
      );
      flashMessage('Photo queued in offline outbox', 'info');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('caption', 'Quick log photo: ' + file.name);

      const added = await apiClient.addJobPhoto(activeJob.id, formData);
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              photos: [...(prev.photos || []), added],
            }
          : prev
      );
      flashMessage('Photo uploaded successfully', 'success');
    } catch (err: any) {
      flashMessage(err.message || 'Photo upload failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 max-w-xl mx-auto">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
        <p className="mt-2 text-sm font-bold">Initializing field session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-safe animate-fadeIn text-brand-black dark:text-white">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">bolt</span>
              Field Quick Log
            </h1>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
              Gloves-on logging • Offline capable
            </p>
          </div>
        </div>

        {activeJob && (
          <button
            onClick={() => setShowCloseModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Close Out
          </button>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-slideDown ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : statusMessage.type === 'info'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {statusMessage.type === 'success' ? 'check' : statusMessage.type === 'info' ? 'info' : 'warning'}
          </span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Pre-filled Context Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-primary uppercase tracking-wider font-mono">
            {woNumber}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[11px]">
            In Progress
          </span>
        </div>
        <h2 className="text-base font-extrabold">{jobTitle}</h2>
        <div className="flex items-center gap-3 text-xs text-text-sub-light dark:text-text-sub-dark pt-1">
          <span className="flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-sm text-gray-400">apartment</span>
            {siteName}
          </span>
          {unitNumber && (
            <span className="flex items-center gap-1 font-mono font-bold text-brand-black dark:text-white">
              <span className="material-symbols-outlined text-sm text-gray-400">door_front</span>
              Unit {unitNumber}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto font-mono text-gray-400">
            <span className="material-symbols-outlined text-sm">timer</span>
            Est {activeJob?.estimated_minutes || 45}m
          </span>
        </div>
      </div>

      {/* 1. Quick Notes Section */}
      <div className="p-4 rounded-3xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">edit_note</span>
            Quick Note / Observation
          </h3>
          <span className="text-[11px] font-mono text-gray-400">
            {activeJob?.notes_list?.length || 0} logged
          </span>
        </div>

        {/* Common Preset Chips (<60s flow) */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_OBSERVATIONS.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAddNote(preset)}
              className="px-3 py-2 rounded-xl text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-brand-black dark:text-white font-medium active:scale-95 transition-all text-left"
            >
              + {preset}
            </button>
          ))}
        </div>

        {/* Custom Note Input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="Type custom technician note..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNote();
              }
            }}
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs"
          />
          <button
            type="button"
            onClick={() => handleAddNote()}
            disabled={!noteInput.trim()}
            className="h-11 px-4 bg-primary text-white text-xs font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center"
          >
            Add
          </button>
        </div>
      </div>

      {/* 2. Quick Parts Consumed Section */}
      <div className="p-4 rounded-3xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-500 text-[18px]">build</span>
            Parts Used
          </h3>
          <span className="text-[11px] font-mono text-gray-400">
            {activeJob?.parts_used?.length || 0} items
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {COMMON_PARTS.map((part) => (
            <button
              key={part}
              type="button"
              onClick={() => handleAddPartChip(part)}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              {part}
            </button>
          ))}
        </div>

        {activeJob?.parts_used && activeJob.parts_used.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
            {activeJob.parts_used.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-xs"
              >
                <span className="font-medium text-brand-black dark:text-white">
                  {p.quantity} {p.unit || 'pcs'} • {p.part_name}
                </span>
                <span className="material-symbols-outlined text-emerald-500 text-[16px]">check</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Photo Attachment Section */}
      <div className="p-4 rounded-3xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark flex items-center gap-1.5">
            <span className="material-symbols-outlined text-purple-500 text-[18px]">photo_camera</span>
            Photo Documentation
          </h3>
          <span className="text-[11px] font-mono text-gray-400">
            {activeJob?.photos?.length || 0} attached
          </span>
        </div>

        <label className="w-full h-12 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all">
          <span className="material-symbols-outlined text-lg">add_a_photo</span>
          <span>Take / Attach Field Photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </label>

        {activeJob?.photos && activeJob.photos.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {activeJob.photos.map((ph, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-[11px] font-mono text-gray-600 dark:text-gray-300 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs text-purple-500">image</span>
                <span>Photo #{idx + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Big Action Close-Out Trigger Button */}
      {activeJob && (
        <button
          type="button"
          onClick={() => setShowCloseModal(true)}
          className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-4"
        >
          <span className="material-symbols-outlined text-2xl">task_alt</span>
          <span>Complete Job & Close Ticket</span>
        </button>
      )}

      {/* Close-Out Modal */}
      {showCloseModal && activeJob && (
        <JobCloseoutModal
          job={activeJob}
          onClose={() => setShowCloseModal(false)}
          onJobClosed={(updated) => {
            setActiveJob(updated);
            if (onJobUpdated) onJobUpdated(updated);
            flashMessage('Job completed and linked ticket moved to done!', 'success');
            setTimeout(() => {
              if (onBack) onBack();
            }, 1000);
          }}
        />
      )}
    </div>
  );
};

export default QuickLogWidget;
