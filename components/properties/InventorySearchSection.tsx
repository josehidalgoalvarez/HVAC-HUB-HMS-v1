import React from 'react';
import { Property, Unit, ApplianceDefaultSet, Appliance, Complex } from '../../types';
import type { PartRecord, Stockpile } from '../../types/domain';
import { getUnitContextChips } from '../../utils/unitContextUtils';
import { resolveBuildingStockpile } from '../../utils/stockpileMatching';

export interface DefaultPatternMatch {
  key: string;
  setId: string;
  setName: string;
  complexName: string;
  unitType: string;
  applianceType: string;
  label: string;
  brand: string;
  model: string;
  notes?: string;
}

export interface InventorySearchResultsData {
  query: string;
  units: Unit[];
  buildings: Property[];
  directAppliances: Appliance[];
  defaultPatterns: DefaultPatternMatch[];
  parts: PartRecord[];
  storages: Stockpile[];
  totalMatches: number;
  filterTimeMs: number;
}

/**
 * Infers a known manufacturer brand from a default-set model prefix when `specs.brand` is not explicitly set,
 * without inventing models or serials.
 */
function inferDefaultPatternBrand(model: string, explicitBrand?: string): string {
  if (explicitBrand && explicitBrand.trim()) return explicitBrand.trim();
  const m = (model || '').trim().toUpperCase();
  if (!m) return '';
  if (m.startsWith('FF') || m.startsWith('CF')) return 'Frigidaire';
  if (m.startsWith('MDF') || m.startsWith('MRT') || m.startsWith('MER') || m.startsWith('MMO') || m.startsWith('HD663')) return 'Midea';
  if (m.startsWith('RL6100')) return 'Broan-NuTone';
  if (m.startsWith('SS6-')) return 'A.O. Smith';
  return '';
}

/**
 * Pure, synchronous client-side search over already-loaded session data.
 * Strict case-insensitive substring match (all whitespace-separated query tokens must match as substrings).
 * Zero network calls, zero fuzzy matching, zero spell correction, zero synonym expansion.
 */
