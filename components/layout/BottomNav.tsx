
import React from 'react';
import { ViewType } from '../../types';

interface BottomNavProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 z-40 w-full border-t border-gray-100 bg-white dark:bg-background-dark dark:border-gray-800 pb-safe pt-2">
      <div className="flex justify-around items-end pb-4 pt-2 max-w-lg mx-auto">
        <button
          onClick={() => onNavigate(ViewType.PROPERTIES)}
          className={`group flex flex-1 flex-col items-center justify-center gap-1 transition-all ${activeView === ViewType.PROPERTIES ? 'text-primary scale-110' : 'text-text-sub-light dark:text-text-sub-dark'}`}
        >
          <div className="relative">
            <span className={`material-symbols-outlined text-[28px] transition-transform duration-200 group-active:scale-90 ${activeView === ViewType.PROPERTIES ? 'font-variation-settings-fill' : ''}`}>home</span>
          </div>
          <span className="text-[10px] font-bold tracking-wide">Properties</span>
        </button>

        <button
          id="tickets-nav-item"
          onClick={() => onNavigate(ViewType.TICKETS)}
          className={`group flex flex-1 flex-col items-center justify-center gap-1 transition-all ${activeView === ViewType.TICKETS ? 'text-primary scale-110' : 'text-text-sub-light dark:text-text-sub-dark'}`}
        >
          <div className="relative">
            <span className={`material-symbols-outlined text-[28px] transition-transform duration-200 group-active:scale-90 ${activeView === ViewType.TICKETS ? 'font-variation-settings-fill' : ''}`}>assignment</span>
          </div>
          <span className="text-[10px] font-bold tracking-wide">Tickets</span>
        </button>

        <button
          id="day-plan-nav-item"
          onClick={() => onNavigate(ViewType.RUN_SHEET)}
          className={`group flex flex-1 flex-col items-center justify-center gap-1 transition-all ${activeView === ViewType.RUN_SHEET ? 'text-primary scale-110' : 'text-text-sub-light dark:text-text-sub-dark'}`}
        >
          <div className="relative">
            <span className={`material-symbols-outlined text-[28px] transition-transform duration-200 group-active:scale-90 ${activeView === ViewType.RUN_SHEET ? 'font-variation-settings-fill' : ''}`}>schedule</span>
          </div>
          <span className="text-[10px] font-bold tracking-wide">Day Plan</span>
        </button>

        <button
          id="parts-nav-item"
          onClick={() => onNavigate(ViewType.PARTS)}
          className={`group flex flex-1 flex-col items-center justify-center gap-1 transition-all ${activeView === ViewType.PARTS ? 'text-primary scale-110' : 'text-text-sub-light dark:text-text-sub-dark'}`}
        >
          <span className={`material-symbols-outlined text-[28px] transition-transform duration-200 group-active:scale-90 ${activeView === ViewType.PARTS ? 'font-variation-settings-fill' : ''}`}>precision_manufacturing</span>
          <span className="text-[10px] font-medium tracking-wide">Parts</span>
        </button>

        <button
          id="profile-nav-item" // Adding ID for tutorial targeting
          onClick={() => onNavigate(ViewType.PROFILE)}
          className={`group flex flex-1 flex-col items-center justify-center gap-1 transition-all ${activeView === ViewType.PROFILE ? 'text-primary scale-110' : 'text-text-sub-light dark:text-text-sub-dark'}`}
        >
          <span className={`material-symbols-outlined text-[28px] transition-transform duration-200 group-active:scale-90 ${activeView === ViewType.PROFILE ? 'font-variation-settings-fill' : ''}`}>person</span>
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
