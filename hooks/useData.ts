
import { useContext } from 'react';
import { InventoryContext, ActivityContext, ActionContext } from '../context/DataContext';

// Specific hook for Inventory (Properties/Appliances)
export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within a DataProvider');
  }
  return context;
};

// Specific hook for Activity (Logs)
export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within a DataProvider');
  }
  return context;
};

// Specific hook for Actions
export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActions must be used within a DataProvider');
  }
  return context;
};

// Legacy support hook that combines all
export const useData = () => {
  const inventory = useInventory();
  const activity = useActivity();
  const actions = useActions();
  
  return {
    ...inventory,
    ...activity,
    ...actions
  };
};
