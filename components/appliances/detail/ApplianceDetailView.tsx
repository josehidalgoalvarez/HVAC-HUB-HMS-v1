
import React, { useState, useMemo } from 'react';
import { Appliance, MaintenanceRecord } from '../../../types';
import { getTechSpecs } from '../../../utils/applianceUtils';
import RatingPlateForm from '../common/RatingPlateForm';
import { useData } from '../../../hooks/useData';
import ScheduleServiceModal from '../../service/ScheduleServiceModal';
import IconButton from '../../ui/IconButton';

import { ApplianceDashboard } from '../dashboard/ApplianceDashboard';
import { TUTORIAL_STEPS } from '../../../tutorial';

// Sub-components
import { ApplianceHero } from './components/ApplianceHero';
import { ApplianceSpecsSection } from './components/ApplianceSpecsSection';
import { ApplianceHistorySection } from './components/ApplianceHistorySection';
import { AddMaintenanceRecordForm } from './components/AddMaintenanceRecordForm';
import { ServiceButton } from './components/ServiceButton';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';

interface ApplianceDetailViewProps {
  applianceId: string | null;
  onBack: () => void;
  onUpdate: (appliance: Appliance) => void;
  onDuplicate: (appliance: Appliance) => void;
  onDelete: (id: string) => void;
  isEditMode: boolean;
  onViewOnCanvas: (propertyId: string, applianceId: string) => void;
  onViewProperty: (propertyId: string) => void;
}

