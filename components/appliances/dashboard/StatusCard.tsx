import React from 'react';
import { DashboardCard } from './DashboardCard';

interface StatusCardProps {
    label: string;
    value: string;
    variant?: 'default' | 'filled';
    status: 'optimal' | 'warning' | 'critical' | 'neutral';
    subtext?: string;
    icon?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
    label,
    value,
    variant = 'default',
    status,
    subtext,
    icon
}) => {

    const getColors = () => {
        if (variant === 'filled') {
            switch (status) {
                // Using subtle gradients for depth
                case 'optimal': return { bg: 'bg-gradient-to-br from-[#1a9387] to-[#126e64]', text: 'text-white', label: 'text-white/90', icon: 'text-white/20' };
                case 'warning': return { bg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', text: 'text-white', label: 'text-white/90', icon: 'text-white/20' };
                case 'critical': return { bg: 'bg-gradient-to-br from-red-500 to-red-600', text: 'text-white', label: 'text-white/90', icon: 'text-white/20' };
                default: return { bg: 'bg-gradient-to-br from-gray-500 to-gray-600', text: 'text-white', label: 'text-white/90', icon: 'text-white/20' };
            }
        } else {
            // Default (white background)
            switch (status) {
                case 'optimal': return { bg: 'hover:border-[#1a9387]/30', text: 'text-[#1a9387]', label: 'text-text-sub-light dark:text-text-sub-dark', icon: 'text-[#1a9387]/10' };
                case 'warning': return { bg: 'hover:border-yellow-500/30', text: 'text-yellow-600', label: 'text-text-sub-light dark:text-text-sub-dark', icon: 'text-yellow-500/10' };
                case 'critical': return { bg: 'hover:border-brand-red/30', text: 'text-brand-red', label: 'text-text-sub-light dark:text-text-sub-dark', icon: 'text-brand-red/10' };
                default: return { bg: 'hover:border-gray-500/30', text: 'text-brand-black dark:text-white', label: 'text-text-sub-light dark:text-text-sub-dark', icon: 'text-gray-500/10' };
            }
        }
    };

    const colors = getColors();

    return (
        <DashboardCard
            bgColor={colors.bg}
            className={`flex flex-col justify-between h-full transition-all duration-300 hover:shadow-md hover:scale-[1.02] overflow-hidden relative group`}
        >
            {/* Background Icon Watermark */}
            {icon && (
                <span className={`material-symbols-outlined absolute -right-4 -bottom-4 text-[80px] ${colors.icon} group-hover:scale-110 transition-transform duration-500 select-none pointer-events-none`}>
                    {icon}
                </span>
            )}

            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold uppercase tracking-wider ${colors.label}`}>{label}</span>
                    {icon && variant !== 'filled' && (
                        <span className={`material-symbols-outlined text-[20px] opacity-50`}>{icon}</span>
                    )}
                </div>
                <div className="mt-2">
                    <div className={`text-3xl font-black ${colors.text} tracking-tight`}>
                        {value}
                    </div>
                    {subtext && <div className={`text-xs mt-1 ${colors.label}`}>{subtext}</div>}
                </div>
            </div>
        </DashboardCard>
    );
};
