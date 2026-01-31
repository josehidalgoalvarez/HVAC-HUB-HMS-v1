import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';
import type { Property } from '../../../types';

interface ManagePropertiesModalProps {
    onClose: () => void;
    properties: Property[];
    startTutorial: () => void;
    onDuplicate: (property: Property) => void;
    onDelete: (id: string, name: string, applianceCount: number) => void;
}

export const ManagePropertiesModal: React.FC<ManagePropertiesModalProps> = ({
    onClose,
    properties,
    startTutorial,
    onDuplicate,
    onDelete
}) => {
    // We keep the "Property to delete" state locally to this component's lifecycle or parent?
    // The previous implementation had the "Are you sure" modal separate.
    // For Modularity, this modal can handle the list. We can have a nested confirmation or callback.
    // Let's keep it simple: We show the list. If user clicks delete, we call onDelete. 
    // The PARENT (ProfileView) will handle the confirmation modal since it needs to cover the screen.
    // OR we can handle it inside here. Let's try to handle it inside here but that might get complex with z-indexes.
    // Actually, looking at the original code, the confirmation modal was at the root of ProfileView.
    // Let's stick to that pattern: Pass onDelete which sets the propertyToDelete in parent.

    return (
        <Modal onClose={onClose} className="max-w-sm">
            <div className="flex justify-between items-start mb-4 shrink-0">
                <h3 className="text-lg font-bold text-brand-black dark:text-white">Manage Properties</h3>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-brand-black dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 max-h-[60vh]">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">school</span>
                        </div>
                        <div>
                            <p className="font-medium text-brand-black dark:text-white">App Tutorial</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Learn how to use features</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={startTutorial}>
                        Start Tutorial
                    </Button>
                </div>
                {(properties || []).map(p => (
                    <div
                        key={p.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                        <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-brand-black dark:text-white truncate text-sm">{p.name}</p>
                            <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate">{p.address}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onDuplicate(p)}
                                className="p-2 text-primary hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Duplicate Property"
                            >
                                <span className="material-symbols-outlined text-[20px]">content_copy</span>
                            </button>
                            <button
                                onClick={() => onDelete(p.id, p.name, p.applianceCount || 0)}
                                className="p-2 text-brand-red hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Delete Property"
                            >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
};
