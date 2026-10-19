
import React, { createContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Property, Appliance, ChangeLogEntry } from '../types';
import { INITIAL_PROPERTIES, INITIAL_APPLIANCES } from '../constants';
import { apiClient } from '../src/api/client';

// --- Inventory Context (Properties & Appliances) ---
// Changes infrequently.
interface InventoryContextType {
  properties: Property[];
  appliances: Appliance[];
  getAppliance: (id: string) => Appliance | undefined;
  getProperty: (id: string) => Property | undefined;
  isTutorialActive: boolean;
  tutorialStep: number;
}

export const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// --- Activity Context (Logs & Alerts) ---
// Changes frequently.
interface ActivityContextType {
  logs: ChangeLogEntry[];
}

export const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

// --- Action Context (Functions) ---
// Stable references to actions.
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

  importData: (data: { properties: Property[], appliances?: Appliance[] }) => void;
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

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Feature flag: default to false (localStorage). When true, reads through API client.
  const useApi = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_API === 'true');

  // --- Initialization with Persistence ---
  const [properties, setProperties] = useState<Property[]>(() => {
    if (useApi) {
      return [];
    }
    try {
      const saved = localStorage.getItem('hvachome_properties');
      return saved ? JSON.parse(saved) : INITIAL_PROPERTIES;
    } catch {
      return INITIAL_PROPERTIES;
    }
  });

  const [appliances, setAppliances] = useState<Appliance[]>(() => {
    if (useApi) {
      return [];
    }
    try {
      const saved = localStorage.getItem('hvachome_appliances');
      return saved ? JSON.parse(saved) : INITIAL_APPLIANCES;
    } catch {
      return INITIAL_APPLIANCES;
    }
  });

  const [logs, setLogs] = useState<ChangeLogEntry[]>(() => {
    if (useApi) {
      return [];
    }
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
    apiClient.get<{ properties: Property[]; appliances: Appliance[]; logs?: ChangeLogEntry[] }>('/api/inventory')
      .then(res => {
        if (!isMounted) return;
        setProperties(res?.properties || []);
        setAppliances(res?.appliances || []);
        if (res?.logs) setLogs(res.logs);
      })
      .catch(err => {
        // Mock shape / empty state when endpoint not yet populated
        console.warn('API inventory unavailable, loaded empty state:', err);
        if (isMounted) {
          setProperties([]);
          setAppliances([]);
        }
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
      localStorage.setItem('hvachome_logs', JSON.stringify(logs));
    }
  }, [logs, useApi]);

  // --- Helpers ---
  const getAppliance = (id: string) => appliances.find(a => a.id === id);
  const getProperty = (id: string) => properties.find(p => p.id === id);

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
    // Update property count
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

  const importData = (data: { properties: Property[], appliances?: Appliance[] }) => {
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
    getAppliance,
    getProperty,
    isTutorialActive,
    tutorialStep
  }), [properties, appliances, isTutorialActive, tutorialStep]);

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
    importData,
    addLog: _addLog,
    startTutorial,
    endTutorial,
    setTutorialStep
  }), [isTutorialActive, properties, appliances]);

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
