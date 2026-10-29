
import React, { useState, useRef } from 'react';
import { useData } from '../../hooks/useData';
import { compressAndUploadImage } from '../../utils/imageUtils';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { apiClient } from '../../src/api/client';
import type { Stockpile } from '../../types/domain';

interface PropertyDetailViewProps {
  propertyId: string;
  onBack: () => void;
  onApplianceClick: (id: string) => void;
  isEditMode: boolean;
  onOpenStockpileInventory?: (stockpileId: number | string) => void;
}

const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  onBack,
  onApplianceClick,
  isEditMode,
  onOpenStockpileInventory,
}) => {
  const { getProperty, appliances, updateProperty } = useData();
  const property = getProperty(propertyId);
  const propertyAppliances = appliances.filter(a => a.propertyId === propertyId);

  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState(property?.imageUrl || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stockpilesList, setStockpilesList] = useState<Stockpile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (property?.role === 'storage') {
      apiClient.getStockpiles()
        .then(res => {
          if (Array.isArray(res)) setStockpilesList(res);
        })
        .catch(() => {});
    }
  }, [property?.role]);

  if (!property) return <div>Property Not Found</div>;

  const handleUpdateImage = () => {
    updateProperty({ ...property, imageUrl: newImageUrl });
    setIsEditingImage(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        const compressed = await compressAndUploadImage(file, { maxWidth: 1600, quality: 0.7, entityType: 'property', entityId: property.id });
        setNewImageUrl(compressed);
      } catch (err) {
        console.error("Compression failed", err);
        alert("Failed to process image.");
      } finally {
        setIsProcessing(false);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-brand-black dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-brand-black dark:text-white">Property Equipment</h1>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* House Header Card */}
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-800 relative group">
          <div
            className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden relative cursor-pointer"
            onClick={() => isEditMode && setIsEditingImage(true)}
          >
            {property.imageUrl ? (
              <img src={property.imageUrl} alt={property.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-4xl text-gray-400">home</span>
            )}
            {isEditMode && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                <span className="material-symbols-outlined text-sm">edit</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-black dark:text-white">{property.name}</h2>
              {isEditMode && (
                <button
                  onClick={() => setIsEditingImage(true)}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              )}
            </div>
            <p className="text-sm text-text-sub-light dark:text-text-sub-dark">{property.address}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-bold uppercase">Residential</span>
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-[10px] font-bold uppercase">{property.applianceCount} Units</span>
              {property.role && property.role !== 'standard' && (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                  {property.role === 'storage' ? (property.id === 'prop-days-511' || property.id === '15' || property.name?.includes('511 Days') ? 'Storage Node (Central)' : 'Storage Node') : property.role === 'mechanical' ? 'Mechanical Hub' : property.role === 'office' ? 'Office' : property.role}
                </span>
              )}
              {property.responsibility === 'external' && (
                <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase">
                  External Super (Not Jose)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Storage Location Inventory Whole-Box Navigation Card or Informational Box */}
        {property.role === 'storage' && (() => {
          const isCentral = property.id === 'prop-days-511' || property.id === '15' || property.name?.includes('511 Days');
          
          // Generic resolution order:
          // (a) Stockpile linked by building_id to the building
          // (b) Else stockpile matched by building name / address
          // (c) Else NO navigation (null) — hardcoded fallback removed
          const matchedStockpile =
            // (a) First: match by building_id
            stockpilesList.find(sp => {
              if (sp.building_id && (String(sp.building_id) === property.id || String(sp.building_id) === String(property.id).replace(/\D/g, ''))) return true;
              if (sp.buildingId && (String(sp.buildingId) === property.id || String(sp.buildingId) === String(property.id).replace(/\D/g, ''))) return true;
              return false;
            }) ||
            // (b) Second: match by building name / address
            stockpilesList.find(sp => {
              if (property.name && sp.name && (sp.name.toLowerCase().includes(property.name.toLowerCase()) || property.name.toLowerCase().includes(sp.name.toLowerCase()))) return true;
              if (property.address && sp.location && (sp.location.toLowerCase().includes(property.address.toLowerCase()) || property.address.toLowerCase().includes(sp.location.toLowerCase()))) return true;
              return false;
            }) ||
            // (c) No navigation
            null;

          const targetStockpileId = matchedStockpile ? matchedStockpile.id : null;

          if (targetStockpileId && onOpenStockpileInventory) {
            return (
              <div
                data-testid="property-detail-storage-inventory-card"
                onClick={() => onOpenStockpileInventory(targetStockpileId)}
                className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-all group shadow-xs"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenStockpileInventory(targetStockpileId);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
                    <span className="material-symbols-outlined text-2xl group-hover:scale-105 transition-transform">
                      inventory_2
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                      <span>{isCentral ? 'Central Storage Depot Stock' : 'Location Stock & Inventory'}</span>
                      <span className="px-2 py-0.2 rounded-md bg-amber-500 text-brand-black text-[10px] font-black uppercase tracking-wider">
                        Stock Menu
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 truncate">
                      {matchedStockpile ? `${matchedStockpile.name} · Tap to see parts & equipment on hand` : 'Tap to see inventory stored here'}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 group-hover:translate-x-0.5 transition-transform">
                  chevron_right
                </span>
              </div>
            );
          }

          // Informational-only box when storage role has no matched stockpile
          return (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
                <span className="material-symbols-outlined text-2xl">inventory_2</span>
              </div>
              <div>
                {isCentral ? (
                  <><strong>Central Storage Building:</strong> 511 Days Rd basement houses primary replacement inventory for BD complex.</>
                ) : (
                  <><strong>Storage Node:</strong> Key storage depot for parts, spare equipment, and replacement inventory.</>
                )}
              </div>
            </div>
          );
        })()}

        {/* Edit Image Modal */}
        {isEditingImage && (
          <Modal onClose={() => setIsEditingImage(false)} title="Update Residence Image">
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center gap-4">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                <div
                  className="w-20 h-20 rounded-full bg-white dark:bg-card-dark shadow-md flex items-center justify-center cursor-pointer hover:scale-105 transition-transform text-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-symbols-outlined text-3xl">photo_camera</span>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm text-brand-black dark:text-white">Upload or Capture</p>
                  <p className="text-[10px] text-text-sub-light dark:text-text-sub-dark mt-1 text-wrap">Select a cover photo for this residence</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-brand-black dark:text-white uppercase ml-1">Or paste an Image URL</label>
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                />
              </div>

              {newImageUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                  <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNewImageUrl('')}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsEditingImage(false)}>Cancel</Button>
                <Button variant="primary" fullWidth onClick={handleUpdateImage} disabled={isProcessing}>Save Image</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Inventory List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">Equipment Inventory</h3>
          </div>

          <div className="space-y-4">
            {propertyAppliances.map(app => (
              <div
                key={app.id}
                className="bg-white dark:bg-card-dark rounded-xl overflow-hidden shadow-sm border-2 border-transparent hover:border-primary/20 transition-all"
              >
                {/* Collapsible Header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer border-b border-gray-50 dark:border-gray-800"
                  onClick={() => onApplianceClick(app.id)}
                >
                  <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{
                      app.type === 'Furnace' ? 'local_fire_department' :
                        app.type === 'Heater' ? 'water_drop' :
                          app.type === 'AC' ? 'ac_unit' : 'smart_toy'
                    }</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-brand-black dark:text-white text-base truncate">{app.name}</h4>
                    <p className="text-xs text-text-sub-light dark:text-text-sub-dark truncate">
                      {[
                        property?.address,
                        app.unitNumber ? `Unit ${app.unitNumber}` : null,
                        app.room || app.specs?.room || app.specs?.location || 'Mech Room'
                      ].filter(Boolean).join(' · ')}
                      {' • '}
                      <span className="capitalize">{(app.status || 'operational').replace('_', ' ')}</span>
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">expand_less</span>
                </div>

                {/* Expanded Details Preview */}
                <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-4">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Model Number</p>
                      <p className="text-sm font-bold text-brand-black dark:text-white truncate">{app.modelNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Serial Number</p>
                      <p className="text-sm font-bold text-brand-black dark:text-white truncate">{app.serialNumber || 'N/A'}</p>
                    </div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Location</p>
                      <p className="text-sm font-bold text-brand-black dark:text-white truncate">
                        {[
                          property?.address,
                          app.unitNumber ? `Unit ${app.unitNumber}` : null,
                          app.room || app.specs?.room || app.specs?.location || 'Basement'
                        ].filter(Boolean).join(' · ')}
                      </p>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Install Date</p>
                      <p className="text-sm font-bold text-brand-black dark:text-white truncate">{app.specs?.installDate || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => onApplianceClick(app.id)}
                      className="w-full py-2.5 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold text-brand-black dark:text-white flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      Rating Plate &amp; Specs
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailView;
