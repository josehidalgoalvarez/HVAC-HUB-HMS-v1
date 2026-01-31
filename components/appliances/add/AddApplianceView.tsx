
import React from 'react';
import { Appliance } from '../../../types';
import RatingPlateForm from '../common/RatingPlateForm';

interface AddApplianceViewProps {
  onSave: (appliance: Appliance) => void;
  onCancel: () => void;
  defaultPropertyId?: string | null;
}

const AddApplianceView: React.FC<AddApplianceViewProps> = ({ onSave, onCancel, defaultPropertyId }) => {
  // Create a blank/template appliance for the form
  const newApplianceTemplate: Appliance = {
    id: `app_${Date.now()}`,
    name: 'New Appliance',
    brand: '',
    propertyId: defaultPropertyId || '1', // Use the passed property ID, fallback to '1' only if null
    status: 'operational',
    lastService: 'Just Added',
    type: 'Generic',
    category: 'OTHER',
    imageUrl: 'https://images.unsplash.com/photo-1581539250439-c96689b516dd?auto=format&fit=crop&q=80&w=800',
    specs: {}
  };

  const handleSave = (applianceData: Appliance) => {
    // Ensure we preserve the propertyId if the form didn't explicitly set it (though RatingPlateForm manages the object)
    // If RatingPlateForm replaces the whole object, we ensure propertyId is sticky from our template
    onSave({
        ...applianceData,
        propertyId: defaultPropertyId || applianceData.propertyId || '1'
    });
    onCancel();
  };

  return (
    <div className="relative min-h-screen bg-gray-900/50 backdrop-blur-sm">
      {/* 
        Reusing the RatingPlateForm as the primary UI for adding an appliance.
        This provides a consistent experience with the edit flow.
      */}
      <RatingPlateForm 
        appliance={newApplianceTemplate}
        onSave={handleSave}
        onClose={onCancel}
      />
    </div>
  );
};

export default AddApplianceView;
