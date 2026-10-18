import React from 'react';
import { DashboardCard } from './DashboardCard';

export interface ResourceMetric {
    label: string;
    value: number; // 0-100
    color: string; // Tailwind bg class or hex
}

interface ResourceBarsProps {
    metrics: ResourceMetric[];
    title?: string;
}

export const ResourceBars: React.FC<ResourceBarsProps> = ({ metrics, title = "Current Statistics" }) => {
    return (
        <DashboardCard title={title}>
            <div className="space-y-5">
                {metrics.map((metric, index) => (
                    <div key={index}>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-brand-black dark:text-white">{metric.label}</span>
                            <span className="text-xs font-mono text-gray-500">{metric.value}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out`}
                                style={{
                                    width: `${metric.value}%`,
                                    backgroundColor: metric.color
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </DashboardCard>
    );
};
