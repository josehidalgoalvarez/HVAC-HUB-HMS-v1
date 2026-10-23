import React, { useRef, useState } from 'react';
import type { Property } from '../../types';
import { useData, useActions } from '../../hooks/useData';
import { Modal } from '../ui/Modal';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileMenu, MenuItem } from './components/ProfileMenu';
import { ActivityLogSection } from './components/ActivityLogSection';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ExportDataModal } from './components/ExportDataModal';
import { ManagePropertiesModal } from './components/ManagePropertiesModal';

interface ProfileViewProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isEditMode: boolean;
  onToggleEditMode: (enabled: boolean) => void;
  onOpenParts?: () => void;
  onOpenWatches?: () => void;
  onOpenDefaults?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({
  isDarkMode,
  onToggleDarkMode,
  isEditMode,
  onToggleEditMode,
  onOpenParts,
  onOpenWatches,
  onOpenDefaults
}) => {
  const { properties, appliances, logs: changeLogs, isTutorialActive } = useData();
  const { importData, duplicateProperty, deleteProperty, startTutorial, endTutorial } = useActions();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  // --- Handlers ---

  const handleSuperPowers = () => {
    if (isEditMode) {
      onToggleEditMode(false);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = () => {
    onToggleEditMode(true);
    setShowLoginModal(false);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        importData(json);
        alert("Data imported successfully!");
      } catch (err) {
        alert("Failed to parse the import file. Please ensure it is a valid JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExport = (propertyId?: string) => {
    let exportProps = properties;
    let exportApps = appliances;
    let exportLogs = changeLogs;

    if (propertyId) {
      exportProps = properties.filter(p => p.id === propertyId);
      exportApps = appliances.filter(a => a.propertyId === propertyId);
      exportLogs = changeLogs.filter(log =>
        log.propertyId === propertyId ||
        (log.entityType === 'PROPERTY' && log.entityId === propertyId)
      );
    }

    const data = {
      properties: exportProps,
      appliances: exportApps,
      changeLogs: exportLogs,
      exportDate: new Date().toISOString(),
      version: "1.1"
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = propertyId
      ? `HVACHome_Export_${exportProps[0].name.replace(/\s+/g, '_')}.json`
      : `HVACHome_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportModal(false);
  };

  const handleConfirmDelete = () => {
    if (propertyToDelete) {
      deleteProperty(propertyToDelete.id);
      setPropertyToDelete(null);
    }
  };

  // --- Menu Configuration ---

  const menuItems: MenuItem[] = [
    ...(isEditMode ? [
      {
        icon: 'settings_suggest',
        label: 'Manage Properties',
        action: () => setShowManageModal(true)
      }
    ] : []),
    ...(onOpenParts ? [{
      icon: 'precision_manufacturing',
      label: 'Parts Inventory',
      action: onOpenParts,
      color: 'text-primary'
    }] : []),
    ...(onOpenWatches ? [{
      icon: 'notifications_active',
      label: 'Watches & Alerts',
      action: onOpenWatches,
      color: 'text-primary'
    }] : []),
    ...(onOpenDefaults ? [{
      icon: 'tune',
      label: 'Appliance Defaults Library',
      action: onOpenDefaults,
      color: 'text-primary'
    }] : []),
    {
      icon: 'install_mobile',
      label: 'Install App',
      action: () => {
        localStorage.removeItem('hvachome_pwa_install_dismissed_until');
        window.location.reload();
      },
      color: 'text-primary'
    },
    {
      icon: 'download',
      label: 'Export Data',
      action: () => setShowExportModal(true)
    },
    {
      icon: isTutorialActive ? 'logout' : 'school',
      label: isTutorialActive ? 'Exit Tutorial' : 'Replay Tutorial',
      action: isTutorialActive ? endTutorial : startTutorial,
      color: isTutorialActive ? 'text-brand-orange' : undefined
    },
    ...(isEditMode ? [{
      icon: 'upload',
      label: 'Import Data',
      action: triggerImport
    }] : []),
    {
      icon: 'bolt',
      label: isEditMode ? 'Disable editing' : 'Enable editing',
      action: handleSuperPowers,
      color: isEditMode ? 'text-brand-red' : 'text-primary'
    },
    {
      icon: isDarkMode ? 'light_mode' : 'dark_mode',
      label: isDarkMode ? 'Light mode' : 'Dark mode',
      action: onToggleDarkMode
    }
  ];

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 pb-32">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <ProfileHeader isEditMode={isEditMode} />

      {/* Menu Options */}
      <ProfileMenu items={menuItems} />

      {/* Activity Log */}
      <ActivityLogSection logs={changeLogs} />

      {/* --- Modals --- */}

      {showLoginModal && (
        <AdminLoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleLoginSuccess}
        />
      )}

      {showExportModal && (
        <ExportDataModal
          onClose={() => setShowExportModal(false)}
          properties={properties}
          onExport={handleExport}
        />
      )}

      {showManageModal && (
        <ManagePropertiesModal
          onClose={() => setShowManageModal(false)}
          properties={properties}
          startTutorial={startTutorial}
          onDuplicate={duplicateProperty}
          onDelete={(id, name, count) => setPropertyToDelete({ id, name, applianceCount: count } as Property)}
        />
      )}

      {/* Delete Confirmation Modal (Kept here as it's a high-level alert) */}
      {propertyToDelete && (
        <Modal onClose={() => setPropertyToDelete(null)} className="max-w-sm" zIndexClass="z-[70]">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-brand-red mb-2">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-black dark:text-white">Delete Property?</h3>
              <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-2">
                Are you sure you want to delete <span className="font-bold text-brand-black dark:text-white">{propertyToDelete.name}</span>?
              </p>
              <p className="text-xs text-brand-red mt-2 font-bold">
                This will permanently delete the property and all its {propertyToDelete.applianceCount} appliances.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-4">
              <button
                onClick={() => setPropertyToDelete(null)}
                className="flex-1 py-3.5 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-brand-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3.5 rounded-xl font-bold bg-brand-red text-white hover:bg-red-600 transition-colors shadow-lg shadow-brand-red/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProfileView;
