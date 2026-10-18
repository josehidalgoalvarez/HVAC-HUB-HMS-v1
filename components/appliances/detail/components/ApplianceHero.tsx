
import React, { useState, useRef } from 'react';
import { Appliance } from '../../../../types';
import { compressAndUploadImage } from '../../../../utils/imageUtils';

interface ApplianceHeroProps {
  appliance: Appliance;
  onStatusChange: (status: Appliance['status']) => void;
  isReadOnly: boolean;
  onImageUpdate: (url: string) => void;
  onModelUrlUpdate?: (url: string) => void;
}

/**
 * ApplianceHero Component
 * Responsibilities: 
 * - Render the 3D model (lazily) or fallback image.
 * - Manage the UI for changing the appliance status (Operational/Needs Service/Idle).
 * - Allow updating the main image via camera/upload if not read-only.
 * - NEW: Allow pasting a 3D model link.
 */
export const ApplianceHero: React.FC<ApplianceHeroProps> = ({ appliance, onStatusChange, isReadOnly, onImageUpdate, onModelUrlUpdate }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStatusSelect = (status: Appliance['status']) => {
    onStatusChange(status);
    setShowStatusMenu(false);
  };

  const handleLoad3D = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModelLoaded(true);
  };

  const handlePaste3D = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = prompt("Paste the 3D model embed URL (e.g. from Sketchfab):");
    if (url && onModelUrlUpdate) {
      onModelUrlUpdate(url);
    }
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

      {appliance.embedModelUrl && isModelLoaded ? (
        <iframe
          src={appliance.embedModelUrl}
          className="w-full h-full border-0 animate-in fade-in duration-700"
          frameBorder="0"
          scrolling="no"
          title={`3D Model of ${appliance.name}`}
        />
      ) : (
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

          {/* Lazy Load Trigger Overlay or Edit Button */}
          {appliance.embedModelUrl ? (
            <button
              onClick={handleLoad3D}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/5 hover:bg-black/10 transition-colors cursor-pointer group/btn"
            >
              <div className="bg-white/90 dark:bg-black/70 backdrop-blur-md px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl transform group-hover/btn:scale-105 transition-all border border-white/50 dark:border-white/10">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[24px]">view_in_ar</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-brand-black dark:text-white text-sm">View 3D Model</p>
                  <p className="text-[10px] text-text-sub-light dark:text-text-sub-dark">Tap to load interactive view</p>
                </div>
              </div>
            </button>
          ) : (
            !isReadOnly && (
              <button
                onClick={handlePaste3D}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/0 hover:bg-black/5 transition-colors cursor-pointer group/paste"
              >
                <div className="bg-white/80 dark:bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg opacity-0 group-hover/paste:opacity-100 transform translate-y-2 group-hover/paste:translate-y-0 transition-all border border-white/30">
                  <span className="material-symbols-outlined text-primary text-[20px]">link</span>
                  <span className="font-bold text-brand-black dark:text-white text-xs">Add 3D Model</span>
                </div>
              </button>
            )
          )}
        </div>
      )}

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