const ApplianceDetailView: React.FC<ApplianceDetailViewProps> = ({
  applianceId,
  onBack,
  onUpdate,
  onDuplicate,
  onDelete,
  isEditMode,
  onViewOnCanvas,
  onViewProperty
}) => {
  const { getAppliance, properties, addLog, isTutorialActive, tutorialStep } = useData();
  const appliance = applianceId ? getAppliance(applianceId) : undefined;

  // Tutorial Auto-Navigation
  React.useEffect(() => {
    if (isTutorialActive && appliance) {
      const currentAction = TUTORIAL_STEPS[tutorialStep]?.action;
      if (currentAction === 'OPEN_NOTES') {
        setActiveTab('specs');
      }
    }
  }, [isTutorialActive, tutorialStep, appliance]);

  // Guard clause for deleted or invalid appliances
  if (!appliance) return <div>Appliance not found</div>;

  const property = properties.find(p => p.id === appliance.propertyId);

  // View State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modal State
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Tabs Configuration
  const availableTabs = useMemo(() => {
    const tabs = [
      { id: 'dashboard', label: 'DASHBOARD' },
      { id: 'specs', label: 'SPECS' }
    ];
    if ((appliance.maintenanceHistory && appliance.maintenanceHistory.length > 0) || true) {
      tabs.push({ id: 'history', label: 'HISTORY' });
    }
    return tabs;
  }, [appliance]);

  // Handlers
  const handleStatusChange = (newStatus: Appliance['status']) => {
    onUpdate({ ...appliance, status: newStatus });
  };

  const handleSaveRecord = (record: MaintenanceRecord) => {
    const updatedHistory = [record, ...(appliance.maintenanceHistory || [])];

    // Sort history by date descending to find the latest
    // Note: Dates are stored as strings (e.g., "Oct 15, 2024"), so we need to parse them
    const sortedHistory = [...updatedHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Define types that reset the "Last Service" date (and thus Efficiency/Filter Life)
    const resettingTypes = [
      'Routine Maintenance',
      'Repair',
      'Installation',
      'Cleaning',
      'Inspection'
    ];

    // Find the most recent record that matches a resetting type
    const latestResetRecord = sortedHistory.find(r => resettingTypes.includes(r.type));

    // Determine the new lastService date
    // If a resetting record exists, use its date. Otherwise, keep the current one (or use installDate as fallback if needed)
    const newLastService = latestResetRecord ? latestResetRecord.date : appliance.lastService;

    onUpdate({
      ...appliance,
      maintenanceHistory: updatedHistory,
      lastService: newLastService
    });
    setIsAddingRecord(false);
  };

  const handleRequestService = () => {
    if (property) {
      setIsScheduling(true);
    } else {
      alert("Could not find property information for this appliance.");
    }
  };

  const handleDelete = () => {
    onDelete(appliance.id);
    onBack(); // Navigate back after deletion
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24 relative" onClick={() => setShowMenu(false)}>

      {/* Header - Navigation & Context Menu */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <IconButton icon="arrow_back" onClick={onBack} />
        <div className="text-center">
          <h1 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
            {appliance.specs?.location ? `Unit: ${appliance.specs.location}` : 'Unit Details'}
          </h1>
        </div>

        <div className="relative">
          {isEditMode && (
            <IconButton
              icon="more_vert"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            />
          )}

          {showMenu && isEditMode && (
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-card-dark rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
              <button
                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-brand-black dark:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span> Edit Details
              </button>
              <button
                onClick={() => { onDuplicate(appliance); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-brand-black dark:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span> Duplicate
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-brand-red"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* Visual Hero Section */}
        <ApplianceHero
          appliance={appliance}
          onStatusChange={handleStatusChange}
          isReadOnly={!isEditMode}
          onImageUpdate={(url) => onUpdate({ ...appliance, imageUrl: url })}
          onModelUrlUpdate={(url) => onUpdate({ ...appliance, embedModelUrl: url })}
        />

        {/* Title Section */}
        <div>
          <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>
          <h2 className="text-2xl font-black text-brand-black dark:text-white uppercase leading-tight mb-1">{appliance.name}</h2>
          <div className="flex items-center gap-3">
            <p className="text-sm font-mono text-text-sub-light dark:text-text-sub-dark">
              ID: {appliance.id.toUpperCase().slice(0, 8)}-{appliance.serialNumber?.slice(-4) || 'REF'}
            </p>
            {appliance.brand && (
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold text-text-sub-light dark:text-gray-400">
                {appliance.brand}
              </span>
            )}
          </div>
        </div>

        {/* Canvas Link - Only if Edit Mode and position exists */}
        {isEditMode && appliance.position && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">location_on</span>
              <span className="text-sm font-bold text-blue-900 dark:text-blue-300">Located on Canvas</span>
            </div>
            <button
              onClick={() => onViewOnCanvas(appliance.propertyId, appliance.id)}
              className="text-xs font-bold bg-white dark:bg-blue-800 text-blue-700 dark:text-white px-3 py-1.5 rounded-lg shadow-sm"
            >
              View
            </button>
          </div>
        )}

        {/* Tabs */}
        {availableTabs.length > 1 && (
          <div className="grid grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wide ${activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-sub-light dark:text-gray-400 hover:text-brand-black dark:hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'dashboard' && (
            <ApplianceDashboard appliance={appliance} />
          )}

          {activeTab === 'specs' && (
            <ApplianceSpecsSection
              appliance={appliance}
              onEdit={() => setIsEditing(true)}
              isEditMode={isEditMode}
              onViewProperty={() => onViewProperty(appliance.propertyId)}
            />
          )}

          {activeTab === 'history' && (
            <ApplianceHistorySection
              history={appliance.maintenanceHistory}
              onAddRecord={() => setIsAddingRecord(true)}
              isReadOnly={!isEditMode}
            />
          )}
        </div>
      </div>

      {/* Footer Service Action */}
      <ServiceButton onClick={handleRequestService} />

      {/* --- Modals --- */}

      {isEditing && (
        <RatingPlateForm
          appliance={appliance}
          onSave={(updated) => { onUpdate(updated); setIsEditing(false); }}
          onClose={() => setIsEditing(false)}
        />
      )}

      {isAddingRecord && (
        <AddMaintenanceRecordForm
          onSave={handleSaveRecord}
          onClose={() => setIsAddingRecord(false)}
        />
      )}

      {isScheduling && property && (
        <ScheduleServiceModal
          property={property}
          onClose={() => setIsScheduling(false)}
          onLog={addLog}
        />
      )}

      {showDeleteConfirm && (
        <Modal onClose={() => setShowDeleteConfirm(false)} className="max-w-sm">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-brand-red mb-2">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-black dark:text-white">Delete Appliance?</h3>
              <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-2">
                Are you sure you want to delete <span className="font-bold text-brand-black dark:text-white">{appliance.name}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-4">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="secondary" fullWidth>
                Cancel
              </Button>
              <Button onClick={handleDelete} variant="danger" fullWidth>
                Yes, Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ApplianceDetailView;
