import React, { useState } from 'react';
import { apiClient } from '../../../src/api/client';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';

interface TicketIdentifyModalProps {
  ticketId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export const TicketIdentifyModal: React.FC<TicketIdentifyModalProps> = ({
  ticketId,
  open,
  onClose,
  onSaved,
}) => {
  const [appliancePhotoUrl, setAppliancePhotoUrl] = useState('');
  const [ratingPlateUrl, setRatingPlateUrl] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [identifyNotes, setIdentifyNotes] = useState('');
  const [identifySaving, setIdentifySaving] = useState(false);

  const handleIdentifyAppliance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIdentifySaving(true);
      await apiClient.appendTicketTimeline(ticketId, {
        event_type: 'appliance_identified',
        actor: 'Jose (Tech)',
        note: identifyNotes.trim() || 'Appliance identified and documented with field data',
        metadata: {
          photo_url: appliancePhotoUrl.trim() || undefined,
          rating_plate_url: ratingPlateUrl.trim() || undefined,
          manual_url: manualUrl.trim() || undefined,
        },
      });
      onClose();
      setAppliancePhotoUrl('');
      setRatingPlateUrl('');
      setManualUrl('');
      setIdentifyNotes('');
      await onSaved();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to identify appliance');
    } finally {
      setIdentifySaving(false);
    }
  };

  if (!open) return null;

  return (
        <Modal title="Appliance Identified" onClose={() => onClose()} className="max-w-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-indigo-600 text-xl">photo_camera</span>
              <h2 className="text-base font-bold text-brand-black dark:text-white">Appliance Identified</h2>
            </div>
            <button
              onClick={() => onClose()}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"
             aria-label="Close">
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleIdentifyAppliance} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Appliance Photo URL
              </label>
              <input
                type="text"
                value={appliancePhotoUrl}
                onChange={(e) => setAppliancePhotoUrl(e.target.value)}
                placeholder="https://... or /uploads/photo.jpg"
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Rating-Plate Photo URL
              </label>
              <input
                type="text"
                value={ratingPlateUrl}
                onChange={(e) => setRatingPlateUrl(e.target.value)}
                placeholder="https://... or /uploads/rating-plate.jpg"
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Manufacturer Manual Link
              </label>
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://manuals.brand.com/model123.pdf"
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                Field Identification Notes
              </label>
              <textarea
                rows={2}
                value={identifyNotes}
                onChange={(e) => setIdentifyNotes(e.target.value)}
                placeholder="Model # confirmed, serial plate verified on left cabinet interior..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onClose()}
                className="flex-1 min-h-[44px] py-2 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 min-h-[44px] py-2 text-xs font-bold shadow-sm"
                disabled={identifySaving}
              >
                {identifySaving ? 'Saving...' : 'Record to Timeline'}
              </Button>
            </div>
          </form>
        </Modal>

  );
};
