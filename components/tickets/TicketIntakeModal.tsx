import React, { useState, useRef, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { apiClient } from '../../src/api/client';
import { compressImageToBlob } from '../../utils/imageUtils';
import type { Ticket, TicketPriority } from '../../types/domain';

interface TicketIntakeModalProps {
  onClose: () => void;
  onSuccess: (ticket: Ticket) => void;
  defaultBuildingId?: string;
  defaultUnitId?: string;
}

export const TicketIntakeModal: React.FC<TicketIntakeModalProps> = ({
  onClose,
  onSuccess,
  defaultBuildingId = '1',
  defaultUnitId = '',
}) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [verbatimText, setVerbatimText] = useState('');
  const [verifiedScope, setVerifiedScope] = useState('');
  const [woNumber, setWoNumber] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [buildingId, setBuildingId] = useState(defaultBuildingId);
  const [unitId, setUnitId] = useState(defaultUnitId);
  const [applianceId, setApplianceId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { units, getUnitAppliances } = useData();

  const matchedUnit = useMemo(() => {
    if (!unitId) return null;
    return units.find(u => String(u.id) === String(unitId)) || null;
  }, [units, unitId]);

  const unitAppliances = useMemo(() => {
    if (!matchedUnit) return [];
    return getUnitAppliances(matchedUnit);
  }, [matchedUnit, getUnitAppliances]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verbatimText.trim() && !verifiedScope.trim() && !photoFile) {
      setError('Please provide a screenshot photo, verbatim text, or verified scope.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (photoFile) {
        // Compress photo using client image pipeline (cap 1600px, 0.7 quality)
        const compressedBlob = await compressImageToBlob(photoFile, 1600, 0.7);
        formData.append('photo', compressedBlob, photoFile.name || 'screenshot.jpg');
      }

      if (verbatimText.trim()) {
        formData.append('verbatim_text', verbatimText.trim());
      }
      if (verifiedScope.trim()) {
        formData.append('verified_scope', verifiedScope.trim());
      }
      if (woNumber.trim()) {
        formData.append('wo_number', woNumber.trim());
      }
      formData.append('priority', priority);
      formData.append('building_id', buildingId || '1');
      if (unitId.trim()) {
        formData.append('unit_id', unitId.trim());
      }
      if (applianceId) {
        formData.append('appliance_id', String(applianceId));
      }

      const created = await apiClient.intakeTicket(formData);
      onSuccess(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Intake failed. Please check connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Quick Intake" onClose={onClose} className="max-w-xl">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary text-2xl">bolt</span>
          <div>
            <h2 className="text-lg font-bold text-brand-black dark:text-white">Quick Intake</h2>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">Snap photo or enter work order</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
         aria-label="Close">
          <span aria-hidden="true" className="material-symbols-outlined">close</span>
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-brand-red flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Photo Upload Area */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark mb-1">
            Photo (Screenshot or work order)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary rounded-2xl p-4 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-900/40"
          >
            {photoPreview ? (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="Screenshot preview"
                  className="max-h-36 rounded-xl object-contain mx-auto shadow-sm"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-brand-red text-white w-6 h-6 rounded-full flex items-center justify-center shadow"
                 aria-label="Close">
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-3 text-text-sub-light dark:text-text-sub-dark">
                <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">add_a_photo</span>
                <span className="text-xs font-medium">Tap to snap camera or select screenshot</span>
                <span className="text-[10px] text-gray-400">JPEG/PNG auto-compressed</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Verbatim Text Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark mb-1">
            Verbatim Text (Raw text from screenshot)
          </label>
          <textarea
            value={verbatimText}
            onChange={(e) => setVerbatimText(e.target.value)}
            rows={2}
            placeholder="e.g. 'AC unit rattling loudly in master bedroom, blowing room temp air'"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Verified Scope Field (Text!) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
            <span aria-hidden="true" className="material-symbols-outlined text-sm">verified</span>
            Verified Scope (Tech-confirmed job description)
          </label>
          <textarea
            value={verifiedScope}
            onChange={(e) => setVerifiedScope(e.target.value)}
            rows={2}
            placeholder="e.g. 'Inspect condenser fan motor & run capacitor. Check refrigerant subcooling.'"
            className="w-full px-3 py-2 text-sm rounded-xl border border-primary/40 bg-primary/5 dark:bg-primary/10 text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* WO Number & Priority Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark mb-1">
              WO Number <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={woNumber}
              onChange={(e) => setWoNumber(e.target.value)}
              placeholder="e.g. WO-19970 (or leave blank)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card-dark text-brand-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="urgent">Urgent (Safety / Hazard)</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Appliance Picker (if unit selected and has appliances) */}
        {unitAppliances.length > 0 && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-text-sub-light dark:text-text-sub-dark flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-primary">kitchen</span>
                Which appliance was this work on? (Optional)
              </label>
              {applianceId && (
                <button
                  type="button"
                  onClick={() => setApplianceId(null)}
                  className="text-[11px] text-gray-400 hover:text-brand-red font-medium"
                >
                  Clear link
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {unitAppliances.map((app) => {
                const isSelected = String(applianceId) === String(app.id);
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setApplianceId(isSelected ? null : app.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 text-brand-black dark:text-gray-200 border-gray-200 dark:border-gray-750'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span>{app.name || app.type}</span>
                    {app.modelNumber && (
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                        ({app.modelNumber})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 py-3 text-sm"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 py-3 text-sm shadow-md"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Create Ticket (<2m)'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
