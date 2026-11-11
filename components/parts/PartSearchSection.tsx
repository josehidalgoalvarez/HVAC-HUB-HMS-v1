import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { PartRecord, Stockpile, HarvestCandidate } from '../../types/domain';
import { isVerifiedPart } from '../../utils/modelParts';

interface PartSearchSectionProps {
  parts: PartRecord[];
  stockpiles?: Stockpile[];
  harvestCandidates?: HarvestCandidate[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogUse: (part: PartRecord) => void;
  onRestock?: (part: PartRecord) => void;
  onAddPart?: () => void;
  onHarvestTransfer?: (candidate: HarvestCandidate) => void;
  onOpenStockpileInventory?: (stockpileId: number | string) => void;
}

/**
 * Abbreviates stockpile names for compact chip display in the Parts Catalog.
 * Preserves street number and distinguishing words while dropping redundant 'Storage'/'Stockpile'
 * and shortening standard road suffixes.
 */
export function abbreviateStockpileName(name: string): string {
  const s = (name || '').trim();

  // 265 Ontario specific distinctions
  if (/265\s+Ontario.*(?:1st Floor|Upstairs)/i.test(s)) {
    return '265 Upstairs';
  }
  if (/265\s+Ontario.*Basement/i.test(s)) {
    return '265 Basement';
  }

  // Sea Cans: 'Sea Can X — 698 McKay' -> 'Sea Can X'
  const mCan = s.match(/^(Sea Can \d+)(?:\s*[—\-]\s*.*)?$/i);
  if (mCan) {
    return mCan[1];
  }

  let out = s;
  if (/Sea Containers/i.test(out)) {
    out = out.replace(/Sea Containers/i, 'Sea Cans');
  }

  // Drop trailing ' Storage' or ' Stockpile'
  out = out.replace(/\s+(?:Storage|Stockpile)$/i, '');

  // 698 / 692 McKay St Warehouse -> 698 / 692 Warehouse
  if (/698\s+McKay.*Warehouse/i.test(out)) {
    return '698 Warehouse';
  }
  if (/692\s+McKay.*Warehouse/i.test(out)) {
    return '692 Warehouse';
  }

  // Standard road abbreviations
  out = out
    .replace(/Street/gi, 'St')
    .replace(/Road/gi, 'Rd')
    .replace(/Drive/gi, 'Dr')
    .replace(/Avenue/gi, 'Ave');

  // Drop ' St ' / ' Rd ' before Warehouse if still present
  out = out.replace(/\s+(?:St|Rd|Ave|Dr)\s+Warehouse/gi, ' Warehouse');

  return out.trim();
}

export const PartSearchSection: React.FC<PartSearchSectionProps> = ({
  parts,
  stockpiles = [],
  harvestCandidates = [],
  searchQuery,
  onSearchChange,
  onLogUse,
  onRestock,
  onAddPart,
  onHarvestTransfer,
  onOpenStockpileInventory,
}) => {
  const [filter, setFilter] = useState<'all' | 'reorder' | 'available' | 'harvest'>('all');
  const [selectedStockpileId, setSelectedStockpileId] = useState<string>('all');
  const [locationQuery, setLocationQuery] = useState<string>('');
  const [isLocationsExpanded, setIsLocationsExpanded] = useState<boolean>(false);
  const [expandedPriceHistoryId, setExpandedPriceHistoryId] = useState<number | null>(null);

  // Status row scroll cue state
  const statusRowRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = statusRowRef.current;
    if (!el) return;
    // Buffer of 2px to account for fractional pixel rounding
    const hasMoreRight = el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setCanScrollRight(hasMoreRight);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = statusRowRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, parts.length, harvestCandidates.length]);

  const filteredHarvestCandidates = harvestCandidates.filter(c => {
    if (filter === 'reorder') return false;
    if (selectedStockpileId !== 'all') return false; // Stockpile depot filter applies to warehouse parts
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const matchName = c.name?.toLowerCase().includes(query) ?? false;
    const matchBrand = c.brand?.toLowerCase().includes(query) ?? false;
    const matchType = c.type?.toLowerCase().includes(query) ?? false;
    const matchCat = c.category?.toLowerCase().includes(query) ?? false;
    const matchModel = c.model_number?.toLowerCase().includes(query) ?? false;
    const matchSerial = c.serial_number?.toLowerCase().includes(query) ?? false;
    const matchBuilding = c.building_name?.toLowerCase().includes(query) ?? false;
    const matchUnit = String(c.unit_number).toLowerCase().includes(query);

    return matchName || matchBrand || matchType || matchCat || matchModel || matchSerial || matchBuilding || matchUnit;
  });

  const filteredParts = filter === 'harvest' ? [] : parts.filter(p => {
    if (filter === 'reorder' && !p.is_reorder && (p.quantity_on_hand > p.reorder_point)) {
      return false;
    }
    if (filter === 'available' && p.quantity_on_hand <= 0) {
      return false;
    }

    if (selectedStockpileId !== 'all') {
      const spIdNum = parseInt(selectedStockpileId, 10);
      const inStockpile = p.stockpiles?.some(sp => sp.stockpile_id === spIdNum && sp.quantity > 0)
        || p.stockpile_id === spIdNum;
      if (!inStockpile) return false;
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

  const totalHits = filteredParts.length + (filter === 'reorder' ? 0 : filteredHarvestCandidates.length);

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative">
        <span aria-hidden="true" className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
          search
        </span>
        <input
          id="parts-search-input"
          type="search"
          placeholder="Search part #, model, or name..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all placeholder:text-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
           aria-label="Close">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Filter Chips Row with Scroll Cue */}
      <div className="relative w-full min-w-0">
        <div
          ref={statusRowRef}
          className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full min-w-0"
        >
          <button
            onClick={() => setFilter('all')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            All ({parts.length + harvestCandidates.length})
          </button>

          <button
            onClick={() => setFilter('reorder')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filter === 'reorder'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
            }`}
          >
            <span aria-hidden="true" className={`material-symbols-outlined text-[16px] ${filter === 'reorder' ? 'text-white' : 'text-amber-500'}`}>warning</span>
            Low Stock ({parts.filter(p => p.is_reorder || p.quantity_on_hand <= p.reorder_point).length})
          </button>

          <button
            onClick={() => setFilter('available')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filter === 'available'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
            }`}
          >
            <span aria-hidden="true" className={`material-symbols-outlined text-[16px] ${filter === 'available' ? 'text-white' : 'text-emerald-500'}`}>check_circle</span>
            In Stock ({parts.filter(p => p.quantity_on_hand > 0).length})
          </button>

          <button
            onClick={() => setFilter('harvest')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filter === 'harvest'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <span aria-hidden="true" className={`material-symbols-outlined text-[16px] ${filter === 'harvest' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>swap_horiz</span>
            Vacant Unit Harvest ({harvestCandidates.length})
          </button>
        </div>

        {/* Right edge scroll cue gradient fade (pointer-events-none, reactive to overflow & scroll position) */}
        {canScrollRight && (
          <div
            data-testid="parts-status-scroll-cue"
            className="absolute right-0 top-0 bottom-1 w-12 pointer-events-none transition-opacity duration-200 bg-gradient-to-l from-background-light dark:from-background-dark to-transparent flex items-center justify-end pr-1"
            aria-hidden="true"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-gray-400/60 dark:text-gray-500/60 text-sm">
              chevron_right
            </span>
          </div>
        )}
      </div>

      {/* Storage Location Filter Chips & Location Filter Input */}
      {stockpiles && stockpiles.length > 0 && (() => {
        const trimmedLocQuery = locationQuery.trim().toLowerCase();
        const filteredStockpiles = stockpiles.filter(sp => {
          if (!trimmedLocQuery) return true;
          const fullName = (sp.name || '').toLowerCase();
          const loc = (sp.location || '').toLowerCase();
          const abbr = abbreviateStockpileName(sp.name).toLowerCase();
          return fullName.includes(trimmedLocQuery) || loc.includes(trimmedLocQuery) || abbr.includes(trimmedLocQuery);
        });

        return (
          <div className="space-y-2.5 pt-1">
            {/* Location Filter Input Bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-base">
                  warehouse
                </span>
                <input
                  type="text"
                  placeholder="Filter locations…"
                  value={locationQuery}
                  onChange={e => setLocationQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-50 dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs transition-all placeholder:text-gray-400"
                />
                {locationQuery && (
                  <button
                    type="button"
                    onClick={() => setLocationQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full cursor-pointer"
                    aria-label="Clear location filter"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>
              <span className="text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark shrink-0 px-1">
                Showing {filteredStockpiles.length} of {stockpiles.length}
              </span>
            </div>

            {/* Top Row: All Locations Chip (Always Visible, sits outside two-row budget) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedStockpileId('all')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  selectedStockpileId === 'all'
                    ? 'bg-amber-500 text-brand-black shadow-xs'
                    : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
                }`}
              >
                <span>All Locations ({stockpiles.length})</span>
              </button>
            </div>

            {/* Property Chips Container (Collapsed to 2 rows by default unless filtered or expanded) */}
            {filteredStockpiles.length === 0 ? (
              <div className="w-full py-3 px-3.5 rounded-xl bg-gray-50 dark:bg-card-dark/60 border border-dashed border-gray-300 dark:border-gray-700 text-xs text-text-sub-light dark:text-text-sub-dark italic">
                No location matches &apos;{locationQuery}&apos;
              </div>
            ) : (
              <>
                <div
                  className={`flex flex-wrap items-center gap-1.5 transition-all ${
                    !trimmedLocQuery && !isLocationsExpanded
                      ? 'max-h-[84px] overflow-hidden'
                      : ''
                  }`}
                >
                  {filteredStockpiles.map(sp => {
                    const isSelected = selectedStockpileId === String(sp.id);
                    const abbrLabel = abbreviateStockpileName(sp.name);
                    return (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => setSelectedStockpileId(isSelected ? 'all' : String(sp.id))}
                        title={sp.name}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-brand-black font-bold shadow-xs'
                            : 'bg-gray-100 dark:bg-card-dark text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-neutral-800 border border-gray-200/60 dark:border-gray-800'
                        }`}
                      >
                        {abbrLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Expand / Collapse Affordance (Only shown when not actively filtering and more than 2 rows) */}
                {!trimmedLocQuery && (
                  <button
                    type="button"
                    onClick={() => setIsLocationsExpanded(!isLocationsExpanded)}
                    className="min-h-[44px] w-full py-2 px-3 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 dark:bg-card-dark dark:hover:bg-neutral-800 border border-gray-200/80 dark:border-gray-800 text-xs font-bold text-text-sub-light dark:text-text-sub-dark flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    aria-expanded={isLocationsExpanded}
                  >
                    <span>{isLocationsExpanded ? 'Show less ▴' : `Show all ${stockpiles.length} ▾`}</span>
                  </button>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Selected Stockpile Dedicated Location Inventory Banner */}
      {selectedStockpileId !== 'all' && onOpenStockpileInventory && (() => {
        const activeSp = stockpiles.find(s => String(s.id) === selectedStockpileId);
        if (!activeSp) return null;
        return (
          <div
            data-testid="depot-inventory-banner"
            onClick={() => onOpenStockpileInventory(activeSp.id)}
            className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-all group shadow-2xs"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenStockpileInventory(activeSp.id);
              }
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span aria-hidden="true" className="material-symbols-outlined text-amber-600 text-xl shrink-0">warehouse</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate flex items-center gap-1.5">
                  <span>{activeSp.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500 text-brand-black font-black uppercase">
                    Location Menu
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 truncate mt-0.5">
                  {activeSp.location} · Tap to see full stock &amp; manage this location
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 shrink-0">
              <span className="hidden sm:inline">Open Menu</span>
              <span aria-hidden="true" className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
        );
      })()}

      {/* Parts & Harvest Candidates List */}
      {totalHits === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3 bg-white/50 dark:bg-card-dark/50">
          <span aria-hidden="true" className="material-symbols-outlined text-4xl text-gray-300">inventory_2</span>
          <p className="text-base font-bold text-gray-700 dark:text-gray-300">No matching parts or harvest units found</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Try searching by part number, appliance type, building or unit, or buy a new replacement part.
          </p>
          {onAddPart && (
            <button
              onClick={onAddPart}
              className="min-h-[44px] px-4 py-2 mt-2 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
              <span>Buy New / Add Part</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 pb-8">
          {/* Harvest Candidates Ranked First (Stockpile/Vacant - Zero Cost) */}
          {filteredHarvestCandidates.map(candidate => (
            <div
              key={`harvest-${candidate.id}`}
              data-testid={`harvest-candidate-${candidate.id}`}
              className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs space-y-3 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 text-xs font-black rounded-lg bg-emerald-600 text-white tracking-wider flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[13px]">home_work</span>
                      {candidate.occupancy_label || 'Vacant unit'}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {candidate.building_name} • Unit {candidate.unit_number}
                    </span>
                    {candidate.category && (
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        {candidate.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-extrabold text-brand-black dark:text-white mt-1.5 leading-snug">
                    {candidate.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {candidate.brand} • Model: {candidate.model_number || 'N/A'} {candidate.serial_number ? `• SN: ${candidate.serial_number}` : ''}
                  </p>
                </div>

                <div className="shrink-0">
                  <span className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 border border-emerald-200 dark:border-emerald-700">
                    <span aria-hidden="true" className="material-symbols-outlined text-[15px]">eco</span>
                    <span>Harvest First (Zero Cost)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 pt-1 flex-wrap gap-2">
                <span className="flex items-center gap-1">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-emerald-600">door_front</span>
                  Location: {candidate.building_name} (Unit {candidate.unit_number}) • Status: {candidate.status || 'operational'}
                </span>
                {onHarvestTransfer && (
                  <button
                    onClick={() => onHarvestTransfer(candidate)}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">swap_horiz</span>
                    <span>Harvest / Transfer</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredParts.map(part => {
            const isReorder = part.is_reorder || part.quantity_on_hand <= part.reorder_point;
            const isHistoryExpanded = expandedPriceHistoryId === part.id;

            return (
              <div
                key={part.id}
                className={`p-4 rounded-2xl border bg-white dark:bg-card-dark shadow-xs space-y-3.5 transition-all ${
                  isReorder
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                {/* Header row: Part #, Title, and Reorder Flag */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 text-sm font-mono font-black rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 tracking-wider">
                        {part.part_number || 'NO-PART-#'}
                      </span>
                      {isVerifiedPart(part.part_number) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title="Fitment-verified part: Part number and compatible model are locked">
                          <span aria-hidden="true" className="material-symbols-outlined text-[13px]">lock</span>
                          <span>Verified part</span>
                        </span>
                      )}
                      {part.category && (
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {part.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold text-brand-black dark:text-white mt-1.5 leading-snug">
                      {part.name}
                    </h3>
                  </div>

                  {/* Dynamic Reorder Status Flag */}
                  <div className="shrink-0">
                    {isReorder ? (
                      <span className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 text-white flex items-center gap-1.5 shadow-xs">
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">warning</span>
                        <span>Reorder (Qty: {part.quantity_on_hand} ≤ {part.reorder_point})</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>In Stock ({part.quantity_on_hand})</span>
                      </span>
                    )}
                  </div>
                </div>

                {part.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {part.description}
                  </p>
                )}

                {/* Compatible Models Badges */}
                {part.compatible_models && part.compatible_models.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                        Compatible Models ({part.compatible_models.length})
                      </span>
                      {isVerifiedPart(part.part_number) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <span aria-hidden="true" className="material-symbols-outlined text-[13px]">lock</span>
                          <span>Model locked</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {part.compatible_models.map((model, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200/50 dark:border-blue-900/50"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Location & Stock Breakdown */}
                <div className="bg-gray-50 dark:bg-neutral-800/60 p-3.5 rounded-xl space-y-2.5 text-sm">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-primary">warehouse</span>
                      Stock Breakdown:
                    </span>
                    <span className="font-extrabold text-brand-black dark:text-white">
                      {part.quantity_on_hand} in active stock
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 pl-6">
                    {part.stockpiles && part.stockpiles.length > 0 ? (
                      part.stockpiles.map((sp, i) => {
                        const isLowStock = typeof sp.minimum === 'number' && sp.quantity < sp.minimum;
                        return (
                          <div key={i} className="flex justify-between items-center py-0.5">
                            <span className="flex items-center gap-1.5 flex-wrap">
                              <span>• {sp.stockpile_name} ({sp.stockpile_location})</span>
                              {sp.location_notes ? <span className="text-gray-400">({sp.location_notes})</span> : null}
                              {typeof sp.minimum === 'number' && (
                                <span className="text-[10px] text-gray-500 font-mono">min: {sp.minimum}</span>
                              )}
                              {isLowStock && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                  <span aria-hidden="true" className="material-symbols-outlined text-[12px]">warning</span>
                                  Low Stock
                                </span>
                              )}
                            </span>
                            <span className={`font-mono font-bold text-xs ${sp.status === 'available' ? (isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400') : 'text-gray-400'}`}>
                              {sp.quantity} {sp.status}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p>{part.stock_summary || `${part.quantity_on_hand} units available`}</p>
                    )}
                  </div>
                </div>

                {/* Price / Order History Section */}
                {part.price_history && part.price_history.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800/80 pt-2.5 text-sm">
                    <button
                      onClick={() => setExpandedPriceHistoryId(isHistoryExpanded ? null : part.id)}
                      className="w-full min-h-[44px] flex items-center justify-between text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white py-1"
                    >
                      <span className="flex items-center gap-1.5 font-bold text-xs">
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">receipt_long</span>
                        Price & Order History ({part.price_history.length} purchases)
                      </span>
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                        {isHistoryExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isHistoryExpanded && (
                      <div className="mt-2 space-y-2 bg-gray-50 dark:bg-neutral-800/40 p-3 rounded-xl animate-fadeIn">
                        {part.price_history.map((order, oIdx) => (
                          <div key={oIdx} className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">{order.date}</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
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
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onRestock ? onRestock(part) : onLogUse(part)}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:border-primary text-brand-black dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      title="Add units of this part to stash"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-primary">add_box</span>
                      <span>+ Restock</span>
                    </button>

                    <button
                      onClick={() => onLogUse(part)}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">build</span>
                      <span>Log Use</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
