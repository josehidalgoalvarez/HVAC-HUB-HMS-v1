import React, { useState, useEffect } from 'react';
import { apiClient } from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { PullToRefresh } from '../common/PullToRefresh';
import { PartSearchSection } from './PartSearchSection';
import { SupplierDirectorySection } from './SupplierDirectorySection';
import { HarvestSourcingView } from './HarvestSourcingView';
import { LogPartUseModal, type LogPartUseResult } from './LogPartUseModal';
import { AddPartModal } from './AddPartModal';
import { HarvestTransferModal } from './HarvestTransferModal';
import { StockTransferModal } from './StockTransferModal';
import { SEED_PARTS, SEED_STOCKPILES, SEED_SUPPLIERS } from './partsSeedData';
import type { PartRecord, Stockpile, SupplierRecord, HarvestCandidate } from '../../types/domain';

interface PartsViewProps {
  onBack?: () => void;
  onOpenTicket?: (ticketId: string) => void;
  onOpenStockpileInventory?: (stockpileId: number | string) => void;
  onOpenBuyList?: () => void;
}

export const PartsView: React.FC<PartsViewProps> = ({
  onBack,
  onOpenTicket,
  onOpenStockpileInventory,
  onOpenBuyList,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'harvest' | 'suppliers'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [parts, setParts] = useState<PartRecord[]>(SEED_PARTS);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>(SEED_STOCKPILES);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(SEED_SUPPLIERS);
  const [harvestCandidates, setHarvestCandidates] = useState<HarvestCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [flashMsg, setFlashMsg] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  // Modal state
  const [activePartForUsage, setActivePartForUsage] = useState<PartRecord | null>(null);
  const [initialPartUsageMode, setInitialPartUsageMode] = useState<'use' | 'restock'>('use');
  const [activeCandidateForTransfer, setActiveCandidateForTransfer] = useState<HarvestCandidate | null>(null);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isTransferStockOpen, setIsTransferStockOpen] = useState(false);

  const loadPartsData = async () => {
    try {
      setLoading(true);
      const [partsRes, spRes, suppRes, harvestRes] = await Promise.allSettled([
        apiClient.getParts(),
        apiClient.getStockpiles(),
        apiClient.getSuppliers(),
        apiClient.getHarvestCandidates(),
      ]);

      if (partsRes.status === 'fulfilled' && partsRes.value && partsRes.value.length > 0) {
        setParts(partsRes.value);
        appCache.set('parts', partsRes.value);
      }

      if (spRes.status === 'fulfilled' && spRes.value && spRes.value.length > 0) {
        setStockpiles(spRes.value);
        appCache.set('stockpiles', spRes.value);
      }

      if (suppRes.status === 'fulfilled' && suppRes.value && suppRes.value.length > 0) {
        setSuppliers(suppRes.value);
        appCache.set('suppliers', suppRes.value);
      }

      if (harvestRes.status === 'fulfilled' && harvestRes.value) {
        setHarvestCandidates(harvestRes.value);
        appCache.set('harvestCandidates', harvestRes.value);
      }
    } catch (err) {
      console.warn('Using cached/seeded parts data due to offline/API error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Instant non-blocking cache population
    Promise.all([
      appCache.get<PartRecord[]>('parts'),
      appCache.get<Stockpile[]>('stockpiles'),
      appCache.get<SupplierRecord[]>('suppliers'),
    ]).then(([cp, cs, csupp]) => {
      if (cp && cp.length) setParts(cp);
      if (cs && cs.length) setStockpiles(cs);
      if (csupp && csupp.length) setSuppliers(csupp);
    });

    // 2. Background revalidation
    loadPartsData();

    // 3. Global refresh listener
    const handleGlobalRefresh = () => loadPartsData();
    window.addEventListener('hvachome:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('hvachome:refresh', handleGlobalRefresh);
  }, []);

  const handleUsePartSuccess = async (payload: LogPartUseResult) => {
    if (!activePartForUsage) return;

    try {
      if (payload.mode === 'restock') {
        const newQty = (activePartForUsage.quantity_on_hand || 0) + payload.quantity;
        const updatedPart = await apiClient.updatePart(
          activePartForUsage.id,
          {
            quantity_on_hand: newQty,
            stockpile_id: payload.stockpile_id,
            is_reorder: newQty <= activePartForUsage.reorder_point,
          },
          payload.reason || 'Restocked parts stash'
        );

        setParts(prev =>
          prev.map(p => (p.id === activePartForUsage.id ? updatedPart : p))
        );
        appCache.set('parts', parts.map(p => (p.id === activePartForUsage.id ? updatedPart : p)));

        setActivePartForUsage(null);
        setFlashMsg({
          text: `Added ${payload.quantity} units to stash. New stock: ${updatedPart.quantity_on_hand} pcs`,
          type: 'success',
        });
        setTimeout(() => setFlashMsg(null), 5000);
        return;
      }

      // Default: consume/use part
      const result = await apiClient.usePart(activePartForUsage.id, payload);
      // Update local state
      setParts(prev =>
        prev.map(p => (p.id === activePartForUsage.id ? (result.part || { ...p, quantity_on_hand: result.new_quantity, is_reorder: result.is_reorder }) : p))
      );
      appCache.set('parts', parts.map(p => (p.id === activePartForUsage.id ? (result.part || { ...p, quantity_on_hand: result.new_quantity, is_reorder: result.is_reorder }) : p)));

      setActivePartForUsage(null);
      if (result.is_reorder) {
        setFlashMsg({
          text: `Logged usage: stock dropped to ${result.new_quantity} pcs. REORDER FLAG RAISED!`,
          type: 'warning',
        });
      } else {
        setFlashMsg({
          text: `Logged usage of ${result.quantity_used} pcs. Remaining stock: ${result.new_quantity}`,
          type: 'success',
        });
      }
      setTimeout(() => setFlashMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to update part in stash');
    }
  };

  const handleAddPartSuccess = (newPart: PartRecord) => {
    setParts(prev => [newPart, ...prev]);
    appCache.set('parts', [newPart, ...parts]);
    setIsAddPartOpen(false);
    setFlashMsg({
      text: `Part "${newPart.name}" added to stash successfully!`,
      type: 'success',
    });
    setTimeout(() => setFlashMsg(null), 5000);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-32 pb-safe animate-fadeIn text-brand-black dark:text-white">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-2xl">precision_manufacturing</span>
              Parts & Stockpiles
            </h1>
            <p className="text-xs text-gray-500">Inventory & suppliers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenBuyList && (
            <button
              id="open-buylist-btn"
              onClick={onOpenBuyList}
              className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              title="Open Buy List Full Screen"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
              <span>Buy List</span>
            </button>
          )}

          <button
            id="transfer-stock-btn"
            onClick={() => setIsTransferStockOpen(true)}
            className="flex-1 sm:flex-none min-h-[44px] px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-brand-black dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700 active:scale-95 transition-all"
            title="Transfer Stock Between Stockpiles"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">move_down</span>
            <span>Transfer</span>
          </button>

          <button
            id="add-part-btn"
            onClick={() => setIsAddPartOpen(true)}
            className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-brand-black dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700 active:scale-95 transition-all"
            title="Add Part to Stash"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Part</span>
          </button>

          <button
            onClick={loadPartsData}
            disabled={loading}
            className="w-11 h-11 shrink-0 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="Refresh Catalog"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </div>
      </div>

      {/* Flash Alert Message */}
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

      {/* Navigation Tab Bar */}
      <div className="flex rounded-2xl bg-gray-100 dark:bg-neutral-800/80 p-1 border border-gray-200/50 dark:border-gray-800">
        <button
          id="parts-tab-search"
          onClick={() => setActiveTab('search')}
          className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'search'
              ? 'bg-white dark:bg-card-dark text-primary shadow-xs'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">search</span>
          Catalog
        </button>

        <button
          id="parts-tab-harvest"
          onClick={() => setActiveTab('harvest')}
          className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'harvest'
              ? 'bg-white dark:bg-card-dark text-primary shadow-xs'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
          Harvest Sources
        </button>

        {onOpenBuyList && (
          <button
            id="parts-tab-shopping"
            onClick={onOpenBuyList}
            className="flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
            Buy List
          </button>
        )}

        <button
          id="parts-tab-suppliers"
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'suppliers'
              ? 'bg-white dark:bg-card-dark text-primary shadow-xs'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">store</span>
          Suppliers
        </button>
      </div>

      {/* Tab Panels */}
      <PullToRefresh onRefresh={loadPartsData}>
        {activeTab === 'search' && (
          <PartSearchSection
            parts={parts}
            stockpiles={stockpiles}
            harvestCandidates={harvestCandidates}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onLogUse={part => {
              setActivePartForUsage(part);
              setInitialPartUsageMode('use');
            }}
            onRestock={part => {
              setActivePartForUsage(part);
              setInitialPartUsageMode('restock');
            }}
            onAddPart={() => setIsAddPartOpen(true)}
            onHarvestTransfer={candidate => setActiveCandidateForTransfer(candidate)}
            onOpenStockpileInventory={onOpenStockpileInventory}
          />
        )}

        {activeTab === 'harvest' && (
          <HarvestSourcingView
            stockpiles={stockpiles}
            harvestCandidates={harvestCandidates}
            onOpenStockpileInventory={onOpenStockpileInventory}
          />
        )}

        {activeTab === 'suppliers' && (
          <SupplierDirectorySection suppliers={suppliers} />
        )}
      </PullToRefresh>

      {/* Log Part Use / Restock Modal */}
      {activePartForUsage && (
        <LogPartUseModal
          part={activePartForUsage}
          stockpiles={stockpiles}
          initialMode={initialPartUsageMode}
          onClose={() => setActivePartForUsage(null)}
          onSuccess={handleUsePartSuccess}
        />
      )}

      {/* Add Part Modal */}
      <AddPartModal
        isOpen={isAddPartOpen}
        stockpiles={stockpiles}
        onClose={() => setIsAddPartOpen(false)}
        onSuccess={handleAddPartSuccess}
      />

      {/* Stockpile Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferStockOpen}
        parts={parts}
        stockpiles={stockpiles}
        onClose={() => setIsTransferStockOpen(false)}
        onSuccess={(result) => {
          loadPartsData();
          setFlashMsg({
            text: `Transferred ${result.quantity || 1}x ${result.item_name || 'part'} between stockpiles! Provenance audit logged.`,
            type: 'success',
          });
          setTimeout(() => setFlashMsg(null), 5000);
        }}
      />

      {/* Harvest from Vacant Unit Modal */}
      {activeCandidateForTransfer && (
        <HarvestTransferModal
          candidate={activeCandidateForTransfer}
          stockpiles={stockpiles}
          isOpen={true}
          onClose={() => setActiveCandidateForTransfer(null)}
          onSuccess={(result) => {
            loadPartsData();
            setFlashMsg({
              text: `Transferred ${result.item_name || 'appliance'} from vacant unit! Stock transfer and append-only correction logged.`,
              type: 'success',
            });
            setTimeout(() => setFlashMsg(null), 5000);
          }}
        />
      )}
    </div>
  );
};

export default PartsView;
