import React, { useState, useEffect } from 'react';
import { apiClient } from '../../src/api/client';
import { appCache } from '../../src/offline/cache';
import { PullToRefresh } from '../common/PullToRefresh';
import { PartSearchSection } from './PartSearchSection';
import { ShoppingListSection } from './ShoppingListSection';
import { SupplierDirectorySection } from './SupplierDirectorySection';
import { LogPartUseModal, type LogPartUseResult } from './LogPartUseModal';
import { AddPartModal } from './AddPartModal';
import { SEED_PARTS, SEED_STOCKPILES, SEED_SUPPLIERS } from './partsSeedData';
import type { PartRecord, Stockpile, SupplierRecord } from '../../types/domain';

interface PartsViewProps {
  onBack?: () => void;
  onOpenTicket?: (ticketId: string) => void;
}

export const PartsView: React.FC<PartsViewProps> = ({ onBack, onOpenTicket }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'shopping' | 'suppliers'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [parts, setParts] = useState<PartRecord[]>(SEED_PARTS);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>(SEED_STOCKPILES);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(SEED_SUPPLIERS);
  const [loading, setLoading] = useState(false);
  const [flashMsg, setFlashMsg] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  // Modal state
  const [activePartForUsage, setActivePartForUsage] = useState<PartRecord | null>(null);
  const [initialPartUsageMode, setInitialPartUsageMode] = useState<'use' | 'restock'>('use');
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);

  const loadPartsData = async () => {
    try {
      setLoading(true);
      const [partsRes, spRes, suppRes] = await Promise.allSettled([
        apiClient.getParts(),
        apiClient.getStockpiles(),
        apiClient.getSuppliers(),
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
      <div className="flex items-center justify-between gap-2">
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

        <div className="flex items-center gap-2">
          <button
            id="add-part-btn"
            onClick={() => setIsAddPartOpen(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="Add Part to Stash"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Part</span>
          </button>

          <button
            onClick={loadPartsData}
            disabled={loading}
            className="w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
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
          id="parts-tab-shopping"
          onClick={() => setActiveTab('shopping')}
          className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'shopping'
              ? 'bg-white dark:bg-card-dark text-primary shadow-xs'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
          Buy List
        </button>

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
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingListSection onOpenTicket={onOpenTicket} />
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
    </div>
  );
};

export default PartsView;
