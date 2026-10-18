
import React, { useState } from 'react';
import { Property } from '../../types';
import { useData, useActions } from '../../hooks/useData';
import { ASSETS } from '../../utils/assets';

interface AddPropertyViewProps {
   onCancel: () => void;
   onSave: () => void;
   initialPropertyId?: string | null;
}

import { compressAndUploadImage } from '../../utils/imageUtils'; // Import added

const AddPropertyView: React.FC<AddPropertyViewProps> = ({ onCancel, onSave, initialPropertyId }) => {
   const { getProperty } = useData();
   const { addProperty, updateProperty } = useActions();
   const initialProperty = initialPropertyId ? getProperty(initialPropertyId) : undefined;

   const fileInputRef = React.useRef<HTMLInputElement>(null);
   const [isProcessing, setIsProcessing] = useState(false);

   // Helper to split a full address string roughly into parts
   const parseAddress = (fullAddr: string) => {
      if (!fullAddr) return { address: '', city: '', state: '', zip: '' };
      const parts = fullAddr.split(',').map(s => s.trim());
      return {
         address: parts[0] || '',
         city: parts[1] || '',
         state: parts[2] || '',
         zip: ''
      };
   };

   const initialAddr = initialProperty ? parseAddress(initialProperty.address) : { address: '', city: '', state: '', zip: '' };

   const [formData, setFormData] = useState({
      name: initialProperty?.name || '',
      address: initialAddr.address,
      city: initialAddr.city,
      state: initialAddr.state,
      zip: initialAddr.zip,
      imageUrl: initialProperty?.imageUrl || ASSETS.DEFAULT_PROPERTY,
      sqFt: initialProperty?.sqFt || '',
      yearBuilt: initialProperty?.yearBuilt || '',
      lotSize: initialProperty?.lotSize || '',
      comments: initialProperty?.comments || ''
   });

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         try {
            setIsProcessing(true);
            const compressed = await compressAndUploadImage(file, { maxWidth: 1600, quality: 0.7, entityType: 'property' });
            setFormData(prev => ({ ...prev, imageUrl: compressed }));
         } catch (err) {
            console.error("Compression failed", err);
            alert("Failed to process image.");
         } finally {
            setIsProcessing(false);
         }
      }
   };

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
   };

   const handleSave = () => {
      if (!formData.name) return; // Basic validation

      const fullAddress = `${formData.address}${formData.city ? `, ${formData.city}` : ''}${formData.state ? `, ${formData.state}` : ''}`;

      if (initialProperty) {
         // Edit Mode
         const updatedProperty: Property = {
            ...initialProperty,
            name: formData.name,
            address: fullAddress,
            imageUrl: formData.imageUrl,
            sqFt: formData.sqFt,
            yearBuilt: formData.yearBuilt,
            lotSize: formData.lotSize,
            comments: formData.comments
         };
         updateProperty(updatedProperty);
      } else {
         // Add Mode
         const newProperty: Property = {
            id: Date.now().toString(),
            name: formData.name,
            address: fullAddress,
            imageUrl: formData.imageUrl,
            applianceCount: 0,
            is3DReady: false,
            sqFt: formData.sqFt,
            yearBuilt: formData.yearBuilt,
            lotSize: formData.lotSize,
            comments: formData.comments
         };
         addProperty(newProperty);
      }
      onSave(); // Trigger navigation
   };

   const isEditMode = !!initialProperty;

   return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-safe relative">

         {/* Hero Header Section */}
         <div className="relative h-72 w-full bg-gray-900">
            <img
               src={formData.imageUrl}
               alt="Property Preview"
               className="w-full h-full object-cover opacity-80"
               onError={(e) => {
                  (e.target as HTMLImageElement).src = ASSETS.DEFAULT_PROPERTY;
               }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Navigation */}
            <button
               onClick={onCancel}
               className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all z-20"
            >
               <span className="material-symbols-outlined">arrow_back</span>
            </button>

            {/* Header Content Overlay */}
            <div className="absolute bottom-10 left-6 right-6 text-white z-10">
               <h1 className="text-3xl font-display font-bold tracking-tight mb-1">{formData.name || (isEditMode ? 'Edit Property' : 'New Property')}</h1>
               <div className="flex items-center gap-2 text-white/80 font-medium">
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                  <p className="truncate">{formData.address ? `${formData.address}, ${formData.city}` : 'Enter property address'}</p>
               </div>
            </div>
         </div>

         {/* Main Form Content */}
         <div className="relative -mt-6 rounded-t-3xl bg-background-light dark:bg-background-dark px-4 py-8 space-y-6 z-20">

            {/* Section: Property Identity */}
            <section className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary text-2xl">domain</span>
                  <h2 className="text-lg font-bold text-brand-black dark:text-white">Property Identity</h2>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Property Name</label>
                     <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Main Residence"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                     />
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Cover Image URL</label>
                     <div className="relative">
                        <input
                           type="file"
                           ref={fileInputRef}
                           accept="image/*"
                           className="hidden"
                           onChange={handleFileChange}
                        />
                        <input
                           name="imageUrl"
                           value={formData.imageUrl}
                           onChange={handleChange}
                           placeholder="https://..."
                           className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        />
                        <button
                           onClick={() => fileInputRef.current?.click()}
                           className="absolute right-2 top-2 p-1 text-text-sub-light dark:text-text-sub-dark hover:text-primary transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                           title="Upload Image"
                        >
                           <span className="material-symbols-outlined">image</span>
                        </button>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Street Address</label>
                     <input
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. 124 Willow Creek Blvd"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                     />
                  </div>

                  <div className="flex gap-3">
                     <div className="flex-[2]">
                        <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">City</label>
                        <input
                           name="city"
                           value={formData.city}
                           onChange={handleChange}
                           placeholder="Kingston"
                           className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        />
                     </div>
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">State</label>
                        <input
                           name="state"
                           value={formData.state}
                           onChange={handleChange}
                           placeholder="ON"
                           className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        />
                     </div>
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Zip</label>
                        <input
                           name="zip"
                           value={formData.zip}
                           onChange={handleChange}
                           placeholder="78701"
                           className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        />
                     </div>
                  </div>
               </div>
            </section>

            {/* Section: Property Characteristics */}
            <section className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary text-2xl">analytics</span>
                  <h2 className="text-lg font-bold text-brand-black dark:text-white">Property Characteristics</h2>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Square Feet</label>
                     <div className="relative">
                        <input
                           name="sqFt"
                           value={formData.sqFt}
                           onChange={handleChange}
                           placeholder="2450"
                           type="number"
                           className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        />
                        <span className="absolute right-4 top-3.5 text-sm font-bold text-text-sub-light dark:text-text-sub-dark pointer-events-none">sq ft</span>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Year Built</label>
                     <input
                        name="yearBuilt"
                        value={formData.yearBuilt}
                        onChange={handleChange}
                        placeholder="2018"
                        type="number"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                     />
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Lot Size</label>
                     <div className="relative">
                        <input
                           name="lotSize"
                           value={formData.lotSize}
                           onChange={handleChange}
                           placeholder="0.25"
                           type="number"
                           step="0.01"
                           className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        />
                        <span className="absolute right-4 top-3.5 text-sm font-bold text-text-sub-light dark:text-text-sub-dark pointer-events-none">acres</span>
                     </div>
                  </div>
               </div>
            </section>

            {/* Section: Comments */}
            <section className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary text-2xl">notes</span>
                  <h2 className="text-lg font-bold text-brand-black dark:text-white">Comments</h2>
               </div>

               <div>
                  <label className="block text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Notes & Details</label>
                  <textarea
                     name="comments"
                     value={formData.comments}
                     onChange={handleChange}
                     placeholder="Add any additional details about the property, access codes, or specific instructions..."
                     className="w-full h-32 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none resize-none"
                  ></textarea>
               </div>
            </section>

            {/* Save Button */}
            <div className="pt-4 pb-8">
               <button
                  onClick={handleSave}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
               >
                  <span className="material-symbols-outlined">save</span>
                  {isEditMode ? 'Save Changes' : 'Save Property'}
               </button>
            </div>

         </div>
      </div>
   );
};

export default AddPropertyView;
