import React from 'react';
import { DashboardCard } from './DashboardCard';

export interface SensorReading {
    id: string;
    label: string;
    value: string;
    unit?: string;
    trend?: 'up' | 'down' | 'stable';
}

interface SensorGridProps {
    readings: SensorReading[];
    title?: string;
}

export const SensorGrid: React.FC<SensorGridProps> = ({ readings, title = "Specifications" }) => {
    return (
        <DashboardCard title={title}>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {readings.map((reading) => (
                    <div key={reading.id} className="flex flex-col">
                        <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider mb-1">
                            {reading.label}
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-brand-black dark:text-white font-mono">
                                {reading.value}
                            </span>
                            {reading.unit && (
                                <span className="text-xs text-gray-500 font-medium">
                                    {reading.unit}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </DashboardCard>
    );
};
