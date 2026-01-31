
import React, { useState, useRef, useEffect } from 'react';
import { Appliance, CanvasPosition } from '../../../types';
import { useData } from '../../../hooks/useData';
import { compressImage } from '../../../utils/imageUtils';

interface RatingPlateFormProps {
    appliance: Appliance;
    onSave: (updatedAppliance: Appliance) => void;
    onClose: () => void;
}

const RatingPlateForm: React.FC<RatingPlateFormProps> = ({ appliance, onSave, onClose }) => {
    const { properties, addRoomToProperty } = useData();
    const currentProperty = properties.find(p => p.id === appliance.propertyId);
    const availableRooms = currentProperty?.definedRooms || [];

    const [modelNumber, setModelNumber] = useState(appliance.modelNumber || '');
    const [serialNumber, setSerialNumber] = useState(appliance.serialNumber || '');
    const [ratingPlateUrl, setRatingPlateUrl] = useState(appliance.ratingPlateUrl || '');
    const [manualUrl, setManualUrl] = useState(appliance.manualUrl || '');
    const [warrantyUrl, setWarrantyUrl] = useState(appliance.warrantyUrl || '');
    const [installationUrl, setInstallationUrl] = useState(appliance.installationUrl || '');
    const [embedModelUrl, setEmbedModelUrl] = useState(appliance.embedModelUrl || '');
    const [notes, setNotes] = useState(appliance.notes || '');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Location & Positioning State
    const [floor, setFloor] = useState<CanvasPosition['floor']>(appliance.position?.floor || 'Basement');
    const [location, setLocation] = useState(appliance.specs?.location || '');

    // Specs State
    const [fuelType, setFuelType] = useState(appliance.specs?.fuelType || '');
    const [capacity, setCapacity] = useState(appliance.specs?.capacity || '');
    const [btuInput, setBtuInput] = useState(appliance.specs?.btuInput || '');
    const [btuOutput, setBtuOutput] = useState(appliance.specs?.btuOutput || '');
    const [kw, setKw] = useState(appliance.specs?.kw || '');
    const [volts, setVolts] = useState(appliance.specs?.volts || '');
    const [watts, setWatts] = useState(appliance.specs?.watts || '');
    const [phase, setPhase] = useState(appliance.specs?.phase || '');
    const [hertz, setHertz] = useState(appliance.specs?.hertz || '');
    const [airTempRise, setAirTempRise] = useState(appliance.specs?.airTempRise || '');
    const [breakerRating, setBreakerRating] = useState(appliance.specs?.breakerRating || '');
    const [panelSlot, setPanelSlot] = useState(appliance.specs?.panelSlot || '');

    // Date Handling
    const getInitialDate = () => {
        if (!appliance.specs?.installDate) return '';
        const d = new Date(appliance.specs.installDate);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
        return '';
    };
    const [mfgDate, setMfgDate] = useState(getInitialDate());

    const handleSave = () => {
        if (location && currentProperty && !availableRooms.includes(location)) {
            addRoomToProperty(currentProperty.id, location);
        }

        const updatedAppliance: Appliance = {
            ...appliance,
            modelNumber: modelNumber || 'TBD',
            serialNumber: serialNumber || 'TBD',
            ratingPlateUrl: ratingPlateUrl,
            manualUrl: manualUrl,
            warrantyUrl: warrantyUrl,
            installationUrl: installationUrl,
            embedModelUrl: embedModelUrl,
            notes: notes,
            position: {
                x: appliance.position?.x || 50,
                y: appliance.position?.y || 50,
                floor: floor
            },
            specs: {
                ...appliance.specs,
                fuelType: fuelType || 'TBD',
                capacity: capacity || 'TBD',
                btuInput: btuInput || 'TBD',
                btuOutput: btuOutput || 'TBD',
                kw: kw || 'TBD',
                volts: volts || 'TBD',
                watts: watts || 'TBD',
                phase: phase || 'TBD',
                hertz: hertz || 'TBD',
                airTempRise: airTempRise || 'TBD',
                breakerRating: breakerRating || 'TBD',
                panelSlot: panelSlot || 'TBD',
                installDate: mfgDate ? new Date(mfgDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (appliance.specs?.installDate || 'TBD'),
                location: location || 'TBD'
            }
        };
        onSave(updatedAppliance);
    };

    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                setIsProcessing(true);
                const compressed = await compressImage(file);
                setRatingPlateUrl(compressed);
            } catch (err) {
                console.error("Compression failed", err);
                alert("Failed to process image.");
            } finally {
                setIsProcessing(false);
            }
        }
        e.target.value = '';
    };

    const FLOORS: CanvasPosition['floor'][] = ['Basement', 'Main Floor', 'Second Floor', 'Attic', 'Garage', 'Exterior'];

    // Fuel Type Options
    const FUEL_TYPES = [
        { id: 'Gas', icon: 'local_fire_department', label: 'Gas' },
        { id: 'Propane', icon: 'propane_tank', label: 'Propane' },
        { id: 'Electric', icon: 'bolt', label: 'Electric' },
        { id: 'Other', icon: 'more_horiz', label: 'Other/More' }
    ];

    // Documentation File Inputs
    const manualInputRef = useRef<HTMLInputElement>(null);
    const warrantyInputRef = useRef<HTMLInputElement>(null);
    const installationInputRef = useRef<HTMLInputElement>(null);

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                setIsProcessing(true);
                // PDFs vs Images logic could go here, for now assuming image capture for docs or simple file link
                // If it's an image, compress it. If PDF, real app would upload to blob storage (here we mimic with local blob for session or base64)
                if (file.type.startsWith('image/')) {
                    const compressed = await compressImage(file);
                    setter(compressed);
                } else {
                    // For non-images in this local-only demo, we might just warn or use a fake path, 
                    // but let's try to read as DataURL to support basic PDF viewing if small enough
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setter(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                }
            } catch (err) {
                console.error("Upload failed", err);
                alert("Failed to upload document.");
            } finally {
                setIsProcessing(false);
            }
        }
        e.target.value = '';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative w-full max-w-lg bg-white dark:bg-background-dark rounded-t-3xl sm:rounded-3xl p-6 pb-safe shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">

                {/* Header */}
                <div className="flex items-start justify-between mb-6 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-brand-black dark:text-white">Edit Details</h2>
                        <p className="text-sm text-text-sub-light dark:text-text-sub-dark">
                            New Appliance - {appliance.brand || 'Generic'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                            title="Save Changes"
                        >
                            <span className="material-symbols-outlined">check</span>
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-brand-black dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                            <span className="material-symbols-outlined text-[24px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Rating Plate Image Card */}
                <div className="bg-background-light dark:bg-card-dark rounded-xl p-4 mb-6 shrink-0 border border-transparent">
                    <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

                    <div onClick={handleCameraClick} className="flex items-center gap-4 cursor-pointer group mb-3 hover:opacity-80 transition-opacity">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm text-brand-black dark:text-white group-hover:text-primary transition-colors border border-gray-100 dark:border-gray-600">
                            <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-brand-black dark:text-white text-base">Rating Plate Image</p>
                            <p className="text-xs text-text-sub-light dark:text-text-sub-dark">Tap to capture or upload</p>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            value={ratingPlateUrl}
                            onChange={(e) => setRatingPlateUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-sm text-brand-black dark:text-white placeholder-gray-300 focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                        {ratingPlateUrl && <span className="absolute right-3 top-2.5 text-green-500 material-symbols-outlined text-[18px]">check_circle</span>}
                    </div>
                </div>

                <div className="space-y-6">

                    {/* Location Section */}
                    <div>
                        <p className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Location & Positioning</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Floor</label>
                                <select value={floor} onChange={(e) => setFloor(e.target.value as CanvasPosition['floor'])} className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-3 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-primary/50 text-sm">
                                    {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Room / Zone</label>
                                <input list="rooms" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Utility Room" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                                <datalist id="rooms">{availableRooms.map(r => <option key={r} value={r} />)}</datalist>
                            </div>
                        </div>
                    </div>

                    {/* Identification Section */}
                    <div>
                        <p className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-2">Identification</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Model Number</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-gray-400 font-bold">#</span>
                                    <input type="text" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} placeholder="1234567" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-8 pr-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Serial Number</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-gray-400 material-symbols-outlined text-[16px]">123</span>
                                    <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="123456" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm font-mono" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Primary Ratings Box */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">local_fire_department</span> Primary Ratings
                        </p>

                        {/* Fuel Type Grid */}
                        <div className="mb-4">
                            <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-2 ml-1">Fuel Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                {FUEL_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setFuelType(type.id === 'Other' ? '' : type.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${fuelType === type.id
                                            ? 'bg-white dark:bg-card-dark border-primary text-primary shadow-sm'
                                            : 'bg-white/50 dark:bg-card-dark/50 border-transparent text-gray-500 hover:bg-white dark:hover:bg-card-dark'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined mb-1">{type.icon}</span>
                                        <span className="text-xs font-bold">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                            {(!FUEL_TYPES.some(t => t.id === fuelType) && fuelType !== '') && (
                                <input
                                    type="text"
                                    value={fuelType}
                                    onChange={(e) => setFuelType(e.target.value)}
                                    placeholder="Specify Fuel Type..."
                                    className="mt-2 w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-sm text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Capacity / Size</label>
                                <input type="text" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 50 Gallons / 3 Tons" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>

                            {/* BTU Colocation */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">BTU Input</label>
                                    <input type="text" value={btuInput} onChange={(e) => setBtuInput(e.target.value)} placeholder="0" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-4 pr-14 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm text-center" />
                                    <span className="absolute right-3 top-9 text-xs font-bold text-gray-400">BTU/h</span>
                                </div>
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">BTU Output</label>
                                    <input type="text" value={btuOutput} onChange={(e) => setBtuOutput(e.target.value)} placeholder="0" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-4 pr-14 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm text-center" />
                                    <span className="absolute right-3 top-9 text-xs font-bold text-gray-400">BTU/h</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Mfg Date</label>
                                <input type="date" value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-brand-black dark:text-white outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Electrical Box */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">bolt</span> Electrical
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Volts</label>
                                <input type="text" value={volts} onChange={(e) => setVolts(e.target.value)} placeholder="240V" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Watts</label>
                                <input type="text" value={watts} onChange={(e) => setWatts(e.target.value)} placeholder="4500W" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Phase</label>
                                <input type="text" value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="1" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Hertz</label>
                                <input type="text" value={hertz} onChange={(e) => setHertz(e.target.value)} placeholder="60Hz" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Breaker</label>
                                <input type="text" value={breakerRating} onChange={(e) => setBreakerRating(e.target.value)} placeholder="60A" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Panel Slot</label>
                                <input type="text" value={panelSlot} onChange={(e) => setPanelSlot(e.target.value)} placeholder="14,16" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Performance Box */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">speed</span> Performance
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Temp Rise</label>
                                <input type="text" value={airTempRise} onChange={(e) => setAirTempRise(e.target.value)} placeholder="45-75°F" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Efficiency (kW)</label>
                                <input type="text" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="15 kW" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Documentation & Links */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">folder_open</span> Documentation
                        </p>

                        <input type="file" ref={manualInputRef} accept=".pdf,image/*" className="hidden" onChange={(e) => handleDocUpload(e, setManualUrl)} />
                        <input type="file" ref={warrantyInputRef} accept=".pdf,image/*" className="hidden" onChange={(e) => handleDocUpload(e, setWarrantyUrl)} />
                        <input type="file" ref={installationInputRef} accept=".pdf,image/*" className="hidden" onChange={(e) => handleDocUpload(e, setInstallationUrl)} />

                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input type="text" value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="Manual URL..." className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pl-3 pr-10 text-sm outline-none" />
                                    <button onClick={() => manualInputRef.current?.click()} className="absolute right-2 top-2 text-gray-400 hover:text-primary"><span className="material-symbols-outlined text-[20px]">upload_file</span></button>
                                </div>
                                <div className="flex-1 relative">
                                    <input type="text" value={warrantyUrl} onChange={(e) => setWarrantyUrl(e.target.value)} placeholder="Warranty URL..." className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pl-3 pr-10 text-sm outline-none" />
                                    <button onClick={() => warrantyInputRef.current?.click()} className="absolute right-2 top-2 text-gray-400 hover:text-primary"><span className="material-symbols-outlined text-[20px]">upload_file</span></button>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">Installation Guide</label>
                                <input type="text" value={installationUrl} onChange={(e) => setInstallationUrl(e.target.value)} placeholder="Installation URL..." className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 pr-10 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                                <button onClick={() => installationInputRef.current?.click()} className="absolute right-2 top-8 text-gray-400 hover:text-primary"><span className="material-symbols-outlined text-[20px]">upload_file</span></button>
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-bold text-brand-black dark:text-white uppercase mb-1 ml-1">3D Model Embed</label>
                                <input type="text" value={embedModelUrl} onChange={(e) => setEmbedModelUrl(e.target.value)} placeholder="https://sketchfab.com/models/.../embed" className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">description</span> Technician Notes
                            </p>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes about condition, special instructions, or maintenance needs..."
                                className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-brand-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 outline-none text-sm min-h-[100px] resize-y"
                            />
                        </div>

                    </div>

                    <div className="mt-8 shrink-0">
                        <button
                            onClick={handleSave}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                            Save Details
                        </button>
                    </div>

                    <style>{`
                  @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                `}</style>

                </div>
            </div>
        </div>
    );
};

export default RatingPlateForm;
