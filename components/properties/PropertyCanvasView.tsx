
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CanvasPosition, Appliance, Property } from '../../types';
import { useData, useActions } from '../../hooks/useData';
import { useInfiniteCanvas } from '../../hooks/useInfiniteCanvas';
import { getManhattanPath, getDirectPath } from '../../utils/geometry';
import IconButton from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';

interface PropertyCanvasViewProps {
    propertyId: string;
    onBack: () => void;
    onApplianceClick: (id: string) => void;
    initialApplianceId?: string | null;
}

const DEFAULT_FLOORS = ['Basement', 'Garage', 'Main Floor', 'Second Floor', 'Attic', 'Exterior'];

// --- Memoized Components for Performance ---

const ConnectionLayer = React.memo(({
    viewMode,
    apps,
    activeFloor,
    selectedId
}: {
    viewMode: 'layout' | 'electrical',
    apps: Appliance[],
    activeFloor: string,
    selectedId: string | null
}) => {
    return (
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            {/* Electrical Connections */}
            {viewMode === 'electrical' && apps.map(app => {
                if (app.connectedToId) {
                    const parent = apps.find(p => p.id === app.connectedToId);
                    if (parent && app.position && parent.position) {
                        const isSelected = selectedId === app.id || selectedId === parent.id;
                        const path = getManhattanPath(
                            parent.position.x,
                            parent.position.y,
                            app.position.x,
                            app.position.y
                        );

                        return (
                            <g key={`conn-${app.id}`}>
                                <path d={path} fill="none" stroke={isSelected ? "#3b82f6" : "#cbd5e1"} strokeWidth={isSelected ? "0.8" : "0.5"} className="transition-colors duration-300" />
                                <circle cx={`${app.position.x}%`} cy={`${app.position.y}%`} r="0.6" fill={isSelected ? "#3b82f6" : "#cbd5e1"} />
                            </g>
                        );
                    }
                }
                return null;
            })}

            {/* Gas Connections (Layout Mode) */}
            {viewMode === 'layout' && activeFloor === 'Basement' && apps.map(app => {
                if ((app.specs?.fuelType === 'Gas' || app.specs?.fuelType === 'Natural Gas') && app.position) {
                    const isSelected = selectedId === app.id;
                    if (isSelected) {
                        return (
                            <path
                                key={`gas-${app.id}`}
                                d={getDirectPath(10, 18, app.position.x, app.position.y)}
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="0.5"
                                strokeDasharray="2 2"
                                className="opacity-60 animate-pulse"
                            />
                        );
                    }
                }
                return null;
            })}
        </svg>
    );
});

