import React from 'react';
import { DashboardCard } from './DashboardCard';

interface InfoCardProps {
    label: string;
    value: string;
    isAlert?: boolean;
    icon?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
    label,
    value,
    isAlert = false,
    icon
}) => {

    const bgColor = isAlert ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' : 'hover:border-gray-300 dark:hover:border-gray-600';
    const textColor = isAlert ? 'text-orange-700 dark:text-orange-400' : 'text-brand-black dark:text-white';
    const labelColor = isAlert ? 'text-orange-600/70 dark:text-orange-400/70' : 'text-text-sub-light dark:text-text-sub-dark';
    const iconColor = isAlert ? 'text-orange-500/20' : 'text-gray-400/20';

    return (
        <DashboardCard
            bgColor={bgColor}
            className={`flex flex-col justify-between h-full transition-all duration-300 hover:shadow-md hover:scale-[1.02] relative group overflow-hidden ${isAlert ? 'border' : ''}`}
        >
            {/* Background Icon Watermark */}
            {icon && (
                <span className={`material-symbols-outlined absolute -right-2 -bottom-4 text-[60px] ${iconColor} group-hover:scale-110 transition-transform duration-500 select-none pointer-events-none`}>
                    {icon}
                </span>
            )}

            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>{label}</span>
                    {icon && <span className={`material-symbols-outlined ${isAlert ? 'text-orange-500' : 'text-gray-400'} text-[20px]`}>{icon}</span>}
                </div>
                <div className="mt-3">
                    <div className={`text-xl font-bold leading-tight ${textColor} flex items-center`}>
                        {isAlert && <span className="material-symbols-outlined mr-2 text-orange-600 animate-pulse">warning</span>}
                        {value}
                    </div>
                </div>
            </div>
        </DashboardCard>
    );
};
