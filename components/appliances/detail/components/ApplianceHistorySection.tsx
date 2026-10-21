
import React from 'react';
import { MaintenanceRecord } from '../../../../types';

interface ApplianceHistorySectionProps {
  history?: MaintenanceRecord[];
  onAddRecord: () => void;
  isReadOnly: boolean;
}

/**
 * ApplianceHistorySection Component
 * Responsibilities:
 * - Render the maintenance timeline visual.
 * - Provide button to add new records.
 */
export const ApplianceHistorySection: React.FC<ApplianceHistorySectionProps> = ({ history, onAddRecord, isReadOnly }) => {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-black dark:text-white">Maintenance Log</h3>
          {!isReadOnly && (
            <button 
                onClick={onAddRecord}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
                <span className="material-symbols-outlined text-[18px]">add</span> Add Record
            </button>
          )}
       </div>

       <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8">
          {history && history.length > 0 ? (
              history.map((record, index) => (
                  <div key={index} className="relative pl-6">
                     <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-background-dark border-4 border-primary"></div>
                     <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">{record.date}</span>
                        <h4 className="text-base font-bold text-brand-black dark:text-white">{record.type}</h4>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark mb-1">{record.notes}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                           <span className="material-symbols-outlined text-[14px]">person</span>
                           <span>Technician: {record.technician}</span>
                        </div>
                     </div>
                  </div>
              ))
          ) : (
              <div className="pl-6 text-sm text-text-sub-light dark:text-text-sub-dark italic">No service history yet</div>
          )}
       </div>
    </div>
  );
};
