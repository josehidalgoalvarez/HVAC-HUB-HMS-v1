
import React from 'react';

interface ServiceButtonProps {
  onClick: () => void;
}

export const ServiceButton: React.FC<ServiceButtonProps> = ({ onClick }) => {
  return (
    <div className="fixed bottom-6 left-0 w-full px-6 z-30">
       <button 
          onClick={onClick}
          className="w-full bg-primary text-white font-bold text-base py-4 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
       >
          <span className="material-symbols-outlined">build</span>
          REQUEST SERVICE
       </button>
    </div>
  );
};
