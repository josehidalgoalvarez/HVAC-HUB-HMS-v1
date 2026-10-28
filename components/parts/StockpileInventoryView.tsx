import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { PullToRefresh } from '../common/PullToRefresh';
import { StockTransferModal } from './StockTransferModal';
import { LogPartUseModal, type LogPartUseResult } from './LogPartUseModal';
import { AddPartModal } from './AddPartModal';
import type { Stockpile, StockpilePartItem, PartRecord } from '../../types/domain';

interface StockpileInventoryViewProps {
  stockpileId: number | string;
  onBack: () => void;
  onOpenTicket?: (ticketId: string) => void;
}

export const StockpileInventoryView: React.FC<StockpileInventoryViewProps> = ({
  stockpileId,
  onBack,
  onOpenTicket,
}) => {
  const [stockpile, setStockpile] = useState<Stockpile | null>(null);
  const [allStockpiles, setAllStockpiles] = useState<Stockpile[]>([]);
  const [items, setItems] = useState<StockpilePartItem[]>([]);
  const [allParts, setAllParts] = useState<PartRecord[]>([]);
  const [storedAppliances, setStoredAppliances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBelowMinOnly, setFilterBelowMinOnly] = useState(false);
  const [flashMsg, setFlashMsg] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  // Modals state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [activePartForUsage, setActivePartForUsage] = useState<PartRecord | null>(null);
  const [initialUsageMode, setInitialUsageMode] = useState<'use' | 'restock'>('use');
  const [movingAppliance, setMovingAppliance] = useState<any | null>(null);
  const [moveDisposition, setMoveDisposition] = useState<'installed' | 'harvested' | 'disposed' | 'stored'>('installed');
  const [moveUnitId, setMoveUnitId] = useState('');
  const [moveNotes, setMoveNotes] = useState('');
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);

  const cacheKey = `stockpile_parts_${stockpileId}`;
  const appCacheKey = `stockpile_appliances_${stockpileId}`;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [spRes, partsRes, stockRes, appRes] = await Promise.allSettled([
        apiClient.getStockpiles(),
        apiClient.getParts(),
        apiClient.getStockpileParts(stockpileId),
        apiClient.getStockpileAppliances(stockpileId),
      ]);

      if (spRes.status === 'fulfilled' && spRes.value) {
        setAllStockpiles(spRes.value);
        const current = spRes.value.find(s => String(s.id) === String(stockpileId));
        if (current) setStockpile(current);
        appCache.set('stockpiles', spRes.value);
      }

      if (partsRes.status === 'fulfilled' && partsRes.value) {
        setAllParts(partsRes.value);
        appCache.set('parts', partsRes.value);
      }

      if (stockRes.status === 'fulfilled' && stockRes.value) {
        setItems(stockRes.value);
        appCache.set(cacheKey, stockRes.value);
      }

      if (appRes.status === 'fulfilled' && Array.isArray(appRes.value)) {
        setStoredAppliances(appRes.value);
        appCache.set(appCacheKey, appRes.value);
      }
    } catch (err) {
      console.warn('Error loading stockpile inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, [stockpileId, cacheKey, appCacheKey]);

  useEffect(() => {
    // 1. Instant cache load
    Promise.all([
      appCache.get<Stockpile[]>('stockpiles'),
      appCache.get<StockpilePartItem[]>(cacheKey),
      appCache.get<PartRecord[]>('parts'),
      appCache.get<any[]>(appCacheKey),
    ]).then(([cachedStockpiles, cachedItems, cachedParts, cachedAppliances]) => {
      if (cachedStockpiles && cachedStockpiles.length > 0) {
        setAllStockpiles(cachedStockpiles);
        const current = cachedStockpiles.find(s => String(s.id) === String(stockpileId));
        if (current) setStockpile(current);
      }
      if (cachedItems) {
        setItems(cachedItems);
      }
      if (cachedParts) {
        setAllParts(cachedParts);
      }
      if (cachedAppliances) {
        setStoredAppliances(cachedAppliances);
      }
    });

    // 2. Fresh fetch
    loadData();

    // 3. Global refresh listener
    const handleGlobalRefresh = () => loadData();
    window.addEventListener('hvachome:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('hvachome:refresh', handleGlobalRefresh);
  }, [stockpileId, loadData, cacheKey, appCacheKey]);

  const handleApplianceMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingAppliance) return;
    try {
      setIsSubmittingMove(true);
      await apiClient.moveAppliance(movingAppliance.id, {
        disposition: moveDisposition,
        to_unit_id: moveUnitId ? Number(moveUnitId) : null,
        to_stockpile_id: moveDisposition === 'stored' ? Number(stockpileId) : null,
        notes: moveNotes,
      });

      setFlashMsg({
        text: `Appliance moved / status updated to ${moveDisposition.toUpperCase()}!`,
        type: 'success',
      });
      setTimeout(() => setFlashMsg(null), 5000);
      setMovingAppliance(null);
      setMoveNotes('');
      setMoveUnitId('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update appliance disposition');
    } finally {
      setIsSubmittingMove(false);
    }
  };

  const handleUsePartSuccess = async (payload: LogPartUseResult) => {
    if (!activePartForUsage) return;

    try {
      if (payload.mode === 'restock') {
        const newQty = (activePartForUsage.quantity_on_hand || 0) + payload.quantity;
        await apiClient.updatePart(
          activePartForUsage.id,
          {
            quantity_on_hand: newQty,
            stockpile_id: payload.stockpile_id || Number(stockpileId),
            is_reorder: newQty <= activePartForUsage.reorder_point,
          },
          payload.reason || 'Restocked parts stash'
        );

        setActivePartForUsage(null);
        setFlashMsg({
          text: `Added ${payload.quantity} units to location stock.`,
          type: 'success',
        });
        setTimeout(() => setFlashMsg(null), 5000);
        await loadData();
        return;
      }

      // Consume/use part
      const result = await apiClient.usePart(activePartForUsage.id, {
        ...payload,
        stockpile_id: payload.stockpile_id || Number(stockpileId),
      });

      setActivePartForUsage(null);
      if (result.is_reorder) {
        setFlashMsg({
          text: `Logged usage: stock dropped to ${result.new_quantity}. REORDER FLAG RAISED!`,
          type: 'warning',
        });
      } else {
        setFlashMsg({
          text: `Logged usage of ${result.quantity_used} units. Remaining total: ${result.new_quantity}`,
          type: 'success',
        });
      }
      setTimeout(() => setFlashMsg(null), 5000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update part stock');
    }
  };

  const handleTransferSuccess = async () => {
    setIsTransferOpen(false);
    setFlashMsg({
      text: 'Stock transfer completed successfully!',
      type: 'success',
    });
    setTimeout(() => setFlashMsg(null), 5000);
    await loadData();
  };

  const handleAddPartSuccess = async (newPart: PartRecord) => {
    setIsAddPartOpen(false);
    setFlashMsg({
      text: `Part "${newPart.name}" added to location successfully!`,
      type: 'success',
    });
    setTimeout(() => setFlashMsg(null), 5000);
    await loadData();
  };

  // Convert StockpilePartItem to PartRecord for modals
  const openModalForPart = (item: StockpilePartItem, mode: 'use' | 'restock') => {
    const matched = allParts.find(p => String(p.id) === String(item.part_id));
    if (matched) {
      setActivePartForUsage(matched);
    } else {
      // Fallback synthetic PartRecord from item
      const syntheticPart: PartRecord = {
        id: item.part_id,
        name: item.part_name,
        partNumber: item.part_number,
        part_number: item.part_number || '',
        category: item.category,
        description: item.description,
        quantityOnHand: item.total_quantity_on_hand,
        quantity_on_hand: item.total_quantity_on_hand,
        minQuantity: item.minimum,
        min_quantity: item.minimum,
        reorderPoint: item.reorder_point,
        reorder_point: item.reorder_point,
        unitCost: item.unit_cost,
        unit_cost: item.unit_cost,
        stockpileId: item.stockpile_id,
        stockpile_id: item.stockpile_id,
        is_reorder: item.is_below_minimum,
        compatible_models: item.compatible_models || [],
        price_history: [],
      };
      setActivePartForUsage(syntheticPart);
    }
    setInitialUsageMode(mode);
  };

  // Metrics calculation
  const totalPartsCount = items.length;
  const totalQuantityUnits = items.reduce((sum, item) => sum + (item.status === 'placeholder' ? 0 : (item.quantity || 0)), 0);
  const lowStockCount = items.filter(item => item.status !== 'placeholder' && (item.is_below_minimum || item.quantity < item.minimum)).length;

  const isCentralNode = stockpile?.name?.includes('511 Days') ||
    stockpile?.location?.includes('511 Days') ||
    stockpile?.id === 1 ||
    stockpile?.id === '1' ||
    stockpile?.building_id === 15;

  // Filtered items
  const filteredItems = items.filter(item => {
    if (filterBelowMinOnly && (item.status === 'placeholder' || !(item.is_below_minimum || item.quantity < item.minimum))) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.part_name?.toLowerCase().includes(q);
      const matchNum = item.part_number?.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      return matchName || matchNum || matchCat || matchDesc;
    }
    return true;
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-32 pb-safe animate-fadeIn text-brand-black dark:text-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="w-11 h-11 min-h-[44px] rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">warehouse</span>
              <span className="truncate">{stockpile?.name || `Storage Location #${stockpileId}`}</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {stockpile?.location || 'Storage Node Inventory'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="w-11 h-11 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
            title="Refresh Inventory"
            aria-label="Refresh Inventory"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </div>
      </div>

      {/* Role / Node Callout */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
        <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">inventory_2</span>
        <div className="flex-1 min-w-0">
          {isCentralNode ? (
            <>
              <strong>Central Storage Depot:</strong> Primary replacement inventory and master parts stash for the BD portfolio.
            </>
          ) : (
            <>
              <strong>Storage Location Node:</strong> On-site equipment storage, spare parts depot, and maintenance staging.
            </>
          )}
          {stockpile?.notes && (
            <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 opacity-90 truncate">
              {stockpile.notes}
            </div>
          )}
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-white dark:bg-card-dark border border-gray-200/80 dark:border-gray-800 shadow-xs text-center">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Parts Types</div>
          <div className="text-xl font-black text-brand-black dark:text-white mt-0.5">{totalPartsCount}</div>
        </div>
        <div className="p-3 rounded-2xl bg-white dark:bg-card-dark border border-gray-200/80 dark:border-gray-800 shadow-xs text-center">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Total Units</div>
          <div className="text-xl font-black text-primary mt-0.5">{totalQuantityUnits}</div>
        </div>
        <button
          onClick={() => setFilterBelowMinOnly(prev => !prev)}
          className={`p-3 rounded-2xl border shadow-xs text-center transition-all ${
            filterBelowMinOnly
              ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200'
              : 'bg-white dark:bg-card-dark border-gray-200/80 dark:border-gray-800'
          }`}
        >
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Low Stock</div>
          <div className={`text-xl font-black mt-0.5 ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
            {lowStockCount}
          </div>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsAddPartOpen(true)}
          className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Part Here</span>
        </button>
        <button
          onClick={() => setIsTransferOpen(true)}
          className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-brand-black dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">move_down</span>
          <span>Transfer Stock</span>
        </button>
      </div>

      {/* Flash Alert */}
      {flashMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
            flashMsg.type === 'warning'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
              : 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {flashMsg.type === 'warning' ? 'warning' : 'check_circle'}
          </span>
          <span>{flashMsg.text}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter parts at this location..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-gray-100 dark:bg-neutral-800/80 border border-gray-200/80 dark:border-gray-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary text-brand-black dark:text-white placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          {filterBelowMinOnly && (
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[15px]">filter_alt</span>
                Filtering: Low stock only ({lowStockCount})
              </span>
              <button
                onClick={() => setFilterBelowMinOnly(false)}
                className="font-bold underline text-amber-800 dark:text-amber-200"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Stock List or Honest Empty State */}
      <PullToRefresh onRefresh={loadData}>
        {items.length === 0 ? (
          /* Honest Empty State for Location */
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3 bg-white/50 dark:bg-card-dark/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-400">
              <span className="material-symbols-outlined text-3xl">inventory_2</span>
            </div>
            <div>
              <p className="text-base font-bold text-gray-700 dark:text-gray-200">
                No parts recorded at this location yet
              </p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                Stock records will reflect here once parts are added or transferred to {stockpile?.name || 'this location'}.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={() => setIsAddPartOpen(true)}
                className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Part to Location</span>
              </button>
              {allParts.length > 0 && (
                <button
                  onClick={() => setIsTransferOpen(true)}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 text-brand-black dark:text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">move_down</span>
                  <span>Transfer from Another Depot</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Filter zero hits */
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-2 bg-white/40 dark:bg-card-dark/40">
            <span className="material-symbols-outlined text-3xl text-gray-400">search_off</span>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">No parts matching &ldquo;{searchQuery}&rdquo;</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterBelowMinOnly(false);
              }}
              className="text-xs text-primary font-bold underline mt-1"
            >
              Reset filter
            </button>
          </div>
        ) : (
          /* Inventory Items Grid */
          <div className="space-y-3">
            {filteredItems.map(item => {
              const isPlaceholder = item.status === 'placeholder';
              const isBelowMin = !isPlaceholder && (item.is_below_minimum || item.quantity < item.minimum);
              return (
                <div
                  key={`item-${item.allocation_id}`}
                  className={`p-4 rounded-2xl bg-white dark:bg-card-dark border transition-all ${
                    isBelowMin
                      ? 'border-amber-400/80 dark:border-amber-600/70 shadow-xs'
                      : isPlaceholder
                      ? 'border-gray-200/60 dark:border-gray-800/80 shadow-xs bg-gray-50/30 dark:bg-card-dark/60'
                      : 'border-gray-200/80 dark:border-gray-800 shadow-xs'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.category && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                            {item.category}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isPlaceholder
                              ? 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-extrabold'
                              : item.status === 'available'
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : item.status === 'on_hold'
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          {isPlaceholder ? 'Placeholder' : item.status.replace('_', ' ')}
                        </span>
                        {isBelowMin && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-brand-black flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            Below Min ({item.quantity}/{item.minimum})
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-brand-black dark:text-white mt-1.5 leading-snug">
                        {item.part_name}
                      </h3>

                      {item.part_number && (
                        <div className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">tag</span>
                          {item.part_number}
                        </div>
                      )}
                    </div>

                    {/* Stock Quantity Display */}
                    <div className="text-right shrink-0">
                      {isPlaceholder ? (
                        <>
                          <div className="text-xl font-black text-gray-400 dark:text-gray-500">
                            TBD
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">
                            To Count
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-black text-brand-black dark:text-white">
                            {item.quantity}
                          </div>
                          <div className="text-[11px] text-gray-400 font-medium">
                            Min: {item.minimum}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes / Context */}
                  {(item.location_notes || item.description) && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-neutral-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                      {item.location_notes && (
                        <div className="flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[14px] text-gray-400">place</span>
                          <span>{item.location_notes}</span>
                        </div>
                      )}
                      {item.description && !item.location_notes && (
                        <div className="line-clamp-2">{item.description}</div>
                      )}
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <button
                      onClick={() => openModalForPart(item, 'use')}
                      disabled={item.quantity <= 0}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-brand-black dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px] text-amber-600">remove_circle_outline</span>
                      <span>Use Part</span>
                    </button>

                    <button
                      onClick={() => openModalForPart(item, 'restock')}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-brand-black dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">add_circle_outline</span>
                      <span>Restock</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsTransferOpen(true);
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-brand-black dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      title="Transfer Stock"
                      aria-label="Transfer Stock"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">swap_horiz</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PullToRefresh>

      {/* Stored Appliances Section (distinct from parts) */}
      <div className="space-y-3 pt-4 border-t border-gray-200/80 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">kitchen</span>
            <h2 className="text-base font-bold text-brand-black dark:text-white">
              Stored Appliances
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Appliance ({storedAppliances.length})
            </span>
          </div>
        </div>

        {storedAppliances.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400 bg-gray-50/50 dark:bg-card-dark/40">
            No donor or stored appliances currently logged at this location.
          </div>
        ) : (
          <div className="space-y-3">
            {storedAppliances.map((app: any) => {
              const modelDisp = app.model_number && app.model_number.trim() !== '' ? app.model_number : 'TBD (Unknown)';
              const serialDisp = app.serial_number && app.serial_number.trim() !== '' ? app.serial_number : 'TBD (Unknown)';
              return (
                <div
                  key={`appliance-${app.id}`}
                  className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                          APPLIANCE
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                          {app.type || 'Appliance'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {app.status || 'stored'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-brand-black dark:text-white truncate">
                        {app.name}
                      </h3>
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                        <div>
                          <span className="font-semibold text-gray-600 dark:text-gray-300">Model: </span>
                          <span className={modelDisp.startsWith('TBD') ? 'font-mono text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                            {modelDisp}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600 dark:text-gray-300">Serial: </span>
                          <span className={serialDisp.startsWith('TBD') ? 'font-mono text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                            {serialDisp}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setMovingAppliance(app);
                        setMoveDisposition('installed');
                        setMoveNotes('');
                        setMoveUnitId('');
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">outbox</span>
                      <span>Move / Install</span>
                    </button>
                  </div>

                  {app.notes && (
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
                      <span className="font-semibold text-brand-black dark:text-white">Note: </span>
                      {app.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals Reuse */}
      {isTransferOpen && (
        <StockTransferModal
          isOpen={isTransferOpen}
          parts={allParts}
          stockpiles={allStockpiles}
          initialSourceStockpileId={stockpileId}
          onClose={() => setIsTransferOpen(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {isAddPartOpen && (
        <AddPartModal
          isOpen={isAddPartOpen}
          stockpiles={allStockpiles}
          initialStockpileId={stockpileId}
          onClose={() => setIsAddPartOpen(false)}
          onSuccess={handleAddPartSuccess}
        />
      )}

      {activePartForUsage && (
        <LogPartUseModal
          part={activePartForUsage}
          stockpiles={allStockpiles}
          initialMode={initialUsageMode}
          initialStockpileId={stockpileId}
          onClose={() => setActivePartForUsage(null)}
          onSuccess={handleUsePartSuccess}
        />
      )}

      {/* Move / Install Appliance Modal */}
      {movingAppliance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-brand-black dark:text-white truncate">
                  Move / Install Appliance
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {movingAppliance.name} (ID #{movingAppliance.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovingAppliance(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleApplianceMoveSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Disposition / Action
                </label>
                <select
                  value={moveDisposition}
                  onChange={e => setMoveDisposition(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 text-xs font-semibold text-brand-black dark:text-white"
                >
                  <option value="installed">Install into Unit (Operational)</option>
                  <option value="stored">Keep Stored / Relocate</option>
                  <option value="harvested">Mark as Donor / Harvested</option>
                  <option value="disposed">Scrap / Disposed</option>
                </select>
              </div>

              {moveDisposition === 'installed' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Destination Unit ID
                  </label>
                  <input
                    type="number"
                    value={moveUnitId}
                    onChange={e => setMoveUnitId(e.target.value)}
                    required
                    placeholder="e.g. 137"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 text-xs text-brand-black dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Enter the unit database ID to assign and mark as operational.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Movement Notes / Work Order
                </label>
                <textarea
                  value={moveNotes}
                  onChange={e => setMoveNotes(e.target.value)}
                  rows={2}
                  placeholder="Reason for movement, tech notes, or work order reference..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 text-xs text-brand-black dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovingAppliance(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 text-xs font-bold text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMove}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-primary hover:bg-blue-600 text-xs font-bold text-white shadow-xs"
                >
                  {isSubmittingMove ? 'Saving...' : 'Record Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockpileInventoryView;
