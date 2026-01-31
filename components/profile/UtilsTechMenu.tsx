
import React from 'react';
import { useData } from '../../hooks/useData';

interface UtilsTechMenuProps {
  onBack: () => void;
  onOpenCanvas: (propertyId: string) => void;
}

/**
 * UtilsTechMenu
 * A specialized dashboard for technicians to quickly access property layouts (Canvases).
 * Only accessible when "Super Powers" are enabled.
 */
const UtilsTechMenu: React.FC<UtilsTechMenuProps> = ({ onBack, onOpenCanvas }) => {
  const { properties, appliances } = useData();
  
  const getApplianceCountForProperty = (propId: string) => {
    return appliances.filter(a => a.propertyId === propId).length;
  };

  const getPositionedApplianceCount = (propId: string) => {
    return appliances.filter(a => a.propertyId === propId && a.position).length;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-brand-black dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-brand-black dark:text-white flex items-center gap-2 justify-center">
            <span className="material-symbols-outlined text-primary">architecture</span>
            Technician Tools
          </h1>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 p-6 max-w-lg mx-auto w-full">
        <div className="mb-6 bg-primary/10 rounded-2xl p-6 border border-primary/20">
            <h2 className="text-xl font-bold text-brand-black dark:text-white mb-2">Canvas Layout Manager</h2>
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                Select a property below to manage appliance positioning and view the interactive blueprint canvas.
            </p>
        </div>

        <h3 className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-4">Available Properties</h3>
        
        <div className="space-y-4">
            {properties.map(property => {
                const totalApps = getApplianceCountForProperty(property.id);
                const positionedApps = getPositionedApplianceCount(property.id);
                const progress = totalApps > 0 ? (positionedApps / totalApps) * 100 : 0;

                return (
                    <div 
                        key={property.id}
                        className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center p-4 gap-4">
                            <div className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0 relative">
                                <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-brand-black dark:text-white truncate text-base">{property.name}</h4>
                                <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate mb-2">{property.address}</p>
                                
                                {/* Mini Progress Bar for Canvas Completion */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary rounded-full transition-all duration-500" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark whitespace-nowrap">
                                        {positionedApps}/{totalApps} Plotted
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-4 pb-4">
                            <button 
                                onClick={() => onOpenCanvas(property.id)}
                                className="w-full py-3 bg-gray-50 dark:bg-gray-800 hover:bg-primary hover:text-white text-brand-black dark:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-gray-100 dark:border-gray-700 hover:border-primary group-hover:border-gray-200 dark:group-hover:border-gray-600"
                            >
                                <span className="material-symbols-outlined text-[18px]">open_with</span>
                                Open Layout Canvas
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default UtilsTechMenu;
