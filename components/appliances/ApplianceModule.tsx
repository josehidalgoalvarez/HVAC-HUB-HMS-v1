
import React from 'react';
import { ViewType } from '../../types';
import { useActions } from '../../hooks/useData';
import ApplianceListView from './list/ApplianceListView';
import ApplianceDetailView from './detail/ApplianceDetailView';
import AddApplianceView from './add/AddApplianceView';

interface ApplianceModuleProps {
  activeView: ViewType;
  selectedApplianceId: string | null;
  selectedPropertyId: string | null;
  onNavigate: (view: ViewType, applianceId?: string | null) => void;
  isEditMode: boolean;
  onViewOnCanvas: (propertyId: string, applianceId: string) => void;
  onViewProperty: (propertyId: string) => void;
}

const ApplianceModule: React.FC<ApplianceModuleProps> = ({
  activeView,
  selectedApplianceId,
  selectedPropertyId,
  onNavigate,
  isEditMode,
  onViewOnCanvas,
  onViewProperty
}) => {
  // Use actions from context instead of props
  const { addAppliance, updateAppliance, deleteAppliance, duplicateAppliance } = useActions();

  // Logic to determine the specific component to render
  switch (activeView) {
    case ViewType.APPLIANCES:
      return (
        <ApplianceListView
          onApplianceClick={(id) => onNavigate(ViewType.APPLIANCE_DETAIL, id)}
        />
      );

    case ViewType.ADD_APPLIANCE:
      return (
        <AddApplianceView
          onSave={addAppliance}
          onCancel={() => onNavigate(ViewType.APPLIANCES)}
          defaultPropertyId={selectedPropertyId}
        />
      );

    case ViewType.APPLIANCE_DETAIL:
      return (
        <ApplianceDetailView
          applianceId={selectedApplianceId}
          onBack={() => onNavigate(ViewType.APPLIANCES)}
          onUpdate={updateAppliance}
          onDuplicate={duplicateAppliance}
          onDelete={deleteAppliance}
          isEditMode={isEditMode}
          onViewOnCanvas={onViewOnCanvas}
          onViewProperty={onViewProperty}
        />
      );

    default:
      return null;
  }
};

export default ApplianceModule;