export function computeInventorySearchResults(
  rawQuery: string,
  data: {
    properties: Property[];
    units: Unit[];
    complexes: Complex[];
    defaultSets: ApplianceDefaultSet[];
    appliances: Appliance[];
    parts: PartRecord[];
    stockpiles: Stockpile[];
  }
): InventorySearchResultsData | null {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const qLower = trimmed.toLowerCase();
  const tokens = qLower
    .replace(/,/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && t !== 'unit' && t !== 'apt');

  if (tokens.length === 0) {
    tokens.push(qLower);
  }

  const matchesAllTokens = (haystack: string): boolean => {
    const h = haystack.toLowerCase();
    return tokens.every((t) => h.includes(t));
  };

  // 1. Buildings
  const matchedBuildings = data.properties.filter((p) => {
    if (p.name.includes('Pool')) return false;
    const allAliases = [...(p.aliases || []), ...(p.addressAliases || [])].join(' ');
    const target = `${p.name} ${p.address} ${p.complexName || ''} ${allAliases} ${p.comments || ''}`;
    return matchesAllTokens(target);
  });

  // 2. Units
  const matchedUnits = data.units.filter((u) => {
    const bld = data.properties.find((p) => p.id === u.buildingId);
    if (!bld || bld.name.includes('Pool')) return false;
    const allAliases = [...(bld.aliases || []), ...(bld.addressAliases || [])].join(' ');
    const target = `${u.unitNumber} ${bld.name} ${bld.address} ${allAliases} ${u.floor || ''} ${u.unitType || ''} ${u.comments || ''}`;
    return matchesAllTokens(target);
  });

  // 3. Appliances — DIRECT unit/building rows (never default rows)
  const matchedDirectAppliances = data.appliances.filter((a) => {
    if (a.isDefault) return false;
    const bld = data.properties.find(
      (p) => p.id === a.propertyId || String(p.id) === String(a.propertyId)
    );
    const u = a.unitId
      ? data.units.find((unit) => String(unit.id) === String(a.unitId))
      : undefined;
    const unitLabel = a.unitNumber || u?.unitNumber || '';
    const bldText = bld ? `${bld.name} ${bld.address}` : a.location || '';
    const target = `${a.name || ''} ${a.type || ''} ${a.category || ''} ${a.brand || ''} ${a.modelNumber || ''} ${a.serialNumber || ''} ${unitLabel} ${bldText} ${a.room || ''} ${a.location || ''} ${a.notes || ''}`;
    return matchesAllTokens(target);
  });

  // 4. Appliances — DEFAULT pattern rows (from loaded defaultSets)
  const matchedDefaultPatterns: DefaultPatternMatch[] = [];
  data.defaultSets.forEach((ds) => {
    const cpx = data.complexes.find(
      (c) => c.id === ds.complexId || c.slug === ds.complexSlug || c.id === ds.complexSlug
    );
    const complexName = cpx?.name || ds.name;
    (ds.appliances || []).forEach((item, idx) => {
      const model = item.model || item.specs?.model || '';
      const brand = inferDefaultPatternBrand(model, item.specs?.brand);
      const label = item.label || item.name || item.type;
      const specValues = item.specs ? Object.values(item.specs).filter(Boolean).join(' ') : '';
      const target = `${ds.name} ${complexName} ${ds.unitType || ''} ${item.type || ''} ${item.category || ''} ${label} ${brand} ${model} ${specValues} ${item.notes || ''} ${ds.notes || ''}`;
      if (matchesAllTokens(target)) {
        matchedDefaultPatterns.push({
          key: `${ds.id}-${idx}-${item.type}`,
          setId: ds.id,
          setName: ds.name,
          complexName,
          unitType: ds.unitType || 'apartment',
          applianceType: item.type,
          label,
          brand,
          model,
          notes: item.notes || ds.notes
        });
      }
    });
  });

  // 5. Parts (from already-loaded session/cached/seeded parts)
  const matchedParts = data.parts.filter((p) => {
    const compat = (p.compatible_models || []).join(' ');
    const spLocs = (p.stockpiles || [])
      .map((s) => `${s.stockpile_name || ''} ${s.stockpile_location || ''} ${s.location_notes || ''}`)
      .join(' ');
    const target = `${p.name || ''} ${p.part_number || ''} ${p.category || ''} ${p.description || ''} ${compat} ${spLocs} ${p.stock_summary || ''}`;
    return matchesAllTokens(target);
  });

  // 6. Storages (from already-loaded stockpiles)
  const matchedStorages = data.stockpiles.filter((sp) => {
    const target = `${sp.name || ''} ${sp.location || ''} ${sp.notes || ''}`;
    return matchesAllTokens(target);
  });

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const totalMatches =
    matchedUnits.length +
    matchedBuildings.length +
    matchedDirectAppliances.length +
    matchedDefaultPatterns.length +
    matchedParts.length +
    matchedStorages.length;

  return {
    query: trimmed,
    units: matchedUnits,
    buildings: matchedBuildings,
    directAppliances: matchedDirectAppliances,
    defaultPatterns: matchedDefaultPatterns,
    parts: matchedParts,
    storages: matchedStorages,
    totalMatches,
    filterTimeMs: Math.round((t1 - t0) * 100) / 100
  };
}

interface InventorySearchResultsPanelProps {
  results: InventorySearchResultsData;
  properties: Property[];
  units: Unit[];
  defaultSets: ApplianceDefaultSet[];
  stockpilesList: Stockpile[];
  onSelectUnit: (unitId: string) => void;
  onSelectBuilding: (buildingId: string) => void;
  onSelectDirectAppliance: (appliance: Appliance) => void;
  onSelectDefaultPattern: (setId: string, complexSlugOrId?: string) => void;
  onOpenStockpileInventory?: (stockpileId: number | string) => void;
  onOpenMcKayStorageMenu: (buildingId: string) => void;
  onOpenParts?: () => void;
}

const UNIT_RESULT_CAP = 50;

