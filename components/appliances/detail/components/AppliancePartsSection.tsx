import React, { useState, useEffect } from 'react';
import { Appliance } from '../../../../types';
import type { Part } from '../../../../types/domain';
import { getApplianceParts, ModelPartRow } from '../../../../utils/modelParts';
import { apiClient } from '../../../../src/api/client';
import { appCache } from '../../../../src/offline/cache';
import { SEED_PARTS } from '../../../parts/partsSeedData';
import Button from '../../../ui/Button';

interface AppliancePartsSectionProps {
  appliance: Appliance;
}

export const AppliancePartsSection: React.FC<AppliancePartsSectionProps> = ({ appliance }) => {
  const [catalogParts, setCatalogParts] = useState<Part[] | null>(() => {
    return appCache.getSync<Part[]>('parts') || (SEED_PARTS as unknown as Part[]);
  });
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const parts = await apiClient.getParts();
        if (isMounted && Array.isArray(parts) && parts.length > 0) {
          setCatalogParts(parts as unknown as Part[]);
          appCache.set('parts', parts);
        }
      } catch (err) {
        console.warn('Failed to fetch parts catalog from API, using cached/seeded parts:', err);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const {
    verifiedParts,
    tbdTemplates,
    hasTemplate,
    isModelUnknown,
    cleanModel,
    applianceType,
    catalogUnavailable
  } = getApplianceParts(appliance, catalogParts);

  const [addingId, setAddingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isStored = appliance.status === 'stored' || (appliance.stockpileId !== null && appliance.stockpileId !== undefined);

  const handleAddToBuyList = async (part: ModelPartRow) => {
    setAddingId(part.id);
    setErrorMessage(null);
    setSuccessId(null);

    try {
      const partName = part.name;
      const partNumber = part.partNumber; // null for TBD, verified string for verified
      const supplier = 'Dependable';
      const modelLabel = cleanModel ? cleanModel : (isModelUnknown ? 'unknown model' : applianceType);
      const notes = part.isVerified
        ? `From [${applianceType}, ${modelLabel}] PARTS tab: ${part.evidenceNote}`
        : `From [${applianceType}, ${modelLabel}] PARTS tab: TBD — confirm part number with Dependable by model before ordering`;

      await apiClient.createManualBuyItem({
        part_name: partName,
        quantity: 1,
        part_number: partNumber,
        supplier: supplier,
        notes: notes,
        ticket_id: null
      });

      setSuccessId(part.id);
      setTimeout(() => {
        setSuccessId(null);
      }, 3000);
    } catch (err: any) {
      console.error('Failed to add to Buy List:', err);
      setErrorMessage(err?.message || 'Failed to add item to Buy List');
    } finally {
      setAddingId(null);
    }
  };

  if (!hasTemplate && verifiedParts.length === 0) {
    return (
      <div className="bg-white dark:bg-card-dark rounded-xl p-6 border border-gray-100 dark:border-gray-800 text-center space-y-3">
        <span aria-hidden="true" className="material-symbols-outlined text-3xl text-gray-400">category</span>
        <p className="text-sm font-semibold text-text-sub-light dark:text-text-sub-dark">
          No parts template for this type yet.
        </p>
        <p className="text-xs text-gray-500">
          Stock on hand is in the Parts menu, not here — this tab is fitment and ordering preparation, not inventory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informational Header Banners */}
      {isStored && (
        <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs text-text-sub-light dark:text-text-sub-dark flex items-start gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-sm text-primary mt-0.5">warehouse</span>
          <span>
            This appliance is currently stored, not active in a residential unit. Parts templates below reflect standard fitments for this equipment type and model.
          </span>
        </div>
      )}

      {isModelUnknown && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-sm text-primary mt-0.5">info</span>
          <div>
            <span className="font-bold">Model unknown:</span> These are categories to ask Dependable about for this unit, not model-confirmed fitments.
          </div>
        </div>
      )}

      {catalogUnavailable && !loadingCatalog && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-sm text-amber-600 mt-0.5">warning</span>
          <div>
            <span className="font-bold">Notice:</span> Verified parts unavailable — catalog not loaded.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 font-bold ml-2">✕</button>
        </div>
      )}

      {/* 1. Verified Model Parts */}
      {verifiedParts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-sm text-primary">verified</span>
              Verified Parts ({verifiedParts.length})
            </h3>
            <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
              Model Confirmed
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            {verifiedParts.map((part) => (
              <div key={part.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-brand-black dark:text-white">
                        {part.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {part.statusLabel}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-mono text-primary font-bold flex items-center gap-1.5 flex-wrap">
                      <span>Part #: {part.partNumber}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        <span aria-hidden="true" className="material-symbols-outlined text-[12px]">lock</span>
                        <span>Locked</span>
                      </span>
                    </div>
                    <div className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5">
                      Supplier: <span className="font-medium">{part.supplier}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToBuyList(part)}
                    disabled={addingId === part.id}
                    className="shrink-0 text-xs py-1 px-2.5 h-auto"
                  >
                    {addingId === part.id ? (
                      <span className="flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                        Adding...
                      </span>
                    ) : successId === part.id ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <span aria-hidden="true" className="material-symbols-outlined text-xs">check</span>
                        Added
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-xs">add_shopping_cart</span>
                        Add to Buy List
                      </span>
                    )}
                  </Button>
                </div>

                {/* Stock on Hand / Allocations Section */}
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 space-y-1">
                  <div className="text-xs font-semibold text-brand-black dark:text-white flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-sm text-primary">inventory_2</span>
                    Stock Status:
                  </div>
                  {part.stockAllocations.length > 0 ? (
                    <div className="space-y-1 text-xs">
                      {part.stockAllocations.map((alloc) => (
                        <div key={alloc.stockpileId} className="flex items-center justify-between text-text-sub-light dark:text-text-sub-dark pl-5">
                          <span>{alloc.stockpileName}</span>
                          <span className="font-bold text-brand-black dark:text-white">{alloc.quantity} in stock</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark pl-5">
                      Not in stock at any recorded location — order from Dependable.
                    </p>
                  )}
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 p-2 rounded">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Evidence: </span>
                  {part.evidenceNote}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. TBD Category Templates */}
      {tbdTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-sm text-gray-400">list_alt</span>
              Ordering Categories ({tbdTemplates.length})
            </h3>
            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              TBD — Ask Dependable
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            {tbdTemplates.map((part) => (
              <div key={part.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-brand-black dark:text-white">
                        {part.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {part.statusLabel}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Part number: <span className="font-semibold text-gray-500 dark:text-gray-400">TBD</span>
                    </div>
                    <div className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5">
                      Supplier: <span className="font-medium">{part.supplier} (contact unconfirmed)</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToBuyList(part)}
                    disabled={addingId === part.id}
                    className="shrink-0 text-xs py-1 px-2.5 h-auto text-gray-700 dark:text-gray-300"
                  >
                    {addingId === part.id ? (
                      <span className="flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                        Adding...
                      </span>
                    ) : successId === part.id ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <span aria-hidden="true" className="material-symbols-outlined text-xs">check</span>
                        Added
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-xs">add_shopping_cart</span>
                        Add to Buy List
                      </span>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 p-2 rounded">
                  {part.evidenceNote}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Footer Note */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
        <p className="text-xs text-text-sub-light dark:text-text-sub-dark leading-relaxed">
          Stock on hand is in the Parts menu, not here — this tab is fitment and ordering preparation, not inventory.
        </p>
      </div>
    </div>
  );
};
