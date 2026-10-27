
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
import type { RunSheetBlock } from '../types/domain';
import ViewLoadingSkeleton from './common/ViewLoadingSkeleton';

// Route-level code splitting with React.lazy
const PropertyListView = React.lazy(() => import('./properties/PropertyListView'));
const AddPropertyView = React.lazy(() => import('./properties/AddPropertyView'));
const PropertyLandingView = React.lazy(() => import('./properties/PropertyLandingView'));
const PropertyDetailView = React.lazy(() => import('./properties/PropertyDetailView'));
const ApplianceModule = React.lazy(() => import('./appliances/ApplianceModule'));
const ProfileView = React.lazy(() => import('./profile/ProfileView'));
const TicketListView = React.lazy(() => import('./tickets/TicketListView').then(m => ({ default: m.TicketListView })));

const DayPlanView = React.lazy(() => import('./runsheets/DayPlanView').then(m => ({ default: m.DayPlanView })));
const QuickLogWidget = React.lazy(() => import('./jobs/QuickLogWidget'));
const PartsView = React.lazy(() => import('./parts/PartsView'));
const WatchesView = React.lazy(() => import('./watches/WatchesView'));
const SOPListView = React.lazy(() => import('./sops/SOPListView').then(m => ({ default: m.SOPListView })));
const SOPRunView = React.lazy(() => import('./sops/SOPRunView').then(m => ({ default: m.SOPRunView })));
const FieldNotesView = React.lazy(() => import('./sops/FieldNotesView').then(m => ({ default: m.FieldNotesView })));

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
  const [selectedSopId, setSelectedSopId] = React.useState<string>('sop-gas-furnace-service');
  const [selectedBlockForQuickLog, setSelectedBlockForQuickLog] = React.useState<RunSheetBlock | null>(null);
  const [propertyNavLevel, setPropertyNavLevel] = React.useState<'root' | 'complex' | 'building' | 'unit' | 'defaults'>('root');

  // --- Navigation Handlers ---

  const handlePropertyClick = (id: string) => {
    setSelectedPropertyId(id);
    setPreviousView(ViewType.PROPERTIES);
    setActiveView(ViewType.PROPERTY_DETAIL);
    window.scrollTo(0, 0);
  };

  const handleOpenPropertyDetail = () => {
    setPreviousView(ViewType.PROPERTIES);
    setActiveView(ViewType.PROPERTY_DETAIL);
    window.scrollTo(0, 0);
  };

  const handleApplianceClick = (id: string) => {
    setSelectedApplianceId(id);
    if ([ViewType.PROPERTY_DETAIL, ViewType.PROPERTY_LANDING].includes(activeView)) {
      setPreviousView(activeView);
    } else {
      setPreviousView(ViewType.APPLIANCES);
    }
    setActiveView(ViewType.APPLIANCE_DETAIL);
    window.scrollTo(0, 0);
  };

  // --- Route Rendering ---

  const renderActiveView = () => {
    switch (activeView) {
    case ViewType.PROPERTIES:
      return (
        <PropertyListView
          onPropertyClick={handlePropertyClick}
          onAddProperty={() => setActiveView(ViewType.ADD_PROPERTY)}
          isEditMode={isEditMode}
          initialNavLevel={propertyNavLevel}
          onNavLevelChange={setPropertyNavLevel}
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
          onBack={() => setActiveView(ViewType.PROPERTIES)}
          onApplianceClick={handleApplianceClick}
          isEditMode={isEditMode}
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
              if ([ViewType.PROPERTY_LANDING, ViewType.PROPERTY_DETAIL].includes(previousView)) {
                setActiveView(previousView);
              } else {
                setActiveView(ViewType.APPLIANCES);
              }
            } else {
              setActiveView(view);
            }
            if (id) setSelectedApplianceId(id);
          }}
          isEditMode={isEditMode}
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
          onOpenParts={() => setActiveView(ViewType.PARTS)}
          onOpenWatches={() => setActiveView(ViewType.WATCHES)}
          onOpenSops={() => setActiveView(ViewType.SOPS)}
          onOpenDefaults={() => {
            setPropertyNavLevel('defaults');
            setActiveView(ViewType.PROPERTIES);
          }}
        />
      );

    case ViewType.TICKETS:
      return (
        <TicketListView
          onBack={() => setActiveView(ViewType.PROPERTIES)}
          initialSelectedTicketId={selectedTicketId}
          onOpenWatches={() => setActiveView(ViewType.WATCHES)}
          onRunSop={(ticketId, sopId) => {
            setSelectedTicketId(ticketId);
            if (sopId) setSelectedSopId(sopId);
            setPreviousView(ViewType.TICKETS);
            setActiveView(ViewType.SOP_RUN);
          }}
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
          onOpenQuickLog={(block) => {
            setSelectedBlockForQuickLog(block);
            setActiveView(ViewType.QUICK_LOG);
          }}
        />
      );

    case ViewType.QUICK_LOG:
      return (
        <QuickLogWidget
          block={selectedBlockForQuickLog}
          onBack={() => {
            if (previousView) {
              setActiveView(previousView);
            } else {
              setActiveView(ViewType.RUN_SHEET);
            }
          }}
        />
      );

    case ViewType.PARTS:
      return (
        <PartsView
          onBack={() => setActiveView(ViewType.PROPERTIES)}
          onOpenTicket={(ticketId) => {
            setSelectedTicketId(ticketId);
            setActiveView(ViewType.TICKETS);
          }}
        />
      );

    case ViewType.NOTICES:
      // Notice Pipeline retired per Batch A-revised: redirected to Tickets
      return (
        <TicketListView
          onBack={() => setActiveView(ViewType.PROPERTIES)}
          initialSelectedTicketId={selectedTicketId}
          onOpenWatches={() => setActiveView(ViewType.WATCHES)}
        />
      );

    case ViewType.WATCHES:
      return (
        <WatchesView
          onBack={() => setActiveView(ViewType.PROPERTIES)}
        />
      );

    case ViewType.SOPS:
      return (
        <SOPListView
          onBack={() => {
            if (previousView) {
              setActiveView(previousView);
            } else {
              setActiveView(ViewType.PROFILE);
            }
          }}
          onOpenFieldNotes={() => {
            setPreviousView(ViewType.SOPS);
            setActiveView(ViewType.FIELD_NOTES);
          }}
          onStartRun={(sopId) => {
            setSelectedSopId(sopId);
            setPreviousView(ViewType.SOPS);
            setActiveView(ViewType.SOP_RUN);
          }}
        />
      );

    case ViewType.FIELD_NOTES:
      return (
        <FieldNotesView
          onBack={() => {
            if (previousView) {
              setActiveView(previousView);
            } else {
              setActiveView(ViewType.SOPS);
            }
          }}
        />
      );

    case ViewType.SOP_RUN:
      return (
        <SOPRunView
          sopId={selectedSopId}
          ticketId={selectedTicketId}
          onBack={() => {
            if (previousView) {
              setActiveView(previousView);
            } else {
              setActiveView(ViewType.SOPS);
            }
          }}
          onRunFinished={(run) => {
            if (run.ticket_id) {
              setSelectedTicketId(String(run.ticket_id));
              setActiveView(ViewType.TICKETS);
            } else {
              setActiveView(ViewType.SOPS);
            }
          }}
        />
      );

      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-2xl">explore_off</span>
            </div>
            <h3 className="text-lg font-bold text-brand-black dark:text-white">View Not Found</h3>
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark mt-1 max-w-xs">
              The requested view ({String(activeView)}) does not exist or has been retired.
            </p>
            <button
              onClick={() => setActiveView(ViewType.PROPERTIES)}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-md hover:opacity-90 transition"
            >
              Return to Properties
            </button>
          </div>
        );
    }
  };

  return (
    <React.Suspense fallback={<ViewLoadingSkeleton />}>
      {renderActiveView()}
    </React.Suspense>
  );
};

export default Router;
