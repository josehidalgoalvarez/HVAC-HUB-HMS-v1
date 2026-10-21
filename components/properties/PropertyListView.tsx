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

  // Map Complexes and Ungrouped Properties
  const complexList = useMemo(() => {
    // BD and Elm + Colborne from state or fallback
    const bd = complexes.find(c => c.id === '1' || c.slug === 'bd') || {
      id: '1',
      name: 'BD',
      slug: 'bd',
      notes: 'Bath Rd (1719–1737) & Days Rd (505–511). 511 Days Rd central storage building.'
    };

    const elm = complexes.find(c => c.id === '2' || c.slug === 'elm-colborne') || {
      id: '2',
      name: 'Elm + Colborne',
      slug: 'elm-colborne',
      notes: '18 Elm St, 24 Elm St, 203 Colborne St downtown cluster.'
    };

    return [bd, elm];
  }, [complexes]);

  const bdProperties = useMemo(() => {
    return properties.filter(p => p.complexId === '1' || p.complexId === 'complex-bd' || (p.address && (p.address.includes('Bath') || p.address.includes('Days')) && !p.name.includes('Pool')));
  }, [properties]);

  const elmProperties = useMemo(() => {
    return properties.filter(p => p.complexId === '2' || p.complexId === 'complex-elm' || (p.address && (p.address.includes('Elm') || p.address.includes('Colborne'))));
  }, [properties]);

  const ungroupedProperties = useMemo(() => {
    const bdIds = new Set(bdProperties.map(p => p.id));
    const elmIds = new Set(elmProperties.map(p => p.id));
    return properties.filter(p => !bdIds.has(p.id) && !elmIds.has(p.id) && !p.name.includes('Pool'));
  }, [properties, bdProperties, elmProperties]);

  // Selected entities
  const activeComplex = useMemo(() => {
    if (!selectedComplexId) return null;
    if (selectedComplexId === 'ungrouped') {
      return { id: 'ungrouped', name: 'Ungrouped', slug: 'ungrouped', notes: 'Properties without a complex assignment' };
    }
    return complexList.find(c => c.id === selectedComplexId || c.slug === selectedComplexId) || null;
  }, [selectedComplexId, complexList]);

  const activeComplexProperties = useMemo(() => {
    if (!selectedComplexId) return [];
    if (selectedComplexId === '1' || selectedComplexId === 'bd') return bdProperties;
    if (selectedComplexId === '2' || selectedComplexId === 'elm-colborne') return elmProperties;
    if (selectedComplexId === 'ungrouped') return ungroupedProperties;
    return properties.filter(p => p.complexId === selectedComplexId);
  }, [selectedComplexId, bdProperties, elmProperties, ungroupedProperties, properties]);

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

  // Active complex default sets
  const activeComplexDefaultSets = useMemo(() => {
    if (!selectedComplexId || selectedComplexId === 'ungrouped') {
      return defaultSets;
    }
    const slug = selectedComplexId === '1' ? 'bd' : selectedComplexId === '2' ? 'elm-colborne' : selectedComplexId;
    return defaultSets.filter(s => s.complexId === selectedComplexId || s.complexSlug === slug);
  }, [selectedComplexId, defaultSets]);

  // Direct Search Logic: Matches units and buildings directly without opening folders
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    // Tokens without noise words like 'rd', 'st', 'road', 'street', 'unit'
    const tokens = q
      .replace(/,/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0 && t !== 'unit' && t !== 'apt');

    // Match Buildings
    const matchedBuildings = properties.filter(p => {
      if (p.name.includes('Pool')) return false;
      const target = `${p.name} ${p.address}`.toLowerCase();
      return tokens.every(t => target.includes(t));
    });

    // Match Units: search in unitNumber + building name + building address
    const matchedUnits = units.filter(u => {
      const bld = properties.find(p => p.id === u.buildingId);
      if (!bld || bld.name.includes('Pool')) return false;

      const fullString = `unit ${u.unitNumber} ${bld.name} ${bld.address}`.toLowerCase();

      // Check if every token matches the unit's context
      return tokens.every(t => fullString.includes(t));
    });

    return {
      buildings: matchedBuildings,
      units: matchedUnits
    };
  }, [searchQuery, properties, units]);

  // Breadcrumb Helpers
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
      if (bld.complexId === '1' || bld.complexId === 'complex-bd' || bld.address.includes('Bath') || bld.address.includes('Days')) {
        setSelectedComplexId('1');
      } else if (bld.complexId === '2' || bld.complexId === 'complex-elm' || bld.address.includes('Elm') || bld.address.includes('Colborne')) {
        setSelectedComplexId('2');
      } else {
        setSelectedComplexId('ungrouped');
      }
    }
    setSelectedBuildingId(bId);
    setSelectedUnitId(null);
    setNavLevel('building');
    setSearchQuery('');
  };

  const handleNavUnit = (uId: string) => {
    const u = units.find(unit => unit.id === uId);
    if (u) {
      handleNavBuilding(u.buildingId);
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
    // Default to first unit in current complex
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
      // Need confirmation
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
    const updated: ApplianceDefaultSet = {
      ...editSetModalSet,
      name: editSetForm.name,
      bedrooms: Number(editSetForm.bedrooms),
      bathrooms: Number(editSetForm.bathrooms),
      stories: Number(editSetForm.stories),
      notes: editSetForm.notes
    };
    updateDefaultSet(updated);
    setEditSetModalSet(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-sans pb-32">
      {/* 1. TOP HEADER & BREADCRUMBS (BRUTALIST / SHARP 0PX) */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#1E293B] border-b-2 border-slate-900 dark:border-slate-700 px-4 py-3">
        {/* Breadcrumb Bar */}
        <nav className="flex items-center gap-1.5 text-xs font-mono tracking-wider overflow-x-auto whitespace-nowrap py-1">
          <button
            onClick={handleNavRoot}
            className={`font-bold uppercase px-2 py-1 border transition-colors ${
              navLevel === 'root'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Complexes
          </button>

          {activeComplex && navLevel !== 'root' && (
            <>
              <span className="text-slate-400">/</span>
              <button
                onClick={() => handleNavComplex(activeComplex.id)}
                className={`font-bold uppercase px-2 py-1 border transition-colors ${
                  navLevel === 'complex'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {activeComplex.name}
              </button>
            </>
          )}

          {activeBuilding && (navLevel === 'building' || navLevel === 'unit') && (
            <>
              <span className="text-slate-400">/</span>
              <button
                onClick={() => handleNavBuilding(activeBuilding.id)}
                className={`font-bold uppercase px-2 py-1 border transition-colors ${
                  navLevel === 'building'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {activeBuilding.name}
              </button>
            </>
          )}

          {activeUnit && navLevel === 'unit' && (
            <>
              <span className="text-slate-400">/</span>
              <span className="font-bold uppercase px-2 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-900 dark:border-slate-100">
                Unit {activeUnit.unitNumber}
              </span>
            </>
          )}

          {navLevel === 'defaults' && (
            <>
              <span className="text-slate-400">/</span>
              <span className="font-bold uppercase px-2 py-1 bg-[#0077B6] text-white border border-[#0077B6]">
                Appliance Defaults
              </span>
            </>
          )}
        </nav>

        {/* Direct Global Search Bar */}
        <div className="mt-2.5 relative">
          <div className="flex items-center border-2 border-slate-900 dark:border-slate-500 bg-white dark:bg-[#0F172A]">
            <span className="material-symbols-outlined px-2.5 text-slate-500 dark:text-slate-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Direct search: unit 32, 507 Days or 18 Elm 411..."
              className="w-full py-2 pr-3 text-sm bg-transparent outline-none font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 pt-4">
        {/* ============================================================== */}
        {/* DIRECT SEARCH RESULTS PANEL (WITHOUT OPENING FOLDERS FIRST)     */}
        {/* ============================================================== */}
        {searchResults ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0077B6] dark:text-[#38BDF8]">manage_search</span>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider">
                  Search Results for &quot;{searchQuery}&quot;
                </h2>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 border border-slate-400">
                {searchResults.units.length} Units · {searchResults.buildings.length} Buildings
              </span>
            </div>

            {/* Units Matching Direct Query */}
            {searchResults.units.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Direct Unit Matches ({searchResults.units.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.units.map(unit => {
                    const bld = properties.find(p => p.id === unit.buildingId);
                    return (
                      <div
                        key={unit.id}
                        onClick={() => handleNavUnit(unit.id)}
                        className="p-3 border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:border-[#0077B6] dark:hover:border-[#38BDF8] cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base font-mono font-bold text-[#0077B6] dark:text-[#38BDF8]">
                            Unit {unit.unitNumber}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                            {unit.unitType || 'Apartment'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {bld?.name || 'Building'}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {bld?.address}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                          <span>{unit.bedrooms || 2} Bed / {unit.bathrooms || 1} Bath</span>
                          <span className="flex items-center gap-1 text-[#0077B6] dark:text-[#38BDF8] font-bold">
                            Open Unit <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Buildings Matching Direct Query */}
            {searchResults.buildings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Direct Building Matches ({searchResults.buildings.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.buildings.map(bld => {
                    const uCount = units.filter(u => u.buildingId === bld.id).length;
                    return (
                      <div
                        key={bld.id}
                        onClick={() => handleNavBuilding(bld.id)}
                        className="p-3 border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:border-[#0077B6] dark:hover:border-[#38BDF8] cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {bld.name}
                          </h4>
                          {bld.isStorageNode && (
                            <span className="text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-600 px-1.5 py-0.5">
                              Storage Node
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mb-2">
                          {bld.address}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300">
                          <span>{uCount > 0 ? `${uCount} Units` : '0 Units (Roster pending)'}</span>
                          <span className="flex items-center gap-1 text-[#0077B6] dark:text-[#38BDF8] font-bold">
                            View Building <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {searchResults.units.length === 0 && searchResults.buildings.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-slate-400 dark:border-slate-600">
                <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">search_off</span>
                <p className="text-sm font-mono font-bold">No units or buildings match &quot;{searchQuery}&quot;</p>
                <p className="text-xs text-slate-500 font-mono mt-1">Try &quot;unit 32, 507 Days&quot; or &quot;18 Elm 411&quot;</p>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* REGULAR FOLDER & DRILL-DOWN HIERARCHY NAVIGATION               */
          /* ============================================================== */
          <div>
            {/* LEVEL 0: ROOT FOLDER VIEW */}
            {navLevel === 'root' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0077B6] dark:text-[#38BDF8]">folder</span>
                    <h1 className="text-sm font-mono font-bold uppercase tracking-wider">
                      Complex Folders ({properties.length} Total Properties)
                    </h1>
                  </div>
                  <button
                    onClick={() => handleNavDefaults()}
                    className="flex items-center gap-1 text-xs font-mono font-bold uppercase px-3 py-1 bg-white dark:bg-[#1E293B] border-2 border-slate-900 dark:border-slate-600 hover:border-[#0077B6] dark:hover:border-[#38BDF8] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    All Default Sets
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* FOLDER 1: BD COMPLEX */}
                  <div className="border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-2xl text-[#0077B6] dark:text-[#38BDF8]">folder</span>
                          <h2 className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white">BD</h2>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-600">
                          {bdProperties.length} Buildings
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                        Bath Rd (1719, 1721, 1723, 1725, 1727, 1731, 1733, 1737) &amp; Days Rd (505, 507, 509, 511).
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-2 border border-amber-300 dark:border-amber-800 mb-4">
                        <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                        <span>511 Days Rd: Central Storage Building</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => handleNavComplex('1')}
                        className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-900 dark:border-slate-100 hover:bg-[#0077B6] dark:hover:bg-[#38BDF8] dark:hover:text-slate-900 transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        Open Folder
                      </button>
                      <button
                        onClick={() => handleNavDefaults('1')}
                        className="px-3 py-2 text-xs font-mono font-bold uppercase bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-600 hover:border-[#0077B6] text-slate-900 dark:text-white transition-colors"
                        title="View & Configure Default Sets"
                      >
                        Defaults
                      </button>
                    </div>
                  </div>

                  {/* FOLDER 2: ELM + COLBORNE COMPLEX */}
                  <div className="border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-2xl text-[#0077B6] dark:text-[#38BDF8]">folder</span>
                          <h2 className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white">Elm + Colborne</h2>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-600">
                          {elmProperties.length} Buildings
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                        Downtown residential cluster: 18 Elm St, 24 Elm St, and 203 Colborne St.
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 border border-slate-300 dark:border-slate-700 mb-4">
                        <span className="material-symbols-outlined text-[16px]">apartment</span>
                        <span>18 Elm base units 101–414 (standard numbering)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => handleNavComplex('2')}
                        className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-900 dark:border-slate-100 hover:bg-[#0077B6] dark:hover:bg-[#38BDF8] dark:hover:text-slate-900 transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        Open Folder
                      </button>
                      <button
                        onClick={() => handleNavDefaults('2')}
                        className="px-3 py-2 text-xs font-mono font-bold uppercase bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-600 hover:border-[#0077B6] text-slate-900 dark:text-white transition-colors"
                        title="View & Configure Default Sets"
                      >
                        Defaults
                      </button>
                    </div>
                  </div>

                  {/* FOLDER 3: UNGROUPED */}
                  <div className="border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] md:col-span-2">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-2xl text-slate-500">folder_special</span>
                        <div>
                          <h2 className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white">Ungrouped</h2>
                          <p className="text-xs text-slate-500 font-mono">Properties without complex assignment</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-600">
                        {ungroupedProperties.length} Properties
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                      Single rental homes, commercial storefronts, and independent multi-units across Kingston.
                    </p>
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => handleNavComplex('ungrouped')}
                        className="w-full py-2 text-xs font-mono font-bold uppercase bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-600 hover:border-[#0077B6] hover:text-[#0077B6] dark:hover:border-[#38BDF8] dark:hover:text-[#38BDF8] transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        Browse Ungrouped Properties ({ungroupedProperties.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add Property Button (Edit Mode Only) */}
                {isEditMode && (
                  <div
                    onClick={onAddProperty}
                    className="p-4 border-2 border-dashed border-slate-400 dark:border-slate-600 text-center hover:border-[#0077B6] cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-2xl text-[#0077B6] mb-1">add_location_alt</span>
                    <p className="text-xs font-mono font-bold uppercase">Add New Property to Portfolio</p>
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 1: COMPLEX LEVEL (BUILDINGS IN COMPLEX) */}
            {navLevel === 'complex' && activeComplex && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleNavRoot}
                      className="p-1 border border-slate-400 hover:border-slate-900 dark:hover:border-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-base font-mono font-bold uppercase text-slate-900 dark:text-white">
                        {activeComplex.name} Folder
                      </h2>
                      <p className="text-xs font-mono text-slate-500">{activeComplexProperties.length} Buildings in Complex</p>
                    </div>
                  </div>

                  {activeComplex.id !== 'ungrouped' && (
                    <button
                      onClick={() => handleNavDefaults(activeComplex.id)}
                      className="flex items-center gap-1 text-xs font-mono font-bold uppercase px-3 py-1.5 bg-[#0077B6] text-white border border-[#0077B6] hover:bg-[#005d90] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                      {activeComplex.name} Defaults
                    </button>
                  )}
                </div>

                {/* List of Buildings in this Complex */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeComplexProperties.map(bld => {
                    const bldUnits = units.filter(u => u.buildingId === bld.id);
                    const is511Storage = bld.id === 'prop-days-511';
                    const is1727Bath = bld.id === 'prop-bath-1727';

                    return (
                      <div
                        key={bld.id}
                        className="p-4 border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                              {bld.name}
                            </h3>
                            {is511Storage && (
                              <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-600 px-1.5 py-0.5 whitespace-nowrap">
                                STORAGE BLDG
                              </span>
                            )}
                            {is1727Bath && (
                              <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-500 px-1.5 py-0.5 whitespace-nowrap">
                                0 UNITS (EMPTY)
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">
                            {bld.address}
                          </p>
                          {bld.comments && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                              {bld.comments}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                            {bldUnits.length} Units
                          </span>
                          <button
                            onClick={() => handleNavBuilding(bld.id)}
                            className="flex items-center gap-1 text-xs font-mono font-bold uppercase text-[#0077B6] dark:text-[#38BDF8] hover:underline"
                          >
                            Explore Units <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
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
                <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNavComplex(selectedComplexId || 'ungrouped')}
                      className="p-1 border border-slate-400 hover:border-slate-900 dark:hover:border-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-base font-mono font-bold uppercase text-slate-900 dark:text-white">
                        {activeBuilding.name}
                      </h2>
                      <p className="text-xs font-mono text-slate-500">{activeBuilding.address}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onPropertyClick(activeBuilding.id)}
                    className="text-xs font-mono font-bold uppercase px-2.5 py-1.5 border border-slate-900 dark:border-slate-500 hover:border-[#0077B6] transition-colors"
                  >
                    Building Details
                  </button>
                </div>

                {/* Central Storage Indicator if 511 Days */}
                {activeBuilding.id === 'prop-days-511' && (
                  <div className="p-3 border-2 border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-mono text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-xl">inventory_2</span>
                    <div>
                      <strong>CENTRAL STORAGE BUILDING:</strong> 511 Days Rd basement houses primary replacement inventory for BD complex.
                    </div>
                  </div>
                )}

                {/* 1727 Bath Notice if applicable */}
                {activeBuilding.id === 'prop-bath-1727' && (
                  <div className="p-4 border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-mono text-xs">
                    <strong>1727 BATH ROAD:</strong> Real property registered in portfolio with no units yet.
                  </div>
                )}

                {/* Units List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                      Roster of Units ({activeBuildingUnits.length})
                    </h3>
                  </div>

                  {activeBuildingUnits.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeBuildingUnits.map(unit => {
                        const unitApps = getUnitAppliances(unit);
                        const overrideCount = Object.keys(unit.applianceOverrides || {}).length;

                        return (
                          <div
                            key={unit.id}
                            onClick={() => handleNavUnit(unit.id)}
                            className="p-3 border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:border-[#0077B6] dark:hover:border-[#38BDF8] cursor-pointer transition-all"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-base font-mono font-bold text-slate-900 dark:text-white">
                                Unit {unit.unitNumber}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {overrideCount > 0 ? (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#0077B6] text-white">
                                    {overrideCount} OVERRIDE{overrideCount > 1 ? 'S' : ''}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                    DEFAULT SET
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs font-mono text-slate-500 mb-2">
                              {unit.unitType?.toUpperCase() || 'APARTMENT'} · {unit.bedrooms || 2} Bed / {unit.bathrooms || 1} Bath {unit.stories ? `· ${unit.stories} Stories` : ''}
                            </p>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                              <span>{unitApps.length} Appliances</span>
                              <span className="flex items-center gap-1 text-[#0077B6] dark:text-[#38BDF8] font-bold">
                                View Appliances <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-400 dark:border-slate-600">
                      <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">door_front</span>
                      <p className="text-sm font-mono font-bold">No units configured for this building yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LEVEL 3: UNIT LEVEL (APPLIANCES WITH DEFAULT / OVERRIDE BADGES) */}
            {navLevel === 'unit' && activeUnit && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNavBuilding(activeUnit.buildingId)}
                      className="p-1 border border-slate-400 hover:border-slate-900 dark:hover:border-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-base font-mono font-bold uppercase text-slate-900 dark:text-white">
                        Unit {activeUnit.unitNumber}
                      </h2>
                      <p className="text-xs font-mono text-slate-500">
                        {activeBuilding?.name} · {activeUnit.bedrooms || 2} Bed / {activeUnit.bathrooms || 1} Bath
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {Object.keys(activeUnit.applianceOverrides || {}).length > 0 && (
                      <button
                        onClick={() => resetUnitToDefault(activeUnit.id)}
                        className="text-xs font-mono font-bold uppercase px-3 py-1.5 border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                        Reset to Default
                      </button>
                    )}
                  </div>
                </div>

                {/* Default Set Status Card */}
                <div className="p-3 border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">APPLIED DEFAULT SET:</span>
                    <span className="font-bold text-[#0077B6] dark:text-[#38BDF8]">
                      {activeUnit.defaultSetId
                        ? defaultSets.find(s => s.id === activeUnit.defaultSetId)?.name || activeUnit.defaultSetId
                        : 'Inherited from Complex'}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5">
                    <span>
                      {Object.keys(activeUnit.applianceOverrides || {}).length} Per-Unit Override(s) Stored
                    </span>
                    <span>
                      {activeUnitAppliances.filter(a => a.isDefault).length} Inherited from Default Set
                    </span>
                  </div>
                </div>

                {/* Appliances List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Appliances in Unit ({activeUnitAppliances.length})
                  </h3>

                  <div className="space-y-3">
                    {activeUnitAppliances.map(app => (
                      <div
                        key={app.id || app.type}
                        className={`p-4 border-2 bg-white dark:bg-[#1E293B] ${
                          app.isOverride
                            ? 'border-[#0077B6] dark:border-[#38BDF8]'
                            : 'border-slate-900 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-[20px]">
                                {app.type.includes('FRIDGE')
                                  ? 'kitchen'
                                  : app.type.includes('STOVE') || app.type.includes('RANGE')
                                  ? 'cooking'
                                  : app.type.includes('DISHWASHER')
                                  ? 'dishwasher_gen'
                                  : app.type.includes('WATER_HEATER')
                                  ? 'water_heater'
                                  : 'device_unknown'}
                              </span>
                              <h4 className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                                {app.name || app.type}
                              </h4>
                            </div>
                            <p className="text-xs font-mono text-slate-500 mt-0.5">
                              CATEGORY: {app.category || 'APPLIANCE'} · TYPE: {app.type}
                            </p>
                          </div>

                          {/* DEFAULT vs OVERRIDE BADGE */}
                          {app.isOverride ? (
                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#0077B6] text-white tracking-wider">
                              [OVERRIDE]
                            </span>
                          ) : (
                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 tracking-wider">
                              [DEFAULT]
                            </span>
                          )}
                        </div>

                        {/* Specs & Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 border border-slate-200 dark:border-slate-700 mb-3">
                          <div>
                            <span className="text-slate-400">BRAND:</span> {app.brand || 'Default / Standard'}
                          </div>
                          <div>
                            <span className="text-slate-400">MODEL:</span> {app.modelNumber || 'Standard Default Spec'}
                          </div>
                          {app.notes && (
                            <div className="col-span-2 text-[11px] text-slate-500 italic">
                              {app.notes}
                            </div>
                          )}
                        </div>

                        {/* Override Action Button */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
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
                            className="px-3 py-1.5 text-xs font-mono font-bold uppercase bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-600 hover:border-[#0077B6] text-slate-900 dark:text-white transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            {app.isOverride ? 'Edit Override' : 'Override This Appliance'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LEVEL 4: DEFAULTS VIEW (LIST OF ALL 4 SEEDED SETS & VARIATIONS) */}
            {navLevel === 'defaults' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => (selectedComplexId ? handleNavComplex(selectedComplexId) : handleNavRoot())}
                      className="p-1 border border-slate-400 hover:border-slate-900 dark:hover:border-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                      <h2 className="text-base font-mono font-bold uppercase text-slate-900 dark:text-white">
                        Appliance Default Sets
                      </h2>
                      <p className="text-xs font-mono text-slate-500">
                        {activeComplex ? `${activeComplex.name} Scoped Sets` : 'All 4 Seeded Sets'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {activeComplexDefaultSets.map(set => (
                    <div
                      key={set.id}
                      className="p-4 border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-mono font-bold text-slate-900 dark:text-white">
                              {set.name}
                            </h3>
                            {set.isDefault && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#0077B6] text-white">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-slate-500 mt-0.5">
                            COMPLEX: {set.complexSlug.toUpperCase()} · UNIT TYPE: {set.unitType.toUpperCase()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditSet(set)}
                            className="px-2.5 py-1 text-xs font-mono font-bold uppercase bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-600 hover:border-[#0077B6] transition-colors"
                          >
                            Edit Set
                          </button>
                          <button
                            onClick={() => handleStartApplyDefaultSet(set)}
                            className="px-3 py-1 text-xs font-mono font-bold uppercase bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-900 dark:border-slate-100 hover:bg-[#0077B6] dark:hover:bg-[#38BDF8] transition-colors"
                          >
                            Apply to Unit
                          </button>
                        </div>
                      </div>

                      {/* Facts Matrix */}
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mb-3">
                        <div>
                          <span className="text-slate-400">BEDROOMS:</span> {set.bedrooms ?? 2}
                        </div>
                        <div>
                          <span className="text-slate-400">WASHROOMS:</span> {set.bathrooms ?? 1}
                        </div>
                        <div>
                          <span className="text-slate-400">STORIES:</span> {set.stories ?? 1}
                        </div>
                      </div>

                      {/* Appliance List in Set */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                          Standard Appliances ({set.appliances.length}):
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {set.appliances.map((appItem, idx) => (
                            <div
                              key={idx}
                              className="p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs font-mono"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-[#0077B6] dark:text-[#38BDF8]">
                                  check_box
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {appItem.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 uppercase">
                                {appItem.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {set.notes && (
                        <p className="mt-3 text-xs font-mono text-slate-500 italic border-t border-slate-200 dark:border-slate-700 pt-2">
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

      {/* ============================================================== */}
      {/* MODAL 1: APPLIANCE OVERRIDE EDITOR                             */}
      {/* ============================================================== */}
      {overrideModalAppliance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-none">
          <div className="bg-white dark:bg-[#1E293B] border-2 border-slate-900 dark:border-white p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-slate-900 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-mono font-bold uppercase text-slate-900 dark:text-white">
                Override Appliance ({overrideModalAppliance.type})
              </h3>
              <button
                onClick={() => setOverrideModalAppliance(null)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mb-4">
              Saving an override stores a deviation specifically for this unit. All other appliances remain inherited from the complex default set.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-500 uppercase mb-1">Brand</label>
                <input
                  type="text"
                  value={overrideForm.brand}
                  onChange={e => setOverrideForm(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="e.g. Frigidaire / Whirlpool"
                  className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase mb-1">Model Number</label>
                <input
                  type="text"
                  value={overrideForm.model}
                  onChange={e => setOverrideForm(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g. FFCD2418US3A"
                  className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase mb-1">Serial Number (Optional)</label>
                <input
                  type="text"
                  value={overrideForm.serial}
                  onChange={e => setOverrideForm(prev => ({ ...prev, serial: e.target.value }))}
                  placeholder="Verified serial if known"
                  className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase mb-1">Notes</label>
                <textarea
                  value={overrideForm.notes}
                  onChange={e => setOverrideForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Upgraded stainless replacement"
                  className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button
                onClick={() => setOverrideModalAppliance(null)}
                className="flex-1 py-2 text-xs font-mono font-bold uppercase border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-transparent text-slate-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApplianceOverride}
                className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-[#0077B6] text-white border-2 border-[#0077B6] hover:bg-[#005d90]"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: APPLY DEFAULT SET TO UNIT                             */}
      {/* ============================================================== */}
      {applySetModalSet && !showOverrideWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-none">
          <div className="bg-white dark:bg-[#1E293B] border-2 border-slate-900 dark:border-white p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-slate-900 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-mono font-bold uppercase text-slate-900 dark:text-white">
                Apply Set: {applySetModalSet.name}
              </h3>
              <button
                onClick={() => setApplySetModalSet(null)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mb-4">
              Select a target unit in the complex to inherit this default appliance set:
            </p>

            <div className="space-y-3 font-mono text-xs">
              <label className="block text-slate-500 uppercase">Target Unit</label>
              <select
                value={applyTargetUnitId}
                onChange={e => setApplyTargetUnitId(e.target.value)}
                className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
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

            <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button
                onClick={() => setApplySetModalSet(null)}
                className="flex-1 py-2 text-xs font-mono font-bold uppercase border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-transparent text-slate-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteApplyDefaultSet(false)}
                className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-[#0077B6] text-white border-2 border-[#0077B6] hover:bg-[#005d90]"
              >
                Apply Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: OVERWRITE WARNING MODAL                               */}
      {/* ============================================================== */}
      {showOverrideWarningModal && pendingApplyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none">
          <div className="bg-white dark:bg-[#1E293B] border-2 border-red-600 p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
            <div className="flex items-center gap-2 mb-3 text-red-600 dark:text-red-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="text-sm font-mono font-bold uppercase">
                Caution: Existing Overrides Present
              </h3>
            </div>

            <p className="text-xs font-mono text-slate-700 dark:text-slate-200 mb-4">
              This unit currently has <strong>{pendingApplyData.overrideCount} custom appliance override(s)</strong> stored.
              Applying a new default set will overwrite them.
            </p>

            <p className="text-xs font-mono text-slate-500 mb-4">
              Do you want to discard existing overrides and reset the unit completely to this default set?
            </p>

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 font-mono text-xs">
              <button
                onClick={() => {
                  setShowOverrideWarningModal(false);
                  setPendingApplyData(null);
                }}
                className="flex-1 py-2 font-bold uppercase border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white"
              >
                Keep Overrides
              </button>
              <button
                onClick={handleConfirmOverwriteApply}
                className="flex-1 py-2 font-bold uppercase bg-red-600 text-white border-2 border-red-600 hover:bg-red-700"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: EDIT DEFAULT SET (INDEPENDENT SET EDITOR)             */}
      {/* ============================================================== */}
      {editSetModalSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-none">
          <div className="bg-white dark:bg-[#1E293B] border-2 border-slate-900 dark:border-white p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-slate-900 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-mono font-bold uppercase text-slate-900 dark:text-white">
                Edit Set: {editSetModalSet.name}
              </h3>
              <button
                onClick={() => setEditSetModalSet(null)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mb-4">
              Changes apply exclusively to <strong>{editSetModalSet.name}</strong> ({editSetModalSet.complexSlug.toUpperCase()} complex).
              Other complexes remain unchanged.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-500 uppercase mb-1">Set Name</label>
                <input
                  type="text"
                  value={editSetForm.name}
                  onChange={e => setEditSetForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-500 uppercase mb-1">Beds</label>
                  <input
                    type="number"
                    value={editSetForm.bedrooms}
                    onChange={e => setEditSetForm(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
                    className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 uppercase mb-1">Baths</label>
                  <input
                    type="number"
                    value={editSetForm.bathrooms}
                    onChange={e => setEditSetForm(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
                    className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 uppercase mb-1">Stories</label>
                  <input
                    type="number"
                    value={editSetForm.stories}
                    onChange={e => setEditSetForm(prev => ({ ...prev, stories: Number(e.target.value) }))}
                    className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 uppercase mb-1">Notes</label>
                <textarea
                  value={editSetForm.notes}
                  onChange={e => setEditSetForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white outline-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button
                onClick={() => setEditSetModalSet(null)}
                className="flex-1 py-2 text-xs font-mono font-bold uppercase border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-transparent text-slate-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditSet}
                className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-[#0077B6] text-white border-2 border-[#0077B6] hover:bg-[#005d90]"
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
