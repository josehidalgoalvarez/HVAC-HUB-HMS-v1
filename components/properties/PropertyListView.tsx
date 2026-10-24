import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData';
import { Property, Unit, ApplianceDefaultSet, Appliance, ApplianceDefaultItem } from '../../types';
import {
  TRADE_APPLIANCE_TYPES,
  getVisibleSpecFields,
  getEditFormFieldsForType
} from '../../utils/applianceDefaultsUtils';
import {
  getUnitContextChips,
  getUnitContextDetail
} from '../../utils/unitContextUtils';

interface PropertyListViewProps {
  onPropertyClick: (id: string) => void;
  onAddProperty: () => void;
  isEditMode: boolean;
  initialNavLevel?: ViewNavLevel;
  onNavLevelChange?: (level: ViewNavLevel) => void;
}

type ViewNavLevel = 'root' | 'complex' | 'building' | 'unit' | 'defaults';

const PropertyListView: React.FC<PropertyListViewProps> = ({
  onPropertyClick,
  onAddProperty,
  isEditMode,
  initialNavLevel,
  onNavLevelChange
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
    updateDefaultSet,
    updateUnit
  } = useData();

  // Navigation State
  const [navLevel, setNavLevelState] = useState<ViewNavLevel>(initialNavLevel || 'root');
  const setNavLevel = (level: ViewNavLevel) => {
    setNavLevelState(level);
    onNavLevelChange?.(level);
  };
  React.useEffect(() => {
    if (initialNavLevel && initialNavLevel !== navLevel) {
      setNavLevelState(initialNavLevel);
    }
  }, [initialNavLevel]);

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

  // Accordion expansion states (default: all collapsed)
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(new Set());
  const [expandedApplianceKeys, setExpandedApplianceKeys] = useState<Set<string>>(new Set());

  // Add Appliance to Set Modal State
  const [addApplianceModalSet, setAddApplianceModalSet] = useState<ApplianceDefaultSet | null>(null);
  const [selectedAddTradeType, setSelectedAddTradeType] = useState<string>('Gas Furnace');
  const [customAddApplianceLabel, setCustomAddApplianceLabel] = useState<string>('');

  const [editSpecModalData, setEditSpecModalData] = useState<{
    set: ApplianceDefaultSet;
    applianceIndex: number;
  } | null>(null);
  const [editSpecForm, setEditSpecForm] = useState({
    type: '',
    label: '',
    model: '',
    manualUrl: '',
    fuelType: '',
    volts: '',
    capacity: '',
    btuInput: '',
    btuOutput: '',
    filterSize: '',
    refrigerantType: '',
    efficiency: '',
    notes: '',
    showAllFields: false
  });

  const [defaultsSectionFilter, setDefaultsSectionFilter] = useState<string>('all');

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

  const activeDefaultSet = useMemo(() => {
    if (!activeUnit) return null;
    if (activeUnit.defaultSetId) {
      return defaultSets.find(s => s.id === activeUnit.defaultSetId) || null;
    }
    const bld = properties.find(p => p.id === activeUnit.buildingId);
    if (bld?.complexId) {
      return defaultSets.find(s => (s.complexId === bld.complexId || s.complexSlug === bld.complexId) && s.unitType === (activeUnit.unitType || 'apartment') && s.isDefault) || null;
    }
    return defaultSets.find(s => s.unitType === (activeUnit.unitType || 'apartment') && s.isDefault) || null;
  }, [activeUnit, defaultSets, properties]);

  const activeComplexDefaultSets = useMemo(() => {
    if (!selectedComplexId || selectedComplexId === 'ungrouped') {
      return defaultSets;
    }
    return defaultSets.filter(s => s.complexId === selectedComplexId || s.complexSlug === selectedComplexId);
  }, [selectedComplexId, defaultSets]);

  const mapComplexIdToSection = (cId?: string): string => {
    if (!cId) return 'all';
    const lower = cId.toLowerCase();
    if (lower.includes('bd') || lower.includes('bath') || lower.includes('days')) return 'bd';
    if (lower.includes('elm') || lower.includes('colborne')) return 'elm-colborne';
    if (lower.includes('amherst')) return 'amherst';
    if (lower.includes('manitou')) return 'manitou';
    if (lower.includes('frontenac')) return 'frontenac';
    if (lower.includes('princess') || lower.includes('alfred') || lower.includes('quadrant')) return 'princess-quadrant';
    if (lower.includes('skyfall') || lower.includes('sante') || lower.includes('armstrong')) return 'armstrong-skyfall';
    if (lower.includes('single')) return 'singles';
    return 'all';
  };

  const getApplianceIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('fridge') || t.includes('refrigerator')) return 'kitchen';
    if (t.includes('stove') || t.includes('range') || t.includes('cooktop') || t.includes('oven')) return 'soup_kitchen';
    if (t.includes('dish')) return 'countertops';
    if (t.includes('water heater') || t.includes('hwt') || t.includes('tank')) return 'water_drop';
    if (t.includes('ac') || t.includes('air condition') || t.includes('heat pump')) return 'ac_unit';
    if (t.includes('furnace') || t.includes('heating')) return 'local_fire_department';
    if (t.includes('thermostat')) return 'thermostat';
    if (t.includes('hood') || t.includes('fan')) return 'air';
    if (t.includes('wash') || t.includes('dryer') || t.includes('laundry')) return 'local_laundry_service';
    if (t.includes('fireplace')) return 'fireplace';
    return 'devices';
  };

  const groupedDefaultSets = useMemo(() => {
    const complexGroups: { id: string; title: string; subtitle: string; icon: string; sets: ApplianceDefaultSet[] }[] = [
      { id: 'bd', title: 'Bath Road & Days Road (BD)', subtitle: 'BD Apartments & Townhouses', icon: 'apartment', sets: [] },
      { id: 'elm-colborne', title: 'Elm + Colborne', subtitle: '18 Elm, 24 Elm & 203 Colborne', icon: 'home_work', sets: [] },
      { id: 'amherst', title: 'Amherstview', subtitle: 'Amherst Apartments & Townhouses', icon: 'domain', sets: [] },
      { id: 'manitou', title: 'Manitou Crescent', subtitle: 'Manitou Townhouses & Apartments', icon: 'holiday_village', sets: [] },
      { id: 'princess-quadrant', title: 'Princess Trio & Quadrant', subtitle: 'Alfred, Victoria, Frontenac & Princess multi-unit properties', icon: 'location_city', sets: [] },
      { id: 'frontenac', title: 'Frontenac Condo', subtitle: 'Frontenac single condo building', icon: 'domain_add', sets: [] },
      { id: 'armstrong-skyfall', title: 'Skyfall & Le Santé (Uniform Building)', subtitle: '2274 Princess St / Uniform specifications', icon: 'stars', sets: [] },
      { id: 'singles', title: 'Singles & Standalone', subtitle: 'Single rental homes, commercial storefronts & office', icon: 'cottage', sets: [] },
    ];

    const groupMap = new Map<string, { id: string; title: string; subtitle: string; icon: string; sets: ApplianceDefaultSet[] }>();
    complexGroups.forEach(g => groupMap.set(g.id, g));

    const otherSets: ApplianceDefaultSet[] = [];

    defaultSets.forEach(s => {
      const slug = (s.complexSlug || s.complexId || '').toLowerCase();
      if (slug === 'bd') {
        groupMap.get('bd')!.sets.push(s);
      } else if (slug === 'elm-colborne' || slug === 'elm') {
        groupMap.get('elm-colborne')!.sets.push(s);
      } else if (slug === 'amherst') {
        groupMap.get('amherst')!.sets.push(s);
      } else if (slug === 'manitou') {
        groupMap.get('manitou')!.sets.push(s);
      } else if (slug === 'alfred' || slug === 'princess' || slug === 'princess-trio' || slug === 'quadrant') {
        groupMap.get('princess-quadrant')!.sets.push(s);
      } else if (slug === 'frontenac') {
        groupMap.get('frontenac')!.sets.push(s);
      } else if (slug === 'armstrong-skyfall' || slug === 'skyfall') {
        groupMap.get('armstrong-skyfall')!.sets.push(s);
      } else if (slug === 'singles') {
        groupMap.get('singles')!.sets.push(s);
      } else {
        otherSets.push(s);
      }
    });

    const result = complexGroups.filter(g => g.sets.length > 0);
    if (otherSets.length > 0) {
      result.push({
        id: 'other',
        title: 'Other Default Sets',
        subtitle: 'Additional specifications',
        icon: 'devices_other',
        sets: otherSets
      });
    }

    return result;
  }, [defaultSets]);

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
    if (cId) {
      setSelectedComplexId(cId);
      setDefaultsSectionFilter(mapComplexIdToSection(cId));
    } else {
      setSelectedComplexId(null);
      setDefaultsSectionFilter('all');
    }
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

  // Accordion Toggle Handlers
  const toggleSetExpanded = (setId: string) => {
    setExpandedSetIds(prev => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  };

  const toggleApplianceExpanded = (key: string) => {
    setExpandedApplianceKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExpandAllSets = () => {
    setExpandedSetIds(new Set(defaultSets.map(s => s.id)));
  };

  const handleCollapseAllSets = () => {
    setExpandedSetIds(new Set());
    setExpandedApplianceKeys(new Set());
  };

  // Add Appliance to Set Handlers
  const handleStartAddAppliance = (set: ApplianceDefaultSet) => {
    setAddApplianceModalSet(set);
    setSelectedAddTradeType('Gas Furnace');
    setCustomAddApplianceLabel('');
  };

  const handleConfirmAddAppliance = () => {
    if (!addApplianceModalSet) return;
    const tradeOption = TRADE_APPLIANCE_TYPES.find(t => t.type === selectedAddTradeType) || TRADE_APPLIANCE_TYPES[0];
    const label = customAddApplianceLabel.trim() || tradeOption.label;
    const newApp: ApplianceDefaultItem = {
      category: tradeOption.category,
      type: tradeOption.type,
      name: `${label} (default)`,
      label: label,
      isDefault: true,
      model: '',
      manualUrl: '',
      notes: 'Specification pending (TODO)',
      specs: {
        fuelType: tradeOption.defaultFuelType || '',
        volts: tradeOption.defaultVolts || '',
        capacity: '',
        btuInput: '',
        btuOutput: '',
        filterSize: '',
        refrigerantType: '',
        efficiency: '',
        notes: ''
      }
    };

    const updatedAppliances = [...addApplianceModalSet.appliances, newApp];
    const newIndex = updatedAppliances.length - 1;
    const updatedSet: ApplianceDefaultSet = {
      ...addApplianceModalSet,
      appliances: updatedAppliances
    };

    updateDefaultSet(updatedSet);
    // Expand the set so the user sees the newly added appliance
    setExpandedSetIds(prev => new Set(prev).add(addApplianceModalSet.id));
    // Expand the appliance specs
    setExpandedApplianceKeys(prev => new Set(prev).add(`${addApplianceModalSet.id}_${newIndex}`));
    // Close add modal
    setAddApplianceModalSet(null);
    setCustomAddApplianceLabel('');
    // Open the edit spec modal right away so Jose can fill in model/specs
    handleStartEditApplianceSpec(updatedSet, newIndex);
  };

  const handleRemoveApplianceFromSet = (set: ApplianceDefaultSet, applianceIndex: number) => {
    const appItem = set.appliances[applianceIndex];
    const label = appItem?.label || appItem?.name || 'appliance';
    if (!window.confirm(`Remove ${label} from default set "${set.name}"?`)) return;
    const updatedAppliances = set.appliances.filter((_, idx) => idx !== applianceIndex);
    updateDefaultSet({
      ...set,
      appliances: updatedAppliances
    });
  };

  const handleStartEditApplianceSpec = (set: ApplianceDefaultSet, applianceIndex: number) => {
    const appItem = set.appliances[applianceIndex];
    if (!appItem) return;
    setEditSpecModalData({ set, applianceIndex });
    setEditSpecForm({
      type: appItem.type || '',
      label: appItem.label || appItem.name || '',
      model: appItem.model || appItem.specs?.model || '',
      manualUrl: appItem.manualUrl || appItem.specs?.manualUrl || '',
      fuelType: appItem.specs?.fuelType || '',
      volts: appItem.specs?.volts || '',
      capacity: appItem.specs?.capacity || '',
      btuInput: appItem.specs?.btuInput || '',
      btuOutput: appItem.specs?.btuOutput || '',
      filterSize: appItem.specs?.filterSize || '',
      refrigerantType: appItem.specs?.refrigerantType || '',
      efficiency: appItem.specs?.efficiency || '',
      notes: appItem.notes || appItem.specs?.notes || '',
      showAllFields: false
    });
  };

  const handleSaveApplianceSpec = () => {
    if (!editSpecModalData) return;
    const { set, applianceIndex } = editSpecModalData;
    const updatedAppliances = set.appliances.map((app, idx) => {
      if (idx !== applianceIndex) return app;
      const modelVal = editSpecForm.model.trim();
      const manualUrlVal = editSpecForm.manualUrl.trim();
      const notesVal = editSpecForm.notes.trim();
      const labelVal = editSpecForm.label.trim();
      const typeVal = editSpecForm.type.trim() || app.type;
      return {
        ...app,
        type: typeVal,
        label: labelVal || app.label || app.name,
        name: labelVal ? `${labelVal} (default)` : app.name,
        model: modelVal || undefined,
        manualUrl: manualUrlVal || undefined,
        notes: notesVal || undefined,
        specs: {
          ...app.specs,
          model: modelVal || undefined,
          manualUrl: manualUrlVal || undefined,
          fuelType: editSpecForm.fuelType.trim() || undefined,
          volts: editSpecForm.volts.trim() || undefined,
          capacity: editSpecForm.capacity.trim() || undefined,
          btuInput: editSpecForm.btuInput.trim() || undefined,
          btuOutput: editSpecForm.btuOutput.trim() || undefined,
          filterSize: editSpecForm.filterSize.trim() || undefined,
          refrigerantType: editSpecForm.refrigerantType.trim() || undefined,
          efficiency: editSpecForm.efficiency.trim() || undefined,
          notes: notesVal || undefined,
        }
      };
    });
    updateDefaultSet({
      ...set,
      appliances: updatedAppliances
    });
    setEditSpecModalData(null);
  };

  const handleUpdateUnitAttribute = (field: keyof Unit, value: any) => {
    if (!activeUnit) return;
    const updatedUnit: Unit = {
      ...activeUnit,
      [field]: value
    };
    if (field === 'washrooms') {
      updatedUnit.bathrooms = value;
    } else if (field === 'bathrooms') {
      updatedUnit.washrooms = value;
    } else if (field === 'storeys') {
      updatedUnit.stories = value;
    } else if (field === 'stories') {
      updatedUnit.storeys = value;
    } else if (field === 'renovated_date') {
      updatedUnit.renovatedDate = value;
    } else if (field === 'renovatedDate') {
      updatedUnit.renovated_date = value;
    } else if (field === 'move_in_date') {
      updatedUnit.moveInDate = value;
    } else if (field === 'moveInDate') {
      updatedUnit.move_in_date = value;
    } else if (field === 'occupancy_status') {
      updatedUnit.occupancyStatus = value;
    } else if (field === 'occupancyStatus') {
      updatedUnit.occupancy_status = value;
    } else if (field === 'vacant_since') {
      updatedUnit.vacantSince = value;
    } else if (field === 'vacantSince') {
      updatedUnit.vacant_since = value;
    }
    updateUnit(updatedUnit);
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
                    const unitDs = defaultSets.find(s => s.id === unit.defaultSetId);
                    const bedCount = unit.bedrooms ?? unitDs?.bedrooms ?? 2;
                    const bathCount = unit.washrooms ?? unit.bathrooms ?? unitDs?.bathrooms ?? 1;
                    const storeyCount = unit.storeys ?? unit.stories ?? unitDs?.stories;
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
                            {bedCount} Bed · {bathCount} Bath{storeyCount ? ` · ${storeyCount} Storey${storeyCount > 1 ? 's' : ''}` : ''}
                          </p>
                          {(() => {
                            const ctxChips = getUnitContextChips(unit);
                            if (ctxChips.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {ctxChips.map(c => (
                                  <span key={c.key} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${c.className}`}>
                                    <span className="material-symbols-outlined text-[12px] leading-none">{c.icon}</span>
                                    {c.label}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
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
                                {bld.role === 'storage' ? (bld.id === 'prop-days-511' || bld.id === '15' || bld.name?.includes('511 Days') ? 'Storage Node (Central)' : 'Storage Node') : bld.role === 'mechanical' ? 'Mechanical Hub' : bld.role === 'office' ? 'Office' : bld.role}
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
                                  {bld.role === 'storage' ? (bld.id === 'prop-days-511' || bld.id === '15' || bld.name?.includes('511 Days') ? 'Storage Node (Central)' : 'Storage Node') : bld.role === 'mechanical' ? 'Mechanical Hub' : bld.role === 'office' ? 'Office' : bld.role}
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
                      {activeBuilding.id === 'prop-days-511' || activeBuilding.id === '15' || activeBuilding.name?.includes('511 Days') ? (
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

                            {(() => {
                              const unitDs = defaultSets.find(s => s.id === unit.defaultSetId);
                              const bedCount = unit.bedrooms ?? unitDs?.bedrooms ?? 2;
                              const bathCount = unit.washrooms ?? unit.bathrooms ?? unitDs?.bathrooms ?? 1;
                              const storeyCount = unit.storeys ?? unit.stories ?? unitDs?.stories;
                              return (
                                <>
                                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-2">
                                    {unit.unitType?.toUpperCase() || 'APARTMENT'} · {bedCount} Bed · {bathCount} Bath{storeyCount ? ` · ${storeyCount} Storey${storeyCount > 1 ? 's' : ''}` : ''}
                                  </p>
                                  {(() => {
                                    const ctxChips = getUnitContextChips(unit);
                                    if (ctxChips.length === 0) return null;
                                    return (
                                      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                        {ctxChips.map(c => (
                                          <span key={c.key} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${c.className}`}>
                                            <span className="material-symbols-outlined text-[12px] leading-none">{c.icon}</span>
                                            {c.label}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </>
                              );
                            })()}

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
                        {activeBuilding?.name} · {activeUnit.bedrooms ?? activeDefaultSet?.bedrooms ?? 2} Bed / {activeUnit.washrooms ?? activeUnit.bathrooms ?? activeDefaultSet?.bathrooms ?? 1} Bath{activeUnit.storeys || activeUnit.stories ? ` · ${activeUnit.storeys || activeUnit.stories} Storey${(activeUnit.storeys || activeUnit.stories) > 1 ? 's' : ''}` : ''}
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

                {/* Unit Context Block (Renovated, Move-In, Occupancy Signals) */}
                {(() => {
                  const contextDetail = getUnitContextDetail(activeUnit);
                  const contextChips = getUnitContextChips(activeUnit);
                  return (
                    <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                            Unit Context
                          </h3>
                        </div>
                        {contextChips.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {contextChips.map(chip => (
                              <span key={chip.key} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${chip.className}`}>
                                <span className="material-symbols-outlined text-[12px] leading-none">{chip.icon}</span>
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-400">
                            Management Signals
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Renovated Signal */}
                        <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/80">
                          <div className="flex items-center gap-1.5 mb-1 text-text-sub-light dark:text-text-sub-dark">
                            <span className="material-symbols-outlined text-[15px] text-amber-500">construction</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider">Renovated</span>
                          </div>
                          <p className="text-xs font-semibold text-brand-black dark:text-white">
                            {contextDetail.renovatedDisplay}
                          </p>
                        </div>

                        {/* Move-In Signal */}
                        <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/80">
                          <div className="flex items-center gap-1.5 mb-1 text-text-sub-light dark:text-text-sub-dark">
                            <span className="material-symbols-outlined text-[15px] text-emerald-500">person_add</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider">Move-In</span>
                          </div>
                          <p className="text-xs font-semibold text-brand-black dark:text-white">
                            {contextDetail.moveInDisplay}
                          </p>
                        </div>

                        {/* Occupancy Signal */}
                        <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/80">
                          <div className="flex items-center gap-1.5 mb-1 text-text-sub-light dark:text-text-sub-dark">
                            <span className="material-symbols-outlined text-[15px] text-purple-500">door_open</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider">Occupancy</span>
                          </div>
                          <p className="text-xs font-semibold text-brand-black dark:text-white">
                            {contextDetail.occupancyDisplay}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Unit Attributes & Context Edit Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                        Unit Attributes & Context
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400">
                      Editable · Append-Only Audit
                    </span>
                  </div>

                  {/* Context Signals Edit Row */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Management Context Signals
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Renovated Status */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Renovated
                        </label>
                        <select
                          aria-label="Renovated"
                          value={activeUnit.renovated === true ? 'yes' : activeUnit.renovated === false ? 'no' : ''}
                          onChange={e => handleUpdateUnitAttribute('renovated', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Renovated (Yes)</option>
                          <option value="no">Not Renovated (No)</option>
                        </select>
                      </div>

                      {/* Renovated Date */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Renovated Date (Approx.)
                        </label>
                        <input
                          type="text"
                          aria-label="Renovated Date"
                          placeholder="e.g. 2024 or 2024-05"
                          value={activeUnit.renovated_date || activeUnit.renovatedDate || ''}
                          onChange={e => handleUpdateUnitAttribute('renovated_date', e.target.value.trim() || null)}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        />
                      </div>

                      {/* Occupancy Status */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Occupancy Status
                        </label>
                        <select
                          aria-label="Occupancy Status"
                          value={activeUnit.occupancy_status || activeUnit.occupancyStatus || 'unknown'}
                          onChange={e => handleUpdateUnitAttribute('occupancy_status', e.target.value)}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        >
                          <option value="unknown">Unknown</option>
                          <option value="occupied">Occupied</option>
                          <option value="vacant">Vacant</option>
                        </select>
                      </div>

                      {/* Vacant Since Date */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Vacant Since (Approx.)
                        </label>
                        <input
                          type="text"
                          aria-label="Vacant Since Date"
                          placeholder="e.g. 2026-05-01"
                          value={activeUnit.vacant_since || activeUnit.vacantSince || ''}
                          onChange={e => handleUpdateUnitAttribute('vacant_since', e.target.value.trim() || null)}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Move-in Date Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Move-in Date (Approx.)
                        </label>
                        <input
                          type="text"
                          aria-label="Move-in Date"
                          placeholder="e.g. 2024-05-01"
                          value={activeUnit.move_in_date || activeUnit.moveInDate || ''}
                          onChange={e => handleUpdateUnitAttribute('move_in_date', e.target.value.trim() || null)}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Layout Attributes Row */}
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Physical Layout
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Bedrooms Dropdown */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Bedrooms
                        </label>
                        <select
                          aria-label="Bedrooms"
                          value={activeUnit.bedrooms !== undefined && activeUnit.bedrooms !== null ? String(activeUnit.bedrooms) : ''}
                          onChange={e => handleUpdateUnitAttribute('bedrooms', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        >
                          <option value="">Default ({activeDefaultSet?.bedrooms ?? 2})</option>
                          <option value="1">1 Bedroom</option>
                          <option value="2">2 Bedrooms</option>
                          <option value="3">3 Bedrooms</option>
                          <option value="4">4 Bedrooms</option>
                          <option value="5">5 Bedrooms</option>
                        </select>
                      </div>

                      {/* Washrooms Dropdown */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Washrooms
                        </label>
                        <select
                          aria-label="Washrooms"
                          value={activeUnit.washrooms !== undefined && activeUnit.washrooms !== null ? String(activeUnit.washrooms) : (activeUnit.bathrooms !== undefined && activeUnit.bathrooms !== null ? String(activeUnit.bathrooms) : '')}
                          onChange={e => handleUpdateUnitAttribute('washrooms', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        >
                          <option value="">Default ({activeDefaultSet?.bathrooms ?? 1})</option>
                          <option value="1">1 Washroom</option>
                          <option value="1.5">1.5 Washrooms</option>
                          <option value="2">2 Washrooms</option>
                          <option value="2.5">2.5 Washrooms</option>
                          <option value="3">3 Washrooms</option>
                        </select>
                      </div>

                      {/* Storeys Dropdown */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Storeys
                        </label>
                        <select
                          aria-label="Storeys"
                          value={activeUnit.storeys !== undefined && activeUnit.storeys !== null ? String(activeUnit.storeys) : (activeUnit.stories !== undefined && activeUnit.stories !== null ? String(activeUnit.stories) : '')}
                          onChange={e => handleUpdateUnitAttribute('storeys', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        >
                          <option value="">Default ({activeDefaultSet?.stories ?? 1})</option>
                          <option value="1">1 Storey</option>
                          <option value="2">2 Storeys</option>
                          <option value="3">3 Storeys</option>
                        </select>
                      </div>

                      {/* Washer / Dryer Dropdown */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                          Washer / Dryer
                        </label>
                        <select
                          aria-label="Washer / Dryer"
                          value={activeUnit.washerDryerState || ''}
                          onChange={e => handleUpdateUnitAttribute('washerDryerState', e.target.value === '' ? null : e.target.value)}
                          className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-brand-black dark:text-white font-medium outline-none focus:border-primary"
                        >
                          <option value="">Unknown / None</option>
                          <option value="building_installed">Building-Installed</option>
                          <option value="tenant_owned">Tenant-Owned</option>
                          <option value="none">Shared Laundry / None</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5 text-text-sub-light dark:text-text-sub-dark">
                      <span>Default Set:</span>
                      <span className="font-bold text-primary">
                        {activeDefaultSet?.name || activeUnit.defaultSetId || 'Inherited from Complex'}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      Changes persist immediately with append-only audit trail.
                    </span>
                  </div>
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
                          {app.manualUrl && (
                            <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                              <a
                                href={app.manualUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
                              >
                                <span className="material-symbols-outlined text-[13px]">menu_book</span>
                                <span>Manufacturer Manual</span>
                                <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                              </a>
                            </div>
                          )}
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

            {/* LEVEL 4: APPLIANCE DEFAULTS LIBRARY */}
            {navLevel === 'defaults' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => (selectedComplexId ? handleNavComplex(selectedComplexId) : handleNavRoot())}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Back to navigation"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      </button>
                      <div>
                        <h2 className="text-lg font-bold text-brand-black dark:text-white flex items-center gap-2">
                          <span>Appliance Defaults Library</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {defaultSets.length} Sets
                          </span>
                        </h2>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5">
                          Standard specifications inherited by reference across all units. Edits propagate automatically.
                        </p>
                      </div>
                    </div>

                    {/* Accordion Expand / Collapse All Controls */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={handleExpandAllSets}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-neutral-800 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors flex items-center gap-1.5"
                        title="Expand all specification sets and appliances"
                      >
                        <span className="material-symbols-outlined text-[15px]">unfold_more</span>
                        <span>Expand All</span>
                      </button>
                      <button
                        onClick={handleCollapseAllSets}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-neutral-800 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors flex items-center gap-1.5"
                        title="Collapse all specification sets"
                      >
                        <span className="material-symbols-outlined text-[15px]">unfold_less</span>
                        <span>Collapse All</span>
                      </button>
                    </div>
                  </div>

                  {/* Section Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <button
                      onClick={() => setDefaultsSectionFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                        defaultsSectionFilter === 'all'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-text-sub-light dark:text-text-sub-dark hover:text-primary'
                      }`}
                    >
                      All Sections ({defaultSets.length})
                    </button>
                    {groupedDefaultSets.map(group => (
                      <button
                        key={group.id}
                        onClick={() => setDefaultsSectionFilter(group.id)}
                        className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          defaultsSectionFilter === group.id
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 text-text-sub-light dark:text-text-sub-dark hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">{group.icon}</span>
                        <span>{group.title.split(' (')[0]}</span>
                        <span className="text-[10px] opacity-75">({group.sets.length})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grouped Default Sets */}
                <div className="space-y-8">
                  {groupedDefaultSets
                    .filter(group => defaultsSectionFilter === 'all' || group.id === defaultsSectionFilter)
                    .map(group => (
                      <div key={group.id} className="space-y-4">
                        <div className="flex items-center justify-between pb-1 border-b border-gray-200/60 dark:border-gray-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">{group.icon}</span>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-brand-black dark:text-white">
                                {group.title}
                              </h3>
                              <p className="text-[11px] text-text-sub-light dark:text-text-sub-dark">
                                {group.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {group.sets.length} {group.sets.length === 1 ? 'Specification Set' : 'Specification Sets'}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {group.sets.map(set => {
                            const isSetExpanded = expandedSetIds.has(set.id);
                            return (
                              <div
                                key={set.id}
                                className={`rounded-2xl bg-white dark:bg-card-dark border transition-all ${
                                  isSetExpanded
                                    ? 'border-primary/50 dark:border-primary/40 shadow-sm'
                                    : 'border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                }`}
                              >
                                {/* Set Header - Accordion Toggle */}
                                <div
                                  onClick={() => toggleSetExpanded(set.id)}
                                  className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                                >
                                  <div className="flex items-start gap-3 min-w-0">
                                    <button
                                      type="button"
                                      className="mt-0.5 w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary text-gray-500 flex items-center justify-center shrink-0 transition-transform duration-200"
                                      aria-label={isSetExpanded ? 'Collapse set' : 'Expand set'}
                                    >
                                      <span
                                        className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                                          isSetExpanded ? 'rotate-180' : ''
                                        }`}
                                      >
                                        expand_more
                                      </span>
                                    </button>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-base font-bold text-brand-black dark:text-white truncate">
                                          {set.name}
                                        </h4>
                                        {set.isDefault && (
                                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                            Primary Default
                                          </span>
                                        )}
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize shrink-0">
                                          {set.unitType}
                                        </span>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 shrink-0">
                                          {set.appliances.length} {set.appliances.length === 1 ? 'Appliance' : 'Appliances'}
                                        </span>
                                      </div>

                                      {/* Scannable layout summary row */}
                                      <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-1 flex flex-wrap items-center gap-1.5">
                                        <span>{set.bedrooms ?? 2} Bed</span>
                                        <span>·</span>
                                        <span>{set.washrooms ?? set.bathrooms ?? 1} Washroom</span>
                                        <span>·</span>
                                        <span>{set.storeys ?? set.stories ?? 1} Storey{((set.storeys ?? set.stories ?? 1) > 1) ? 's' : ''}</span>
                                        <span>·</span>
                                        <span className="font-medium text-brand-black dark:text-white">
                                          {set.hasUnitWaterHeater ? 'Dedicated Tank' : 'Building Mechanical Room'}
                                        </span>
                                      </p>

                                      {/* Quick preview badges when collapsed so user can scan appliances without scrolling */}
                                      {!isSetExpanded && (
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                                          {set.appliances.map((app, aIdx) => (
                                            <span
                                              key={aIdx}
                                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700/60"
                                            >
                                              <span className="material-symbols-outlined text-[13px] text-primary">
                                                {getApplianceIcon(app.type || app.name)}
                                              </span>
                                              <span>{app.label || app.name.replace(' (default)', '')}</span>
                                              {(app.model || app.specs?.model) && (
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                                  ({app.model || app.specs?.model})
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons in Set Header */}
                                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleStartAddAppliance(set);
                                      }}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                                      title="Add an appliance to this default set"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">add</span>
                                      <span>Add Appliance</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleStartEditSet(set);
                                      }}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 hover:border-primary transition-colors flex items-center gap-1.5"
                                      title="Edit set layout metadata"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">edit</span>
                                      <span className="hidden md:inline">Edit Set</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleStartApplyDefaultSet(set);
                                      }}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5"
                                      title="Apply this default template to a unit"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">input</span>
                                      <span className="hidden md:inline">Apply to Unit</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Set Content */}
                                {isSetExpanded && (
                                  <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-800">
                                    {/* Layout Summary Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 mt-4">
                                      <div>
                                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Bedrooms</span>
                                        <span className="font-semibold">{set.bedrooms ?? 2} <span className="text-[10px] text-gray-400 font-normal">(overridable per unit)</span></span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Washrooms</span>
                                        <span className="font-semibold">{set.washrooms ?? set.bathrooms ?? 1}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Storeys (Floors)</span>
                                        <span className="font-semibold">{set.storeys ?? set.stories ?? 1}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Water Heater Node</span>
                                        <span className="font-semibold">{set.hasUnitWaterHeater ? 'In-Unit Tank' : 'Shared / Central'}</span>
                                      </div>
                                    </div>

                                    {set.notes && (
                                      <p className="text-xs italic text-gray-500 bg-gray-50/50 dark:bg-gray-900/30 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                        Set Notes: {set.notes}
                                      </p>
                                    )}

                                    {/* Appliances Accordion Section */}
                                    <div className="space-y-3 pt-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                          <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
                                          <span>Standard Appliances &amp; Specifications ({set.appliances.length})</span>
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleStartAddAppliance(set)}
                                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">add</span>
                                            <span>Add Appliance</span>
                                          </button>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 gap-2.5">
                                        {set.appliances.map((appItem, idx) => {
                                          const appKey = `${set.id}_${idx}`;
                                          const isAppExpanded = expandedApplianceKeys.has(appKey);
                                          const appModel = appItem.model || appItem.specs?.model;
                                          const manualUrl = appItem.manualUrl || appItem.specs?.manualUrl;
                                          const iconName = getApplianceIcon(appItem.type || appItem.name);
                                          const visibleSpecs = getVisibleSpecFields(appItem);

                                          return (
                                            <div
                                              key={idx}
                                              className={`rounded-xl border transition-all ${
                                                isAppExpanded
                                                  ? 'border-primary/40 dark:border-primary/40 bg-white dark:bg-gray-900/60 shadow-xs'
                                                  : 'border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900/30 hover:border-gray-300 dark:hover:border-gray-700'
                                              }`}
                                            >
                                              {/* Appliance Accordion Row / Header */}
                                              <div
                                                onClick={() => toggleApplianceExpanded(appKey)}
                                                className="p-3 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none"
                                              >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                  <button
                                                    type="button"
                                                    className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center shrink-0"
                                                    aria-label={isAppExpanded ? 'Collapse specs' : 'Expand specs'}
                                                  >
                                                    <span
                                                      className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                                                        isAppExpanded ? 'rotate-180' : ''
                                                      }`}
                                                    >
                                                      expand_more
                                                    </span>
                                                  </button>
                                                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-primary flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-[16px]">
                                                      {iconName}
                                                    </span>
                                                  </div>
                                                  <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <h5 className="font-bold text-xs sm:text-sm text-brand-black dark:text-white truncate">
                                                        {appItem.label || appItem.name}
                                                      </h5>
                                                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 uppercase shrink-0">
                                                        {appItem.category}
                                                      </span>
                                                      <span className="text-[10px] text-text-sub-light dark:text-text-sub-dark shrink-0">
                                                        ({appItem.type || 'Standard'})
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                  {/* Model Badge */}
                                                  {appModel ? (
                                                    <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                                                      <span className="material-symbols-outlined text-[12px]">verified</span>
                                                      <span>{appModel}</span>
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 font-medium">
                                                      Specs Pending
                                                    </span>
                                                  )}

                                                  {/* Manual Link in View Mode */}
                                                  {manualUrl && (
                                                    <a
                                                      href={manualUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      onClick={e => e.stopPropagation()}
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:underline"
                                                      title="Open manufacturer manual"
                                                    >
                                                      <span className="material-symbols-outlined text-[12px]">menu_book</span>
                                                      <span>Manual</span>
                                                      <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                                    </a>
                                                  )}

                                                  {/* Edit Spec Button */}
                                                  <button
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      handleStartEditApplianceSpec(set, idx);
                                                    }}
                                                    className="px-2 py-1 text-xs font-semibold rounded-lg bg-gray-50 hover:bg-primary/10 hover:text-primary dark:bg-gray-800 dark:hover:bg-primary/20 border border-gray-200 dark:border-gray-700 transition-colors flex items-center gap-1"
                                                    title="Edit specification for this default set"
                                                  >
                                                    <span className="material-symbols-outlined text-[13px]">edit</span>
                                                    <span>Edit</span>
                                                  </button>

                                                  {/* Remove from set button */}
                                                  <button
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      handleRemoveApplianceFromSet(set, idx);
                                                    }}
                                                    className="p-1 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-gray-400 transition-colors"
                                                    title="Remove appliance from set"
                                                  >
                                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                                  </button>
                                                </div>
                                              </div>

                                              {/* EXPANDED SPECIFICATION VIEW */}
                                              {isAppExpanded && (
                                                <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                                                  {visibleSpecs.length === 0 ? (
                                                    <div className="py-2 text-center text-xs text-gray-400 italic">
                                                      No specifications entered yet (TODO). Click &quot;Edit&quot; to define model and specs.
                                                    </div>
                                                  ) : (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                                      {visibleSpecs.map(field => (
                                                        <div
                                                          key={field.key}
                                                          className={field.key === 'notes' ? 'col-span-2 sm:col-span-4' : ''}
                                                        >
                                                          <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                                                            {field.label}
                                                          </span>
                                                          {field.isUrl ? (
                                                            <a
                                                              href={field.value}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline mt-0.5"
                                                            >
                                                              <span className="material-symbols-outlined text-[13px]">menu_book</span>
                                                              <span>Manual Reference</span>
                                                              <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                                                            </a>
                                                          ) : (
                                                            <span className="font-medium text-brand-black dark:text-white block mt-0.5">
                                                              {field.value}
                                                            </span>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
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

      {/* MODAL 5: EDIT APPLIANCE SPECIFICATION */}
      {editSpecModalData && (() => {
        const typeFields = getEditFormFieldsForType(editSpecForm.type, editSpecForm.fuelType);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="text-sm font-bold text-brand-black dark:text-white">
                    Edit Appliance Specification
                  </h3>
                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5">
                    Set: {editSpecModalData.set.name} · {editSpecModalData.set.appliances[editSpecModalData.applianceIndex]?.label || editSpecModalData.set.appliances[editSpecModalData.applianceIndex]?.name}
                  </p>
                </div>
                <button
                  onClick={() => setEditSpecModalData(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-2.5 rounded-xl mb-4">
                <strong>Single Editable Source:</strong> Edits to this specification immediately update this default set and propagate by reference to every unit referencing this set.
              </p>

              <div className="space-y-3 text-xs">
                {/* Appliance Label / Description */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                      Appliance Label
                    </label>
                    <input
                      type="text"
                      value={editSpecForm.label}
                      onChange={e => setEditSpecForm(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. Fridge, Gas Furnace, Dishwasher"
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                      Trade Type
                    </label>
                    <select
                      value={editSpecForm.type}
                      onChange={e => setEditSpecForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary text-xs"
                    >
                      {TRADE_APPLIANCE_TYPES.map(t => (
                        <option key={t.type} value={t.type}>
                          {t.label} ({t.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Model Number */}
                <div>
                  <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                    Model Number (Verified models only — serial numbers NEVER in defaults)
                  </label>
                  <input
                    type="text"
                    value={editSpecForm.model}
                    onChange={e => setEditSpecForm(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g. Frigidaire FFCD2418US3A or Carrier 59TP6B"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary font-mono text-xs"
                  />
                </div>

                {/* Manual Link Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-text-sub-light dark:text-text-sub-dark">
                      Manual Reference URL (Manufacturer / Spec Sheet)
                    </label>
                    {editSpecForm.manualUrl && (
                      <a
                        href={editSpecForm.manualUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        <span>Test Link</span>
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={editSpecForm.manualUrl}
                    onChange={e => setEditSpecForm(prev => ({ ...prev, manualUrl: e.target.value }))}
                    placeholder="e.g. https://www.carrier.com/residential/en/us/manuals/59TP6B.pdf"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary font-mono text-xs"
                  />
                  <p className="text-[10px] text-text-sub-light dark:text-text-sub-dark mt-1">
                    Renders as a direct clickable &quot;Manual&quot; link in view mode for quick field trade reference.
                  </p>
                </div>

                {/* Type-Specific Fields */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(typeFields.showFuelType || editSpecForm.showAllFields) && (
                    <div>
                      <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Fuel Type</label>
                      <input
                        type="text"
                        value={editSpecForm.fuelType}
                        onChange={e => setEditSpecForm(prev => ({ ...prev, fuelType: e.target.value }))}
                        placeholder="e.g. Electric, Natural Gas"
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {(typeFields.showVolts || editSpecForm.showAllFields) && (
                    <div>
                      <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Voltage (Volts)</label>
                      <input
                        type="text"
                        value={editSpecForm.volts}
                        onChange={e => setEditSpecForm(prev => ({ ...prev, volts: e.target.value }))}
                        placeholder="e.g. 120, 240, 208, 24"
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {(typeFields.showCapacity || editSpecForm.showAllFields) && (
                    <div>
                      <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                        {typeFields.capacityLabel}
                      </label>
                      <input
                        type="text"
                        value={editSpecForm.capacity}
                        onChange={e => setEditSpecForm(prev => ({ ...prev, capacity: e.target.value }))}
                        placeholder="e.g. 18 cu. ft., 60 Gallons, 2.5 Ton"
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {(typeFields.showBtuInput || editSpecForm.showAllFields) && (
                    <div>
                      <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                        {typeFields.btuInputLabel}
                      </label>
                      <input
                        type="text"
                        value={editSpecForm.btuInput}
                        onChange={e => setEditSpecForm(prev => ({ ...prev, btuInput: e.target.value }))}
                        placeholder="e.g. 60,000 BTU, 4500W"
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {(typeFields.showBtuOutput || editSpecForm.showAllFields) && (
                    <div>
                      <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">BTU Output</label>
                      <input
                        type="text"
                        value={editSpecForm.btuOutput}
                        onChange={e => setEditSpecForm(prev => ({ ...prev, btuOutput: e.target.value }))}
                        placeholder="e.g. 48,000 BTU"
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {(typeFields.showFilterSize || editSpecForm.showAllFields) && (
                    <div>
                      <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Filter Size</label>
                      <input
                        type="text"
                        value={editSpecForm.filterSize}
                        onChange={e => setEditSpecForm(prev => ({ ...prev, filterSize: e.target.value }))}
                        placeholder="e.g. 16x25x1"
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {(typeFields.showRefrigerantType || editSpecForm.showAllFields) && (
                    <div>
                      <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Refrigerant</label>
                      <input
                        type="text"
                        value={editSpecForm.refrigerantType}
                        onChange={e => setEditSpecForm(prev => ({ ...prev, refrigerantType: e.target.value }))}
                        placeholder="e.g. R-410A, R-32"
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {(typeFields.showEfficiency || editSpecForm.showAllFields) && (
                    <div>
                      <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Efficiency Rating</label>
                      <input
                        type="text"
                        value={editSpecForm.efficiency}
                        onChange={e => setEditSpecForm(prev => ({ ...prev, efficiency: e.target.value }))}
                        placeholder="e.g. 96% AFUE, 15 SEER2, UEF 0.93"
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Toggle All Fields */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setEditSpecForm(prev => ({ ...prev, showAllFields: !prev.showAllFields }))}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {editSpecForm.showAllFields ? 'visibility_off' : 'tune'}
                    </span>
                    <span>
                      {editSpecForm.showAllFields ? 'Show standard fields for this type only' : 'Show all trade fields'}
                    </span>
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">Specification Notes</label>
                  <textarea
                    value={editSpecForm.notes}
                    onChange={e => setEditSpecForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Standard field replacement or installation notes"
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                <button
                  onClick={() => setEditSpecModalData(null)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 text-text-main-light dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApplianceSpec}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
                >
                  Save Spec Changes
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 6: ADD APPLIANCE TO DEFAULT SET */}
      {addApplianceModalSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-bold text-brand-black dark:text-white">
                  Add Appliance to Default Set
                </h3>
                <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5">
                  Target Set: <strong className="text-brand-black dark:text-white">{addApplianceModalSet.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setAddApplianceModalSet(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-4">
              Choose an appliance template from the full trade range. The newly added appliance starts with blank specifications (TODO) and can be immediately configured.
            </p>

            {/* 10 Trade Types Picker Grid */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-brand-black dark:text-white uppercase tracking-wider mb-2">
                Select Trade Type (10 Categories)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {TRADE_APPLIANCE_TYPES.map(trade => {
                  const isSelected = selectedAddTradeType === trade.type;
                  return (
                    <button
                      key={trade.type}
                      type="button"
                      onClick={() => setSelectedAddTradeType(trade.type)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 shadow-xs'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-primary'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">{trade.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-brand-black dark:text-white truncate">
                            {trade.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block line-clamp-1">
                          {trade.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Label / Name Input */}
            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block font-semibold text-text-sub-light dark:text-text-sub-dark mb-1">
                  Custom Label / Name (Optional, defaults to trade name)
                </label>
                <input
                  type="text"
                  value={customAddApplianceLabel}
                  onChange={e => setCustomAddApplianceLabel(e.target.value)}
                  placeholder={`e.g. ${TRADE_APPLIANCE_TYPES.find(t => t.type === selectedAddTradeType)?.label || 'Appliance'}`}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-black dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                onClick={() => setAddApplianceModalSet(null)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 text-text-main-light dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddAppliance}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add &amp; Configure Specs</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyListView;
