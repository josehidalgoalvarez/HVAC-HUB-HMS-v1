
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../hooks/useData';
import { Appliance } from '../../../types';
import { Modal } from '../../ui/Modal';

interface ApplianceListViewProps {
  onApplianceClick: (id: string) => void;
}

const ApplianceListView: React.FC<ApplianceListViewProps> = ({ onApplianceClick }) => {
  const { appliances, properties } = useData();
  const [showFilter, setShowFilter] = useState(false);

  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(() =>
    properties.map(p => p.id)
  );

  useEffect(() => {
    setSelectedPropertyIds(prev => {
      const currentIds = new Set(prev);
      const newIds = properties.map(p => p.id).filter(id => !currentIds.has(id));

      if (newIds.length > 0) {
        return [...prev, ...newIds];
      }
      return prev;
    });
  }, [properties.length, properties]);

  const togglePropertyFilter = (id: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(id)
        ? prev.filter(pId => pId !== id)
        : [...prev, id]
    );
  };

  const groupedAppliances = useMemo(() => {
    const groups: Record<string, Appliance[]> = {};
    appliances.forEach(app => {
      if (!groups[app.propertyId]) groups[app.propertyId] = [];
      groups[app.propertyId].push(app);
    });
    return groups;
  }, [appliances]);

  const visibleProperties = properties.filter(p => selectedPropertyIds.includes(p.id));

  return (
    <div id="appliance-list" className="flex flex-col gap-4 max-w-lg mx-auto pb-32 relative">
      <div className="flex items-center justify-between px-2 pt-2">
        <h2 className="text-xl font-bold flex items-center gap-2 text-brand-black dark:text-white">
          <span className="material-symbols-outlined text-primary">inventory_2</span>
          Manage Appliances
        </h2>
        <button
          onClick={() => setShowFilter(true)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${selectedPropertyIds.length < properties.length
            ? 'bg-primary text-white shadow-md hover:bg-primary/90'
            : 'bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 text-text-sub-light dark:text-text-sub-dark hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
        >
          <span className="material-symbols-outlined text-[16px]">filter_list</span>
          Filter
        </button>
      </div>

      <div className="space-y-8 mt-4">
        {visibleProperties.map(property => {
          const propertyApps = groupedAppliances[property.id] || [];

          if (propertyApps.length === 0) return null;

          return (
            <div key={property.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1 rounded-full"></div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest">{property.name}</span>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1 rounded-full"></div>
              </div>

              <div className="flex flex-col gap-3">
                {propertyApps.map(app => (
                  <div
                    key={app.id}
                    id={`appliance-card-${app.id}`} // Adding ID for tutorial targeting
                    onClick={() => onApplianceClick(app.id)}
                    className="bg-card-light dark:bg-card-dark p-4 rounded-2xl shadow-ethereal flex items-center justify-between border border-gray-100 dark:border-gray-800 hover:shadow-floating transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${app.status === 'operational' ? 'bg-brand-green/30 text-primary' :
                        app.status === 'needs_service' ? 'bg-brand-orange/10 text-brand-orange' : 'bg-brand-red/10 text-brand-red'
                        }`}>
                        <span className="material-symbols-outlined font-variation-settings-fill">
                          {app.type === 'Refrigerator' ? 'kitchen' : app.type === 'Dishwasher' ? 'flatware' : 'local_laundry_service'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-brand-black dark:text-white truncate group-hover:text-primary transition-colors">{app.name}</h3>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate">
                          {app.brand || 'Generic'} • {app.specs?.location || 'Location N/A'}
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {visibleProperties.length === 0 && (
          <div className="text-center py-12 opacity-50">
            <span className="material-symbols-outlined text-4xl mb-2 text-gray-400">filter_alt_off</span>
            <p className="text-sm">No properties selected.</p>
            <button onClick={() => setShowFilter(true)} className="mt-2 text-primary font-bold text-sm">Change Filters</button>
          </div>
        )}
      </div>

      {showFilter && (
        <Modal onClose={() => setShowFilter(false)} className="max-w-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-brand-black dark:text-white">Filter Properties</h3>
            <button onClick={() => setShowFilter(false)} className="p-1 text-gray-400 hover:text-brand-black dark:hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {properties.map(p => {
              const isSelected = selectedPropertyIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePropertyFilter(p.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                    {isSelected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-brand-black dark:text-white'}`}>{p.name}</p>
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate">{p.address}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <button
              onClick={() => setSelectedPropertyIds(properties.map(p => p.id))}
              className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors"
            >
              Select All
            </button>
            <button
              onClick={() => setShowFilter(false)}
              className="bg-primary text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-primary/20"
            >
              Apply
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ApplianceListView;
