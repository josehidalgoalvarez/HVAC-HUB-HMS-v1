import React, { createContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Property, Appliance, ChangeLogEntry, Complex, Unit, ApplianceDefaultSet } from '../types';
import {
  INITIAL_PROPERTIES,
  INITIAL_APPLIANCES,
  INITIAL_COMPLEXES,
  INITIAL_UNITS,
  INITIAL_DEFAULT_SETS
} from '../constants';
import { apiClient } from '../src/api/client';

// --- Inventory Context (Properties, Complexes, Units, Default Sets, & Appliances) ---
interface InventoryContextType {
  properties: Property[];
  appliances: Appliance[];
  complexes: Complex[];
  defaultSets: ApplianceDefaultSet[];
  units: Unit[];
  getAppliance: (id: string) => Appliance | undefined;
  getProperty: (id: string) => Property | undefined;
  getUnit: (id: string) => Unit | undefined;
  getDefaultSet: (id: string) => ApplianceDefaultSet | undefined;
  getUnitAppliances: (unit: Unit) => Appliance[];
  isTutorialActive: boolean;
  tutorialStep: number;
}

export const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// --- Activity Context (Logs & Alerts) ---
interface ActivityContextType {
  logs: ChangeLogEntry[];
}

export const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

// --- Action Context (Functions) ---
interface ActionContextType {
  addProperty: (property: Property) => void;
  updateProperty: (updatedProperty: Property) => void;
  deleteProperty: (id: string) => void;
  duplicateProperty: (property: Property) => void;
  addRoomToProperty: (propertyId: string, roomName: string) => void;

  addAppliance: (appliance: Appliance) => void;
  updateAppliance: (updatedAppliance: Appliance) => void;
  deleteAppliance: (id: string) => void;
  duplicateAppliance: (appliance: Appliance) => void;

  addUnit: (unit: Unit) => void;
  updateUnit: (unit: Unit) => void;
  updateDefaultSet: (updatedSet: ApplianceDefaultSet) => void;
  applyDefaultSetToUnit: (unitId: string, defaultSetId: string, force?: boolean) => { success: boolean; overwrittenCount: number };
  overrideUnitAppliance: (unitId: string, appliance: Appliance) => void;
  resetUnitToDefault: (unitId: string) => void;

  importData: (data: { properties: Property[]; appliances?: Appliance[]; units?: Unit[] }) => void;
  addLog: (
    action: ChangeLogEntry['action'],
    entityType: ChangeLogEntry['entityType'],
    entityId: string,
    entityName: string,
    details: string,
    propertyId?: string
  ) => void;
  startTutorial: () => void;
  endTutorial: () => void;
  setTutorialStep: (step: number) => void;
}

export const ActionContext = createContext<ActionContextType | undefined>(undefined);

