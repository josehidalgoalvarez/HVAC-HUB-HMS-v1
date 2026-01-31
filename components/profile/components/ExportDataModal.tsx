import React from 'react';
import { Modal } from '../../ui/Modal';
import { Property } from '../../../types';

interface ExportDataModalProps {
    onClose: () => void;
    properties: Property[];
    onExport: (propertyId?: string) => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({ onClose, properties, onExport }) => {
    return (
        <Modal onClose={onClose} className="max-w-sm">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-brand-black dark:text-white">Export Data</h3>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-brand-black dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-4">
                Choose a specific property to export, or back up your entire account. Includes activity logs.
            </p>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <button
                    onClick={() => onExport()}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-bold text-left"
                >
                    <span className="material-symbols-outlined">dataset</span>
                    Export All Data (Backup)
                </button>

                <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>

                <p className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">Individual Properties</p>
                {properties.map(p => (
                    <button
                        key={p.id}
                        onClick={() => onExport(p.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                        <span className="material-symbols-outlined text-gray-400">home</span>
                        <div className="min-w-0">
                            <p className="font-bold text-brand-black dark:text-white truncate">{p.name}</p>
                            <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate">{p.address}</p>
                        </div>
                    </button>
                ))}
            </div>
        </Modal>
    );
};