const PropertyCanvasView: React.FC<PropertyCanvasViewProps> = ({ propertyId, onBack, onApplianceClick, initialApplianceId }) => {
    const { getProperty, appliances: allAppliances } = useData();
    const { updateProperty, updateAppliance } = useActions();
    const property = getProperty(propertyId);
    const appliances = useMemo(() => allAppliances.filter(a => a.propertyId === propertyId), [allAppliances, propertyId]);

    // Dynamic Floors Logic
    const floors = useMemo(() => property?.floors && property.floors.length > 0 ? property.floors : DEFAULT_FLOORS, [property?.floors]);

    // Determine initial state based on passed appliance ID
    const initialAppliance = useMemo(() => initialApplianceId ? appliances.find(a => a.id === initialApplianceId) : null, [initialApplianceId, appliances]);
    const initialFloor = initialAppliance?.position?.floor || floors[0];

    const [activeFloor, setActiveFloor] = useState<string>(initialFloor);
    const [selectedApplianceId, setSelectedApplianceId] = useState<string | null>(initialApplianceId || null);
    const [viewMode, setViewMode] = useState<'layout' | 'electrical'>('layout');

    // Menu & Modal State
    const [showMenu, setShowMenu] = useState(false);
    const [showFloorModal, setShowFloorModal] = useState<'add' | 'edit' | null>(null);
    const [floorNameInput, setFloorNameInput] = useState('');

    // Use Custom Hook for Canvas Logic
    const { containerRef, transform, handlers, controls } = useInfiniteCanvas();

    const [visibleLayers, setVisibleLayers] = useState<string[]>([initialFloor]);

    if (!property) return <div>Property not found</div>;

    // Sync visibleLayers when activeFloor changes
    useEffect(() => {
        setVisibleLayers(prev => {
            if (!prev.includes(activeFloor)) {
                return [...prev, activeFloor];
            }
            return prev;
        });
    }, [activeFloor]);

    const selectedAppliance = appliances.find(a => a.id === selectedApplianceId);

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('panel') || t.includes('breaker')) return 'electric_bolt';
        if (t.includes('furnace') || t.includes('heat')) return 'local_fire_department';
        if (t.includes('water') || t.includes('heater')) return 'water_drop';
        if (t.includes('ac') || t.includes('air') || t.includes('cooling')) return 'ac_unit';
        if (t.includes('pump')) return 'mode_fan';
        return 'hvac';
    };

    // Floor Management Handlers
    const handleAddFloor = () => {
        if (floorNameInput.trim()) {
            const newFloors = [...floors, floorNameInput.trim()];
            updateProperty({ ...property, floors: newFloors });
            setActiveFloor(floorNameInput.trim());
            setShowFloorModal(null);
            setFloorNameInput('');
        }
    };

    const handleEditFloor = () => {
        if (floorNameInput.trim() && floorNameInput !== activeFloor) {
            const newName = floorNameInput.trim();
            const newFloors = floors.map(f => f === activeFloor ? newName : f);

            // Update property floors
            updateProperty({ ...property, floors: newFloors });

            // Update all appliances on this floor
            appliances.forEach(app => {
                if (app.position?.floor === activeFloor) {
                    updateAppliance({
                        ...app,
                        position: { ...app.position, floor: newName }
                    });
                }
            });

            setActiveFloor(newName);
            setShowFloorModal(null);
            setFloorNameInput('');
        }
    };

    const handleDeleteFloor = () => {
        if (floors.length <= 1) {
            alert("You must have at least one floor.");
            return;
        }
        const newFloors = floors.filter(f => f !== activeFloor);
        updateProperty({ ...property, floors: newFloors });
        setActiveFloor(newFloors[0]);
        setShowMenu(false);
    };

    const openFloorModal = (type: 'add' | 'edit') => {
        setFloorNameInput(type === 'edit' ? activeFloor : '');
        setShowFloorModal(type);
        setShowMenu(false);
    };

    return (
        <div className="flex flex-col h-screen bg-[#F0F2F5] dark:bg-background-dark overflow-hidden font-body select-none">

            {/* Header */}
            <div className="bg-white dark:bg-card-dark border-b border-gray-100 dark:border-gray-800 px-4 py-3 z-30 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <IconButton icon="menu" onClick={onBack} />
                    <div>
                        <div className="flex items-center gap-1">
                            <h1 className="text-sm font-bold text-brand-black dark:text-white leading-tight font-display">{property.name}</h1>
                            <span className="material-symbols-outlined text-gray-400 text-[14px]">chevron_right</span>
                        </div>
                        <p className="text-xs text-text-sub-light dark:text-text-sub-dark">{property.address}</p>
                    </div>
                </div>

                <div className="relative">
                    <IconButton icon="more_horiz" onClick={() => setShowMenu(!showMenu)} />

                    {/* Context Menu */}
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-card-dark rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden animate-[scaleIn_0.1s_ease-out] origin-top-right">
                                <div className="p-1">
                                    <button onClick={() => openFloorModal('add')} className="w-full text-left px-3 py-2 text-sm text-brand-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">add</span> Add Floor
                                    </button>
                                    <button onClick={() => openFloorModal('edit')} className="w-full text-left px-3 py-2 text-sm text-brand-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">edit</span> Rename Floor
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>
                                    <button onClick={handleDeleteFloor} disabled={floors.length <= 1} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 disabled:opacity-50">
                                        <span className="material-symbols-outlined text-[18px]">delete</span> Delete Floor
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-card-dark border-b border-gray-100 dark:border-gray-800 px-4 flex items-center gap-6 overflow-x-auto hide-scrollbar z-20 shrink-0">
                {floors.map(floor => (
                    <button
                        key={floor}
                        onClick={() => { setActiveFloor(floor); setSelectedApplianceId(null); }}
                        className={`py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${activeFloor === floor
                                ? 'border-[#004d40] text-[#004d40] dark:border-primary dark:text-primary'
                                : 'border-transparent text-gray-400 hover:text-brand-black dark:hover:text-white'
                            }`}
                    >
                        {floor.toUpperCase()} {floor === 'Garage' && viewMode === 'electrical' ? '(E)' : ''}
                    </button>
                ))}
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className="flex-1 relative bg-[#F4F6F8] dark:bg-[#1a202c] overflow-hidden cursor-grab active:cursor-grabbing touch-none"
                {...handlers}
                onClick={() => setSelectedApplianceId(null)}
            >
                {/* Dot Grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px'
                }}></div>

                <div
                    className="absolute inset-0 w-full h-full origin-top-left transition-transform duration-75 ease-out"
                    style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
                >

                    {/* Mock Utility Connection Node (Gas) - Only in Layout Mode + Basement */}
                    {viewMode === 'layout' && activeFloor === 'Basement' && (
                        <div className="absolute top-[18%] left-[10%] flex flex-col items-center gap-1 z-10 pointer-events-none select-none">
                            <div className="w-12 h-12 bg-white dark:bg-card-dark rounded-full flex items-center justify-center border-2 border-orange-500 shadow-md">
                                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">gas_meter</span>
                            </div>
                            <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter">Gas Utility</span>
                        </div>
                    )}

                    {/* Render Layers */}
                    {floors.map((floor) => {
                        if (!visibleLayers.includes(floor)) return null;
                        const isMain = floor === activeFloor;
                        const floorApps = appliances.filter(app => (app.position?.floor || 'Basement') === floor);

                        return (
                            <div key={floor} className="absolute inset-0" style={{ opacity: isMain ? 1 : 0.2, zIndex: isMain ? 20 : 10, pointerEvents: isMain ? 'auto' : 'none' }}>

                                <ConnectionLayer
                                    viewMode={viewMode}
                                    apps={floorApps}
                                    activeFloor={activeFloor}
                                    selectedId={selectedApplianceId}
                                />

                                {/* 2. Nodes Layer */}
                                {floorApps.map(app => {
                                    const isSelected = selectedApplianceId === app.id;
                                    const isPanel = app.type === 'Panel';

                                    const nodeClasses = viewMode === 'electrical' && isPanel
                                        ? 'w-24 h-20 bg-[#1e293b] rounded-xl shadow-xl border-0' // Electrical Mode Panel
                                        : `w-20 h-20 bg-white dark:bg-card-dark rounded-2xl shadow-md border-2 ${isSelected
                                            ? viewMode === 'electrical' ? 'border-blue-500 shadow-blue-500/20' : 'border-primary shadow-lg scale-110'
                                            : 'border-white dark:border-gray-700'
                                        }`;

                                    const iconColor = viewMode === 'electrical' && isPanel ? 'text-white' : isSelected ? 'text-primary' : 'text-slate-500 dark:text-slate-400';
                                    const textColor = viewMode === 'electrical' && isPanel ? 'text-gray-300' : isSelected ? 'text-brand-black dark:text-white' : 'text-slate-500 dark:text-gray-400';

                                    return (
                                        <React.Fragment key={app.id}>
                                            {/* Zone Label */}
                                            {app.specs?.location && (
                                                <div
                                                    className="absolute transform -translate-x-1/2 -translate-y-full text-[8px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none whitespace-nowrap mb-8"
                                                    style={{ left: `${app.position?.x}%`, top: `${app.position?.y}%` }}
                                                >
                                                    {app.specs.location.split(' ')[0]} AREA
                                                </div>
                                            )}

                                            <div
                                                onClick={(e) => { e.stopPropagation(); setSelectedApplianceId(app.id); }}
                                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${nodeClasses} ${isSelected ? 'z-30' : 'z-20 hover:scale-105'}`}
                                                style={{ left: `${app.position?.x}%`, top: `${app.position?.y}%` }}
                                            >
                                                <span className={`material-symbols-outlined text-3xl mb-1 ${iconColor}`}>
                                                    {getIcon(app.type)}
                                                </span>
                                                <span className={`text-[8px] font-bold uppercase text-center leading-tight px-1 max-w-full ${textColor}`}>
                                                    {app.type}
                                                </span>

                                                {/* Status Indicators */}
                                                <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                                                    {/* Gas Indicator (Layout Mode Only) */}
                                                    {viewMode === 'layout' && (app.specs?.fuelType?.includes('Gas') || app.specs?.fuelType?.includes('Propane')) && (
                                                        <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white dark:border-card-dark flex items-center justify-center shadow-sm">
                                                            <span className="material-symbols-outlined text-[10px] text-white">local_fire_department</span>
                                                        </div>
                                                    )}

                                                    {/* Status Dot */}
                                                    <div className={`w-3 h-3 rounded-full border-2 ${viewMode === 'electrical' && isPanel ? 'border-[#1e293b]' : 'border-white dark:border-card-dark'} ${app.status === 'operational' || app.status === 'connected' ? 'bg-green-500' :
                                                            app.status === 'needs_service' ? 'bg-orange-500' : 'bg-gray-400'
                                                        }`}></div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Right Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
                    {/* View Mode Toggle */}
                    <button
                        onClick={() => setViewMode(prev => prev === 'layout' ? 'electrical' : 'layout')}
                        className={`w-10 h-10 rounded-xl shadow-sm border flex items-center justify-center transition-all duration-300 ${viewMode === 'electrical'
                                ? 'bg-yellow-400 border-yellow-500 text-brand-black shadow-lg shadow-yellow-400/20'
                                : 'bg-white/90 dark:bg-card-dark/90 backdrop-blur border-gray-100 dark:border-gray-700 text-slate-400 hover:text-slate-600'
                            }`}
                        title={viewMode === 'electrical' ? 'Switch to General Layout' : 'Switch to Electrical View'}
                    >
                        <span className={`material-symbols-outlined ${viewMode === 'electrical' ? 'font-variation-settings-fill' : ''}`}>
                            {viewMode === 'electrical' ? 'bolt' : 'flash_on'}
                        </span>
                    </button>

                    {/* Zoom Controls */}
                    <IconButton icon="add" onClick={controls.zoomIn} variant="solid" className="rounded-xl w-10 h-10" />
                    <IconButton icon="remove" onClick={controls.zoomOut} variant="solid" className="rounded-xl w-10 h-10" />
                </div>

            </div>

            {/* Bottom Sheet - Context Aware */}
            {selectedAppliance && (
                <div className="flex-none z-30 bg-white dark:bg-card-dark rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-gray-100 dark:border-gray-800 overflow-hidden animate-[slideUp_0.3s_ease-out]">

                    {/* Handle */}
                    <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer" onClick={() => setSelectedApplianceId(null)}>
                        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    </div>

                    <div className="px-6 pb-6">
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${viewMode === 'electrical' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                                    <span className="material-symbols-outlined text-3xl">{getIcon(selectedAppliance.type)}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedAppliance.name}</h3>
                                        <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${selectedAppliance.status === 'operational' || selectedAppliance.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {selectedAppliance.status === 'connected' ? 'CONNECTED' : selectedAppliance.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {selectedAppliance.brand} {selectedAppliance.modelNumber ? `· ${selectedAppliance.modelNumber}` : ''}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => onApplianceClick(selectedAppliance.id)} className="text-[#004d40] dark:text-primary font-bold text-sm">Edit</button>
                        </div>

                        {/* Conditional Content based on View Mode */}
                        {viewMode === 'electrical' ? (
                            <>
                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400 uppercase mb-1">Breaker</p>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-600 text-sm">tune</span>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedAppliance.specs?.breakerRating || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400 uppercase mb-1">Panel Slot</p>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-600 text-sm">grid_view</span>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedAppliance.specs?.panelSlot || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => onApplianceClick(selectedAppliance.id)} className="w-full py-3.5 bg-[#004d40] hover:bg-[#003d33] dark:bg-primary dark:hover:bg-primary/90 text-white rounded-xl font-bold text-sm shadow-lg transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">electric_bolt</span>
                                    Circuit Load Details
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="bg-orange-50/50 dark:bg-orange-950/20 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                        <p className="text-[10px] font-bold text-orange-600/70 dark:text-orange-400 uppercase mb-1">Utility</p>
                                        <p className="text-sm font-bold text-brand-black dark:text-white">{selectedAppliance.specs?.fuelType || 'Electric'}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Last Service</p>
                                        <p className="text-sm font-bold text-brand-black dark:text-white">{selectedAppliance.lastService || 'N/A'}</p>
                                    </div>
                                </div>
                                <button onClick={() => onApplianceClick(selectedAppliance.id)} className="w-full py-3.5 bg-white border border-gray-200 text-brand-black dark:bg-card-dark dark:border-gray-700 dark:text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">description</span>
                                    View Full Technical Specs
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Floor Management Modal */}
            {showFloorModal && (
                <Modal onClose={() => setShowFloorModal(null)} className="max-w-sm">
                    <div className="p-2">
                        <h3 className="text-lg font-bold text-brand-black dark:text-white mb-4">
                            {showFloorModal === 'add' ? 'Add New Floor' : 'Rename Floor'}
                        </h3>
                        <input
                            type="text"
                            value={floorNameInput}
                            onChange={(e) => setFloorNameInput(e.target.value)}
                            placeholder="Floor Name (e.g. 3rd Floor)"
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-brand-black dark:text-white focus:ring-2 focus:ring-primary/50 outline-none mb-6"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setShowFloorModal(null)} className="flex-1">Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={showFloorModal === 'add' ? handleAddFloor : handleEditFloor}
                                className="flex-1"
                                disabled={!floorNameInput.trim()}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default PropertyCanvasView;