const PORTFOLIO_VERSION = '2.10.0';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Feature flag: default to false (localStorage). When true, reads through API client.
  const useApi = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_API === 'true');

  // --- Initialization with Persistence & Version Cache Busting ---
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const version = localStorage.getItem('hvachome_portfolio_version');
      if (version !== PORTFOLIO_VERSION) {
        localStorage.removeItem('hvachome_properties');
        localStorage.removeItem('hvachome_appliances');
        localStorage.removeItem('hvachome_units');
        localStorage.removeItem('hvachome_complexes');
        localStorage.removeItem('hvachome_default_sets');
        localStorage.setItem('hvachome_portfolio_version', PORTFOLIO_VERSION);
        return INITIAL_PROPERTIES;
      }
      const saved = localStorage.getItem('hvachome_properties');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_PROPERTIES;
    } catch {
      return INITIAL_PROPERTIES;
    }
  });

  const [appliances, setAppliances] = useState<Appliance[]>(() => {
    try {
      const version = localStorage.getItem('hvachome_portfolio_version');
      if (version !== PORTFOLIO_VERSION) {
        return INITIAL_APPLIANCES;
      }
      const saved = localStorage.getItem('hvachome_appliances');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_APPLIANCES;
    } catch {
      return INITIAL_APPLIANCES;
    }
  });

  const [complexes, setComplexes] = useState<Complex[]>(() => {
    try {
      const version = localStorage.getItem('hvachome_portfolio_version');
      if (version !== PORTFOLIO_VERSION) {
        return INITIAL_COMPLEXES;
      }
      const saved = localStorage.getItem('hvachome_complexes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_COMPLEXES;
    } catch {
      return INITIAL_COMPLEXES;
    }
  });

  const [defaultSets, setDefaultSets] = useState<ApplianceDefaultSet[]>(() => {
    try {
      const version = localStorage.getItem('hvachome_portfolio_version');
      if (version !== PORTFOLIO_VERSION) {
        return INITIAL_DEFAULT_SETS;
      }
      const saved = localStorage.getItem('hvachome_default_sets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_DEFAULT_SETS;
    } catch {
      return INITIAL_DEFAULT_SETS;
    }
  });

  const [units, setUnits] = useState<Unit[]>(() => {
    try {
      const version = localStorage.getItem('hvachome_portfolio_version');
      if (version !== PORTFOLIO_VERSION) {
        return INITIAL_UNITS;
      }
      const saved = localStorage.getItem('hvachome_units');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_UNITS;
    } catch {
      return INITIAL_UNITS;
    }
  });

  const [logs, setLogs] = useState<ChangeLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('hvachome_logs');
      return saved ? JSON.parse(saved) : [{
        id: 'log_init',
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'CREATE',
        entityType: 'PROPERTY',
        entityName: 'System',
        entityId: '0',
        details: 'System Initialized'
      }];
    } catch {
      return [];
    }
  });

  // --- API Load Effect (when VITE_USE_API=true) ---
  useEffect(() => {
    if (!useApi) return;
    let isMounted = true;
    apiClient.get<{
      properties: Property[];
      appliances: Appliance[];
      complexes?: Complex[];
      defaultSets?: ApplianceDefaultSet[];
      logs?: ChangeLogEntry[];
    }>('/api/inventory')
      .then(res => {
        if (!isMounted) return;
        if (res?.properties && res.properties.length > 0) {
          setProperties(res.properties);
        }
        if (res?.appliances && res.appliances.length > 0) {
          setAppliances(res.appliances);
        }
        if (res?.complexes && res.complexes.length > 0) {
          setComplexes(res.complexes);
        }
        if (res?.defaultSets && res.defaultSets.length > 0) {
          setDefaultSets(res.defaultSets);
        }
        if (res?.logs) setLogs(res.logs);
      })
      .catch(err => {
        console.warn('API inventory unavailable, keeping local/cached portfolio:', err);
      });
    return () => { isMounted = false; };
  }, [useApi]);

  // --- Persistence Effects (when flag off) ---
  useEffect(() => {
    if (!useApi) {
      localStorage.setItem('hvachome_properties', JSON.stringify(properties));
    }
  }, [properties, useApi]);

  useEffect(() => {
    if (!useApi) {
      localStorage.setItem('hvachome_appliances', JSON.stringify(appliances));
    }
  }, [appliances, useApi]);

  useEffect(() => {
    if (!useApi) {
      localStorage.setItem('hvachome_complexes', JSON.stringify(complexes));
    }
  }, [complexes, useApi]);

  useEffect(() => {
    if (!useApi) {
      localStorage.setItem('hvachome_default_sets', JSON.stringify(defaultSets));
    }
  }, [defaultSets, useApi]);

  useEffect(() => {
    if (!useApi) {
      localStorage.setItem('hvachome_units', JSON.stringify(units));
    }
  }, [units, useApi]);

  useEffect(() => {
    if (!useApi) {
      localStorage.setItem('hvachome_logs', JSON.stringify(logs));
    }
  }, [logs, useApi]);

  // --- Helpers ---
  const getAppliance = (id: string) => appliances.find(a => a.id === id);
  const getProperty = (id: string) => properties.find(p => p.id === id);
  const getUnit = (id: string) => units.find(u => u.id === id);
  const getDefaultSet = (id: string) => defaultSets.find(s => s.id === id);

  /**
   * Resolves the full appliance roster for a unit:
   * Defaults are inherited from the unit's complex and unit type.
   * Only per-unit overrides replace the corresponding default appliance.
   */
  const getUnitAppliances = (unit: Unit): Appliance[] => {
    const bld = properties.find(p => p.id === unit.buildingId);
    const complexIdStr = bld?.complexId ? String(bld.complexId) : null;
    const unitType = unit.unitType || 'apartment';

    let set = unit.defaultSetId ? defaultSets.find(s => s.id === unit.defaultSetId) : undefined;
    if (!set && complexIdStr) {
      set = defaultSets.find(s =>
        (s.complexId === complexIdStr || s.complexSlug === complexIdStr) &&
        s.unitType === unitType &&
        s.isDefault
      );
    }
    if (!set) {
      set = defaultSets.find(s => s.unitType === unitType && s.isDefault) || defaultSets[0];
    }

    const overrides = unit.applianceOverrides || {};
    const unitAppliancesInDb = appliances.filter(a =>
      a.unitId === unit.id || (a.propertyId === unit.buildingId && a.unitNumber === unit.unitNumber)
    );

    const result: Appliance[] = [];

    if (set && Array.isArray(set.appliances)) {
      for (const item of set.appliances) {
        if (overrides[item.type]) {
          result.push({
            maintenanceHistory: [],
            ...overrides[item.type],
            isOverride: true,
            isDefault: false
          });
          continue;
        }

        const directApp = unitAppliancesInDb.find(a => a.type === item.type);
        if (directApp) {
          result.push({
            maintenanceHistory: [],
            ...directApp,
            isOverride: true,
            isDefault: false
          });
          continue;
        }

        result.push({
          id: `default-${unit.id}-${item.type.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          propertyId: unit.buildingId,
          unitId: unit.id,
          unitNumber: unit.unitNumber,
          name: item.label,
          type: item.type,
          category: item.category,
          brand: 'Standard / Default',
          modelNumber: '',
          serialNumber: '',
          location: unit.unitNumber ? `Unit ${unit.unitNumber}` : '',
          room: 'Kitchen',
          status: 'operational',
          isDefault: true,
          isOverride: false,
          notes: item.notes || `Default ${item.type} (Set: ${set.name})`,
          specs: item.specs || {},
          maintenanceHistory: [],
          lastService: ''
        });
      }
    }

    for (const direct of unitAppliancesInDb) {
      if (!result.some(r => r.id === direct.id || r.type === direct.type)) {
        result.push({
          maintenanceHistory: [],
          ...direct,
          isOverride: true,
          isDefault: false
        });
      }
    }

    return result;
  };

  // --- Internal Add Log ---
  const _addLog = (
    action: ChangeLogEntry['action'],
    entityType: ChangeLogEntry['entityType'],
    entityId: string,
    entityName: string,
    details: string,
    propertyId?: string
  ) => {
    const newLog: ChangeLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      user: 'Sophia Anderson',
      action,
      entityType,
      entityId,
      entityName,
      details,
      propertyId
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // --- Actions Implementation ---

  const addProperty = (newProperty: Property) => {
    setProperties(prev => [...prev, newProperty]);
    _addLog('CREATE', 'PROPERTY', newProperty.id, newProperty.name, `Created property: ${newProperty.name}`);
  };

  const updateProperty = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

  const deleteProperty = (id: string) => {
    const prop = properties.find(p => p.id === id);
    setProperties(prev => prev.filter(p => p.id !== id));
    setAppliances(prev => prev.filter(a => a.propertyId !== id)); // Cascade delete
    setUnits(prev => prev.filter(u => u.buildingId !== id));
    if (prop) {
      _addLog('DELETE', 'PROPERTY', id, prop.name, `Deleted property ${prop.name}`);
    }
  };

  const duplicateProperty = (property: Property) => {
    const newId = `prop_${Date.now()}`;
    const newProperty = { ...property, id: newId, name: `${property.name} (Copy)` };

    // Duplicate appliances
    const propAppliances = appliances.filter(a => a.propertyId === property.id);
    const newAppliances = propAppliances.map(a => ({
      ...a,
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      propertyId: newId
    }));

    setProperties(prev => [...prev, newProperty]);
    setAppliances(prev => [...prev, ...newAppliances]);
    _addLog('DUPLICATE', 'PROPERTY', newId, newProperty.name, `Duplicated property ${property.name}`);
  };

  const addRoomToProperty = (propertyId: string, roomName: string) => {
    setProperties(prev => prev.map(prop => {
      if (prop.id !== propertyId) return prop;
      const currentRooms = prop.definedRooms || [];
      if (currentRooms.includes(roomName)) return prop;
      return { ...prop, definedRooms: [...currentRooms, roomName] };
    }));
  };

  const addAppliance = (newAppliance: Appliance) => {
    setAppliances(prev => [...prev, newAppliance]);
    setProperties(prev => prev.map(p =>
      p.id === newAppliance.propertyId
        ? { ...p, applianceCount: (p.applianceCount || 0) + 1 }
        : p
    ));
    _addLog('CREATE', 'APPLIANCE', newAppliance.id, newAppliance.name, `Added appliance`, newAppliance.propertyId);
  };

  const updateAppliance = (updatedAppliance: Appliance) => {
    setAppliances(prev => prev.map(a => a.id === updatedAppliance.id ? updatedAppliance : a));
    _addLog('UPDATE', 'APPLIANCE', updatedAppliance.id, updatedAppliance.name, 'Updated appliance details', updatedAppliance.propertyId);
  };

  const deleteAppliance = (id: string) => {
    const app = appliances.find(a => a.id === id);
    if (app) {
      setAppliances(prev => prev.filter(a => a.id !== id));
      setProperties(prev => prev.map(p =>
        p.id === app.propertyId
          ? { ...p, applianceCount: Math.max(0, (p.applianceCount || 0) - 1) }
          : p
      ));
      _addLog('DELETE', 'APPLIANCE', app.id, app.name, `Deleted appliance: ${app.name}`, app.propertyId);
    }
  };

  const duplicateAppliance = (app: Appliance) => {
    const newId = `app_${Date.now()}`;
    const newApp = {
      ...app,
      id: newId,
      name: `${app.name} (Copy)`,
      serialNumber: '',
    };
    setAppliances(prev => [...prev, newApp]);
    setProperties(prev => prev.map(p =>
      p.id === app.propertyId
        ? { ...p, applianceCount: (p.applianceCount || 0) + 1 }
        : p
    ));
    _addLog('DUPLICATE', 'APPLIANCE', newId, newApp.name, `Duplicated from ${app.name}`, app.propertyId);
  };

  const addUnit = (unit: Unit) => {
    setUnits(prev => [...prev, unit]);
  };

  const updateUnit = (unit: Unit) => {
    setUnits(prev => prev.map(u => u.id === unit.id ? unit : u));
  };

  const updateDefaultSet = (updatedSet: ApplianceDefaultSet) => {
    setDefaultSets(prev => prev.map(ds => ds.id === updatedSet.id ? updatedSet : ds));
    if (useApi) {
      apiClient.patch(`/api/default-sets/${updatedSet.id}`, updatedSet).catch(err => {
        console.warn('Failed to sync updated default set to API:', err);
      });
    }
    _addLog('UPDATE', 'PROPERTY', updatedSet.id, updatedSet.name, `Updated default set ${updatedSet.name}`);
  };

  const applyDefaultSetToUnit = (unitId: string, defaultSetId: string, force = false): { success: boolean; overwrittenCount: number } => {
    const unit = units.find(u => u.id === unitId);
    const set = defaultSets.find(s => s.id === defaultSetId);
    if (!unit || !set) return { success: false, overwrittenCount: 0 };

    const currentOverrides = unit.applianceOverrides || {};
    const existingOverridesCount = Object.keys(currentOverrides).length;

    if (existingOverridesCount > 0 && !force) {
      return { success: false, overwrittenCount: existingOverridesCount };
    }

    const updatedUnit: Unit = {
      ...unit,
      defaultSetId,
      unitType: set.unitType,
      bedrooms: set.bedrooms ?? unit.bedrooms,
      bathrooms: set.bathrooms ?? unit.bathrooms,
      stories: set.stories ?? unit.stories,
      applianceOverrides: force ? {} : currentOverrides
    };

    setUnits(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
    _addLog('UPDATE', 'PROPERTY', unitId, `Unit ${unit.unitNumber}`, `Applied default set "${set.name}" to Unit ${unit.unitNumber}`, unit.buildingId);
    return { success: true, overwrittenCount: force ? existingOverridesCount : 0 };
  };

  const overrideUnitAppliance = (unitId: string, appliance: Appliance) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    const currentOverrides = unit.applianceOverrides || {};
    const updatedOverrides = {
      ...currentOverrides,
      [appliance.type]: {
        ...appliance,
        isOverride: true,
        isDefault: false,
        overrideForType: appliance.type
      }
    };
    const updatedUnit: Unit = {
      ...unit,
      applianceOverrides: updatedOverrides
    };
    setUnits(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
    _addLog('UPDATE', 'APPLIANCE', appliance.id || `app-${Date.now()}`, appliance.name, `Overrode ${appliance.type} on Unit ${unit.unitNumber}`, unit.buildingId);
  };

  const resetUnitToDefault = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    const updatedUnit: Unit = {
      ...unit,
      applianceOverrides: {}
    };
    setUnits(prev => prev.map(u => u.id === unitId ? updatedUnit : u));
    // Also remove any direct override appliance entries from appliances
    setAppliances(prev => prev.filter(a => !(a.unitId === unitId && a.isOverride)));
    _addLog('UPDATE', 'PROPERTY', unitId, `Unit ${unit.unitNumber}`, `Reset Unit ${unit.unitNumber} to defaults`, unit.buildingId);
  };

  const importData = (data: { properties: Property[]; appliances?: Appliance[]; units?: Unit[] }) => {
    if (data.properties) {
      setProperties(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProps = data.properties.filter(p => !existingIds.has(p.id));
        return [...prev, ...newProps];
      });
    }
    if (data.appliances) {
      setAppliances(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newApps = data.appliances!.filter(a => !existingIds.has(a.id));
        return [...prev, ...newApps];
      });
    }
    if (data.units) {
      setUnits(prev => {
        const existingIds = new Set(prev.map(u => u.id));
        const newUnits = data.units!.filter(u => !existingIds.has(u.id));
        return [...prev, ...newUnits];
      });
    }
    _addLog('IMPORT', 'PROPERTY', 'BATCH', 'Import', 'Imported data');
  };

  // --- Tutorial Mode ---
  const TUTORIAL_DISMISSED_KEY = 'hvachome_tutorial_dismissed';

  const [isTutorialActive, setIsTutorialActive] = useState(() => {
    try {
      return localStorage.getItem(TUTORIAL_DISMISSED_KEY) !== 'true';
    } catch {
      return false;
    }
  });
  const [tutorialStep, setTutorialStep] = useState(0);

  const startTutorial = () => {
    try {
      localStorage.removeItem(TUTORIAL_DISMISSED_KEY);
    } catch {
      // ignore
    }
    setIsTutorialActive(true);
    setTutorialStep(0);
    _addLog('UPDATE', 'PROPERTY', 'SYSTEM', 'Tutorial', 'Started Tutorial Mode');
  };

  const endTutorial = () => {
    try {
      localStorage.setItem(TUTORIAL_DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
    setIsTutorialActive(false);
    setTutorialStep(0);
    _addLog('UPDATE', 'PROPERTY', 'SYSTEM', 'Tutorial', 'Ended Tutorial Mode');
  };

  // --- Context Values ---

  const inventoryValue = useMemo(() => ({
    properties,
    appliances,
    complexes,
    defaultSets,
    units,
    getAppliance,
    getProperty,
    getUnit,
    getDefaultSet,
    getUnitAppliances,
    isTutorialActive,
    tutorialStep
  }), [properties, appliances, complexes, defaultSets, units, isTutorialActive, tutorialStep]);

  const activityValue = useMemo(() => ({
    logs
  }), [logs]);

  const actionValue = useMemo(() => ({
    addProperty,
    updateProperty,
    deleteProperty,
    duplicateProperty,
    addRoomToProperty,
    addAppliance,
    updateAppliance,
    deleteAppliance,
    duplicateAppliance,
    addUnit,
    updateUnit,
    updateDefaultSet,
    applyDefaultSetToUnit,
    overrideUnitAppliance,
    resetUnitToDefault,
    importData,
    addLog: _addLog,
    startTutorial,
    endTutorial,
    setTutorialStep
  }), [isTutorialActive, properties, appliances, units, defaultSets]);

  return (
    <InventoryContext.Provider value={inventoryValue}>
      <ActivityContext.Provider value={activityValue}>
        <ActionContext.Provider value={actionValue}>
          {children}
        </ActionContext.Provider>
      </ActivityContext.Provider>
    </InventoryContext.Provider>
  );
};
