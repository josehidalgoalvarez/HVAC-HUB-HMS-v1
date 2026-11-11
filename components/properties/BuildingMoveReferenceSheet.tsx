import React from 'react';
import { Modal } from '../ui/Modal';
import { BuildingMoveReference } from '../../residential_constants';

interface BuildingMoveReferenceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  entries: BuildingMoveReference[];
  onNavigateComplex?: (complexId: string) => void;
}

export const BuildingMoveReferenceSheet: React.FC<BuildingMoveReferenceSheetProps> = ({
  isOpen,
  onClose,
  entries,
  onNavigateComplex,
}) => {
  if (!isOpen || entries.length === 0) return null;

  return (
    <Modal title="Location Reference" onClose={onClose} className="max-w-md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">info</span>
            <h2 className="text-sm font-bold text-brand-black dark:text-white uppercase tracking-wider">
              Location Reference
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Entries list */}
        <div className="space-y-3.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 rounded-2xl bg-gray-50 dark:bg-card-dark border border-gray-200/80 dark:border-gray-800 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-brand-black dark:text-white">
                  {entry.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {entry.date}
                </span>
              </div>

              <div className="text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark flex items-center gap-1.5 flex-wrap">
                <span>{entry.movedFrom}</span>
                <span aria-hidden="true" className="material-symbols-outlined text-xs">arrow_forward</span>
                <span className="text-brand-black dark:text-white">{entry.movedTo}</span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                <strong>Reason:</strong> {entry.reason}
              </p>

              {entry.jumpTarget && onNavigateComplex && (
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateComplex(entry.jumpTarget!.complexId);
                    }}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                   aria-label="Open details">
                    <span>{entry.jumpTarget.label}</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-sm">open_in_new</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default BuildingMoveReferenceSheet;
