
import React, { useState, useRef } from 'react';
import { Appliance } from '../../../../types';
import { compressAndUploadImage } from '../../../../utils/imageUtils';

interface ApplianceHeroProps {
  appliance: Appliance;
  onStatusChange: (status: Appliance['status']) => void;
  isReadOnly: boolean;
  onImageUpdate: (url: string) => void;
}

/**
 * ApplianceHero Component
 * Responsibilities: 
 * - Render appliance photo with flat tonal framing.
 * - Manage UI for changing appliance status (Operational/Needs Service/Idle).
 * - Allow updating main photo via camera/upload if not read-only.
 */
export const ApplianceHero: React.FC<ApplianceHeroProps> = ({ appliance, onStatusChange, isReadOnly, onImageUpdate }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStatusSelect = (status: Appliance['status']) => {
    onStatusChange(status);
    setShowStatusMenu(false);
  };

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        const compressed = await compressAndUploadImage(file, { entityType: 'appliance', entityId: appliance.id });
        onImageUpdate(compressed);
      } catch (err) {
        console.error("Compression failed", err);
        alert("Failed to update image.");
      } finally {
        setIsProcessing(false);
      }
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="relative w-full aspect-square bg-[#e0e4cc]/20 dark:bg-[#2A363B] rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner flex items-center justify-center group">

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative w-full h-full p-8 flex items-center justify-center">
        <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#0077b6 1px, transparent 1px), linear-gradient(90deg, #0077b6 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
        <img
          src={appliance.imageUrl}
          alt={appliance.name}
          className={`relative z-10 max-h-full max-w-full object-contain drop-shadow-2xl transition-opacity duration-300 ${isProcessing ? 'opacity-50 blur-sm' : ''}`}
        />

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-black/60 text-white px-4 py-2 rounded-xl backdrop-blur-md text-sm font-bold animate-pulse">
              Processing Image...
            </div>
          </div>
        )}
      </div>

      {/* Camera / Edit Button - Only if not read only */}
      {!isReadOnly && !isProcessing && (
        <button
          onClick={handleCameraClick}
          className="absolute bottom-4 right-4 z-30 w-10 h-10 rounded-full bg-white dark:bg-card-dark text-brand-black dark:text-white shadow-lg flex items-center justify-center hover:bg-primary hover:text-white transition-all border border-gray-100 dark:border-gray-600"
          title="Update Photo"
        >
          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
        </button>
      )}

      {/* Dynamic Status Badge / Dropdown */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={(e) => {
            if (!isReadOnly) {
              e.stopPropagation();
              setShowStatusMenu(!showStatusMenu);
            }
          }}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-sm flex items-center gap-1 transition-all ${appliance.status === 'operational' ? 'bg-green-900/90 text-green-400 border-green-700/50' :
              appliance.status === 'needs_service' ? 'bg-brand-orange/90 text-white border-brand-orange/50' :
                'bg-gray-800/90 text-gray-300 border-gray-600/50'
            } ${!isReadOnly ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
        >
          {appliance.status.toUpperCase().replace('_', ' ')}
          {!isReadOnly && <span className="material-symbols-outlined text-[12px]">expand_more</span>}
        </button>

        {showStatusMenu && !isReadOnly && (
          <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-card-dark rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <button onClick={() => handleStatusSelect('operational')} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 text-green-600 dark:text-green-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div> OPERATIONAL
            </button>
            <button onClick={() => handleStatusSelect('needs_service')} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 text-brand-orange flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-orange"></div> NEEDS SERVICE
            </button>
            <button onClick={() => handleStatusSelect('idle')} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div> IDLE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
