
import React, { useState } from 'react';
import { Appliance, ViewType } from '../../../../types';
import { getTechSpecs } from '../../../../utils/applianceUtils';
import { Modal } from '../../../../components/ui/Modal';
import { TUTORIAL_STEPS } from '../../../../tutorial';
import { InventoryContext, ActionContext, DataProvider } from '../../../../context/DataContext';
import Button from '../../../../components/ui/Button';

interface ApplianceSpecsSectionProps {
    appliance: Appliance;
    onEdit?: () => void;
    isEditMode: boolean;
    onViewProperty?: () => void;
}

/**
 * ApplianceSpecsSection Component
 */
export const ApplianceSpecsSection: React.FC<ApplianceSpecsSectionProps> = ({ appliance, onEdit, isEditMode, onViewProperty }) => {
    const [showPlateModal, setShowPlateModal] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [unavailableItem, setUnavailableItem] = useState<string | null>(null);
    const techSpecs = getTechSpecs(appliance.specs);

    // Tutorial Integration
    const { isTutorialActive, tutorialStep } = React.useContext(InventoryContext)!;

    // We use the onViewProperty prop for navigation now.

    // Let's use the Tutorial logic first.
    React.useEffect(() => {
        if (isTutorialActive) {
            const currentAction = TUTORIAL_STEPS[tutorialStep]?.action;
            if (currentAction === 'OPEN_NOTES') {
                setShowNotesModal(true);
            }
        }
    }, [isTutorialActive, tutorialStep]);

    // Helper to render doc button state
    const renderDocButton = (
        icon: string,
        label: string,
        subLabel: string,
        url?: string,
        viewAction?: () => void,
        id?: string
    ) => {
        const isPresent = !!url;

        let handleClick: (() => void) | undefined;
        let buttonLabel = label;
        let buttonSub = subLabel;
        let isAddMode = false;

        if (isPresent) {
            // Content Exists -> View it
            handleClick = viewAction || (() => window.open(url, '_blank'));
        } else {
            // Content Missing
            if (isEditMode && onEdit) {
                // Super Power -> Add it
                handleClick = onEdit;
                buttonLabel = `Add ${label}`;
                buttonSub = 'Tap to add';
                isAddMode = true;
            } else {
                // Read Only -> Advise unavailable via Modal
                handleClick = () => setUnavailableItem(label);
                buttonSub = 'Not Available';
            }
        }

        return (
            <button
                id={id}
                onClick={handleClick}
                className={`flex items-center gap-3 p-4 rounded-xl shadow-sm border transition-colors group text-left w-full ${isPresent || isAddMode
                    ? (isAddMode
                        ? 'bg-primary/5 border-primary/30 border-dashed hover:bg-primary/10 cursor-pointer'
                        : 'bg-card-light dark:bg-card-dark border-gray-100 dark:border-gray-800 hover:border-primary/50 cursor-pointer')
                    : 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-80 cursor-default'
                    }`}
            >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isPresent || isAddMode
                    ? (isAddMode
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 dark:bg-gray-700 text-brand-black dark:text-white group-hover:bg-primary group-hover:text-white')
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div>
                    <p className={`font-bold text-sm ${isPresent || isAddMode ? 'text-brand-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{buttonLabel}</p>
                    <p className="text-[10px] text-text-sub-light dark:text-text-sub-dark">{buttonSub}</p>
                </div>
            </button>
        );
    };

    return (
        <div className="space-y-6">
            {/* Key Metrics Cards - Always visible */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                        <span className="material-symbols-outlined text-[20px]">
                            {appliance.specs?.capacity ? 'water_drop' : 'local_fire_department'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                            {appliance.specs?.capacity ? 'Capacity' : 'Output'}
                        </span>
                    </div>
                    <p className={`text-2xl font-bold ${appliance.specs?.capacity || appliance.specs?.btuOutput ? 'text-brand-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                        {appliance.specs?.capacity || appliance.specs?.btuOutput || '-'}
                    </p>
                </div>

                <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                        <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">Install</span>
                    </div>
                    <p className={`text-xl font-bold truncate ${appliance.specs?.installDate ? 'text-brand-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                        {appliance.specs?.installDate || '-'}
                    </p>
                </div>
            </div>

            {/* Identification List */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-text-sub-light dark:text-text-sub-dark">Model Number</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${appliance.modelNumber ? 'text-brand-black dark:text-white' : 'text-gray-400'}`}>
                            {appliance.modelNumber || '-'}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-text-sub-light dark:text-text-sub-dark">Serial Number</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${appliance.serialNumber ? 'text-brand-black dark:text-white' : 'text-gray-400'}`}>
                            {appliance.serialNumber || '-'}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-text-sub-light dark:text-text-sub-dark">Location</span>
                    <span className={`text-sm font-medium text-right ${appliance.specs?.location ? 'text-brand-black dark:text-white' : 'text-gray-400'}`}>
                        {appliance.specs?.location || '-'}
                    </span>
                </div>
            </div>

            {/* Dynamic Technical Specs List - Always visible */}
            <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark mb-3 ml-1">Technical Specifications</h3>
                <div className="bg-card-light dark:bg-card-dark rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                    {techSpecs.map((spec, index) => (
                        <div key={index} className="flex justify-between items-center p-4">
                            <span className="text-sm text-text-sub-light dark:text-text-sub-dark">{spec.label}</span>
                            <span className={`text-sm font-medium ${spec.value !== '-' ? 'text-brand-black dark:text-white' : 'text-gray-400'}`}>{spec.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Documentation Section - Always visible */}
            <div>
                <div className="flex items-center justify-between mb-3 ml-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">Documentation</h3>
                    {onEdit && isEditMode && (
                        <button
                            onClick={onEdit}
                            className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 uppercase tracking-tighter"
                        >
                            <span className="material-symbols-outlined text-[14px]">edit_note</span> Edit Links
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderDocButton(
                        'image',
                        'Rating Plate',
                        'View Image',
                        appliance.ratingPlateUrl,
                        appliance.ratingPlateUrl ? () => setShowPlateModal(true) : undefined
                    )}
                    {renderDocButton(
                        'menu_book',
                        'User Manual',
                        'PDF • Download',
                        appliance.manualUrl
                    )}
                    {renderDocButton(
                        'verified_user',
                        'Warranty Info',
                        'View Status',
                        appliance.warrantyUrl
                    )}
                    {renderDocButton(
                        'build',
                        'Install Guide',
                        'View Instructions',
                        appliance.installationUrl
                    )}
                    {renderDocButton(
                        'description',
                        'Technician Notes',
                        'View Notes',
                        appliance.notes ? 'present' : undefined, // Hack to show as present if notes exist
                        () => setShowNotesModal(true),
                        'doc-notes-btn' // Adding ID for tutorial
                    )}
                    {/* New Property Details Button */}
                    {onViewProperty && renderDocButton(
                        'real_estate_agent',
                        'Property Equipment', // Renamed from Property Details
                        'View Property',
                        undefined,
                        onViewProperty,
                        'view-property-btn'
                    )}
                </div>
            </div>

            {/* Rating Plate Lightbox Modal */}
            {showPlateModal && appliance.ratingPlateUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowPlateModal(false)}></div>
                    <div className="relative max-w-2xl w-full bg-transparent flex flex-col items-center animate-[zoomIn_0.2s_ease-out]">
                        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black">
                            <img
                                src={appliance.ratingPlateUrl}
                                alt="Rating Plate"
                                className="w-full h-auto max-h-[80vh] object-contain"
                            />
                        </div>
                        <button
                            onClick={() => setShowPlateModal(false)}
                            className="mt-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 backdrop-blur-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Notes Modal */}
            {showNotesModal && (
                <Modal onClose={() => setShowNotesModal(false)} className="max-w-md">
                    <div className="p-2">
                        <div className="flex items-center gap-3 mb-4 text-primary">
                            <span className="material-symbols-outlined text-3xl">description</span>
                            <h3 className="text-xl font-bold text-brand-black dark:text-white">Technician Notes</h3>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[100px]">
                            <p className="text-sm text-brand-black dark:text-white whitespace-pre-wrap leading-relaxed">
                                {appliance.notes || "No notes available."}
                            </p>
                        </div>
                        <div className="mt-6">
                            <Button variant="primary" fullWidth onClick={() => setShowNotesModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Unavailable Item Modal */}
            {unavailableItem && (
                <Modal onClose={() => setUnavailableItem(null)} className="max-w-sm">
                    <div className="flex flex-col items-center text-center p-2">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-gray-400 text-3xl">block</span>
                        </div>
                        <h3 className="text-xl font-bold text-brand-black dark:text-white mb-2">
                            Not Available
                        </h3>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-8 leading-relaxed">
                            <span className="font-bold">{unavailableItem}</span> is not available for this appliance.
                        </p>
                        <Button variant="secondary" fullWidth onClick={() => setUnavailableItem(null)}>
                            Dismiss
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
