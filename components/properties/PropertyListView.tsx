import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData';
import { Property, Unit, ApplianceDefaultSet, Appliance } from '../../types';

interface PropertyListViewProps {
  onPropertyClick: (id: string) => void;
  onAddProperty: () => void;
  isEditMode: boolean;
}

type ViewNavLevel = 'root' | 'complex' | 'building' | 'unit' | 'defaults';

const PropertyListView: React.FC<PropertyListViewProps> = ({
  onPropertyClick,
  onAddProperty,
  isEditMode
}) => {
  const {
    properties,
    units,
    complexes,
    defaultSets,
    getUnitAppliances,
    overrideUnitAppliance,
    resetUnitToDefault,
    applyDefaultSetToUnit,
    updateDefaultSet
  } = useData();

  // Navigation State
  const [navLevel, setNavLevel] = useState<ViewNavLevel>('root');
  const [selectedComplexId, setSelectedComplexId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // Global Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [overrideModalAppliance, setOverrideModalAppliance] = useState<Appliance | null>(null);
  const [overrideForm, setOverrideForm] = useState({ brand: '', model: '', serial: '', notes: '' });

  const [applySetModalSet, setApplySetModalSet] = useState<ApplianceDefaultSet | null>(null);
  const [applyTargetUnitId, setApplyTargetUnitId] = useState('');
  const [showOverrideWarningModal, setShowOverrideWarningModal] = useState(false);
  const [pendingApplyData, setPendingApplyData] = useState<{ unitId: string; defaultSetId: string; overrideCount: number } | null>(null);

  const [editSetModalSet, setEditSetModalSet] = useState<ApplianceDefaultSet | null>(null);
  const [editSetForm, setEditSetForm] = useState({ name: '', bedrooms: 2, bathrooms: 1, stories: 1, notes: '' });

  // 1. Group buildings into complexes by complexId (reads complexId from data, zero address matching)
  const { complexCards, ungroupedProperties } = useMemo(() => {
    const map = new Map<string, Property[]>();
    complexes.forEach(c => {
      map.set(c.id, []);
      if (c.slug && c.slug !== c.id) map.set(c.slug, map.get(c.id)!);
    });

    const ungrouped: Property[] = [];

    properties.forEach(p => {
      if (p.name.includes('Pool')) return; // ignore virtual pool entry
      if (p.complexId && map.has(p.complexId)) {
        map.get(p.complexId)!.push(p);
      } else {
        ungrouped.push(p);
      }
    });

    const cards = complexes.map(c => ({
      ...c,
      buildings: map.get(c.id) || []
    }));

    return { complexCards: cards, ungroupedProperties: ungrouped };
  }, [complexes, properties]);

  // Selected entities
  const activeComplex = useMemo(() => {
    if (!selectedComplexId) return null;
    if (selectedComplexId === 'ungrouped') {
      return {
        id: 'ungrouped',
        name: 'Ungrouped',
        slug: 'ungrouped',
        notes: 'Single rental homes, commercial storefronts, and office.'
      };
    }
    return complexes.find(c => c.id === selectedComplexId || c.slug === selectedComplexId) || null;
  }, [selectedComplexId, complexes]);

  const activeComplexProperties = useMemo(() => {
    if (!selectedComplexId) return [];
    if (selectedComplexId === 'ungrouped') return ungroupedProperties;
    const match = complexes.find(c => c.id === selectedComplexId || c.slug === selectedComplexId);
    if (!match) return [];
    return properties.filter(p => !p.name.includes('Pool') && (p.complexId === match.id || p.complexId === match.slug));
  }, [selectedComplexId, ungroupedProperties, complexes, properties]);

  const activeBuilding = useMemo(() => {
    if (!selectedBuildingId) return null;
    return properties.find(p => p.id === selectedBuildingId) || null;
  }, [selectedBuildingId, properties]);

  const activeBuildingUnits = useMemo(() => {
    if (!selectedBuildingId) return [];
    return units.filter(u => u.buildingId === selectedBuildingId);
  }, [selectedBuildingId, units]);

  const activeUnit = useMemo(() => {
    if (!selectedUnitId) return null;
    return units.find(u => u.id === selectedUnitId) || null;
  }, [selectedUnitId, units]);

  const activeUnitAppliances = useMemo(() => {
    if (!activeUnit) return [];
    return getUnitAppliances(activeUnit);
  }, [activeUnit, getUnitAppliances]);

  const activeComplexDefaultSets = useMemo(() => {
    if (!selectedComplexId || selectedComplexId === 'ungrouped') {
      return defaultSets;
    }
    return defaultSets.filter(s => s.complexId === selectedComplexId || s.complexSlug === selectedComplexId);
  }, [selectedComplexId, defaultSets]);

  // Direct Search Logic
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const tokens = q
      .replace(/,/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0 && t !== 'unit' && t !== 'apt');

    const matchedBuildings = properties.filter(p => {
      if (p.name.includes('Pool')) return false;
      const allAliases = [...(p.aliases || []), ...(p.addressAliases || [])].join(' ');
      const target = `${p.name} ${p.address} ${allAliases} ${p.comments || ''}`.toLowerCase();
      return tokens.every(t => target.includes(t));
    });

    const matchedUnits = units.filter(u => {
      const bld = properties.find(p => p.id === u.buildingId);
      if (!bld || bld.name.includes('Pool')) return false;
      const allAliases = [...(bld.aliases || []), ...(bld.addressAliases || [])].join(' ');
      const fullString = `unit ${u.unitNumber} ${bld.name} ${bld.address} ${allAliases} ${bld.comments || ''}`.toLowerCase();
      return tokens.every(t => fullString.includes(t));
    });

    return { buildings: matchedBuildings, units: matchedUnits };
  }, [searchQuery, properties, units]);

  // Navigation Handlers
  const handleNavRoot = () => {
    setNavLevel('root');
    setSelectedComplexId(null);
    setSelectedBuildingId(null);
    setSelectedUnitId(null);
    setSearchQuery('');
  };

  const handleNavComplex = (cId: string) => {
    setSelectedComplexId(cId);
    setSelectedBuildingId(null);
    setSelectedUnitId(null);
    setNavLevel('complex');
    setSearchQuery('');
  };

  const handleNavBuilding = (bId: string) => {
    const bld = properties.find(p => p.id === bId);
    if (bld) {
      setSelectedComplexId(bld.complexId || 'ungrouped');
    }
    setSelectedBuildingId(bId);
    setSelectedUnitId(null);
    setNavLevel('building');
    setSearchQuery('');
  };

  const handleNavUnit = (uId: string) => {
    const u = units.find(unit => unit.id === uId);
    if (u) {
      const bld = properties.find(p => p.id === u.buildingId);
      if (bld) setSelectedComplexId(bld.complexId || 'ungrouped');
      setSelectedBuildingId(u.buildingId);
    }
    setSelectedUnitId(uId);
    setNavLevel('unit');
    setSearchQuery('');
  };

  const handleNavDefaults = (cId?: string) => {
    if (cId) setSelectedComplexId(cId);
    setNavLevel('defaults');
    setSearchQuery('');
  };

  // Actions
  const handleSaveApplianceOverride = () => {
    if (!selectedUnitId || !overrideModalAppliance) return;
    overrideUnitAppliance(selectedUnitId, {
      ...overrideModalAppliance,
      brand: overrideForm.brand || overrideModalAppliance.brand,
      modelNumber: overrideForm.model || overrideModalAppliance.modelNumber,
      serialNumber: overrideForm.serial || overrideModalAppliance.serialNumber,
      notes: overrideForm.notes || overrideModalAppliance.notes,
      isOverride: true,
      isDefault: false
    });
    setOverrideModalAppliance(null);
  };

  const handleStartApplyDefaultSet = (set: ApplianceDefaultSet) => {
    setApplySetModalSet(set);
    if (activeBuildingUnits.length > 0) {
      setApplyTargetUnitId(activeBuildingUnits[0].id);
    } else {
      const firstBld = activeComplexProperties[0];
      const firstUnit = units.find(u => u.buildingId === firstBld?.id);
      setApplyTargetUnitId(firstUnit?.id || '');
    }
  };

  const handleExecuteApplyDefaultSet = (force = false) => {
    if (!applySetModalSet || !applyTargetUnitId) return;

    const result = applyDefaultSetToUnit(applyTargetUnitId, applySetModalSet.id, force);
    if (!result.success && result.overwrittenCount > 0) {
      setPendingApplyData({
        unitId: applyTargetUnitId,
        defaultSetId: applySetModalSet.id,
        overrideCount: result.overwrittenCount
      });
      setShowOverrideWarningModal(true);
      return;
    }

    setApplySetModalSet(null);
    setShowOverrideWarningModal(false);
    setPendingApplyData(null);
  };

  const handleConfirmOverwriteApply = () => {
    if (!pendingApplyData) return;
    applyDefaultSetToUnit(pendingApplyData.unitId, pendingApplyData.defaultSetId, true);
    setShowOverrideWarningModal(false);
    setPendingApplyData(null);
    setApplySetModalSet(null);
  };

  const handleStartEditSet = (set: ApplianceDefaultSet) => {
    setEditSetModalSet(set);
    setEditSetForm({
      name: set.name,
      bedrooms: set.bedrooms ?? 2,
      bathrooms: set.bathrooms ?? 1,
      stories: set.stories ?? 1,
      notes: set.notes || ''
    });
  };

  const handleSaveEditSet = () => {
    if (!editSetModalSet) return;
    updateDefaultSet({
      ...editSetModalSet,
      name: editSetForm.name,
      bedrooms: Number(editSetForm.bedrooms),
      bathrooms: Number(editSetForm.bathrooms),
      stories: Number(editSetForm.stories),
      notes: editSetForm.notes
    });
    setEditSetModalSet(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-sans pb-32">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-card-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3 shadow-xs">
        {/* Breadcrumb Bar */}
        <nav className="flex items-center gap-1.5 text-xs overflow-x-auto whitespace-nowrap py-1">
          <button
            onClick={handleNavRoot}
            className={`font-semibold px-2.5 py-1 rounded-lg transition-colors ${
              navLevel === 'root'
                ? 'bg-primary/10 text-primary dark:bg-primary/20 font-bold'
                : 'text-text-sub-light dark:text-text-sub-dark hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
          >
            All Complexes
          </button>

          {activeComplex && navLevel !== 'root' && (
            <>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <button
                onClick={() => handleNavComplex(activeComplex.id)}
                className={`font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  navLevel === 'complex'
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 font-bold'
                    : 'text-text-sub-light dark:text-text-sub-dark hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
              >
                {activeComplex.name}
              </button>
            </>
          )}

          {activeBuilding && (navLevel === 'building' || navLevel === 'unit') && (
            <>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <button
                onClick={() => handleNavBuilding(activeBuilding.id)}
                className={`font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  navLevel === 'building'
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 font-bold'
                    : 'text-text-sub-light dark:text-text-sub-dark hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
              >
                {activeBuilding.name}
              </button>
            </>
          )}

          {activeUnit && navLevel === 'unit' && (
            <>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span className="font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                Unit {activeUnit.unitNumber}
              </span>
            </>
          )}

          {navLevel === 'defaults' && (
            <>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span className="font-bold px-2.5 py-1 rounded-lg bg-primary text-white">
                Appliance Defaults
              </span>
            </>
          )}
        </nav>

        {/* Direct Global Search Bar */}
        <div className="mt-2.5 relative">
          <div className="flex items-center rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card-dark px-3 shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <span className="material-symbols-outlined text-gray-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, building, or unit (e.g. 137 Amherst, 507 Days, Unit 266)..."
              className="w-full py-2.5 px-2.5 text-sm bg-transparent outline-none text-text-main-light dark:text-white placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-gray-400 hover:text-text-main-light dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 pt-4">
        {/* DIRECT SEARCH RESULTS PANEL */}
        {searchResults ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">manage_search</span>
                <h2 className="text-sm font-bold text-brand-black dark:text-white">
                  Search Results for &quot;{searchQuery}&quot;
                </h2>
              </div>
              <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark px-2.5 py-1 rounded-full">
                {searchResults.units.length} Units · {searchResults.buildings.length} Buildings
              </span>
            </div>

            {searchResults.units.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                  Units ({searchResults.units.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.units.map(unit => {
                    const bld = properties.find(p => p.id === unit.buildingId);
                    const isExternal = unit.ownership === 'external';
                    const wdState = unit.washerDryerState;
                    return (
                      <div
                        key={unit.id}
                        onClick={() => handleNavUnit(unit.id)}
                        className={`group rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between ${
                          isExternal
                            ? 'opacity-65 bg-gray-50/80 dark:bg-card-dark/40 border border-dashed border-gray-300 dark:border-gray-700'
                            : 'bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                              Unit {unit.unitNumber}
                            </span>
                            {isExternal && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                External
                              </span>
                            )}
                            {wdState && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                wdState === 'building_installed'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                                  : wdState === 'tenant_owned'
                                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                              }`}>
                                {wdState === 'building_installed' ? 'W/D: Installed' : wdState === 'tenant_owned' ? 'W/D: Tenant' : 'W/D: None'}
                              </span>
                            )}
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {unit.unitType || 'Apartment'}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-text-sub-light dark:text-text-sub-dark">
                            {bld?.name} · {bld?.address}
                          </p>
                          <p className="text-xs text-gray-400">
                            {unit.bedrooms || 2} Bed · {unit.bathrooms || 1} Bath
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xl shrink-0">
                          chevron_right
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {searchResults.buildings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                  Buildings ({searchResults.buildings.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.buildings.map(bld => {
                    const uCount = units.filter(u => u.buildingId === bld.id).length;
                    const hasSpecialRole = bld.role && bld.role !== 'standard';
                    const isExternal = bld.responsibility === 'external';

                    return (
                      <div
                        key={bld.id}
                        onClick={() => handleNavBuilding(bld.id)}
                        className={`group rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between ${
                          isExternal
                            ? 'opacity-65 bg-gray-50/80 dark:bg-card-dark/40 border border-dashed border-gray-300 dark:border-gray-700'
                            : hasSpecialRole
                            ? 'border-2 border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500 shadow-sm shadow-amber-500/5'
                            : 'bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                              {bld.name}
                            </h4>
                            {hasSpecialRole && (
                              <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full capitalize">
                                {bld.role === 'storage' ? (bld.id === 'prop-days-511' ? 'Storage Node (Central)' : 'Storage Node') : bld.role === 'mechanical' ? 'Mechanical Hub' : bld.role === 'office' ? 'Office' : bld.role}
                              </span>
                            )}
                            {isExternal && (
                              <span className="text-[11px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                External Super (Not Jose)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                            {bld.address}
                          </p>
                          <p className="text-xs text-gray-400">
                            {uCount > 0 ? `${uCount} Units` : '0 Units (Roster pending)'}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xl shrink-0">
                          chevron_right
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {searchResults.units.length === 0 && searchResults.buildings.length === 0 && (
              <div className="p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-card-dark/50 space-y-2">
                <span className="material-symbols-outlined text-3xl text-gray-400">search_off</span>
                <p className="text-sm font-bold text-brand-black dark:text-white">No matches for &quot;{searchQuery}&quot;</p>
                <p className="text-xs text-text-sub-light dark:text-text-sub-dark">Try searching by building name, address, or unit number</p>
              </div>
            )}
          </div>
        ) : (
          /* REGULAR HIERARCHY NAVIGATION */
          <div>
            {/* LEVEL 0: ROOT FOLDER VIEW */}
            {navLevel === 'root' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">domain</span>
                    <h1 className="text-sm font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                      Portfolio ({properties.length} Total Buildings)
                    </h1>
                  </div>
                  <button
                    onClick={() => handleNavDefaults()}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-text-main-light dark:text-white hover:border-primary/40 hover:text-primary shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    Default Sets
                  </button>
                </div>

                {/* 8 Defined Complexes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {complexCards.map(c => {
                    const isBD = c.slug === 'bd';
                    const isElm = c.slug === 'elm-colborne';

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleNavComplex(c.id)}
                        className="group rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[22px]">apartment</span>
                              </div>
                              <div>
                                <h2 className="text-base font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                                  {c.name}
                                </h2>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark line-clamp-1">
                                  {c.notes || `${c.buildings.length} Buildings`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {c.buildings.length} Buildings
                              </span>
                              <span className="material-symbols-outlined text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xl">
                                chevron_right
                              </span>
                            </div>
                          </div>

                          {/* Preserved Note Callouts */}
                          {isBD && (
                            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">inventory_2</span>
                              <span className="font-medium">511 Days Rd: Central Storage Building</span>
                            </div>
                          )}

                          {isElm && (
                            <div className="mt-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0">tag</span>
                              <span className="font-medium">18 Elm base units 101–414 (standard numbering)</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-text-sub-light dark:text-text-sub-dark">
                          <span>
                            {c.buildings.reduce((acc, b) => acc + units.filter(u => u.buildingId === b.id).length, 0)} Configured Units
                          </span>
                          <span className="text-primary font-semibold flex items-center gap-0.5 text-xs">
                            View Complex <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* UNGROUPED CARD (Singles & Office Only) */}
                  <div
                    onClick={() => handleNavComplex('ungrouped')}
                    className="group rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between md:col-span-2"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[22px]">home_work</span>
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                              Ungrouped
                            </h2>
                            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                              Single rental homes, commercial storefronts, and office
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {ungroupedProperties.length} Properties
                          </span>
                          <span className="material-symbols-outlined text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xl">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-text-sub-light dark:text-text-sub-dark">
                      <span>{ungroupedProperties.length} Properties</span>
                      <span className="text-primary font-semibold flex items-center gap-0.5 text-xs">
                        Browse Ungrouped <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Add Property Button (Edit Mode Only) */}
                {isEditMode && (
                  <div
                    onClick={onAddProperty}
                    className="p-5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center hover:border-primary cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-2xl text-primary mb-1">add_location_alt</span>
                    <p className="text-xs font-bold uppercase text-primary">Add New Property to Portfolio</p>
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 1: COMPLEX LEVEL (BUILDINGS IN COMPLEX) */}
            {navLevel === 'complex' && activeComplex && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleNavRoot}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-base font-bold text-brand-black dark:text-white">
                        {activeComplex.name}
                      </h2>
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                        {activeComplexProperties.length} Buildings in Complex
                      </p>
                    </div>
                  </div>

                  {activeComplex.id !== 'ungrouped' && (
                    <button
                      onClick={() => handleNavDefaults(activeComplex.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                      {activeComplex.name} Defaults
                    </button>
                  )}
                </div>

                {/* Whole-Box Building Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeComplexProperties.map(bld => {
                    const bldUnits = units.filter(u => u.buildingId === bld.id);
                    const hasSpecialRole = bld.role && bld.role !== 'standard';
                    const isExternal = bld.responsibility === 'external';

                    return (
                      <div
                        key={bld.id}
                        onClick={() => handleNavBuilding(bld.id)}
                        className={`group rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                          isExternal
                            ? 'opacity-65 bg-gray-50/80 dark:bg-card-dark/40 border border-dashed border-gray-300 dark:border-gray-700'
                            : hasSpecialRole
                            ? 'border-2 border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500 shadow-sm shadow-amber-500/5'
                            : 'bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors">
                              {bld.name}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {hasSpecialRole && (
                                <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full capitalize whitespace-nowrap">
                                  {bld.role === 'storage' ? (bld.id === 'prop-days-511' ? 'Storage Node (Central)' : 'Storage Node') : bld.role === 'mechanical' ? 'Mechanical Hub' : bld.role === 'office' ? 'Office' : bld.role}
                                </span>
                              )}
                              {isExternal && (
                                <span className="text-[11px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  External Super (Not Jose)
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-2">
                            {bld.address}
                          </p>
                          {bld.comments && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                              {bld.comments}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-text-sub-light dark:text-text-sub-dark">
                          <span>{bldUnits.length} Units</span>
                          <span className="material-symbols-outlined text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xl">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LEVEL 2: BUILDING LEVEL (UNITS IN BUILDING) */}
            {navLevel === 'building' && activeBuilding && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleNavComplex(selectedComplexId || 'ungrouped')}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-base font-bold text-brand-black dark:text-white">
                        {activeBuilding.name}
                      </h2>
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark">{activeBuilding.address}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onPropertyClick(activeBuilding.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-text-main-light dark:text-white hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    Building Details
                  </button>
                </div>

                {/* Special Role Callout */}
                {activeBuilding.role && activeBuilding.role !== 'standard' && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-xl">
                      {activeBuilding.role === 'storage' ? 'inventory_2' : activeBuilding.role === 'mechanical' ? 'settings_suggest' : 'corporate_fare'}
                    </span>
                    <div>
                      {activeBuilding.id === 'prop-days-511' ? (
                        <><strong>Central Storage Building:</strong> 511 Days Rd basement houses primary replacement inventory for BD complex.</>
                      ) : activeBuilding.role === 'storage' ? (
                        <><strong>Storage Node:</strong> Key storage depot for parts, spare equipment, and replacement inventory.</>
                      ) : activeBuilding.role === 'mechanical' ? (
                        <><strong>Mechanical Hub:</strong> Houses central mechanical equipment, boilers, and shared plant infrastructure.</>
                      ) : (
                        <><strong>Operations Office:</strong> Administrative office and staging area for maintenance operations.</>
                      )}
                    </div>
                  </div>
                )}

                {/* External Responsibility Callout */}
                {activeBuilding.responsibility === 'external' && (
                  <div className="p-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-gray-500 text-xl">engineering</span>
                    <div>
                      <strong>External Superintendent:</strong> Routine maintenance is handled by an external superintendent (not Jose).
                    </div>
                  </div>
                )}

                {/* Address Aliases Callout */}
                {activeBuilding.addressAliases && activeBuilding.addressAliases.length > 0 && (
                  <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-lg">alternate_email</span>
                    <div>
                      <span className="font-semibold">Known Address Aliases: </span>
                      <span className="text-text-sub-light dark:text-text-sub-dark">
                        {activeBuilding.addressAliases.join(', ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Building Spaces Callout (103 Amherst UTILITY room) */}
                {activeBuilding.id === 'prop-amherst-103' && (
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-blue-600 text-xl">room_preferences</span>
                    <div>
                      <strong>Building Space:</strong> UTILITY space (utility room — building space, not a rentable unit).
                    </div>
                  </div>
                )}


                {/* Whole-Box Unit Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                      Units ({activeBuildingUnits.length})
                    </h3>
                  </div>

                  {activeBuildingUnits.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeBuildingUnits.map(unit => {
                        const unitApps = getUnitAppliances(unit);
                        const overrideCount = Object.keys(unit.applianceOverrides || {}).length;

                        const isExternal = unit.ownership === 'external';
                        const wdState = unit.washerDryerState;

                        return (
                          <div
                            key={unit.id}
                            onClick={() => handleNavUnit(unit.id)}
                            className={`group rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                              isExternal
                                ? 'opacity-65 bg-gray-50/80 dark:bg-card-dark/40 border border-dashed border-gray-300 dark:border-gray-700'
                                : 'bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                              <span className="text-base font-bold text-brand-black dark:text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                Unit {unit.unitNumber}
                                {isExternal && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    External
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {wdState && (
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    wdState === 'building_installed'
                                      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                                      : wdState === 'tenant_owned'
                                      ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                  }`}>
                                    {wdState === 'building_installed' ? 'W/D: Installed' : wdState === 'tenant_owned' ? 'W/D: Tenant' : 'W/D: None'}
                                  </span>
                                )}
                                {overrideCount > 0 ? (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {overrideCount} Override{overrideCount > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                    Default Set
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-3">
                              {unit.unitType?.toUpperCase() || 'APARTMENT'} · {unit.bedrooms || 2} Bed · {unit.bathrooms || 1} Bath {unit.stories ? `· ${unit.stories} Stories` : ''}
                            </p>

                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-text-sub-light dark:text-text-sub-dark">
                              <span>{unitApps.length} Appliances</span>
                              <span className="material-symbols-outlined text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xl">
                                chevron_right
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-card-dark/50">
                      <span className="material-symbols-outlined text-3xl text-gray-400 mb-1">door_front</span>
                      <p className="text-sm font-bold text-brand-black dark:text-white">No units configured for this building yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LEVEL 3: UNIT LEVEL (APPLIANCES IN UNIT) */}
            {navLevel === 'unit' && activeUnit && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleNavBuilding(activeUnit.buildingId)}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-base font-bold text-brand-black dark:text-white">
                        Unit {activeUnit.unitNumber}
                      </h2>
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                        {activeBuilding?.name} · {activeUnit.bedrooms || 2} Bed / {activeUnit.bathrooms || 1} Bath
                      </p>
                    </div>
                  </div>

                  {Object.keys(activeUnit.applianceOverrides || {}).length > 0 && (
                    <button
                      onClick={() => resetUnitToDefault(activeUnit.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                      Reset to Default
                    </button>
                  )}
                </div>

                {/* Default Set Status Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-sub-light dark:text-text-sub-dark font-medium">Applied Default Set:</span>
                    <span className="font-bold text-primary">
                      {activeUnit.defaultSetId
                        ? defaultSets.find(s => s.id === activeUnit.defaultSetId)?.name || activeUnit.defaultSetId
                        : 'Inherited from Complex'}
                    </span>
                  </div>
                  {activeUnit.washerDryerState && (
                    <div className="mt-2 text-xs flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
                      <span className="text-text-sub-light dark:text-text-sub-dark font-medium">Washer / Dryer Status:</span>
                      <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] border ${
                        activeUnit.washerDryerState === 'building_installed'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                          : activeUnit.washerDryerState === 'tenant_owned'
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                      }`}>
                        {activeUnit.washerDryerState === 'building_installed'
                          ? 'Building-Installed W/D'
                          : activeUnit.washerDryerState === 'tenant_owned'
                          ? 'Tenant-Owned W/D'
                          : 'No In-Unit W/D'}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-text-sub-light dark:text-text-sub-dark flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
                    <span>{Object.keys(activeUnit.applianceOverrides || {}).length} Unit Override(s)</span>
                    <span>{activeUnitAppliances.filter(a => a.isDefault).length} Inherited from Default Set</span>
                  </div>
                </div>

                {/* Appliances List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                    Appliances in Unit ({activeUnitAppliances.length})
                  </h3>

                  <div className="space-y-3">
                    {activeUnitAppliances.map(app => (
                      <div
                        key={app.id || app.type}
                        className={`p-4 rounded-2xl bg-white dark:bg-card-dark border shadow-sm ${
                          app.isOverride
                            ? 'border-primary/50'
                            : 'border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[20px]">
                                {app.type.includes('FRIDGE')
                                  ? 'kitchen'
                                  : app.type.includes('STOVE') || app.type.includes('RANGE')
                                  ? 'cooking'
                                  : app.type.includes('DISHWASHER')
                                  ? 'dishwasher_gen'
                                  : app.type.includes('WATER_HEATER')
                                  ? 'water_heater'
                                  : 'home_repair_service'}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-brand-black dark:text-white">
                                {app.name || app.type}
                              </h4>
                              <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                                {app.category || 'Appliance'} · {app.type}
                              </p>
                            </div>
                          </div>

                          {app.isOverride ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              Override
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              Default
                            </span>
                          )}
                        </div>

                        {/* Specs & Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-text-sub-light dark:text-text-sub-dark bg-gray-50/80 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 mb-3">
                          <div>
                            <span className="text-gray-400">Brand:</span> {app.brand || 'Standard / Default'}
                          </div>
                          <div>
                            <span className="text-gray-400">Model:</span> {app.modelNumber || 'Standard Spec'}
                          </div>
                          {app.notes && (
                            <div className="col-span-2 text-xs italic text-gray-500">
                              {app.notes}
                            </div>
                          )}
                        </div>

                        {/* Override Action Button */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => {
                              setOverrideModalAppliance(app);
                              setOverrideForm({
                                brand: app.brand === 'Standard / Default' ? '' : (app.brand || ''),
                                model: app.modelNumber || '',
                                serial: app.serialNumber || '',
                                notes: app.notes || ''
                              });
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 hover:border-primary text-text-main-light dark:text-white transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            {app.isOverride ? 'Edit Override' : 'Override Appliance'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LEVEL 4: DEFAULTS VIEW */}
            {navLevel === 'defaults' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => (selectedComplexId ? handleNavComplex(selectedComplexId) : handleNavRoot())}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-base font-bold text-brand-black dark:text-white">
                        Appliance Default Sets
                      </h2>
                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark">
                        {activeComplex ? `${activeComplex.name} Sets` : 'All Seeded Sets'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {activeComplexDefaultSets.map(set => (
                    <div
                      key={set.id}
                      className="rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-brand-black dark:text-white">
                              {set.name}
                            </h3>
                            {set.isDefault && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5">
                            Complex: {set.complexSlug.toUpperCase()} · Type: {set.unitType.toUpperCase()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditSet(set)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 hover:border-primary transition-colors"
                          >
                            Edit Set
                          </button>
                          <button
                            onClick={() => handleStartApplyDefaultSet(set)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
                          >
                            Apply to Unit
                          </button>
                        </div>
                      </div>

                      {/* Facts Grid */}
                      <div className="grid grid-cols-3 gap-2 text-xs p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <div>
                          <span className="text-gray-400">Bedrooms:</span> {set.bedrooms ?? 2}
                        </div>
                        <div>
                          <span className="text-gray-400">Bathrooms:</span> {set.bathrooms ?? 1}
                        </div>
                        <div>
                          <span className="text-gray-400">Stories:</span> {set.stories ?? 1}
                        </div>
                      </div>

                      {/* Appliance List in Set */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">
                          Standard Appliances ({set.appliances.length}):
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {set.appliances.map((appItem, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  check_circle
                                </span>
                                <span className="font-semibold text-brand-black dark:text-white">
                                  {appItem.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 uppercase">
                                {appItem.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {set.notes && (
                        <p className="text-xs italic text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-2">
                          Note: {set.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: APPLIANCE OVERRIDE EDITOR */}
      {overrideModalAppliance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-brand-black dark:text-white">
                Override Appliance ({overrideModalAppliance.type})
              </h3>
              <button
                onClick={() => setOverrideModalAppliance(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-4">
              Saving an override stores a specific deviation for this unit. All other appliances remain inherited from the complex default set.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Brand</label>
                <input
                  type="text"
                  value={overrideForm.brand}
                  onChange={e => setOverrideForm(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="e.g. Frigidaire / Whirlpool"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Model Number</label>
                <input
                  type="text"
                  value={overrideForm.model}
                  onChange={e => setOverrideForm(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g. FFCD2418US3A"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Serial Number (Optional)</label>
                <input
                  type="text"
                  value={overrideForm.serial}
                  onChange={e => setOverrideForm(prev => ({ ...prev, serial: e.target.value }))}
                  placeholder="Verified serial if known"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Notes</label>
                <textarea
                  value={overrideForm.notes}
                  onChange={e => setOverrideForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Upgraded stainless replacement"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                  rows={2}
                />
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                onClick={() => setOverrideModalAppliance(null)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 text-text-main-light dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApplianceOverride}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-xs"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: APPLY DEFAULT SET TO UNIT */}
      {applySetModalSet && !showOverrideWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-brand-black dark:text-white">
                Apply Set: {applySetModalSet.name}
              </h3>
              <button
                onClick={() => setApplySetModalSet(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-4">
              Select a target unit in the complex to inherit this default appliance set:
            </p>

            <div className="space-y-3 text-xs">
              <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark">Target Unit</label>
              <select
                value={applyTargetUnitId}
                onChange={e => setApplyTargetUnitId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
              >
                {units.map(u => {
                  const bld = properties.find(p => p.id === u.buildingId);
                  return (
                    <option key={u.id} value={u.id}>
                      {bld?.name} — Unit {u.unitNumber} ({u.unitType || 'Apartment'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                onClick={() => setApplySetModalSet(null)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 text-text-main-light dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteApplyDefaultSet(false)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-xs"
              >
                Apply Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: OVERWRITE WARNING MODAL */}
      {showOverrideWarningModal && pendingApplyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-red-500/30 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-red-600 dark:text-red-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="text-sm font-bold">
                Existing Overrides Present
              </h3>
            </div>

            <p className="text-xs text-text-main-light dark:text-text-main-dark mb-3">
              This unit has <strong>{pendingApplyData.overrideCount} custom appliance override(s)</strong>.
              Applying a new default set will overwrite them.
            </p>

            <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-4">
              Do you want to discard existing overrides and reset the unit completely to this default set?
            </p>

            <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
              <button
                onClick={() => {
                  setShowOverrideWarningModal(false);
                  setPendingApplyData(null);
                }}
                className="flex-1 py-2.5 font-semibold rounded-xl border border-gray-200 dark:border-gray-800 text-text-main-light dark:text-white"
              >
                Keep Overrides
              </button>
              <button
                onClick={handleConfirmOverwriteApply}
                className="flex-1 py-2.5 font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT DEFAULT SET */}
      {editSetModalSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-brand-black dark:text-white">
                Edit Set: {editSetModalSet.name}
              </h3>
              <button
                onClick={() => setEditSetModalSet(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Set Name</label>
                <input
                  type="text"
                  value={editSetForm.name}
                  onChange={e => setEditSetForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Beds</label>
                  <input
                    type="number"
                    value={editSetForm.bedrooms}
                    onChange={e => setEditSetForm(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Baths</label>
                  <input
                    type="number"
                    value={editSetForm.bathrooms}
                    onChange={e => setEditSetForm(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Stories</label>
                  <input
                    type="number"
                    value={editSetForm.stories}
                    onChange={e => setEditSetForm(prev => ({ ...prev, stories: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Notes</label>
                <textarea
                  value={editSetForm.notes}
                  onChange={e => setEditSetForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                  rows={2}
                />
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                onClick={() => setEditSetModalSet(null)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 text-text-main-light dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditSet}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyListView;
