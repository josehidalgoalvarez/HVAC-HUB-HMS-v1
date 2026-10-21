
import React, { useState } from 'react';
import { useData } from '../../hooks/useData';
import PropertyCard from './PropertyCard';

interface PropertyListViewProps {
  onPropertyClick: (id: string) => void;
  onAddProperty: () => void;
  isEditMode: boolean;
}

const PropertyListView: React.FC<PropertyListViewProps> = ({
  onPropertyClick,
  onAddProperty,
  isEditMode
}) => {
  const { properties } = useData();
  const [showFilter, setShowFilter] = useState(false);

  // Filter states
  const [searchName, setSearchName] = useState('');
  const [searchAddress, setSearchAddress] = useState('');

  // Active filters (applied on search)
  const [activeNameFilter, setActiveNameFilter] = useState('');
  const [activeAddressFilter, setActiveAddressFilter] = useState('');

  const handleApplyFilter = () => {
    setActiveNameFilter(searchName);
    setActiveAddressFilter(searchAddress);
    setShowFilter(false);
  };

  const handleClearFilter = () => {
    setSearchName('');
    setSearchAddress('');
    setActiveNameFilter('');
    setActiveAddressFilter('');
    setShowFilter(false);
  };

  const filteredProperties = properties.filter(p => {
    const matchName = p.name.toLowerCase().includes(activeNameFilter.toLowerCase());
    const matchAddress = p.address.toLowerCase().includes(activeAddressFilter.toLowerCase());
    return matchName && matchAddress;
  });

  // Complex order map for consistent display
  const COMPLEX_ORDER = [
    'complex-bd',
    'complex-amherst',
    'complex-princess',
    'complex-victoria',
    'complex-alfred',
    'complex-frontenac',
    'complex-elm',
    'complex-manitou',
    'complex-singles',
    'complex-office'
  ];

  const groupedProperties = React.useMemo(() => {
    const map = new Map<string, { complexId: string; name: string; properties: typeof properties }>();
    for (const p of filteredProperties) {
      const cId = p.complexId || 'other';
      const cName = p.complexName || (cId === 'other' ? 'Other Properties' : cId);
      if (!map.has(cId)) {
        map.set(cId, { complexId: cId, name: cName, properties: [] });
      }
      map.get(cId)!.properties.push(p);
    }

    return Array.from(map.values()).sort((a, b) => {
      const idxA = COMPLEX_ORDER.indexOf(a.complexId);
      const idxB = COMPLEX_ORDER.indexOf(b.complexId);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredProperties]);

  const hasActiveFilters = activeNameFilter || activeAddressFilter;

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto pb-32 relative">
      {/* Action Bar / Sub-header */}
      <div className="flex items-center justify-between px-2 pt-2">
        <p className="text-sm font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">
          {filteredProperties.length} Properties
        </p>
        <button
          onClick={() => setShowFilter(true)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${hasActiveFilters
            ? 'bg-primary text-white shadow-md hover:bg-primary/90'
            : 'bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 text-text-sub-light dark:text-text-sub-dark hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
        >
          <span className="material-symbols-outlined text-[16px]">filter_list</span>
          {hasActiveFilters ? 'Filtered' : 'Filter'}
        </button>
      </div>

      <div className="space-y-8">
        {groupedProperties.map((group) => (
          <div key={group.complexId} className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-800 pb-2 px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                {group.name}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark">
                {group.properties.length}
              </span>
            </div>
            <div className="space-y-4">
              {group.properties.map((p) => (
                <PropertyCard
                  key={p.id}
                  id={`property-card-${p.id}`}
                  property={p}
                  onClick={() => onPropertyClick(p.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredProperties.length === 0 && (
          <div className="text-center py-12 opacity-50">
            <span className="material-symbols-outlined text-4xl mb-2 text-gray-400">home_work</span>
            <p className="text-sm">No properties match your search.</p>
            <button onClick={() => setShowFilter(true)} className="mt-2 text-primary font-bold text-sm">Change Filters</button>
          </div>
        )}

        {/* Add Button Card - Only shown in edit mode */}
        {isEditMode && (
          <div
            onClick={onAddProperty}
            className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-green dark:border-gray-700 p-8 text-center opacity-80 hover:opacity-100 hover:border-primary transition-all cursor-pointer group bg-brand-green/5 dark:bg-white/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green dark:bg-gray-800 group-hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-text-sub-light dark:text-text-sub-dark group-hover:text-primary transition-colors">add_location_alt</span>
            </div>
            <div>
              <p className="font-bold text-text-main-light dark:text-white">Add property</p>
              <p className="text-sm text-text-sub-light dark:text-text-sub-dark font-body">Add building to database</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilter(false)}></div>
          <div className="relative bg-white dark:bg-card-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-[slideUp_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-brand-black dark:text-white">Filter Properties</h3>
              <button onClick={() => setShowFilter(false)} className="p-1 text-gray-400 hover:text-brand-black dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Property Name</label>
                <input
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="e.g. Princess St"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Address / City</label>
                <input
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="e.g. Kingston"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={handleClearFilter}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-brand-black dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleApplyFilter}
                className="flex-[2] bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PropertyListView;
