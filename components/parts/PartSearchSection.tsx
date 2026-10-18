import React, { useState } from 'react';
import type { PartRecord } from '../../types/domain';

interface PartSearchSectionProps {
  parts: PartRecord[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogUse: (part: PartRecord) => void;
}

export const PartSearchSection: React.FC<PartSearchSectionProps> = ({
  parts,
  searchQuery,
  onSearchChange,
  onLogUse,
}) => {
  const [filter, setFilter] = useState<'all' | 'reorder' | 'available'>('all');
  const [expandedPriceHistoryId, setExpandedPriceHistoryId] = useState<number | null>(null);

  const filteredParts = parts.filter(p => {
    if (filter === 'reorder' && !p.is_reorder && (p.quantity_on_hand > p.reorder_point)) {
      return false;
    }
    if (filter === 'available' && p.quantity_on_hand <= 0) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const matchNumber = p.part_number?.toLowerCase().includes(query) ?? false;
    const matchName = p.name.toLowerCase().includes(query);
    const matchDesc = p.description?.toLowerCase().includes(query) ?? false;
    const matchCategory = p.category?.toLowerCase().includes(query) ?? false;
    const matchModels = p.compatible_models?.some(m => m.toLowerCase().includes(query)) ?? false;

    return matchNumber || matchName || matchDesc || matchCategory || matchModels;
  });

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
          search
        </span>
        <input
          id="parts-search-input"
          type="search"
          placeholder="Search WB24T10025, model (e.g. RB525), or keyword..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all placeholder:text-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          All ({parts.length})
        </button>

        <button
          onClick={() => setFilter('reorder')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
            filter === 'reorder'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          <span className={`material-symbols-outlined text-[14px] ${filter === 'reorder' ? 'text-white' : 'text-amber-500'}`}>warning</span>
          Reorder Needed ({parts.filter(p => p.is_reorder || p.quantity_on_hand <= p.reorder_point).length})
        </button>

        <button
          onClick={() => setFilter('available')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
            filter === 'available'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
          }`}
        >
          <span className={`material-symbols-outlined text-[14px] ${filter === 'available' ? 'text-white' : 'text-emerald-500'}`}>check_circle</span>
          In Stock ({parts.filter(p => p.quantity_on_hand > 0).length})
        </button>
      </div>

      {/* Parts List */}
      {filteredParts.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-2">
          <span className="material-symbols-outlined text-4xl text-gray-300">inventory_2</span>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No matching parts found</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Try searching by part number (e.g. WB24T10025, M376) or appliance model.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredParts.map(part => {
            const isReorder = part.is_reorder || part.quantity_on_hand <= part.reorder_point;
            const isHistoryExpanded = expandedPriceHistoryId === part.id;

            return (
              <div
                key={part.id}
                className={`p-4 rounded-2xl border bg-white dark:bg-card-dark shadow-xs space-y-3 transition-all ${
                  isReorder
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                {/* Header row: Part #, Title, and Reorder Flag */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 text-xs font-mono font-extrabold rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                        {part.part_number || 'NO-PART-#'}
                      </span>
                      {part.category && (
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          {part.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-brand-black dark:text-white mt-1">
                      {part.name}
                    </h3>
                  </div>

                  {/* Dynamic Reorder Status Flag */}
                  {isReorder ? (
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 text-white flex items-center gap-1 shrink-0 animate-pulse">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      Reorder (Qty: {part.quantity_on_hand} ≤ Min: {part.reorder_point})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                      Stock OK
                    </span>
                  )}
                </div>

                {part.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {part.description}
                  </p>
                )}

                {/* Compatible Models Badges */}
                {part.compatible_models && part.compatible_models.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Compatible Models ({part.compatible_models.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {part.compatible_models.map((model, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200/50 dark:border-blue-900/50"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Location & Stock Breakdown */}
                <div className="bg-gray-50 dark:bg-neutral-800/60 p-3 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <span className="material-symbols-outlined text-[16px] text-primary">warehouse</span>
                      Stock Breakdown:
                    </span>
                    <span className="font-extrabold text-brand-black dark:text-white">
                      {part.quantity_on_hand} in active stock
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1 pl-5">
                    {part.stockpiles && part.stockpiles.length > 0 ? (
                      part.stockpiles.map((sp, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span>
                            • {sp.stockpile_name} ({sp.stockpile_location})
                            {sp.location_notes ? ` - ${sp.location_notes}` : ''}
                          </span>
                          <span className={`font-mono font-bold ${sp.status === 'available' ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {sp.quantity} {sp.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>{part.stock_summary || `${part.quantity_on_hand} units available`}</p>
                    )}
                  </div>
                </div>

                {/* Price / Order History Section */}
                {part.price_history && part.price_history.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800/80 pt-2 text-xs">
                    <button
                      onClick={() => setExpandedPriceHistoryId(isHistoryExpanded ? null : part.id)}
                      className="w-full flex items-center justify-between text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1"
                    >
                      <span className="flex items-center gap-1 font-semibold text-[11px]">
                        <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                        Price & Order History ({part.price_history.length} purchases)
                      </span>
                      <span className="material-symbols-outlined text-[16px]">
                        {isHistoryExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isHistoryExpanded && (
                      <div className="mt-2 space-y-1.5 bg-gray-50 dark:bg-neutral-800/40 p-2.5 rounded-xl animate-fadeIn">
                        {part.price_history.map((order, oIdx) => (
                          <div key={oIdx} className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-500">{order.date}</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {order.supplier || 'Supply House'}
                            </span>
                            <span className="font-mono font-bold text-brand-black dark:text-white">
                              ${Number(order.price).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Row */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">
                    Unit Cost: <span className="font-bold text-brand-black dark:text-white">${part.unit_cost?.toFixed(2) || '42.50'}</span>
                  </div>

                  <button
                    onClick={() => onLogUse(part)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">build</span>
                    Log Use on Job
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
