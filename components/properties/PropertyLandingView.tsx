
import React, { useMemo, useState } from 'react';
import { useData } from '../../hooks/useData';
import { Appliance } from '../../types';
import ScheduleServiceModal from '../service/ScheduleServiceModal';
import ContactTechModal from '../service/ContactTechModal';
import { Modal } from '../ui/Modal';
import IconButton from '../ui/IconButton';
import Button from '../ui/Button';

interface PropertyLandingViewProps {
  propertyId: string;
  onBack: () => void;
  onOpenDetail: () => void;
  onEditProperty: () => void;
  onApplianceClick: (id: string) => void;
  onAddAppliance: () => void;
  isEditMode: boolean;
}

const PropertyLandingView: React.FC<PropertyLandingViewProps> = ({
  propertyId,
  onBack,
  onOpenDetail,
  onEditProperty,
  onApplianceClick,
  onAddAppliance,
  isEditMode
}) => {
  const { getProperty, appliances, addLog } = useData();
  const property = getProperty(propertyId);
  const propertyAppliances = appliances.filter(a => a.propertyId === propertyId);

  const [isScheduling, setIsScheduling] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const groupedAppliances = useMemo(() => {
    const groups: Record<string, Appliance[]> = {};
    propertyAppliances.forEach(app => {
      const category = app.category || 'OTHER';
      if (!groups[category]) groups[category] = [];
      groups[category].push(app);
    });
    return groups;
  }, [propertyAppliances]);

  if (!property) return <div>Property Not Found</div>;

  const hasComments = !!property.comments;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-32">

      <div className="relative h-72 w-full bg-gray-900">
        <img
          src={property.imageUrl}
          alt={property.name}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4 z-20">
          <IconButton icon="arrow_back" onClick={onBack} variant="glass" />
        </div>

        {isEditMode && (
          <div className="absolute top-4 right-4 z-20">
            <IconButton icon="edit" onClick={onEditProperty} variant="primary" />
          </div>
        )}

        <div className="absolute bottom-6 left-6 right-6 text-white z-10">
          <h1 className="text-3xl font-display font-bold tracking-tight mb-1">{property.name}</h1>
          <div className="flex items-center gap-2 text-white/80 font-medium">
            <span className="material-symbols-outlined text-[18px]">location_on</span>
            <p className="truncate text-sm">{property.address}</p>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-background-light dark:bg-background-dark px-5 py-8 space-y-8 z-20 flex-1">

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-card-dark rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1">Square Feet</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-bold ${property.sqFt ? 'text-brand-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                {property.sqFt || '-'}
              </span>
              <span className="text-[10px] text-gray-400">sq ft</span>
            </div>
          </div>
          <div className="bg-white dark:bg-card-dark rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1">Year Built</span>
            <span className={`text-lg font-bold ${property.yearBuilt ? 'text-brand-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
              {property.yearBuilt || '-'}
            </span>
          </div>
          <div className="bg-white dark:bg-card-dark rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1">Lot Size</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-bold ${property.lotSize ? 'text-brand-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                {property.lotSize || '-'}
              </span>
              <span className="text-[10px] text-gray-400">acres</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => hasComments && setShowComments(true)}
          disabled={!hasComments}
          className={`w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm border ${hasComments
              ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 text-gray-400 cursor-not-allowed'
            }`}
        >
          <span className="material-symbols-outlined">sticky_note_2</span>
          <span>{hasComments ? 'View Property Notes' : 'No Property Notes'}</span>
        </button>

        <div className="mt-3 mb-6">
          <Button
            onClick={onOpenDetail}
            variant="secondary"
            fullWidth
            icon="inventory_2"
          >
            View Property Equipment
          </Button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-brand-black dark:text-white">Installed Appliances</h2>
            {isEditMode && (
              <button
                onClick={onAddAppliance}
                className="flex items-center gap-1 text-primary text-sm font-bold hover:opacity-80 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add New
              </button>
            )}
          </div>

          <div className="space-y-6">
            {Object.entries(groupedAppliances).map(([category, categoryApps]) => (
              <div key={category}>
                <h3 className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-3 ml-1">{category}</h3>
                <div className="space-y-3">
                  {(categoryApps as Appliance[]).map(app => (
                    <div
                      key={app.id}
                      onClick={() => onApplianceClick(app.id)}
                      className="bg-white dark:bg-card-dark rounded-2xl p-3 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        <img src={app.imageUrl} alt={app.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-brand-black dark:text-white truncate">{app.name}</h4>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate">
                          {app.modelNumber ? `Model: ${app.modelNumber}` : app.brand} • {app.specs?.installDate?.split(' ')[2] || '2021'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {propertyAppliances.length === 0 && (
              <div className="text-center py-8 text-text-sub-light dark:text-text-sub-dark bg-gray-50 dark:bg-white/5 rounded-2xl border-dashed border-2 border-gray-200 dark:border-gray-700">
                <p className="text-sm">No appliances added yet.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-brand-black dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setIsScheduling(true)}
              className="bg-[#1a9387] hover:bg-[#157a70] text-white rounded-2xl py-4 px-2 flex flex-col items-center gap-2 shadow-lg shadow-[#1a9387]/20 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[28px]">calendar_month</span>
              <span className="font-bold text-sm">Book Service</span>
            </button>
            <button
              onClick={() => setIsContacting(true)}
              className="bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 text-brand-black dark:text-white rounded-2xl py-4 px-2 flex flex-col items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[28px]">help</span>
              <span className="font-bold text-sm">Contact Tech</span>
            </button>
          </div>
        </div>

        {isEditMode && (
          <div className="pt-4 pb-8">
            <Button
              onClick={onEditProperty}
              variant="secondary"
              fullWidth
              icon="settings"
            >
              Edit Property Details
            </Button>
          </div>
        )}

      </div>

      {isScheduling && <ScheduleServiceModal property={property} onClose={() => setIsScheduling(false)} onLog={addLog} />}
      {isContacting && <ContactTechModal onClose={() => setIsContacting(false)} />}

      {showComments && (
        <Modal onClose={() => setShowComments(false)} className="max-w-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-brand-black dark:text-white">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                <span className="material-symbols-outlined">sticky_note_2</span>
              </div>
              <h3 className="text-lg font-bold">Property Notes</h3>
            </div>
            <IconButton icon="close" onClick={() => setShowComments(false)} size="sm" />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 max-h-[60vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-brand-black dark:text-white whitespace-pre-wrap leading-relaxed">{property.comments}</p>
          </div>
          <div className="mt-4">
            <Button onClick={() => setShowComments(false)} fullWidth variant="secondary">
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PropertyLandingView;
