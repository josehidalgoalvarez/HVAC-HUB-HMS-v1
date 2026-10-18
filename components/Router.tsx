
import React from 'react';
import {
  ViewType,
  Building,
  Unit,
  Ticket,
  RunSheet,
  Notice,
  Watch,
  Stockpile,
  Part,
  Correction
} from '../types';
import PropertyListView from './properties/PropertyListView';
import AddPropertyView from './properties/AddPropertyView';
import PropertyLandingView from './properties/PropertyLandingView';
import PropertyDetailView from './properties/PropertyDetailView'; // Legacy file note: Ensure we use the right one
import PropertyCanvasView from './properties/PropertyCanvasView';
import UtilsTechMenu from './profile/UtilsTechMenu';
import ApplianceModule from './appliances/ApplianceModule';
import ProfileView from './profile/ProfileView';
import { TicketListView } from './tickets/TicketListView';
import { NoticePipelineView } from './notices/NoticePipelineView';
import { DayPlanView } from './runsheets/DayPlanView';

// Note: Ensure PropertyDetailView is the correct new component. 
// Since we have a duplicate file issue, we are importing from './properties/PropertyDetailView' explicitly.
// But in the file tree, PropertyDetailView was in 'components/properties/'.

interface RouterProps {
  activeView: ViewType;
  selectedPropertyId: string | null;
  selectedApplianceId: string | null;
  isEditMode: boolean;

  // Navigation Setters
  setActiveView: (view: ViewType) => void;
  setPreviousView: (view: ViewType | null) => void;
  setSelectedPropertyId: (id: string | null) => void;
  setSelectedApplianceId: (id: string | null) => void;
  setIsEditMode: (mode: boolean) => void;

  // Navigation State
  previousView: ViewType | null;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

const Router: React.FC<RouterProps> = ({
  activeView,
  selectedPropertyId,
  selectedApplianceId,
  isEditMode,
  setActiveView,
  setPreviousView,
  setSelectedPropertyId,
  setSelectedApplianceId,
  setIsEditMode,
  previousView,
  toggleDarkMode,
  isDarkMode
}) => {
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);

  // --- Navigation Handlers ---

  const handlePropertyClick = (id: string) => {
    setSelectedPropertyId(id);
    setActiveView(ViewType.PROPERTY_LANDING);
    window.scrollTo(0, 0);
  };

  const handleOpenPropertyDetail = () => {
    setPreviousView(ViewType.PROPERTY_LANDING);
    setActiveView(ViewType.PROPERTY_DETAIL);
    window.scrollTo(0, 0);
  };

  const handleOpenCanvas = () => {
    setPreviousView(ViewType.PROPERTY_DETAIL);
    setActiveView(ViewType.PROPERTY_CANVAS);
    window.scrollTo(0, 0);
  };

  const handleOpenTechMenu = () => {
    setPreviousView(ViewType.PROFILE);
    setActiveView(ViewType.TECH_MENU);
    window.scrollTo(0, 0);
  };

