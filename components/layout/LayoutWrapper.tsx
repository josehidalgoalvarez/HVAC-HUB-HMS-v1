
import React from 'react';
import { ViewType } from '../../types';
import BottomNav from './BottomNav';

interface LayoutWrapperProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
  children: React.ReactNode;
}

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ activeView, onNavigate, children }) => {
  
  // Views where BottomNav should be hidden
  const hiddenViews = [
    ViewType.ADD_PROPERTY,
    ViewType.EDIT_PROPERTY,
    ViewType.ADD_APPLIANCE,
    ViewType.PROPERTY_CANVAS,
    ViewType.TECH_MENU
  ];

  const showBottomNav = !hiddenViews.includes(activeView);

  // Logic to determine which tab is active based on current view context
  // This maps sub-views back to their parent tab for the navigation bar state
  const getActiveNavTab = () => {
    switch (activeView) {
      case ViewType.PROPERTY_LANDING:
      case ViewType.PROPERTY_DETAIL:
        return ViewType.PROPERTIES;
      case ViewType.APPLIANCE_DETAIL:
        return ViewType.APPLIANCES;
      default:
        return activeView;
    }
  };

  return (
    <>
      {children}
      {showBottomNav && (
        <BottomNav 
          activeView={getActiveNavTab()} 
          onNavigate={onNavigate} 
        />
      )}
    </>
  );
};

export default LayoutWrapper;