export const InventorySearchResultsPanel: React.FC<InventorySearchResultsPanelProps> = ({
  results,
  properties,
  units,
  defaultSets,
  stockpilesList,
  onSelectUnit,
  onSelectBuilding,
  onSelectDirectAppliance,
  onSelectDefaultPattern,
  onOpenStockpileInventory,
  onOpenMcKayStorageMenu,
  onOpenParts
}) => {
  const displayedUnits = results.units.slice(0, UNIT_RESULT_CAP);

  return (
    <div className="space-y-6" data-testid="inventory-search-results">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">manage_search</span>
          <h2 className="text-sm font-bold text-brand-black dark:text-white">
            Inventory Search Results for &quot;{results.query}&quot;
          </h2>
        </div>
        <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark px-2.5 py-1 rounded-full">
          {results.totalMatches} {results.totalMatches === 1 ? 'Match' : 'Matches'}
        </span>
      </div>

      {/*Honest Empty State*/}
      {results.totalMatches === 0 && (
        <div
          className="p-10 text-center rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark space-y-2"
          data-testid="inventory-search-empty"
        >
          <span className="material-symbols-outlined text-3xl text-gray-400">search_off</span>
          <p className="text-sm font-bold text-brand-black dark:text-white">
            No matches for &quot;{results.query}&quot;.
          </p>
        </div>
      )}

      {/* 1. BUILDINGS */}
      {results.buildings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              Buildings ({results.buildings.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.buildings.map((bld) => {
              const uCount = units.filter((u) => u.buildingId === bld.id).length;
              const hasSpecialRole = bld.role && bld.role !== 'standard';
              const isExternal = bld.responsibility === 'external';
              const bRes = resolveBuildingStockpile(bld, stockpilesList);
              const canOpenStorage =
                (bRes.isMcKay && bRes.mckayStockpiles.length > 0) ||
                Boolean(bRes.targetStockpileId && onOpenStockpileInventory);

              return (
                <div
                  key={bld.id}
                  onClick={() => onSelectBuilding(bld.id)}
                  className={`group rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isExternal
                      ? 'opacity-65 bg-gray-50/80 dark:bg-card-dark/40 border border-dashed border-gray-300 dark:border-gray-700'
                      : hasSpecialRole
                      ? 'border-2 border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500'
                      : 'bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Building
                      </span>
                      <h4 className="text-sm font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                        {bld.name}
                      </h4>
                      {bld.complexName && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark">
                          {bld.complexName}
                        </span>
                      )}
                      {hasSpecialRole && (
                        <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full capitalize">
                          {bld.role === 'storage' ? 'Storage Node' : bld.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark">{bld.address}</p>
                    <p className="text-xs text-gray-400">
                      {uCount > 0 ? `${uCount} Units` : '0 Units (Roster pending)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canOpenStorage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (bRes.isMcKay) {
                            onOpenMcKayStorageMenu(bld.id);
                          } else if (bRes.targetStockpileId && onOpenStockpileInventory) {
                            onOpenStockpileInventory(bRes.targetStockpileId);
                          }
                        }}
                        className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-300">
                          inventory_2
                        </span>
                        <span>Stock Menu</span>
                      </button>
                    )}
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-all text-xl">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. UNITS */}
      {results.units.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
              Units ({results.units.length})
            </h3>
            {results.units.length > UNIT_RESULT_CAP && (
              <span className="text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark">
                Showing first {UNIT_RESULT_CAP} of {results.units.length} matches
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedUnits.map((unit) => {
              const bld = properties.find((p) => p.id === unit.buildingId);
              const isExternal = unit.ownership === 'external';
              const unitDs = defaultSets.find((s) => s.id === unit.defaultSetId);
              const bedCount = unit.bedrooms ?? unitDs?.bedrooms ?? 2;
              const bathCount = unit.washrooms ?? unit.bathrooms ?? unitDs?.bathrooms ?? 1;
              const ctxChips = getUnitContextChips(unit);

              return (
                <div
                  key={unit.id}
                  onClick={() => onSelectUnit(unit.id)}
                  className={`group rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between ${
                    isExternal
                      ? 'opacity-65 bg-gray-50/80 dark:bg-card-dark/40 border border-dashed border-gray-300 dark:border-gray-700'
                      : 'bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Unit
                      </span>
                      <span className="text-base font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                        {bld?.name ? `${bld.name} · ` : ''}Unit {unit.unitNumber}
                      </span>
                    </div>
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                      {bld?.address} · {unit.unitType || 'Apartment'} ({bedCount} Bed · {bathCount} Bath)
                    </p>
                    {ctxChips.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {ctxChips.map((c) => (
                          <span
                            key={c.key}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${c.className}`}
                          >
                            <span className="material-symbols-outlined text-[12px] leading-none">{c.icon}</span>
                            {c.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-all text-xl shrink-0">
                    chevron_right
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. APPLIANCES — DIRECT UNIT RECORDS */}
      {results.directAppliances.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
            Appliances — Unit Records ({results.directAppliances.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.directAppliances.map((app) => {
              const bld = properties.find(
                (p) => p.id === app.propertyId || String(p.id) === String(app.propertyId)
              );
              const u = app.unitId
                ? units.find((unit) => String(unit.id) === String(app.unitId))
                : undefined;
              const unitLabel = app.unitNumber || u?.unitNumber || 'Common';

              return (
                <div
                  key={app.id}
                  onClick={() => onSelectDirectAppliance(app)}
                  className="group rounded-2xl p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Unit record
                      </span>
                      <h4 className="text-sm font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                        {app.name || app.type}
                      </h4>
                    </div>
                    <p className="text-xs font-semibold text-brand-black dark:text-white">
                      {bld?.name || app.location || 'Building'} ·{' '}
                      {unitLabel === 'Common' ? 'Shared / Mechanical Room' : `Unit ${unitLabel}`}
                    </p>
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                      {[
                        app.type,
                        app.brand ? `Brand: ${app.brand}` : null,
                        app.modelNumber ? `Model: ${app.modelNumber}` : null
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {app.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{app.notes}</p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-all text-xl shrink-0">
                    chevron_right
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. APPLIANCES — DEFAULT PATTERN ROWS (NEVER UNIT RECORDS, NEVER SERIALS) */}
      {results.defaultPatterns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
            Appliances — Default Patterns ({results.defaultPatterns.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.defaultPatterns.map((pat) => (
              <div
                key={pat.key}
                onClick={() => onSelectDefaultPattern(pat.setId)}
                className="group rounded-2xl p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark border border-gray-200 dark:border-gray-700">
                      Default pattern (not a unit record)
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                    {pat.applianceType} — {pat.setName}
                  </h4>
                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                    {[
                      pat.complexName,
                      pat.brand ? `Brand: ${pat.brand}` : null,
                      pat.model ? `Model: ${pat.model}` : 'Standard Default Spec'
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {pat.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{pat.notes}</p>
                  )}
                </div>
                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-all text-xl shrink-0">
                  chevron_right
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. STORAGES (AMBER ALLOWED ONLY FOR STORAGE) */}
      {results.storages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
            Storage Locations ({results.storages.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.storages.map((sp) => (
              <div
                key={sp.id}
                onClick={() => onOpenStockpileInventory && onOpenStockpileInventory(sp.id)}
                className="group rounded-2xl p-4 border-2 border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500 shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                      Storage
                    </span>
                    <h4 className="text-sm font-bold text-brand-black dark:text-white">
                      {sp.name}
                    </h4>
                  </div>
                  {sp.location && (
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                      Location: {sp.location}
                    </p>
                  )}
                  {sp.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{sp.notes}</p>
                  )}
                </div>
                <div className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-300">
                    inventory_2
                  </span>
                  <span>Open Storage</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. PARTS */}
      {results.parts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
            Parts ({results.parts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.parts.map((part) => {
              const primarySp = part.stockpiles && part.stockpiles.length > 0 ? part.stockpiles[0] : null;
              const targetSpId = primarySp?.stockpile_id || part.stockpile_id;
              const storageLabels =
                part.stockpiles && part.stockpiles.length > 0
                  ? part.stockpiles
                      .map((s) => `${s.stockpile_name || s.stockpile_location || 'Storage'} (${s.quantity})`)
                      .join(', ')
                  : part.stock_summary || 'Location not specified';

              return (
                <div
                  key={part.id}
                  onClick={() => {
                    if (targetSpId && onOpenStockpileInventory) {
                      onOpenStockpileInventory(targetSpId);
                    } else if (onOpenParts) {
                      onOpenParts();
                    }
                  }}
                  className="group rounded-2xl p-4 bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Part
                      </span>
                      <h4 className="text-sm font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                        {part.name}
                      </h4>
                    </div>
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                      {[
                        part.part_number ? `Part #: ${part.part_number}` : null,
                        part.category || null,
                        typeof part.quantity_on_hand === 'number' ? `Qty: ${part.quantity_on_hand}` : null
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Storage: {storageLabels}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-all text-xl shrink-0">
                    chevron_right
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