  const handleOpenCanvasFromTech = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setPreviousView(ViewType.TECH_MENU);
    setActiveView(ViewType.PROPERTY_CANVAS);
    window.scrollTo(0, 0);
  };

  const handleViewOnCanvas = (propertyId: string, applianceId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedApplianceId(applianceId);
    setPreviousView(ViewType.APPLIANCE_DETAIL);
    setActiveView(ViewType.PROPERTY_CANVAS);
    window.scrollTo(0, 0);
  };

  const handleApplianceClick = (id: string) => {
    setSelectedApplianceId(id);
    if ([ViewType.PROPERTY_DETAIL, ViewType.PROPERTY_LANDING, ViewType.PROPERTY_CANVAS, ViewType.TECH_MENU].includes(activeView)) {
      setPreviousView(activeView);
    } else {
      setPreviousView(ViewType.APPLIANCES);
    }
    setActiveView(ViewType.APPLIANCE_DETAIL);
    window.scrollTo(0, 0);
  };

  // --- Route Rendering ---

  switch (activeView) {
    case ViewType.PROPERTIES:
      return (
        <PropertyListView
          onPropertyClick={handlePropertyClick}
          onAddProperty={() => setActiveView(ViewType.ADD_PROPERTY)}
          isEditMode={isEditMode}
        />
      );

    case ViewType.ADD_PROPERTY:
      return (
        <AddPropertyView
          onCancel={() => setActiveView(ViewType.PROPERTIES)}
          onSave={() => setActiveView(ViewType.PROPERTIES)} // Data saving handled inside via useActions
        />
      );

    case ViewType.PROPERTY_LANDING:
      if (!selectedPropertyId) return <div>Property not selected</div>;
      return (
        <PropertyLandingView
          propertyId={selectedPropertyId}
          onBack={() => setActiveView(ViewType.PROPERTIES)}
          onOpenDetail={handleOpenPropertyDetail}
          onEditProperty={() => setActiveView(ViewType.EDIT_PROPERTY)}
          onApplianceClick={handleApplianceClick}
          onAddAppliance={() => {
            setPreviousView(ViewType.PROPERTY_LANDING);
            setActiveView(ViewType.ADD_APPLIANCE);
          }}
          isEditMode={isEditMode}
        />
      );

    case ViewType.EDIT_PROPERTY:
      if (!selectedPropertyId) return <div>Property not selected</div>;
      return (
        <AddPropertyView
          initialPropertyId={selectedPropertyId}
          onCancel={() => setActiveView(ViewType.PROPERTY_LANDING)}
          onSave={() => setActiveView(ViewType.PROPERTY_LANDING)}
        />
      );

    case ViewType.PROPERTY_DETAIL:
      if (!selectedPropertyId) return <div>Property not selected</div>;
      return (
        <PropertyDetailView
          propertyId={selectedPropertyId}
          onBack={() => setActiveView(ViewType.PROPERTY_LANDING)}
          onApplianceClick={handleApplianceClick}
          onManageCanvas={handleOpenCanvas}
          isEditMode={isEditMode}
        />
      );

    case ViewType.PROPERTY_CANVAS:
      if (!selectedPropertyId) return <div>Property not selected</div>;
      return (
        <PropertyCanvasView
          propertyId={selectedPropertyId}
          onBack={() => {
            if (previousView === ViewType.TECH_MENU) {
              setActiveView(ViewType.TECH_MENU);
            } else if (previousView === ViewType.APPLIANCE_DETAIL) {
              setActiveView(ViewType.APPLIANCE_DETAIL);
            } else {
              setActiveView(ViewType.PROPERTY_DETAIL);
            }
          }}
          onApplianceClick={handleApplianceClick}
          initialApplianceId={selectedApplianceId}
        />
      );

    case ViewType.TECH_MENU:
      return (
        <UtilsTechMenu
          onBack={() => setActiveView(ViewType.PROFILE)}
          onOpenCanvas={handleOpenCanvasFromTech}
        />
      );

    case ViewType.APPLIANCES:
    case ViewType.APPLIANCE_DETAIL:
    case ViewType.ADD_APPLIANCE:
      return (
        <ApplianceModule
          activeView={activeView}
          selectedApplianceId={selectedApplianceId}
          selectedPropertyId={selectedPropertyId}
          onNavigate={(view, id) => {
            if (view === ViewType.APPLIANCES && previousView) {
              // Intelligent back navigation
              if ([ViewType.PROPERTY_LANDING, ViewType.PROPERTY_DETAIL, ViewType.PROPERTY_CANVAS, ViewType.TECH_MENU].includes(previousView)) {
                setActiveView(previousView);
              } else {
                setActiveView(ViewType.APPLIANCES);
              }
            } else {
              setActiveView(view);
            }
            if (id) setSelectedApplianceId(id);
          }}
          // Removed CRUD props - ApplianceModule now uses useActions
          isEditMode={isEditMode}
          onViewOnCanvas={handleViewOnCanvas}
          onViewProperty={(pid) => {
            setSelectedPropertyId(pid);
            setActiveView(ViewType.PROPERTY_DETAIL);
          }}
        />
      );

    case ViewType.PROFILE:
      return (
        <ProfileView
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          isEditMode={isEditMode}
          onToggleEditMode={setIsEditMode}
          onOpenTechMenu={handleOpenTechMenu}
        // Removed CRUD props - ProfileView now uses useActions
        />
      );

    case ViewType.TICKETS:
      return (
        <TicketListView
          onBack={() => setActiveView(ViewType.PROPERTIES)}
          initialSelectedTicketId={selectedTicketId}
          onOpenNotices={() => setActiveView(ViewType.NOTICES)}
          onOpenDayPlan={() => setActiveView(ViewType.RUN_SHEET)}
        />
      );

    case ViewType.RUN_SHEET:
      return (
        <DayPlanView
          onBack={() => setActiveView(ViewType.PROPERTIES)}
          onOpenTicket={(ticketId) => {
            setSelectedTicketId(ticketId);
            setActiveView(ViewType.TICKETS);
          }}
        />
      );

    case ViewType.QUICK_LOG: {
      const contextBuilding: Building = {
        id: selectedPropertyId || 'bldg-curr',
        name: 'Selected Building',
        address: 'Site Address'
      };
      const contextUnit: Unit = {
        id: 'unit-1',
        buildingId: contextBuilding.id,
        unitNumber: '101'
      };
      const sampleCorrection: Correction = {
        id: 'corr-quick',
        entityType: 'ticket',
        entityId: 'tkt-1',
        fieldName: 'status',
        reason: 'Quick-log field correction',
        createdAt: new Date().toISOString()
      };
      return (
        <div className="p-4 space-y-4 max-w-xl mx-auto pb-safe">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Quick Log</h1>
            <button onClick={() => setActiveView(ViewType.PROPERTIES)} className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-800 rounded">
              Back
            </button>
          </div>
          <p className="text-sm text-neutral-500">
            {contextBuilding.name} {contextUnit.unitNumber} | Audit: {sampleCorrection.fieldName}
          </p>
        </div>
      );
    }

    case ViewType.PARTS: {
      const activeStockpile: Stockpile = {
        id: 'sp-van-1',
        name: 'Van 1 Mobile Stockpile',
        location: 'Service Vehicle'
      };
      const activePart: Part = {
        id: 'part-cap-45',
        name: 'Dual Run Capacitor 45/5',
        quantityOnHand: 3,
        minQuantity: 1,
        stockpileId: activeStockpile.id
      };
      return (
        <div className="p-4 space-y-4 max-w-xl mx-auto pb-safe">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Parts & Stockpile</h1>
            <button onClick={() => setActiveView(ViewType.PROPERTIES)} className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-800 rounded">
              Back
            </button>
          </div>
          <p className="text-sm text-neutral-500">
            {activePart.name} in {activeStockpile.name} (Qty: {activePart.quantityOnHand})
          </p>
        </div>
      );
    }

    case ViewType.NOTICES:
      return (
        <NoticePipelineView
          onBack={() => setActiveView(ViewType.PROPERTIES)}
          onOpenTicket={(ticketId) => {
            setSelectedTicketId(ticketId);
            setActiveView(ViewType.TICKETS);
          }}
        />
      );

    case ViewType.WATCHES: {
      const activeWatch: Watch = {
        id: 'watch-compressor',
        userId: 'tech-1',
        entityType: 'ticket',
        entityId: 'tkt-1',
        triggerCondition: 'compressor_overheating',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      return (
        <div className="p-4 space-y-4 max-w-xl mx-auto pb-safe">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Watches</h1>
            <button onClick={() => setActiveView(ViewType.PROPERTIES)} className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-800 rounded">
              Back
            </button>
          </div>
          <p className="text-sm text-neutral-500">Watch: {activeWatch.triggerCondition} (Active: {activeWatch.isActive ? 'Yes' : 'No'})</p>
        </div>
      );
    }

    default:
      return <div>View not found</div>;
  }
};

export default Router;
