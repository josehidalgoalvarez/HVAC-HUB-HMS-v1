import React from 'react';
import { DashboardCard } from './DashboardCard';

interface SchematicViewProps {
    type?: string;
    applianceName: string;
    imageUrl?: string;
}

export const SchematicView: React.FC<SchematicViewProps> = ({ type, applianceName, imageUrl }) => {
    // In a real app, this would select the correct Schematic SVG/Image based on appliance type
    // If an explicit imageUrl is provided (e.g. from a file upload or specific asset), use that.

    return (
        <DashboardCard title="Schematic View" className="h-full min-h-[200px]">
            {/* Container: Added overflow-hidden to prevent image from sticking out */}
            <div className="w-full h-full flex items-center justify-center min-h-[150px] relative overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800 bg-white">

                {/* Grid Background - Always visible for technical feel */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />

                {imageUrl ? (
                    <div className="relative w-full h-full p-4 flex items-center justify-center">
                        <img
                            src={imageUrl}
                            alt={`${applianceName} Schematic`}
                            className="w-full h-full object-contain"
                        />
                        {/* Zoom hint overlay */}
                        <div className="absolute bottom-2 right-2 p-1.5 bg-black/5 rounded-md backdrop-blur-[2px]">
                            <span className="material-symbols-outlined text-gray-500 text-[16px]">zoom_in</span>
                        </div>
                    </div>
                ) : (
                    <svg viewBox="0 0 200 150" className="w-full h-full max-w-[80%] max-h-[80%] stroke-gray-400 dark:stroke-gray-500" fill="none" strokeWidth="1.5">
                        {/* Simplified Isometric Cube/Box representation */}
                        <path d="M100 20 L160 50 L160 110 L100 140 L40 110 L40 50 Z" strokeLinejoin="round" />
                        <path d="M40 50 L100 80 L160 50" strokeLinejoin="round" />
                        <path d="M100 80 L100 140" strokeLinejoin="round" />

                        {/* Internal details */}
                        <path d="M70 65 L70 100" strokeDasharray="4 4" className="stroke-primary/50" />
                        <path d="M130 65 L130 100" strokeDasharray="4 4" className="stroke-primary/50" />
                        <circle cx="100" cy="50" r="10" className="fill-primary/10 stroke-primary" />

                        {/* Callout Lines */}
                        <line x1="160" y1="80" x2="190" y2="80" className="stroke-gray-300" />
                        <circle cx="190" cy="80" r="2" className="fill-gray-300 stroke-none" />
                    </svg>
                )}

                {!imageUrl && (
                    <div className="absolute bottom-2 right-2 text-[8px] font-mono text-gray-400 uppercase">
                        Model: {applianceName.substring(0, 12)}...<br />
                        Rev: 2.4.1
                    </div>
                )}
            </div>
        </DashboardCard>
    );
};
