import React from 'react';
import type { Stockpile } from '../../types/domain';

interface McKayStorageMenuViewProps {
  stockpiles: Stockpile[];
  onSelectStockpile: (stockpileId: number | string) => void;
  onBack: () => void;
}

export const McKayStorageMenuView: React.FC<McKayStorageMenuViewProps> = ({
  stockpiles,
  onSelectStockpile,
  onBack,
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-32 pb-safe animate-fadeIn text-brand-black dark:text-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="w-11 h-11 min-h-[44px] rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
            aria-label="Back to 698 McKay Street"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">warehouse</span>
              <span>McKay Storage Depot</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              698 McKay St · Staging, Yard & Sea Containers
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 text-xs font-bold font-mono shrink-0">
          {stockpiles.length} {stockpiles.length === 1 ? 'Location' : 'Locations'}
        </span>
      </div>

      {/* Overview Card */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
        <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">
          inventory_2
        </span>
        <div className="min-w-0">
          <p className="font-bold">698 McKay Storage Facilities</p>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
            Select a warehouse or sea container below to view its parts catalog, equipment, and stock on hand.
          </p>
        </div>
      </div>

      {/* Stockpile List */}
      <div className="space-y-3">
        {stockpiles.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-2">
            <span className="material-symbols-outlined text-4xl text-gray-400">inventory</span>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No stockpiles found for McKay site</p>
            <p className="text-xs text-gray-500">Stockpiles linked to building #89 will appear here automatically.</p>
          </div>
        ) : (
          stockpiles.map(sp => {
            const hasCounts = sp.distinct_parts_count !== undefined || sp.total_units_count !== undefined;
            const distinctParts = sp.distinct_parts_count ?? 0;
            const totalUnits = sp.total_units_count ?? 0;

            // Pick an icon based on container vs warehouse
            const isContainer = sp.name.toLowerCase().includes('container') || sp.name.toLowerCase().includes('can');
            const iconName = isContainer ? 'inventory' : 'warehouse';

            return (
              <div
                key={sp.id}
                data-testid={`mckay-stockpile-row-${sp.id}`}
                onClick={() => onSelectStockpile(sp.id)}
                className="p-4 rounded-2xl bg-white dark:bg-card-dark hover:bg-gray-50 dark:hover:bg-neutral-800/80 border border-gray-100 dark:border-gray-800 text-brand-black dark:text-white flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-all group shadow-xs"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectStockpile(sp.id);
                  }
                }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 min-h-[44px] rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 text-primary group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">{iconName}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                      {sp.name}
                    </h3>
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate mt-0.5">
                      {sp.location}
                    </p>

                    {hasCounts && (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-bold">
                          {distinctParts} {distinctParts === 1 ? 'part' : 'parts'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold">
                          {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}
                        </span>
                        {sp.notes && (
                          <span className="text-[11px] text-gray-400 italic truncate max-w-[180px]">
                            {sp.notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-2xl shrink-0">
                  chevron_right
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default McKayStorageMenuView;
